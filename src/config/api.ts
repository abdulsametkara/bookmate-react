// API Configuration
import { Platform } from 'react-native';

export const API_CONFIG = {
  BASE_URL: Platform.select({
    android: 'http://192.168.1.116:5000', // Android emülatör için backend IP
    default: 'http://192.168.1.116:5000', // Diğer platformlar için backend IP
  }),
  ENDPOINTS: {
    AUTH: {
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