// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.5:5000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ME: '/api/auth/me'
    },
    BOOKS: {
      LIST: '/api/books',
      SEARCH: '/api/books/search',
      DETAIL: '/api/books',
      USER_BOOKS: '/api/user/books'
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