import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API URL'leri - Platform bazlı IP adresi
// Android emülatörde localhost yerine 10.0.2.2 kullanılır
const API_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api', // Android emülatör için localhost
  default: 'http://10.22.7.154:5000/api', // Diğer platformlar için
});

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
 