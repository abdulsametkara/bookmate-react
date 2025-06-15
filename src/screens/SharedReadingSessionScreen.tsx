import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSharedReadingSession,
  getSessionProgress,
  getSessionMessages,
  updateReadingProgress,
  sendMessage,
  deleteSharedReadingSession,
  SharedReadingSession,
  ReadingProgress,
  SharedReadingMessage,
} from '../services/sharedReadingApi';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced Toast Component
const AnimatedToast = ({ visible, message, type = 'success', onHide }: {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onHide: () => void;
}) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const getToastColor = () => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'info': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const getToastIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getToastColor(),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Ionicons name={getToastIcon()} size={20} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const SharedReadingSessionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params as { sessionId: string };

  // Redux store'dan kitapları al
  const userBooks = useSelector((state: RootState) => state.books.items);
  
  // Current user ID'yi al
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [session, setSession] = useState<SharedReadingSession | null>(null);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [messages, setMessages] = useState<SharedReadingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showUpdateProgress, setShowUpdateProgress] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const [readingNotes, setReadingNotes] = useState('');
  const [updatingProgress, setUpdatingProgress] = useState(false);
  
  // Kitap seçimi için state'ler
  const [showBookSelection, setShowBookSelection] = useState(false);
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<any>(null);

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const loadSessionData = useCallback(async () => {
    try {
      const [sessionData, progressData, messagesData] = await Promise.all([
        getSharedReadingSession(sessionId).catch(() => null),
        getSessionProgress(sessionId).catch(() => []),
        getSessionMessages(sessionId).catch(() => []),
      ]);

      setSession(sessionData);
      setProgress(progressData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading session data:', error);
      showToast('Oturum verileri yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // Get current user ID
    const getCurrentUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting current user ID:', error);
      }
    };

    getCurrentUserId();
    loadSessionData();
  }, [loadSessionData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessionData();
  }, [loadSessionData]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await sendMessage({
        sessionId,
        messageType: 'text',
        content: newMessage.trim(),
      });

      setNewMessage('');
      showToast('Mesaj gönderildi! 💬', 'success');
      
      // Reload messages
      const updatedMessages = await getSessionMessages(sessionId);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Mesaj gönderilemedi', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateProgress = async () => {
    console.log('📊 Progress update attempt:', {
      currentPageInput: currentPage,
      sessionBookId: session?.book_id,
      sessionBook: session?.book,
      readingNotes,
      selectedBookForProgress
    });

    // Enhanced validation
    if (!currentPage.trim()) {
      console.log('❌ Validation failed: Empty page input');
      showToast('Lütfen bir sayfa numarası girin', 'error');
      return;
    }

    const pageNum = parseInt(currentPage.trim());
    console.log('📄 Parsed page number:', pageNum);

    if (isNaN(pageNum)) {
      console.log('❌ Validation failed: Not a number');
      showToast('Lütfen geçerli bir sayı girin', 'error');
      return;
    }

    if (pageNum < 0) {
      console.log('❌ Validation failed: Negative number');
      showToast('Sayfa numarası 0\'dan küçük olamaz', 'error');
      return;
    }

    // "different_books" modunda kitap seçimi kontrolü
    if (session?.reading_mode === 'different_books' && !selectedBookForProgress) {
      console.log('❌ Validation failed: No book selected for different_books mode');
      showToast('Farklı kitaplar modunda kitap seçmelisiniz', 'error');
      setShowBookSelection(true);
      return;
    }

    // Get max pages from selected book or session book
    const targetBook = selectedBookForProgress || session?.book;
    const maxPages = targetBook?.totalPages || 
                    targetBook?.pageCount || 
                    (targetBook as any)?.total_pages ||
                    (session as any)?.book_total_pages ||
                    500;

    console.log('📚 Max pages determined:', maxPages, 'from book:', targetBook);

    if (pageNum > maxPages) {
      console.log('❌ Validation failed: Page exceeds max', { pageNum, maxPages });
      showToast(`Sayfa numarası ${maxPages} sayfadan fazla olamaz`, 'error');
      return;
    }

    console.log('✅ Validation passed, updating progress...');

    setUpdatingProgress(true);
    try {
      await updateReadingProgress({
        sessionId,
        bookId: selectedBookForProgress?.id || session?.book_id || null,
        currentPage: pageNum,
        totalPages: maxPages,
        readingTimeMinutes: 30, // Default reading time
        notes: readingNotes.trim() || undefined,
      });

      setShowUpdateProgress(false);
      setCurrentPage('');
      setReadingNotes('');
      setSelectedBookForProgress(null);
      
      showToast('İlerlemeniz güncellendi! 🎉', 'success');
      
      // Reload progress
      const updatedProgress = await getSessionProgress(sessionId);
      setProgress(updatedProgress);
    } catch (error) {
      console.error('❌ Progress update error:', error);
      showToast('İlerleme güncellenirken bir hata oluştu', 'error');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getReadingModeText = (mode: string) => {
    const modeMap: { [key: string]: string } = {
      'same_book': 'Aynı Kitap',
      'different_books': 'Farklı Kitaplar',
      'book_club': 'Kitap Kulübü',
    };
    return modeMap[mode] || mode;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'active': '#10B981',
      'paused': '#F59E0B',
      'completed': '#3B82F6',
    };
    return colorMap[status] || '#6B7280';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Bilinmiyor';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Şimdi';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} dk önce`;
    } else if (diffHours < 24) {
      return `${diffHours} saat önce`;
    } else if (diffDays === 1) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 50) return '#F59E0B';
    return '#3B82F6';
  };

  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}s ${remainingMinutes}dk`;
  };

  const goToTimer = () => {
    navigation.navigate('ReadingTimer' as never, { 
      sharedSessionId: sessionId 
    } as never);
  };

  const handleDeleteSession = () => {
    Alert.alert(
      'Oturumu Sil',
      'Bu oturumu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm mesajlar ile ilerleme kayıtları silinecektir.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedReadingSession(sessionId);
              showToast('Oturum başarıyla silindi', 'success');
              setTimeout(() => {
                navigation.goBack();
              }, 1500);
            } catch (error) {
              console.error('Error deleting session:', error);
              showToast('Oturum silinirken hata oluştu', 'error');
            }
          },
        },
      ]
    );
  };

  const renderBookCover = (coverUrl?: string) => {
    if (coverUrl) {
      return (
        <Image
          source={{ uri: coverUrl }}
          style={styles.bookCover}
          resizeMode="cover"
        />
      );
    }
    return (
      <View style={styles.bookCoverPlaceholder}>
        <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#6B7280" />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Oturum Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#fff" />
            <Text style={styles.errorText}>Oturum bulunamadı</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        {/* Animated Toast */}
        <AnimatedToast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />

        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{session.title}</Text>
            <Text style={styles.headerSubtitle}>
              {getReadingModeText(session.reading_mode)} • {session.participants?.length || 1} Katılımcı
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
              <Text style={styles.statusText}>{session.status.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSession}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Session Book Information */}
          {session.book && (
            <View style={styles.modernSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialCommunityIcons name="book-multiple" size={24} color="#fff" />
                  <Text style={styles.sectionTitle}>Oturum Kitabı</Text>
                </View>
                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={goToTimer}
                >
                  <MaterialCommunityIcons name="timer" size={18} color="#fff" />
                  <Text style={styles.timerButtonText}>Zamanlayıcı</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.detailedProgressCard}>
                <View style={styles.userBookSection}>
                  <View style={styles.progressBookCover}>
                    {renderBookCover(session.book.cover_url || session.book.coverImageUrl)}
                  </View>
                  <View style={styles.progressDetailsContainer}>
                    <Text style={styles.userBookTitle}>
                      📚 {session.book.title}
                    </Text>
                    <Text style={styles.userBookAuthor}>
                      👨‍💼 {session.book.author}
                    </Text>
                    <Text style={styles.progressStatText}>
                      📖 {session.book.totalPages || session.book.pageCount || 'Bilinmeyen'} sayfa
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Different Books Mode Info */}
          {session.reading_mode === 'different_books' && (
            <View style={styles.modernSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialCommunityIcons name="book-variant" size={24} color="#fff" />
                  <Text style={styles.sectionTitle}>Farklı Kitaplar Modu</Text>
                </View>
              </View>
              
              <Text style={styles.emptyStateText}>
                Bu oturumda herkes farklı kitap okuyabilir. Aşağıdaki ilerleme bölümünde herkesin seçtiği kitabı görebilirsiniz.
              </Text>
            </View>
          )}

          {/* Progress Section with Detailed Information */}
          <View style={styles.modernSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
                <Text style={styles.sectionTitle}>Okuma İlerlemesi</Text>
              </View>
              <TouchableOpacity
                style={styles.updateProgressButton}
                onPress={() => setShowUpdateProgress(true)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.updateProgressText}>Güncelle</Text>
              </TouchableOpacity>
            </View>

            {session.reading_mode === 'different_books' ? (
              // Different books mode - tüm katılımcıları göster
              <View style={styles.progressList}>
                {session.participants.map((participant) => {
                  // Bu katılımcının progress bilgisini bul
                  const participantProgress = progress.find(p => p.user_id === participant.id);
                  
                  return (
                    <View key={participant.id} style={styles.detailedProgressCard}>
                      {/* User Header */}
                      <View style={styles.progressUserHeader}>
                        <View style={[styles.userAvatar, { 
                          backgroundColor: participantProgress ? getProgressColor(participantProgress.progress_percentage) : '#6B7280' 
                        }]}>
                          <Text style={styles.userAvatarText}>
                            {participant.displayName?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.userInfoContainer}>
                          <Text style={styles.userName}>
                            {participant.displayName || 'Bilinmeyen kullanıcı'}
                          </Text>
                          <Text style={styles.lastUpdate}>
                            {participantProgress 
                              ? `Son güncelleme: ${formatDate(participantProgress.updated_at)}`
                              : 'Henüz güncelleme yok'
                            }
                          </Text>
                        </View>
                        <View style={styles.progressPercentageContainer}>
                          <Text style={[styles.progressPercentageText, { 
                            color: participantProgress ? getProgressColor(participantProgress.progress_percentage) : '#6B7280' 
                          }]}>
                            %{participantProgress ? Math.round(participantProgress.progress_percentage) : 0}
                          </Text>
                        </View>
                      </View>

                      {/* Individual User Book Information */}
                      <View style={styles.userBookSection}>
                        <View style={styles.userBookCover}>
                          {participantProgress?.book?.cover_url ? 
                            renderBookCover(participantProgress.book.cover_url) :
                            <View style={styles.noBookCover}>
                              <MaterialCommunityIcons name="book-outline" size={24} color="#6B7280" />
                            </View>
                          }
                        </View>
                        <View style={styles.userBookInfo}>
                          {participantProgress?.book?.title ? (
                            <>
                              <Text style={styles.userBookTitle}>
                                📚 {participantProgress.book.title}
                              </Text>
                              <Text style={styles.userBookAuthor}>
                                👨‍💼 {participantProgress.book.author}
                              </Text>
                            </>
                          ) : (
                            <View>
                              <Text style={styles.noBookSelectedText}>
                                📖 Henüz kitap seçmedi
                              </Text>
                              {participant.id === currentUserId && (
                                <TouchableOpacity
                                  style={styles.compactSelectBookButton}
                                  onPress={() => setShowBookSelection(true)}
                                >
                                  <MaterialCommunityIcons name="book-plus" size={14} color="#3B82F6" />
                                  <Text style={styles.compactSelectBookText}>Kitap Seç</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                          
                          {participantProgress ? (
                            <View style={styles.progressStatsGrid}>
                              <View style={styles.progressStat}>
                                <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#10B981" />
                                <Text style={styles.progressStatText}>
                                  {participantProgress.current_page} / {participantProgress.total_pages} sayfa
                                </Text>
                              </View>
                              
                              {participantProgress.reading_time_minutes > 0 && (
                                <View style={styles.progressStat}>
                                  <MaterialCommunityIcons name="clock-outline" size={16} color="#3B82F6" />
                                  <Text style={styles.progressStatText}>
                                    {formatReadingTime(participantProgress.reading_time_minutes)} okuma süresi
                                  </Text>
                                </View>
                              )}

                              {participantProgress.reading_speed_pages_per_hour > 0 && (
                                <View style={styles.progressStat}>
                                  <MaterialCommunityIcons name="speedometer" size={16} color="#F59E0B" />
                                  <Text style={styles.progressStatText}>
                                    {participantProgress.reading_speed_pages_per_hour.toFixed(1)} sayfa/saat
                                  </Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.noProgressText}>
                              Henüz okuma başlamamış
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Visual Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { 
                                width: `${participantProgress ? Math.min(participantProgress.progress_percentage, 100) : 0}%`,
                                backgroundColor: participantProgress ? getProgressColor(participantProgress.progress_percentage) : '#6B7280'
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressBarText}>
                          %{participantProgress ? Math.round(participantProgress.progress_percentage) : 0} tamamlandı
                        </Text>
                      </View>

                      {/* Notes Section */}
                      {participantProgress?.notes && (
                        <View style={styles.notesContainer}>
                          <View style={styles.notesHeader}>
                            <MaterialCommunityIcons name="note-text" size={16} color="#8B5CF6" />
                            <Text style={styles.notesHeaderText}>Notlar</Text>
                          </View>
                          <Text style={styles.notesText}>{participantProgress.notes}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : progress.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="chart-line-variant" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyStateText}>Henüz ilerleme kaydı yok</Text>
                                 <Text style={styles.emptyStateSubtext}>İlk güncellemeyi siz yapın!</Text>
              </View>
            ) : (
              <View style={styles.progressList}>
                {progress.map((item, index) => (
                  <View key={item.id || index} style={styles.detailedProgressCard}>
                    {/* User Header */}
                    <View style={styles.progressUserHeader}>
                      <View style={[styles.userAvatar, { backgroundColor: getProgressColor(item.progress_percentage) }]}>
                        <Text style={styles.userAvatarText}>
                          {item.user?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userInfoContainer}>
                        <Text style={styles.userName}>
                          {item.user?.displayName || 'Bilinmeyen kullanıcı'}
                        </Text>
                        <Text style={styles.lastUpdate}>
                          Son güncelleme: {formatDate(item.updated_at)}
                        </Text>
                      </View>
                      <View style={styles.progressPercentageContainer}>
                        <Text style={[styles.progressPercentageText, { color: getProgressColor(item.progress_percentage) }]}>
                          %{Math.round(item.progress_percentage)}
                        </Text>
                      </View>
                    </View>

                    {/* Individual User Book Information */}
                    <View style={styles.userBookSection}>
                      <View style={styles.userBookCover}>
                        {renderBookCover(item.book?.cover_url || session.book?.cover_url)}
                      </View>
                      <View style={styles.userBookInfo}>
                        {item.book?.title || session.book?.title ? (
                          <>
                            <Text style={styles.userBookTitle}>
                              📚 {item.book?.title || session.book?.title || 'Bilinmeyen Kitap'}
                            </Text>
                            <Text style={styles.userBookAuthor}>
                              👨‍💼 {item.book?.author || session.book?.author || 'Bilinmeyen Yazar'}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.noBookSelectedText}>
                            📖 Henüz kitap seçmedi
                          </Text>
                        )}
                        <View style={styles.progressStatsGrid}>
                          <View style={styles.progressStat}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#10B981" />
                            <Text style={styles.progressStatText}>
                              {item.current_page} / {item.total_pages} sayfa
                            </Text>
                          </View>
                          
                          {item.reading_time_minutes > 0 && (
                            <View style={styles.progressStat}>
                              <MaterialCommunityIcons name="clock-outline" size={16} color="#3B82F6" />
                              <Text style={styles.progressStatText}>
                                {formatReadingTime(item.reading_time_minutes)} okuma süresi
                              </Text>
                            </View>
                          )}

                          {item.reading_speed_pages_per_hour > 0 && (
                            <View style={styles.progressStat}>
                              <MaterialCommunityIcons name="speedometer" size={16} color="#F59E0B" />
                              <Text style={styles.progressStatText}>
                                {item.reading_speed_pages_per_hour.toFixed(1)} sayfa/saat
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Visual Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { 
                              width: `${Math.min(item.progress_percentage, 100)}%`,
                              backgroundColor: getProgressColor(item.progress_percentage)
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressBarText}>
                        {Math.round(item.progress_percentage)}% tamamlandı
                      </Text>
                    </View>

                    {/* Notes Section */}
                    {item.notes && (
                      <View style={styles.notesContainer}>
                        <View style={styles.notesHeader}>
                          <MaterialCommunityIcons name="note-text" size={16} color="#8B5CF6" />
                          <Text style={styles.notesHeaderText}>Notlar</Text>
                        </View>
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Messages Section */}
          <View style={styles.modernSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
                <Text style={styles.sectionTitle}>Mesajlar ({messages.length})</Text>
              </View>
            </View>
            
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="message-outline" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyStateText}>Henüz mesaj yok</Text>
                <Text style={styles.emptyStateSubtext}>İlk mesajı siz gönderin!</Text>
              </View>
            ) : (
              messages.map((message) => (
                <View key={message.id} style={[
                  styles.modernMessageCard,
                  message.message_type === 'progress' && styles.progressMessageCard
                ]}>
                  <View style={styles.messageHeader}>
                    <View style={[
                      styles.messageAvatar,
                      { backgroundColor: message.message_type === 'progress' ? '#F59E0B' : '#3B82F6' }
                    ]}>
                      <Text style={styles.messageAvatarText}>
                        {message.user?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.messageInfo}>
                      <Text style={styles.messageUserName}>
                        {message.user?.displayName || 'Bilinmeyen kullanıcı'}
                      </Text>
                      <Text style={styles.messageDate}>{formatDate(message.created_at)}</Text>
                    </View>
                    {message.message_type === 'progress' && (
                      <MaterialCommunityIcons name="trending-up" size={16} color="#F59E0B" />
                    )}
                  </View>
                  <Text style={[
                    styles.messageContent,
                    message.message_type === 'progress' && styles.progressMessageContent
                  ]}>
                    {message.content}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modern Message Input */}
        <View style={styles.modernMessageInput}>
          <TextInput
            style={styles.messageInput}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Enhanced Progress Update Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showUpdateProgress}
          onRequestClose={() => setShowUpdateProgress(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.enhancedModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>İlerleme Güncelle</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowUpdateProgress(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Kitap Bilgisi - Mode'a göre farklı */}
              {session.reading_mode === 'different_books' ? (
                <View style={styles.bookSelectionContainer}>
                  <Text style={styles.modalLabel}>Hangi kitabınızın ilerlemesini güncelleyeceksiniz?</Text>
                  {selectedBookForProgress ? (
                    <View style={styles.selectedBookInfo}>
                      <View style={styles.modalBookCover}>
                        {renderBookCover(selectedBookForProgress.coverURL)}
                      </View>
                      <View style={styles.modalBookDetails}>
                        <Text style={styles.modalBookTitle}>{selectedBookForProgress.title}</Text>
                        <Text style={styles.modalBookAuthor}>{selectedBookForProgress.author}</Text>
                        <Text style={styles.modalBookPages}>
                          Toplam: {selectedBookForProgress.pageCount || 'Bilinmeyen'} sayfa
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeBookButton}
                        onPress={() => setShowBookSelection(true)}
                      >
                        <MaterialCommunityIcons name="swap-horizontal" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.selectBookButton}
                      onPress={() => setShowBookSelection(true)}
                    >
                      <MaterialCommunityIcons name="book-plus" size={24} color="#3B82F6" />
                      <Text style={styles.selectBookText}>Kitap Seç</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.modalBookInfo}>
                  <View style={styles.modalBookCover}>
                    {renderBookCover(session.book?.cover_url || session.book?.coverImageUrl)}
                  </View>
                  <View style={styles.modalBookDetails}>
                    <Text style={styles.modalBookTitle}>{session.book?.title}</Text>
                    <Text style={styles.modalBookAuthor}>{session.book?.author}</Text>
                    <Text style={styles.modalBookPages}>
                      Toplam: {session.book?.totalPages || session.book?.pageCount || 'Bilinmeyen'} sayfa
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.modalLabel}>Şu anda hangi sayfadasınız?</Text>
              <TextInput
                style={styles.modernModalInput}
                placeholder="Sayfa numarası..."
                placeholderTextColor="#9CA3AF"
                value={currentPage}
                onChangeText={setCurrentPage}
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.modalLabel}>Notlarınız (opsiyonel)</Text>
              <TextInput
                style={[styles.modernModalInput, styles.notesInput]}
                placeholder="Bugünkü okuma deneyiminizi paylaşın..."
                placeholderTextColor="#9CA3AF"
                value={readingNotes}
                onChangeText={setReadingNotes}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.enhancedModalButton,
                  (!currentPage.trim() || updatingProgress) && styles.modalButtonDisabled,
                ]}
                onPress={handleUpdateProgress}
                disabled={!currentPage.trim() || updatingProgress}
              >
                {updatingProgress ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>İlerlemeyi Güncelle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Kitap Seçim Modalı */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showBookSelection}
          onRequestClose={() => setShowBookSelection(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.enhancedModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kitap Seç</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowBookSelection(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Kütüphanenizden bir kitap seçin:</Text>
              
              <FlatList
                data={userBooks}
                keyExtractor={(item) => item.id}
                style={styles.bookSelectionList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.bookSelectionItem,
                      selectedBookForProgress?.id === item.id && styles.bookSelectionItemSelected
                    ]}
                    onPress={() => {
                      setSelectedBookForProgress(item);
                      setShowBookSelection(false);
                    }}
                  >
                    <View style={styles.bookSelectionCover}>
                      {renderBookCover(item.coverURL)}
                    </View>
                    <View style={styles.bookSelectionInfo}>
                      <Text style={styles.bookSelectionTitle}>{item.title}</Text>
                      <Text style={styles.bookSelectionAuthor}>{item.author}</Text>
                      <Text style={styles.bookSelectionPages}>
                        {item.pageCount || 'Bilinmeyen'} sayfa
                      </Text>
                    </View>
                    {selectedBookForProgress?.id === item.id && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />

              <TouchableOpacity
                style={styles.enhancedModalButton}
                onPress={() => setShowBookSelection(false)}
              >
                <Text style={styles.modalButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  gradient: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modern Header
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Book Info Card
  bookInfoCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookCoverContainer: {
    marginRight: 16,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 12,
  },
  bookCoverPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  bookAuthor: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 6,
  },
  bookPages: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 16,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Modern Sections
  modernSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  updateProgressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  updateProgressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Detailed Progress Cards
  progressList: {
    gap: 16,
  },
  detailedProgressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  progressPercentageContainer: {
    alignItems: 'flex-end',
  },
  progressPercentageText: {
    fontSize: 20,
    fontWeight: '700',
  },

  // User Book Section
  userBookSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  progressBookCover: {
    marginRight: 12,
  },
  userBookCover: {
    marginRight: 12,
  },
  progressDetailsContainer: {
    flex: 1,
    gap: 8,
  },
  userBookInfo: {
    flex: 1,
  },
  userBookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userBookAuthor: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  noBookSelectedText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  progressStatsGrid: {
    gap: 8,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },

  // Progress Bar
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Notes Container
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesHeaderText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  notesText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Messages
  modernMessageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressMessageCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messageInfo: {
    flex: 1,
  },
  messageUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  messageContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  progressMessageContent: {
    fontWeight: '600',
    color: '#FEF3C7',
  },

  // Message Input
  modernMessageInput: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },

  // Enhanced Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  enhancedModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  modalBookCover: {
    marginRight: 12,
  },
  modalBookDetails: {
    flex: 1,
  },
  modalBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalBookAuthor: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalBookPages: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
  },
  modernModalInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  enhancedModalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Book Selection Styles
  bookSelectionContainer: {
    marginBottom: 20,
  },
  selectedBookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  changeBookButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  selectBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  selectBookText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookSelectionList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  bookSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookSelectionItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  bookSelectionCover: {
    marginRight: 12,
  },
  bookSelectionInfo: {
    flex: 1,
  },
  bookSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  bookSelectionAuthor: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bookSelectionPages: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  bottomSpacer: {
    height: 20,
  },
  noBookCover: {
    width: 60,
    height: 80,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProgressText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  compactSelectBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 8,
  },
  compactSelectBookText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default SharedReadingSessionScreen; 