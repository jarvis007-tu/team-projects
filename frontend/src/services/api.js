import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add device ID if available
    const deviceId = localStorage.getItem('deviceId');
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Check if using mock authentication
    const isUsingMockAuth = localStorage.getItem('accessToken')?.startsWith('mock_');

    // Auth endpoints that should NOT trigger token refresh on 401
    // (401 on these endpoints means wrong credentials, not expired token)
    const authEndpoints = [
      '/auth/login',
      '/auth/change-password',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/register'
    ];
    const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest?.url?.includes(endpoint));

    // Handle token refresh - but skip for:
    // - Development mock mode
    // - Auth endpoints where 401 means wrong credentials
    if (error.response?.status === 401 && !originalRequest._retry && !isUsingMockAuth && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens but don't redirect with window.location
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Let the app handle the redirect via React Router
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const message = error.response.data?.message ||
                      error.response.data?.error?.message ||
                      'An error occurred';

      // Check if this is a deleted account error (403 with deleted message)
      const isDeletedAccountError = error.response.status === 403 &&
        (message.toLowerCase().includes('deleted') || message.toLowerCase().includes('account has been deleted'));

      // Don't show toast for:
      // - 400 = validation errors (handled in forms)
      // - 401 = unauthorized (handled by specific endpoints like login, change-password)
      // - 409 = conflict errors (e.g., user already exists)
      // - 403 deleted account errors (handled by redirect to /account-deleted page)
      const skipToastStatuses = [400, 401, 409];
      if (!skipToastStatuses.includes(error.response.status) && !isDeletedAccountError) {
        toast.error(message);
      }

      // Log errors only in development mode
      if (import.meta.env.DEV && import.meta.env.MODE !== 'production') {
        console.debug('API Error:', error.response);
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// API methods with proper error handling
const apiMethods = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};

export default apiMethods;