import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL'leri - Always use Production (Render.com)
const API_URL = 'https://bookmate-react.onrender.com/api';

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('bookmate_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Token süresi dolmuşsa otomatik logout
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('bookmate_auth_token');
      await AsyncStorage.removeItem('user');
      // Burada auth state güncellemek için bir Redux/Context action'ı çağrılabilir
    }
    
    return Promise.reject(error);
  }
);

export default api; 
 