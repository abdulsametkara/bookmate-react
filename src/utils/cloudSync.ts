// Basit Bulut Senkronizasyon Servisi
// Bu servis kullanıcı verilerini merkezi bir sunucuya senkronize eder

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserManager } from './userManager';

export class CloudSync {
  
  // Test sunucusu - gerçek projede kendi sunucunuzu kullanın
  private static readonly API_BASE = 'https://jsonplaceholder.typicode.com'; // Sadece test için
  
  /**
   * Kullanıcı verilerini buluta yükle
   */
  static async uploadUserData(userId: string): Promise<boolean> {
    try {
      const user = await UserManager.getUserById(userId);
      if (!user) {
        console.error('User not found');
        return false;
      }

      // AsyncStorage'dan tüm kullanıcı verilerini al
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.includes(userId));
      const userData = await AsyncStorage.multiGet(userKeys);
      
      const dataToUpload = {
        userId,
        user,
        userData: userData.map(([key, value]) => ({
          key,
          value: value ? JSON.parse(value) : null
        })),
        uploadedAt: new Date().toISOString()
      };

      // API'ye gönder (gerçek projede kendi backend'inizi kullanın)
      const response = await fetch(`${this.API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpload)
      });

      return response.ok;
      
    } catch (error) {
      console.error('Cloud upload error:', error);
      return false;
    }
  }

  /**
   * Tüm kullanıcıları listele (Admin fonksiyonu)
   */
  static async getAllCloudUsers(): Promise<any[]> {
    try {
      // Gerçek projede kendi API endpoint'inizi kullanın
      const response = await fetch(`${this.API_BASE}/posts`);
      const data = await response.json();
      
      // Mock data döndürür - gerçek projede kendi formatınızı kullanın
      return data.slice(0, 10).map((item: any, index: number) => ({
        id: `user_${index + 1}`,
        email: `user${index + 1}@example.com`,
        displayName: `Kullanıcı ${index + 1}`,
        booksCount: Math.floor(Math.random() * 50),
        lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
      
    } catch (error) {
      console.error('Get cloud users error:', error);
      return [];
    }
  }

  /**
   * Belirli bir kullanıcının verilerini indir
   */
  static async downloadUserData(userId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.API_BASE}/posts/${userId}`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Download user data error:', error);
      return null;
    }
  }

  /**
   * Otomatik senkronizasyon
   */
  static async autoSync(userId: string): Promise<void> {
    try {
      // Her 5 dakikada bir senkronize et
      const lastSync = await AsyncStorage.getItem(`lastSync_${userId}`);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!lastSync || (now - parseInt(lastSync)) > fiveMinutes) {
        const success = await this.uploadUserData(userId);
        if (success) {
          await AsyncStorage.setItem(`lastSync_${userId}`, now.toString());
          console.log('Auto sync completed');
        }
      }
      
    } catch (error) {
      console.error('Auto sync error:', error);
    }
  }
} 