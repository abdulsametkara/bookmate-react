import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  passwordHash?: string; // Basit password sistemi için
  createdAt: string;
  lastLoginAt: string;
  updatedAt?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    readingGoal?: number; // Daily reading goal in minutes
    preferredGenres?: string[];
  };
}

// Basit hash fonksiyonu (gerçek uygulamada bcrypt kullanılmalı)
const simpleHash = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Guest user template
export const GUEST_USER: User = {
  id: 'guest_user',
  displayName: 'Misafir Kullanıcı',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  preferences: {
    theme: 'system',
    notifications: true,
    readingGoal: 30, // 30 minutes default
    preferredGenres: []
  }
};

// Storage keys
const USERS_STORAGE_KEY = 'bookmate_users';
const CURRENT_USER_SESSION_KEY = 'bookmate_current_session';

export class UserManager {
  // Get current user from session
  static async getCurrentUser(): Promise<User | null> {
    try {
      const sessionData = await AsyncStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return await this.getUserById(session.userId);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Set current user session
  static async setCurrentUserSession(userId: string): Promise<void> {
    try {
      const sessionData = {
        userId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      await AsyncStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error setting user session:', error);
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      if (userId === 'guest_user') {
        return GUEST_USER;
      }

      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        return users.find(user => user.id === userId) || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Authenticate user with email and password
  static async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      console.log('🔐 UserManager: Attempting authentication for:', email);
      
      // API çağrısı yap
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ API Error:', errorData);
        return null;
      }

      const data = await response.json();
      console.log('✅ API Success:', data);

      // Backend'den gelen user data'sını local User formatına çevir
      const user: User = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        createdAt: data.user.createdAt,
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'system',
          notifications: true,
          readingGoal: 30,
          preferredGenres: []
        }
      };

      // JWT token'ı AsyncStorage'a kaydet
      await AsyncStorage.setItem('bookmate_auth_token', data.token);
      
      // User'ı local storage'a kaydet
      await this.saveUser(user);
      
      console.log('💾 User saved to local storage');
      
      return user;
      
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return null;
    }
  }

  // Save user (for registration/profile updates)
  static async saveUser(user: User): Promise<void> {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      let users: User[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUserIndex = users.findIndex(u => u.id === user.id);
      if (existingUserIndex >= 0) {
        users[existingUserIndex] = user;
      } else {
        users.push(user);
      }
      
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  // Update user (wrapper for saveUser with updatedAt)
  static async updateUser(user: User): Promise<void> {
    const userWithUpdateTime = {
      ...user,
      updatedAt: new Date().toISOString()
    };
    await this.saveUser(userWithUpdateTime);
  }

  // Register new user
  static async registerUser(email: string, password: string, displayName: string): Promise<User> {
    const userId = this.generateUserId();
    const passwordHash = simpleHash(password);
    
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      displayName,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'system',
        notifications: true,
        readingGoal: 30,
        preferredGenres: []
      }
    };

    await this.saveUser(newUser);
    return newUser;
  }

  // Initialize guest session (for first-time users)
  static async initializeGuestSession(): Promise<string> {
    try {
      const guestUserId = 'guest_user';
      await this.setCurrentUserSession(guestUserId);
      return guestUserId;
    } catch (error) {
      console.error('Error initializing guest session:', error);
      return 'guest_user';
    }
  }

  // Clear session (logout)
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CURRENT_USER_SESSION_KEY);
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  // Complete logout - clear session and return success
  static async logout(): Promise<boolean> {
    try {
      await this.clearSession();
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  // Get all users (admin function)
  static async getAllUsers(): Promise<User[]> {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Update user preferences
  static async updateUserPreferences(userId: string, preferences: Partial<User['preferences']>): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (user) {
        const updatedUser = {
          ...user,
          preferences: { ...user.preferences, ...preferences }
        };
        await this.saveUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  // Check if email is already registered (for future authentication)
  static async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      return users.some(user => user.email === email);
    } catch (error) {
      console.error('Error checking email registration:', error);
      return false;
    }
  }

  // Generate unique user ID
  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Migrate guest data to registered user (for future use)
  static async migrateGuestDataToUser(newUserId: string): Promise<void> {
    try {
      // Bu fonksiyon gelecekte guest kullanıcının verilerini
      // kayıtlı kullanıcıya aktarmak için kullanılacak
      console.log(`Migrating guest data to user: ${newUserId}`);
      
      // BookSlice'daki migration fonksiyonları buradan çağrılabilir
      // await migrateBooksFromGuestToUser(newUserId);
      
    } catch (error) {
      console.error('Error migrating guest data:', error);
    }
  }
}

export default UserManager; 