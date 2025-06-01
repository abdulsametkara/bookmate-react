export enum BookStatus {
  TO_READ = 'TO_READ',
  READING = 'READING',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  // DROPPED = 'DROPPED', // Retaining for now, can be removed if not used
}

export interface BookNote {
  id: string;
  content: string;
  page?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverURL?: string;
  isbn?: string;
  pageCount: number;
  currentPage: number;
  createdAt: string; // Was dateAdded
  status: BookStatus; // Was readingStatus, enum name also changed
  rating?: number; 
  genre?: string; // Was genreId
  description?: string; // Keep if useful, not in BookMateApp model
  publishYear?: number;
  publisher?: string;
  language?: string; // Keep if useful, not in BookMateApp model
  notes: BookNote[]; // Was string[], now uses BookNote interface
  isJointReading?: boolean; // Was isSharedWithPartner
  userId?: string; // Keep if useful, not in BookMateApp model. Make optional as it's not in BookMateApp model.
  updatedAt?: string; // Was lastUpdated

  // Added from BookMateApp/src/models/Book.ts
  progress?: number; 
  startDate?: string;
  finishDate?: string;
  partnerId?: string;
  partnerProgress?: number;
  isFavorite?: boolean;
  priority?: 'high' | 'medium' | 'low';
  color?: string;
}

export interface BookProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastReadingDate: string;
  readingStatus: BookStatus;
  notes?: string[];
}

export interface ReadingSession {
  id: string;
  bookId: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number; // dakika cinsinden
  pagesRead: number;
} 