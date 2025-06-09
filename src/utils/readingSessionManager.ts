import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds (changed from minutes)
  pagesRead: number;
  startPage: number;
  endPage: number;
  date: string; // YYYY-MM-DD format
}

export interface ReadingStats {
  totalMinutesRead: number;
  totalSecondsRead: number;
  totalPagesRead: number;
  totalSessions: number;
  averageSessionDuration: number;
  booksStarted: number;
  booksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
}

class ReadingSessionManager {
  private static STORAGE_KEY = 'bookmate_reading_sessions';

  // Start a reading session
  static async startSession(userId: string, bookId: string, startPage: number): Promise<string> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: ReadingSession = {
        id: sessionId,
        userId,
        bookId,
        startTime: new Date().toISOString(),
        duration: 0,
        pagesRead: 0,
        startPage,
        endPage: startPage,
        date: new Date().toISOString().split('T')[0],
      };

      const sessions = await this.getAllSessions();
      sessions.push(session);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      
      return sessionId;
    } catch (error) {
      console.error('Error starting reading session:', error);
      throw error;
    }
  }

  // End a reading session
  static async endSession(sessionId: string, endPage: number, durationInSeconds?: number): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        const session = sessions[sessionIndex];
        const endTime = new Date();
        const startTime = new Date(session.startTime);
        
        // Use provided duration in seconds if available, otherwise calculate from time difference
        let duration: number;
        if (durationInSeconds !== undefined) {
          duration = durationInSeconds; // Keep as seconds
          console.log('Using provided duration:', durationInSeconds, 'seconds');
        } else {
          duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000); // in seconds
          console.log('Calculated duration from time difference:', duration, 'seconds');
        }
        
        sessions[sessionIndex] = {
          ...session,
          endTime: endTime.toISOString(),
          duration,
          endPage,
          pagesRead: Math.max(0, endPage - session.startPage),
        };

        console.log('Session updated:', {
          id: sessionId,
          startTime: session.startTime,
          endTime: endTime.toISOString(),
          duration,
          startPage: session.startPage,
          endPage,
          pagesRead: Math.max(0, endPage - session.startPage)
        });

        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Error ending reading session:', error);
      throw error;
    }
  }

  // Get all sessions
  static async getAllSessions(): Promise<ReadingSession[]> {
    try {
      const sessionsData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return sessionsData ? JSON.parse(sessionsData) : [];
    } catch (error) {
      console.error('Error getting reading sessions:', error);
      return [];
    }
  }

  // Get sessions for a specific user
  static async getUserSessions(userId: string): Promise<ReadingSession[]> {
    try {
      const allSessions = await this.getAllSessions();
      return allSessions.filter(session => session.userId === userId);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Get sessions for a specific book
  static async getBookSessions(bookId: string): Promise<ReadingSession[]> {
    try {
      const allSessions = await this.getAllSessions();
      return allSessions.filter(session => session.bookId === bookId);
    } catch (error) {
      console.error('Error getting book sessions:', error);
      return [];
    }
  }

  // Calculate reading statistics for a user
  static async getUserStats(userId: string): Promise<ReadingStats> {
    try {
      const sessions = await this.getUserSessions(userId);
      const completedSessions = sessions.filter(s => s.endTime);

      if (completedSessions.length === 0) {
        return {
          totalMinutesRead: 0,
          totalSecondsRead: 0,
          totalPagesRead: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          booksStarted: 0,
          booksCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastReadDate: '',
        };
      }

      // Duration is now in seconds, convert to minutes for stats
      const totalSecondsRead = completedSessions.reduce((sum, s) => sum + s.duration, 0);
      const totalMinutesRead = Math.round(totalSecondsRead / 60);
      const totalPagesRead = completedSessions.reduce((sum, s) => sum + s.pagesRead, 0);
      const averageSessionDuration = Math.round(totalSecondsRead / completedSessions.length); // average in seconds

      // Count unique books
      const uniqueBooks = new Set(sessions.map(s => s.bookId));
      const booksStarted = uniqueBooks.size;

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(completedSessions);

      // Get last read date
      const lastSession = completedSessions
        .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime())[0];
      const lastReadDate = lastSession ? lastSession.date : '';

      console.log('getUserStats result:', {
        totalSecondsRead,
        totalMinutesRead,
        totalSessions: completedSessions.length,
        averageSessionDuration,
        sessions: completedSessions.map(s => ({ duration: s.duration, date: s.date }))
      });

      return {
        totalMinutesRead,
        totalSecondsRead,
        totalPagesRead,
        totalSessions: completedSessions.length,
        averageSessionDuration,
        booksStarted,
        booksCompleted: 0, // Will be calculated from book completion status
        currentStreak,
        longestStreak,
        lastReadDate,
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        totalMinutesRead: 0,
        totalSecondsRead: 0,
        totalPagesRead: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        booksStarted: 0,
        booksCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: '',
      };
    }
  }

  // Calculate reading streaks
  private static calculateStreaks(sessions: ReadingSession[]): { currentStreak: number; longestStreak: number } {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Group sessions by date
    const sessionsByDate = sessions.reduce((acc, session) => {
      const date = session.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    }, {} as Record<string, ReadingSession[]>);

    const uniqueDates = Object.keys(sessionsByDate).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (from today backwards)
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sessionsByDate[dateStr]) {
        currentStreak++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0 || this.isConsecutiveDay(uniqueDates[i-1], uniqueDates[i])) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }

  // Check if two dates are consecutive
  private static isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays === 1;
  }

  // Clear all sessions (for testing or reset)
  static async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing sessions:', error);
      throw error;
    }
  }

  // Delete sessions for a specific user
  static async deleteUserSessions(userId: string): Promise<void> {
    try {
      const allSessions = await this.getAllSessions();
      const filteredSessions = allSessions.filter(session => session.userId !== userId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      throw error;
    }
  }

  // Get today's reading statistics
  static async getTodayStats(userId: string): Promise<{
    today: string;
    todaySessions: ReadingSession[];
    todaySessionsCount: number;
    todayTotalSeconds: number;
    todayTotalMinutes: number;
  }> {
    try {
      const sessions = await this.getUserSessions(userId);
      const today = new Date().toISOString().split('T')[0];
      
      const todaySessions = sessions.filter(session => 
        session.date === today && session.endTime
      );
      
      const todayTotalSeconds = todaySessions.reduce((sum, session) => sum + session.duration, 0);
      const todayTotalMinutes = Math.round(todayTotalSeconds / 60);
      
      return {
        today,
        todaySessions,
        todaySessionsCount: todaySessions.length,
        todayTotalSeconds,
        todayTotalMinutes
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        today: new Date().toISOString().split('T')[0],
        todaySessions: [],
        todaySessionsCount: 0,
        todayTotalSeconds: 0,
        todayTotalMinutes: 0
      };
    }
  }
}

export default ReadingSessionManager; 