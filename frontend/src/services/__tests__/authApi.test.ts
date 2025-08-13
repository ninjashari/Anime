import { authApi } from '../authApi';
import { api, tokenManager } from '../api';
import { User } from '../../contexts/AuthContext';

// Mock the api module
jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
  tokenManager: {
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clearTokens: jest.fn(),
    hasValidToken: jest.fn(),
    getToken: jest.fn(),
  },
  handleApiError: jest.fn((error) => {
    throw error;
  }),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockAuthResponse = {
      user: {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        mal_token_expires_at: null,
      } as User,
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
      },
    };

    it('should login successfully and store tokens', async () => {
      mockApi.post.mockResolvedValue({ data: mockAuthResponse });

      const result = await authApi.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(mockTokenManager.setToken).toHaveBeenCalledWith('access-token');
      expect(mockTokenManager.setRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('register', () => {
    const mockAuthResponse = {
      user: {
        id: 1,
        username: 'newuser',
        name: 'New User',
        mal_token_expires_at: null,
      } as User,
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
      },
    };

    it('should register successfully and store tokens', async () => {
      mockApi.post.mockResolvedValue({ data: mockAuthResponse });

      const result = await authApi.register({
        name: 'New User',
        username: 'newuser',
        password: 'password123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        name: 'New User',
        username: 'newuser',
        password: 'password123',
      });
      expect(mockTokenManager.setToken).toHaveBeenCalledWith('access-token');
      expect(mockTokenManager.setRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('should call logout endpoint and clear tokens', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockApi.post.mockResolvedValue({ data: {} });

      await authApi.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should clear tokens even if API call fails', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockApi.post.mockRejectedValue(new Error('Network error'));

      await authApi.logout();

      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should not call API if no token exists', async () => {
      mockTokenManager.getToken.mockReturnValue(null);

      await authApi.logout();

      expect(mockApi.post).not.toHaveBeenCalled();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const mockRefreshResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      token_type: 'bearer',
    };

    it('should refresh token successfully', async () => {
      mockTokenManager.getRefreshToken.mockReturnValue('refresh-token');
      mockApi.post.mockResolvedValue({ data: mockRefreshResponse });

      const result = await authApi.refreshToken();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
        refresh_token: 'refresh-token',
      });
      expect(mockTokenManager.setToken).toHaveBeenCalledWith('new-access-token');
      expect(mockTokenManager.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should handle refresh without new refresh token', async () => {
      const responseWithoutRefreshToken = {
        access_token: 'new-access-token',
        token_type: 'bearer',
      };
      mockTokenManager.getRefreshToken.mockReturnValue('refresh-token');
      mockApi.post.mockResolvedValue({ data: responseWithoutRefreshToken });

      const result = await authApi.refreshToken();

      expect(mockTokenManager.setToken).toHaveBeenCalledWith('new-access-token');
      expect(mockTokenManager.setRefreshToken).not.toHaveBeenCalled();
      expect(result).toEqual(responseWithoutRefreshToken);
    });
  });

  describe('getMe', () => {
    const mockUser: User = {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      mal_token_expires_at: '2024-12-31T23:59:59Z',
    };

    it('should get user info successfully', async () => {
      mockApi.get.mockResolvedValue({ data: mockUser });

      const result = await authApi.getMe();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token is valid', () => {
      mockTokenManager.hasValidToken.mockReturnValue(true);

      const result = authApi.isAuthenticated();

      expect(result).toBe(true);
      expect(mockTokenManager.hasValidToken).toHaveBeenCalled();
    });

    it('should return false if token is invalid', () => {
      mockTokenManager.hasValidToken.mockReturnValue(false);

      const result = authApi.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      mockTokenManager.getToken.mockReturnValue('stored-token');

      const result = authApi.getToken();

      expect(result).toBe('stored-token');
      expect(mockTokenManager.getToken).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should return true if token verification succeeds', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      const result = await authApi.verifyToken();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/verify');
      expect(result).toBe(true);
    });

    it('should return false if token verification fails', async () => {
      mockApi.get.mockRejectedValue(new Error('Invalid token'));

      const result = await authApi.verifyToken();

      expect(result).toBe(false);
    });
  });
});