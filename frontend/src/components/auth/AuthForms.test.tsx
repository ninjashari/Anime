import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    clearError: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Authentication Forms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginForm', () => {
    it('renders login form with required elements', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up here/i })).toBeInTheDocument();
    });

    it('has password visibility toggle', () => {
      renderWithProviders(<LoginForm />);

      const toggleButton = screen.getByLabelText(/toggle password visibility/i);
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('RegisterForm', () => {
    it('renders register form with required elements', () => {
      renderWithProviders(<RegisterForm />);

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^confirm password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in here/i })).toBeInTheDocument();
    });

    it('has password visibility toggles for both password fields', () => {
      renderWithProviders(<RegisterForm />);

      const toggleButtons = screen.getAllByLabelText(/toggle.*password visibility/i);
      expect(toggleButtons).toHaveLength(2);
    });
  });
});