import { api, handleApiError, tokenManager } from './api';
import { User } from '../contexts/AuthContext';

// Types for authentication requests and responses
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

// Authentication API service
export const authApi = {
  /**
   * Login user with username and password
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      
      const { tokens } = response.data;
      
      // Store tokens
      tokenManager.setToken(tokens.access_token);
      tokenManager.setRefreshToken(tokens.refresh_token);
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      
      const { tokens } = response.data;
      
      // Store tokens
      tokenManager.setToken(tokens.access_token);
      tokenManager.setRefreshToken(tokens.refresh_token);
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Logout user (clear tokens and optionally call backend)
   */
  logout: async (): Promise<void> => {
    try {
      // Call backend logout endpoint if token exists
      const token = tokenManager.getToken();
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      // Don't throw error on logout failure, just log it
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local tokens
      tokenManager.clearTokens();
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: newRefreshToken } = response.data;
      
      // Update stored tokens
      tokenManager.setToken(access_token);
      if (newRefreshToken) {
        tokenManager.setRefreshToken(newRefreshToken);
      }

      return response.data;
    } catch (error) {
      // Clear tokens on refresh failure
      tokenManager.clearTokens();
      throw handleApiError(error);
    }
  },

  /**
   * Get current user information
   */
  getMe: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    return tokenManager.hasValidToken();
  },

  /**
   * Get stored access token
   */
  getToken: (): string | null => {
    return tokenManager.getToken();
  },

  /**
   * Verify token validity by calling the backend
   */
  verifyToken: async (): Promise<boolean> => {
    try {
      await api.get('/auth/verify');
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default authApi;