import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserManager } from './userManager';
import { Alert } from 'react-native';
import { CloudSync } from './cloudSync';

// Admin debug fonksiyonları
export class AdminDebug {
  
  // Tüm kullanıcıları konsola yazdır
  static async logAllUsers(): Promise<void> {
    try {
      const users = await UserManager.getAllUsers();
      console.log('=== TÜM KULLANICILAR ===');
      console.log(`Toplam kullanıcı sayısı: ${users.length}`);
      console.log('========================');
      
      users.forEach((user, index) => {
        console.log(`--- Kullanıcı ${index + 1} ---`);
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Ad: ${user.displayName}`);
        console.log(`Kayıt Tarihi: ${user.createdAt}`);
        console.log(`Son Giriş: ${user.lastLoginAt}`);
        console.log(`------------------------`);
      });
      
    } catch (error) {
      console.error('Error logging users:', error);
    }
  }

  // Tüm kullanıcı verilerini döndür
  static async getAllUsersData(): Promise<any[]> {
    try {
      const users = await UserManager.getAllUsers();
      
      // Her kullanıcı için ek bilgileri de al
      const usersWithDetails = await Promise.all(
        users.map(async (user) => {
          try {
            // Kullanıcının kitaplarını al
            const userBooks = await AsyncStorage.getItem(`user_books_${user.id}`);
            const books = userBooks ? JSON.parse(userBooks) : [];
            
            // Okuma session'larını al
            const userSessions = await AsyncStorage.getItem(`reading_sessions_${user.id}`);
            const sessions = userSessions ? JSON.parse(userSessions) : [];
            
            return {
              ...user,
              booksCount: books.length,
              readingSessionsCount: sessions.length,
              totalReadingTime: sessions.reduce((total: number, session: any) => 
                total + (session.duration || 0), 0
              )
            };
          } catch (error) {
            console.error(`Error getting details for user ${user.id}:`, error);
            return user;
          }
        })
      );
      
      return usersWithDetails;
    } catch (error) {
      console.error('Error getting all users data:', error);
      return [];
    }
  }

  // Kullanıcı sayısını Alert ile göster
  static async showUserCountAlert(): Promise<void> {
    try {
      const users = await this.getAllUsersData();
      
      const alertMessage = `
📊 KULLANICI İSTATİSTİKLERİ

👥 Toplam Kullanıcı: ${users.length}

📚 Detaylar:
${users.map((user, index) => 
  `${index + 1}. ${user.displayName || user.email}
   📖 ${user.booksCount || 0} kitap
   ⏱️ ${Math.round((user.totalReadingTime || 0) / 60)} saat okuma`
).join('\n\n')}
      `.trim();
      
      Alert.alert('👑 Admin Paneli', alertMessage);
      
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı verileri alınamadı.');
      console.error('Error showing user count:', error);
    }
  }

  // AsyncStorage'daki tüm verileri logla
  static async logAllStorageData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('=== TÜM ASYNC STORAGE VERİLERİ ===');
      console.log(`Toplam key sayısı: ${keys.length}`);
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          console.log(`\n--- ${key} ---`);
          console.log(value ? JSON.stringify(JSON.parse(value), null, 2) : 'null');
        } catch (error) {
          console.log(`${key}: [Error reading value]`);
        }
      }
      
    } catch (error) {
      console.error('Error logging storage data:', error);
    }
  }

  // AsyncStorage'daki tüm ham verileri döndür
  static async getRawStorageData(): Promise<Record<string, any>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rawData: Record<string, any> = {};
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          rawData[key] = value ? JSON.parse(value) : null;
        } catch (error) {
          rawData[key] = `[Error reading value: ${error}]`;
        }
      }
      
      return rawData;
      
    } catch (error) {
      console.error('Error getting raw storage data:', error);
      return {};
    }
  }

  // Bulut senkronizasyon durumunu kontrol et
  static async checkCloudSync(): Promise<void> {
    try {
      const cloudUsers = await CloudSync.getAllCloudUsers();
      const localUsers = await this.getAllUsersData();
      
      console.log('=== BULUT SENKRONİZASYON DURUMU ===');
      console.log(`Yerel kullanıcı sayısı: ${localUsers.length}`);
      console.log(`Buluttaki kullanıcı sayısı: ${cloudUsers.length}`);
      
      Alert.alert(
        '☁️ Bulut Durumu',
        `📱 Yerel: ${localUsers.length} kullanıcı\n☁️ Bulut: ${cloudUsers.length} kullanıcı\n\n${localUsers.length > 0 ? '✅ Yerel veriler mevcut' : '❌ Yerel veri yok'}`
      );
      
    } catch (error) {
      console.error('Error checking cloud sync:', error);
      Alert.alert('Hata', 'Bulut durumu kontrol edilemedi.');
    }
  }

  // Development mode kontrolü
  static isDevelopment(): boolean {
    return __DEV__ || process.env.NODE_ENV === 'development';
  }

  // Admin debug menüsünü göster  
  static showAdminMenu(): void {
    if (!this.isDevelopment()) {
      Alert.alert('Uyarı', 'Bu özellik sadece geliştirme modunda kullanılabilir.');
      return;
    }

    Alert.alert(
      '👑 Admin Debug Menüsü',
      'Hangi işlemi yapmak istiyorsunuz?',
      [
        {
          text: 'Kullanıcıları Göster',
          onPress: () => this.showUserCountAlert()
        },
        {
          text: 'Bulut Durumu',
          onPress: () => this.checkCloudSync()
        },
        {
          text: 'Console Log',
          onPress: () => this.logAllUsers()
        },
        {
          text: 'İptal',
          style: 'cancel'
        }
      ]
    );
  }
}

// Global debug fonksiyonları (konsol üzerinden çağırılabilir)
(global as any).debugUsers = AdminDebug.logAllUsers;
(global as any).showUsers = AdminDebug.showUserCountAlert;
(global as any).adminMenu = AdminDebug.showAdminMenu; 