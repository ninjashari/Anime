import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005/api';

// Types for API responses
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  details?: any;
  status?: number;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('access_token', token);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },
  
  setRefreshToken: (token: string): void => {
    localStorage.setItem('refresh_token', token);
  },
  
  clearTokens: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  
  hasValidToken: (): boolean => {
    const token = tokenManager.getToken();
    if (!token) return false;
    
    try {
      // Check if token is expired (basic JWT parsing)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Handle form data content type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']; // Let browser set it with boundary
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          tokenManager.setToken(access_token);
          
          if (newRefreshToken) {
            tokenManager.setRefreshToken(newRefreshToken);
          }
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  get: <T = any>(url: string, params?: any): Promise<AxiosResponse<T>> => {
    return apiClient.get(url, { params });
  },
  
  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    return apiClient.post(url, data);
  },
  
  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    return apiClient.put(url, data);
  },
  
  delete: <T = any>(url: string): Promise<AxiosResponse<T>> => {
    return apiClient.delete(url);
  },
  
  patch: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    return apiClient.patch(url, data);
  }
};

// Error handling utility
export const handleApiError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Server responded with error status
      const data = axiosError.response.data as any;
      return {
        message: data?.message || data?.detail || 'An error occurred',
        details: data?.details,
        status: axiosError.response.status
      };
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      // Something else happened
      return {
        message: axiosError.message || 'An unexpected error occurred',
      };
    }
  }
  
  // Non-axios error
  return {
    message: error?.message || 'An unexpected error occurred',
  };
};

export default apiClient;