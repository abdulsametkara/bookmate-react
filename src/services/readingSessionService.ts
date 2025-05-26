import api from './api';
import { Book } from './bookService';

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pagesRead?: number;
  createdAt: string;
  book?: Book;
}

// Yeni okuma seansı başlat
export const startSession = async (bookId: string) => {
  const response = await api.post<{ message: string; session: ReadingSession }>('/reading-sessions/start', { bookId });
  return response.data.session;
};

// Okuma seansını bitir
export const endSession = async (sessionId: string, pagesRead: number) => {
  const response = await api.post<{ message: string; session: ReadingSession; book: Book }>('/reading-sessions/end', {
    sessionId,
    pagesRead
  });
  return response.data;
};

// Kullanıcının okuma seanslarını getir
export const getSessions = async (bookId?: string) => {
  const params = bookId ? { bookId } : {};
  const response = await api.get<{ message: string; sessions: ReadingSession[] }>('/reading-sessions', { params });
  return response.data.sessions;
};

// Belirli bir kitabın okuma seanslarını getir
export const getSessionsByBook = async (bookId: string) => {
  const response = await api.get<{ message: string; sessions: ReadingSession[] }>('/reading-sessions', {
    params: { bookId }
  });
  return response.data.sessions;
};

// Okuma istatistiklerini hesapla
export const calculateReadingStats = (sessions: ReadingSession[]) => {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.endTime).length;
  
  // Toplam okuma süresi (dakika)
  const totalReadingTime = sessions.reduce((total, session) => total + (session.duration || 0), 0) / 60;
  
  // Toplam okunan sayfa sayısı
  const totalPagesRead = sessions.reduce((total, session) => total + (session.pagesRead || 0), 0);
  
  // Dakika başına sayfa
  const pagesPerMinute = totalReadingTime > 0 ? totalPagesRead / totalReadingTime : 0;
  
  return {
    totalSessions,
    completedSessions,
    totalReadingTime,
    totalPagesRead,
    pagesPerMinute
  };
}; 