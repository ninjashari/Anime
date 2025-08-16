import { api, handleApiError } from './api';

// Types for MyAnimeList API integration
export interface MALTokenStatus {
  has_tokens: boolean;
  expires_at: string | null;
  is_expired: boolean;
  username?: string;
}

export interface MALAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface MALCallbackRequest {
  code: string;
  state: string;
}

export interface MALTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  username: string;
}

export interface MALUserInfo {
  id: number;
  name: string;
  picture?: string;
  gender?: string;
  birthday?: string;
  location?: string;
  joined_at: string;
}

// MyAnimeList API service
export const malApi = {
  /**
   * Get MyAnimeList OAuth authorization URL
   */
  getAuthUrl: async (): Promise<MALAuthUrlResponse> => {
    try {
      const response = await api.get<MALAuthUrlResponse>('/mal/auth-url');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  handleCallback: async (callbackData: MALCallbackRequest): Promise<MALTokenResponse> => {
    try {
      const response = await api.post<MALTokenResponse>('/mal/callback', callbackData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get current MyAnimeList token status
   */
  getTokenStatus: async (): Promise<MALTokenStatus> => {
    try {
      const response = await api.get<MALTokenStatus>('/mal/token-status');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Refresh MyAnimeList access token
   */
  refreshToken: async (): Promise<MALTokenResponse> => {
    try {
      const response = await api.post<MALTokenResponse>('/mal/refresh-token');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get MyAnimeList user information
   */
  getUserInfo: async (): Promise<MALUserInfo> => {
    try {
      const response = await api.get<MALUserInfo>('/mal/user-info');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Revoke MyAnimeList tokens
   */
  revokeToken: async (): Promise<void> => {
    try {
      await api.delete('/mal/token');
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Test MyAnimeList API connection
   */
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.get<{ success: boolean; message: string }>('/mal/test-connection');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

export default malApi;