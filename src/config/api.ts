// API Configuration
import { Platform } from 'react-native';

export const API_CONFIG = {
  BASE_URL: Platform.select({
    android: 'http://10.0.2.2:5000', // Android emülatör için 10.0.2.2 (localhost mapping)
    ios: 'http://localhost:5000', // iOS simulator için localhost
    default: 'http://localhost:5000', // Diğer platformlar için localhost
  }),
  ENDPOINTS: {
    AUTH: {
      BASE: '/api/auth',
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ME: '/api/auth/me',
      CHANGE_PASSWORD: '/api/auth/change-password',
      VERIFY_PASSWORD: '/api/auth/verify-password'
    },
    BOOKS: {
      LIST: '/api/books',
      SEARCH: '/api/books/search',
      DETAIL: '/api/books',
      USER_BOOKS: '/api/user/books'
    },
    WISHLISTS: {
      LIST: '/api/user/wishlists',
      ADD: '/api/user/wishlists',
      DELETE: '/api/user/wishlists',
      UPDATE: '/api/user/wishlists'
    },
    DASHBOARD: '/api/dashboard'
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Request headers with auth token
export const getAuthHeaders = (token?: string) => {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}; 