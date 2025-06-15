import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

// Shared Reading Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  createdAt: string;
}

export interface SearchUser {
  id: string;
  displayName: string;
  username?: string;
  email: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  relationship_type: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface SharedReadingSession {
  id: string;
  initiator_id: string;
  partner_ids: string[];
  reading_mode: 'same_book' | 'different_books' | 'book_club';
  book_id?: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
  participants?: User[];
  book?: any;
}

export interface SharedReadingMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'text' | 'progress' | 'system';
  content: string;
  created_at: string;
  user?: User;
}

export interface ReadingProgress {
  id: string;
  session_id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  reading_time_minutes?: number;
  notes?: string;
  last_reading_date?: string;
  reading_speed_pages_per_hour?: number;
  updated_at: string;
  user?: User;
  book?: {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    totalPages: number;
  };
}

// Friend Profile & Statistics
export interface FriendProfile {
  friend: {
    id: string;
    displayName: string;
    username?: string;
    email: string;
    joinDate: string;
  };
  currentReading: {
    user_book_id: string;
    current_page: number;
    total_pages: number;
    reading_status: string;
    start_date: string;
    total_reading_time: number;
    book_id: string;
    title: string;
    author: string;
    cover_image?: string;
  }[];
  statistics: {
    total_books: number;
    completed_books: number;
    currently_reading: number;
    total_reading_time: number;
    total_pages_read: number;
  };
  recentBooks: {
    end_date: string;
    total_reading_time: number;
    total_pages: number;
    title: string;
    author: string;
    cover_image?: string;
  }[];
}

export interface SharedLibrary {
  id: string;
  name: string;
  description?: string;
  bookCount: number;
  memberCount: number;
  isOwner: boolean;
  createdAt: string;
  creatorName: string;
  members: {
    id: string;
    displayName: string;
    role: 'owner' | 'member';
  }[];
  recentBooks: {
    title: string;
    author: string;
    addedBy: string;
  }[];
}

export interface SharedLibraryDetails {
  library: {
    id: string;
    name: string;
    description?: string;
    creatorId: string;
    creator_id?: string;
    createdAt: string;
    created_at?: string;
    userRole: string;
    user_role?: string;
  };
  members: {
    id: string;
    display_name: string;
    username?: string;
    role: string;
    joined_at: string;
  }[];
  books: {
    id: string;
    title: string;
    author: string;
    isbn?: string;
    cover_image?: string;
    page_count: number;
    notes?: string;
    added_at: string;
    added_by_name: string;
    note_count: number;
  }[];
}

