import axios from 'axios';
import { api, tokenManager, handleApiError } from '../api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  isAxiosError: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('tokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      const mockToken = 'test-token';
      localStorageMock.getItem.mockReturnValue(mockToken);

      const result = tokenManager.getToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('access_token');
      expect(result).toBe(mockToken);
    });

    it('should return null if no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = tokenManager.getToken();

      expect(result).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should store token in localStorage', () => {
      const token = 'new-token';

      tokenManager.setToken(token);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', token);
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token from localStorage', () => {
      const mockToken = 'refresh-token';
      localStorageMock.getItem.mockReturnValue(mockToken);

      const result = tokenManager.getRefreshToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('refresh_token');
      expect(result).toBe(mockToken);
    });
  });

  describe('setRefreshToken', () => {
    it('should store refresh token in localStorage', () => {
      const token = 'new-refresh-token';

      tokenManager.setRefreshToken(token);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', token);
    });
  });

  describe('clearTokens', () => {
    it('should remove both tokens from localStorage', () => {
      tokenManager.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('hasValidToken', () => {
    it('should return false if no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = tokenManager.hasValidToken();

      expect(result).toBe(false);
    });

    it('should return false for invalid token format', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');

      const result = tokenManager.hasValidToken();

      expect(result).toBe(false);
    });

    it('should return false for expired token', () => {
      const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 }); // 1 hour ago
      localStorageMock.getItem.mockReturnValue(expiredToken);

      const result = tokenManager.hasValidToken();

      expect(result).toBe(false);
    });

    it('should return true for valid token', () => {
      const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 }); // 1 hour from now
      localStorageMock.getItem.mockReturnValue(validToken);

      const result = tokenManager.hasValidToken();

      expect(result).toBe(true);
    });
  });
});

describe('handleApiError', () => {
  it('should handle axios error with response', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          message: 'Bad request',
          details: 'Invalid input'
        }
      }
    };
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Bad request',
      details: 'Invalid input',
      status: 400
    });
  });

  it('should handle axios error with detail field', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: 'Validation error'
        }
      }
    };
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Validation error',
      details: undefined,
      status: 422
    });
  });

  it('should handle axios error without response (network error)', () => {
    const axiosError = {
      isAxiosError: true,
      request: {}
    };
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Network error. Please check your connection.',
      status: 0
    });
  });

  it('should handle axios error without request or response', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request setup error'
    };
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Request setup error'
    });
  });

  it('should handle non-axios error', () => {
    const error = new Error('Generic error');
    mockedAxios.isAxiosError.mockReturnValue(false);

    const result = handleApiError(error);

    expect(result).toEqual({
      message: 'Generic error'
    });
  });

  it('should handle unknown error', () => {
    const error = 'string error';
    mockedAxios.isAxiosError.mockReturnValue(false);

    const result = handleApiError(error);

    expect(result).toEqual({
      message: 'An unexpected error occurred'
    });
  });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${payloadStr}.${signature}`;
}