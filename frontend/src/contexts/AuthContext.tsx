import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
export interface User {
  id: number;
  username: string;
  name: string;
  malTokenExists: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // TODO: Implement API call to verify token and get user info
          // For now, we'll just set loading to false
          dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      // TODO: Implement actual API call
      // const response = await authAPI.login(username, password);
      // localStorage.setItem('token', response.data.token);
      // dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
      
      // Placeholder implementation
      throw new Error('Login API not implemented yet');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  };

  const register = async (name: string, username: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      // TODO: Implement actual API call
      // const response = await authAPI.register(name, username, password);
      // localStorage.setItem('token', response.data.token);
      // dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
      
      // Placeholder implementation
      throw new Error('Register API not implemented yet');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshUser = async (): Promise<void> => {
    try {
      // TODO: Implement API call to refresh user data
      // const response = await authAPI.getMe();
      // dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};