export interface SharedNote {
  id: string;
  content: string;
  page_number?: number;
  note_type: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_username?: string;
  is_own_note: boolean;
}

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('bookmate_auth_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function for authenticated API calls
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 API Call: ${options.method || 'GET'} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  console.log(`📡 API Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    console.log(`❌ API Error Data:`, errorData);
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Shared Reading API Functions

// Partner Search & Friend Requests
export const searchUsers = async (query: string): Promise<SearchUser[]> => {
  try {
    console.log('🔍 Searching users with query:', query);
    const response = await apiCall<SearchUser[]>(`/shared-reading/search-users?query=${encodeURIComponent(query)}`);
    console.log('✅ Search response:', response);
    
    if (!Array.isArray(response)) {
      console.warn('⚠️ Invalid search response format:', response);
      return [];
    }
    
    return response;
  } catch (error: any) {
    console.error('❌ Search users error details:', {
      message: error.message,
      status: error.status,
      response: error.response,
    });
    
    // More specific error messages
    if (error.message?.includes('Network request failed')) {
      throw new Error('İnternet bağlantınızı kontrol edin');
    } else if (error.message?.includes('timeout')) {
      throw new Error('İstek zaman aşımına uğradı');
    } else if (error.status === 500) {
      throw new Error('Sunucu hatası, lütfen daha sonra tekrar deneyin');
    } else if (error.status === 401) {
      throw new Error('Oturum süreniz dolmuş, lütfen tekrar giriş yapın');
    } else {
      throw new Error('Arama sırasında bir hata oluştu, lütfen tekrar deneyin');
    }
  }
};

export const sendFriendRequest = async (data: {
  receiverId: string;
  message?: string;
}): Promise<{ message: string; requestId: string }> => {
  return apiCall(`/shared-reading/send-friend-request`, {
    method: 'POST',
    body: JSON.stringify({
      receiverId: data.receiverId,
      message: data.message,
    }),
  });
};

export const getIncomingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    console.log('🔍 Getting incoming friend requests...');
    const response = await apiCall<FriendRequest[]>(`/shared-reading/friend-requests/incoming`);
    console.log('✅ Friend requests response:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Get friend requests error details:', {
      message: error.message,
      status: error.status,
      response: error.response,
    });
    throw new Error('Davetler listelenirken hata oluştu');
  }
};

export const getOutgoingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    return await apiCall<FriendRequest[]>(`/shared-reading/friend-requests/outgoing`);
  } catch (error: any) {
    console.error('❌ Get outgoing requests error, returning mock data:', error);
    
    // Mock data for testing - remove when API is ready
    return [];
  }
};

export const respondToFriendRequest = async (
  requestId: string,
  action: 'accept' | 'reject'
): Promise<{ success: boolean; message: string }> => {
  return apiCall(`/shared-reading/friend-requests/${requestId}/${action}`, {
    method: 'POST',
  });
};

export const getFriends = async (): Promise<User[]> => {
  try {
    console.log('🔍 Getting friends list...');
    const response = await apiCall<User[]>(`/shared-reading/friends`);
    console.log('✅ Friends response:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Get friends error details:', {
      message: error.message,
      status: error.status,
      response: error.response,
    });
    throw new Error('Arkadaş listesi getirilirken hata oluştu');
  }
};

// Shared Reading Sessions
export const startSharedReadingSession = async (data: {
  partnerIds: string[];
  readingMode: 'same_book' | 'different_books' | 'book_club';
  bookId?: string;
  title: string;
  description?: string;
  bookInfo?: {
    title: string;
    author: string;
    totalPages: number;
    coverUrl?: string;
  };
}): Promise<SharedReadingSession> => {
  return apiCall(`/shared-sessions/start-session`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getSharedReadingSessions = async (): Promise<SharedReadingSession[]> => {
  return apiCall<SharedReadingSession[]>(`/shared-sessions/sessions`);
};

export const getSharedReadingSession = async (sessionId: string): Promise<SharedReadingSession> => {
  return apiCall<SharedReadingSession>(`/shared-sessions/sessions/${sessionId}`);
};

export const deleteSharedReadingSession = async (sessionId: string): Promise<{ success: boolean; message: string }> => {
  return apiCall(`/shared-sessions/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

export const updateReadingProgress = async (data: {
  sessionId: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  readingTimeMinutes?: number;
  notes?: string;
}): Promise<{ success: boolean; message: string }> => {
  return apiCall(`/shared-sessions/update-progress`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getSessionProgress = async (sessionId: string): Promise<ReadingProgress[]> => {
  return apiCall<ReadingProgress[]>(`/shared-sessions/sessions/${sessionId}/progress`);
};

// Messages
export const sendMessage = async (data: {
  sessionId: string;
  messageType: 'text' | 'progress' | 'system';
  content: string;
}): Promise<{ success: boolean; message: string }> => {
  return apiCall(`/shared-sessions/send-message`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getSessionMessages = async (sessionId: string): Promise<SharedReadingMessage[]> => {
  return apiCall<SharedReadingMessage[]>(`/shared-sessions/sessions/${sessionId}/messages`);
};

// Challenges & Badges
export const getUserBadges = async (): Promise<any[]> => {
  return apiCall<any[]>(`/shared-reading/badges`);
};

export const getActiveChallenges = async (): Promise<any[]> => {
  return apiCall<any[]>(`/shared-reading/challenges/active`);
};

// Notifications
export const getNotifications = async (): Promise<any[]> => {
  return apiCall<any[]>(`/shared-reading/notifications`);
};

export const markNotificationAsRead = async (notificationId: string): Promise<{ success: boolean }> => {
  return apiCall(`/shared-reading/notifications/${notificationId}/read`, {
    method: 'POST',
  });
};

// Friend Profile API
export const getFriendProfile = async (friendId: string): Promise<FriendProfile> => {
  return apiCall<FriendProfile>(`/shared-reading/friends/${friendId}/profile`);
};

// Shared Libraries API
export const getSharedLibraries = async (): Promise<SharedLibrary[]> => {
  try {
    console.log('🔍 Getting shared libraries...');
    const response = await apiCall<SharedLibrary[]>(`/shared-reading/shared-libraries`);
    console.log('✅ Shared libraries response:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Get shared libraries error:', error);
    throw new Error('Özel kütüphaneler yüklenirken hata oluştu');
  }
};

export const getSharedLibraryDetails = async (libraryId: string): Promise<SharedLibraryDetails> => {
  try {
    console.log(`🔍 Getting shared library details for ID: ${libraryId}`);
    
    const response = await apiCall<SharedLibraryDetails>(`/shared-reading/shared-libraries/${libraryId}`);

    console.log('✅ Shared library details response:', response);
    return response;
  } catch (error) {
    console.error('❌ Get library details error:', error);
    throw error;
  }
};

export const addBookToSharedLibrary = async (libraryId: number, bookId: string, notes?: string) => {
  try {
    console.log(`📚 Adding book ${bookId} to shared library ${libraryId}`);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Auth token not found');
    }

    const response = await fetch(`${API_BASE_URL}/shared-reading/shared-libraries/${libraryId}/books`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookId,
        notes: notes || null,
      }),
    });

    console.log(`📡 API Response: ${response.status}`);

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ API Error Data:`, data);
      throw new Error(data.message || 'Failed to add book to library');
    }

    console.log(`✅ Book added successfully:`, data);
    return data;

  } catch (error) {
    console.error('❌ Add book to library error:', error);
    throw error;
  }
};

export const createSharedLibrary = async (data: {
  name: string;
  description?: string;
  friendIds: string[];
}): Promise<{ message: string; library: any }> => {
  return apiCall(`/shared-reading/shared-library`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 🗑️ Ortak kütüphane sil
export const deleteSharedLibrary = async (libraryId: number) => {
  try {
    console.log(`🗑️ Deleting shared library ${libraryId}`);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Auth token not found');
    }

    const response = await fetch(`${API_BASE_URL}/shared-reading/shared-libraries/${libraryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Delete Response: ${response.status}`);

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ Delete Error Data:`, data);
      throw new Error(data.message || 'Failed to delete library');
    }

    console.log(`✅ Library deleted successfully:`, data);
    return data;

  } catch (error) {
    console.error('❌ Delete library error:', error);
    throw error;
  }
};