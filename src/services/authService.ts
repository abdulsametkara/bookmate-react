import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth yardımcı fonksiyonları
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
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
 