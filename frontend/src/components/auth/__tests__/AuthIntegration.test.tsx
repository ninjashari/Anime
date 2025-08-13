import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginForm from '../LoginForm';
import RegisterForm from '../RegisterForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import { authApi } from '../../../services/authApi';

// Mock the authApi
jest.mock('../../../services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    isAuthenticated: jest.fn(),
    getToken: jest.fn(),
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

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
        <AuthProvider>
          {component}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthApi.isAuthenticated.mockReturnValue(false);
    mockAuthApi.getToken.mockReturnValue(null);
  });

  describe('LoginForm Integration', () => {
    it('should call authApi.login when form is submitted with valid data', async () => {
      const user = userEvent.setup();
      const mockAuthResponse = {
        user: {
          id: 1,
          username: 'testuser',
          name: 'Test User',
          mal_token_expires_at: null,
        },
        tokens: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          token_type: 'bearer',
        },
      };

      mockAuthApi.login.mockResolvedValue(mockAuthResponse);

      renderWithProviders(<LoginForm />);

      // Fill in the form
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Verify navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should display error message when login fails', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Invalid credentials');
      mockError.message = 'Invalid username or password';

      mockAuthApi.login.mockRejectedValue(mockError);

      renderWithProviders(<LoginForm />);

      // Fill in the form
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
      });

      // Verify navigation did not occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockAuthApi.login.mockReturnValue(loginPromise);

      renderWithProviders(<LoginForm />);

      // Fill in the form
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveLogin!({
        user: { id: 1, username: 'testuser', name: 'Test User', mal_token_expires_at: null },
        tokens: { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer' },
      });

      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('RegisterForm Integration', () => {
    it('should call authApi.register when form is submitted with valid data', async () => {
      const user = userEvent.setup();
      const mockAuthResponse = {
        user: {
          id: 1,
          username: 'newuser',
          name: 'New User',
          mal_token_expires_at: null,
        },
        tokens: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          token_type: 'bearer',
        },
      };

      mockAuthApi.register.mockResolvedValue(mockAuthResponse);

      renderWithProviders(<RegisterForm />);

      // Fill in the form
      const nameInput = screen.getByLabelText(/full name/i);
      const usernameInput = screen.getByLabelText(/^username$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/^confirm password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'New User');
      await user.type(usernameInput, 'newuser');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(mockAuthApi.register).toHaveBeenCalledWith({
          name: 'New User',
          username: 'newuser',
          password: 'password123',
        });
      });

      // Verify navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should display error message when registration fails', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Username already exists');
      mockError.message = 'Username already registered';

      mockAuthApi.register.mockRejectedValue(mockError);

      renderWithProviders(<RegisterForm />);

      // Fill in the form
      const nameInput = screen.getByLabelText(/full name/i);
      const usernameInput = screen.getByLabelText(/^username$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/^confirm password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'New User');
      await user.type(usernameInput, 'existinguser');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/username already registered/i)).toBeInTheDocument();
      });

      // Verify navigation did not occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during registration', async () => {
      const user = userEvent.setup();
      let resolveRegister: (value: any) => void;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });

      mockAuthApi.register.mockReturnValue(registerPromise);

      renderWithProviders(<RegisterForm />);

      // Fill in the form
      const nameInput = screen.getByLabelText(/full name/i);
      const usernameInput = screen.getByLabelText(/^username$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/^confirm password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'New User');
      await user.type(usernameInput, 'newuser');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveRegister!({
        user: { id: 1, username: 'newuser', name: 'New User', mal_token_expires_at: null },
        tokens: { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer' },
      });

      await waitFor(() => {
        expect(screen.queryByText(/creating account/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should prevent login submission with invalid data', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check validation errors appear
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();

      // Verify API was not called
      expect(mockAuthApi.login).not.toHaveBeenCalled();
    });

    it('should prevent registration submission with mismatched passwords', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RegisterForm />);

      // Fill in the form with mismatched passwords
      const nameInput = screen.getByLabelText(/full name/i);
      const usernameInput = screen.getByLabelText(/^username$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/^confirm password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'New User');
      await user.type(usernameInput, 'newuser');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);

      // Check validation error appears
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();

      // Verify API was not called
      expect(mockAuthApi.register).not.toHaveBeenCalled();
    });
  });
});