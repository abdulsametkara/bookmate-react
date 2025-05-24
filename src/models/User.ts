export enum PartnershipStatus {
  NONE = 'NONE',
  PENDING_SENT = 'PENDING_SENT',
  PENDING_RECEIVED = 'PENDING_RECEIVED',
  CONNECTED = 'CONNECTED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  profileImageURL?: string;
  partnerId?: string;
  partnershipStatus: PartnershipStatus;
  readingGoals?: ReadingGoal[];
  createdAt: Date;
  lastActive: Date;
  deviceToken?: string;
  notificationSettings: NotificationSettings;
  preferences: UserPreferences;
}

export interface ReadingGoal {
  id: string;
  userId: string;
  type: 'BOOKS' | 'PAGES' | 'TIME';
  target: number;
  progress: number;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
}

export interface NotificationSettings {
  partnerActivity: boolean;
  readingReminders: boolean;
  goalUpdates: boolean;
  appUpdates: boolean;
  dailyTime?: string; // "HH:MM" format
}

export interface UserPreferences {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  language: string;
  defaultReadingSessionDuration: number; // minutes
  shareReadingProgress: boolean;
  shareBookRatings: boolean;
  shareBookNotes: boolean;
  libraryView: 'LIST' | 'GRID' | '3D';
} 