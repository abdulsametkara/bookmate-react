import AsyncStorage from '@react-native-async-storage/async-storage';

export class DebugUtils {
  // AsyncStorage'daki tüm verileri log'la
  static async logAllAsyncStorageData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', keys);

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`AsyncStorage[${key}]:`, value);
      }
    } catch (error) {
      console.error('Error logging AsyncStorage data:', error);
    }
  }

  // Kullanıcı verilerini log'la
  static async logUserData(userId: string): Promise<void> {
    try {
      console.log(`\n--- USER DATA DEBUG for ${userId} ---`);
      
      // Session data
      const sessionData = await AsyncStorage.getItem('bookmate_current_session');
      console.log('Current session:', sessionData);

      // User's books
      const booksData = await AsyncStorage.getItem(`bookmate_books_${userId}`);
      console.log(`Books for ${userId}:`, booksData);

      // User data
      const usersData = await AsyncStorage.getItem('bookmate_users');
      console.log('All users:', usersData);

      console.log('--- END USER DATA DEBUG ---\n');
    } catch (error) {
      console.error('Error logging user data:', error);
    }
  }

  // AsyncStorage'ı temizle (test amaçlı)
  static async clearAllAsyncStorage(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  }
} 