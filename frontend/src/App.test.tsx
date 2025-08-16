import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the AuthContext to avoid authentication requirements in tests
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

test('renders login page when not authenticated', () => {
  render(<App />);
  const loginHeading = screen.getByRole('heading', { name: /welcome back/i });
  expect(loginHeading).toBeInTheDocument();
});