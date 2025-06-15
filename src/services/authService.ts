import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';

// Auth yardımcı fonksiyonları
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt?: string; // Backend'den gelecek
  
  // Frontend-only fields (opsiyonel, backend'de yok)
  photoURL?: string;
  partnerId?: string;
  partnershipStatus?: 'NONE' | 'PENDING' | 'ACCEPTED';
}

export interface UsernameCheckResponse {
  available: boolean;
  message: string;
}

export interface UserSearchResponse {
  id: string;
  username: string;
  displayName: string;
  photoURL?: string;
}

// Login işlemi
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', data);
    
    // Token ve kullanıcı bilgilerini kaydet
    await AsyncStorage.setItem('bookmate_auth_token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error: any) {
    // Backend hata mesajını yakala
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Giriş yapılırken bir hata oluştu');
  }
};

// Kayıt işlemi
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    // Token ve kullanıcı bilgilerini kaydet
    await AsyncStorage.setItem('bookmate_auth_token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error: any) {
    // Backend hata mesajını yakala
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Kayıt olurken bir hata oluştu');
  }
};

// Çıkış işlemi
export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem('bookmate_auth_token');
  await AsyncStorage.removeItem('user');
};

// Kullanıcı profili getir
export const getProfile = async (): Promise<User> => {
  try {
    const response = await api.get<{ message: string; user: User }>('/auth/profile');
    
    // Güncel kullanıcı bilgilerini kaydet
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data.user;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token geçersizse logout yap
      await logout();
      throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın');
    }
    throw new Error('Profil bilgileri alınırken bir hata oluştu');
  }
};

// Kullanıcı bilgilerini AsyncStorage'dan getir
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken hata:', error);
    return null;
  }
};

// Token kontrolü
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem('bookmate_auth_token');
  return !!token;
};

export class AuthService {
  // Username müsaitlik kontrolü
  static async checkUsername(username: string): Promise<UsernameCheckResponse> {
    try {
      console.log(`🔍 Checking username: ${username}`);
      
      const apiUrl = getApiUrl(`${API_CONFIG.ENDPOINTS.AUTH.BASE}/check-username/${username}`);
      console.log(`🌐 API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ API Error:', errorData);
        return {
          available: false,
          message: errorData.message || 'Kontrol edilemedi'
        };
      }

      const result = await response.json();
      console.log('✅ Username check result:', result);
      return result;
    } catch (error) {
      console.error('❌ Username check error:', error);
      return {
        available: false,
        message: 'Bağlantı hatası'
      };
    }
  }

  // Username ile kullanıcı arama
  static async searchByUsername(username: string): Promise<UserSearchResponse | null> {
    try {
      const apiUrl = getApiUrl(`${API_CONFIG.ENDPOINTS.AUTH.BASE}/search/${username}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Username search error:', error);
      return null;
    }
  }

  // Kullanıcı kaydı (username ile)
  static async register(registerData: RegisterData): Promise<any> {
    try {
      const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(registerData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kayıt başarısız');
      }

      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }
} 
 