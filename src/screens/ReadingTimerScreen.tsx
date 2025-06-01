import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  Text,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Image,
  AppState,
  StatusBar
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../store';
import { updateBookStatus } from '../store/bookSlice';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomToast from '../components/CustomToast';
import { useToast } from '../hooks/useToast';

// Timer durumu için interface
interface TimerState {
  sessionSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  currentSessionId: string | null;
  startPage: number;
  selectedBookId: string | null;
  lastUpdateTime: string;
}

const ReadingTimerScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  // Redux'tan current user ve kitapları al
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const reduxBooks = useSelector((state: RootState) => state.books.items);
  
  // Timer state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Reading session tracking
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [startPage, setStartPage] = useState(0);
  
  // Real reading stats from ReadingSessionManager
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  
  // Book selection state
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookSelectionModal, setShowBookSelectionModal] = useState(false);

  // AsyncStorage keys
  const TIMER_STATE_KEY = `timer_state_${currentUserId}`;

  // Load timer state from AsyncStorage
  const loadTimerState = async () => {
    if (!currentUserId) return;
    
    try {
      const savedState = await AsyncStorage.getItem(TIMER_STATE_KEY);
      if (savedState) {
        const timerState: TimerState = JSON.parse(savedState);
        console.log('Loading timer state:', timerState);
        
        // Calculate elapsed time since last update
        const lastUpdateTime = new Date(timerState.lastUpdateTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);
        
        // Find selected book
        let book = null;
        if (timerState.selectedBookId) {
          book = reduxBooks.find(b => b.id === timerState.selectedBookId);
        }
        
        // Restore timer state
        setSelectedBook(book);
        setCurrentSessionId(timerState.currentSessionId);
        setStartPage(timerState.startPage);
        setIsRunning(timerState.isRunning);
        setIsPaused(timerState.isPaused);
        
        // Update session seconds with elapsed time if timer was running
        if (timerState.isRunning && !timerState.isPaused) {
          setSessionSeconds(timerState.sessionSeconds + elapsedSeconds);
          console.log('Timer was running, adding elapsed time:', elapsedSeconds, 'seconds');
        } else {
          setSessionSeconds(timerState.sessionSeconds);
        }
      }
      
      // Eğer kaydedilmiş state yoksa veya seçili kitap yoksa, "READING" durumundaki kitabı otomatik seç
      if (!savedState || !JSON.parse(savedState).selectedBookId) {
        const readingBook = reduxBooks.find(book => book.status === 'READING');
        if (readingBook) {
          setSelectedBook(readingBook);
          console.log('Otomatik olarak "READING" durumundaki kitap seçildi:', readingBook.title);
        } else if (reduxBooks.length > 0) {
          // Eğer READING durumunda kitap yoksa, ilk kitabı seç
          const firstBook = reduxBooks[0];
          setSelectedBook(firstBook);
          console.log('READING durumunda kitap bulunamadı, ilk kitap seçildi:', firstBook.title);
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  // Save timer state to AsyncStorage
  const saveTimerState = async () => {
    if (!currentUserId) return;
    
    try {
      const timerState: TimerState = {
        sessionSeconds,
        isRunning,
        isPaused,
        currentSessionId,
        startPage,
        selectedBookId: selectedBook?.id || null,
        lastUpdateTime: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState));
      console.log('Timer state saved:', timerState);
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  // Clear timer state from AsyncStorage
  const clearTimerState = async () => {
    if (!currentUserId) return;
    
    try {
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
      console.log('Timer state cleared');
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  // Load reading stats on mount
  useEffect(() => {
    loadReadingStats();
    if (reduxBooks.length > 0) {
      loadTimerState();
    }
  }, [currentUserId, reduxBooks]);

  // Otomatik kitap seçimi - reduxBooks değiştiğinde "READING" durumundaki kitabı seç
  useEffect(() => {
    // Sadece selectedBook yoksa ve reduxBooks yüklenmişse otomatik seçim yap
    if (!selectedBook && reduxBooks.length > 0) {
      const readingBook = reduxBooks.find(book => book.status === 'READING');
      if (readingBook) {
        setSelectedBook(readingBook);
        console.log('Otomatik olarak "READING" durumundaki kitap seçildi:', readingBook.title);
      } else {
        // Eğer READING durumunda kitap yoksa, ilk kitabı seç
        const firstBook = reduxBooks[0];
        if (firstBook) {
          setSelectedBook(firstBook);
          console.log('READING durumunda kitap bulunamadı, ilk kitap seçildi:', firstBook.title);
        }
      }
    }
  }, [reduxBooks, selectedBook]);

  // Save timer state whenever it changes (but not during app state transitions)
  const [isAppStateChanging, setIsAppStateChanging] = useState(false);
  
  useEffect(() => {
    if (currentUserId && !isAppStateChanging) {
      saveTimerState();
    }
  }, [sessionSeconds, isRunning, isPaused, currentSessionId, selectedBook, isAppStateChanging]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changing from', appState.current, 'to', nextAppState);
      setIsAppStateChanging(true);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('App came to foreground, reloading timer state');
        setTimeout(() => {
          loadTimerState().then(() => {
            setIsAppStateChanging(false);
          });
        }, 100);
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background - save current state immediately
        console.log('App going to background, saving current timer state');
        const currentTimerState: TimerState = {
          sessionSeconds,
          isRunning,
          isPaused,
          currentSessionId,
          startPage,
          selectedBookId: selectedBook?.id || null,
          lastUpdateTime: new Date().toISOString(),
        };
        
        AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(currentTimerState))
          .then(() => {
            console.log('Background save successful:', currentTimerState);
            setIsAppStateChanging(false);
          })
          .catch(error => {
            console.error('Background save failed:', error);
            setIsAppStateChanging(false);
          });
      } else {
        setIsAppStateChanging(false);
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [sessionSeconds, isRunning, isPaused, currentSessionId, selectedBook, startPage]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && !isAppStateChanging) {
      intervalRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, isAppStateChanging]);

  const loadReadingStats = async () => {
    if (!currentUserId) return;
    
    try {
      const stats = await ReadingSessionManager.getUserStats(currentUserId);
      setReadingStats(stats);

      // Calculate today's reading time (completed sessions only) - duration is now in seconds
      const allSessions = await ReadingSessionManager.getUserSessions(currentUserId);
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = allSessions.filter(session => session.date === today && session.endTime);
      const todayTotalSeconds = todaySessions.reduce((sum, session) => sum + session.duration, 0);
      
      console.log('Today\'s reading stats:', {
        today,
        todaySessionsCount: todaySessions.length,
        todayTotalSeconds,
        todayTotalMinutes: Math.round(todayTotalSeconds / 60),
        todaySessions: todaySessions.map(s => ({ duration: s.duration, startTime: s.startTime, endTime: s.endTime }))
      });
      
      // setTodayMinutes expects seconds now, so we can use todayTotalSeconds directly
      setTodayMinutes(todayTotalSeconds);
    } catch (error) {
      console.error('Error loading reading stats:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    };
  };

  const startTimer = async () => {
    if (!selectedBook) {
      showError('Lütfen önce okuyacağınız kitabı seçin.');
      return;
    }

    if (!currentUserId) {
      showError('Kullanıcı bilgisi bulunamadı.');
      return;
    }

    try {
      // Start a new reading session
      const sessionId = await ReadingSessionManager.startSession(
        currentUserId, 
        selectedBook.id, 
        selectedBook.currentPage || 0
      );
      
      // Kitabı otomatik olarak "READING" durumuna geçir
      if (selectedBook.status !== 'READING') {
        dispatch(updateBookStatus({ 
          id: selectedBook.id, 
          status: 'READING' 
        }));
        
        // Local selectedBook state'ini de güncelle
        setSelectedBook({
          ...selectedBook,
          status: 'READING'
        });
        
        showSuccess(`"${selectedBook.title}" okuma listesine eklendi ve zamanlayıcı başlatıldı!`);
        console.log('Kitap otomatik olarak "READING" durumuna geçirildi:', selectedBook.title);
      } else {
        showInfo('Zamanlayıcı başlatıldı. İyi okumalar!');
      }
      
      setCurrentSessionId(sessionId);
      setStartPage(selectedBook.currentPage || 0);
      setIsRunning(true);
      setIsPaused(false);
      
      console.log('Timer started, session ID:', sessionId);
    } catch (error) {
      console.error('Error starting reading session:', error);
      showError('Okuma seansı başlatılamadı.');
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
    console.log('Timer paused');
  };

  const resumeTimer = () => {
    setIsPaused(false);
    console.log('Timer resumed');
  };

  const stopTimer = async () => {
    if (sessionSeconds > 0 && currentSessionId && selectedBook) {
      // Timer durduğunda direkt olarak mevcut kitap sayfası ile session'ı kaydet
      try {
        console.log('Stopping timer and saving session');
        
        // Session'ı mevcut kitap sayfası ile bitir
        await ReadingSessionManager.endSession(currentSessionId, selectedBook.currentPage || startPage, sessionSeconds);
        
        // Timer state'ini sıfırla
      setIsRunning(false);
      setIsPaused(false);
      setSessionSeconds(0);
      setCurrentSessionId(null);
        
        // AsyncStorage'dan timer state'ini temizle
        await clearTimerState();
        
        // İstatistikleri yeniden yükle
        await loadReadingStats();
        
        const readingMinutes = Math.round(sessionSeconds / 60);
        const readingSeconds = sessionSeconds % 60;
        console.log('Session finished successfully, reading time:', sessionSeconds, 'seconds (', readingMinutes, 'minutes', readingSeconds, 'seconds)');
        
        showSuccess(
          `${formatTime(sessionSeconds).formatted} okuma süresi bugünün toplamına eklendi.`,
          4000
        );
      } catch (error) {
        console.error('Error ending reading session:', error);
        showError('Okuma seansı kaydedilemedi.');
      }
    } else {
      // Session yoksa veya süre 0 ise sadece timer'ı sıfırla
      console.log('Stopping timer and resetting state (no session to save)');
      setIsRunning(false);
      setIsPaused(false);
      setSessionSeconds(0);
      setCurrentSessionId(null);
      
      // Clear timer state from AsyncStorage
      await clearTimerState();
      console.log('Timer stopped and reset');
    }
  };

  const goToStats = () => {
    navigation.navigate('Stats');
  };

  const selectBook = () => {
    setShowBookSelectionModal(true);
  };

  const handleBookSelection = (book) => {
    setSelectedBook(book);
    setShowBookSelectionModal(false);
    showSuccess(`"${book.title}" zamanlayıcı için seçildi.`);
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.bookSelectionItem}
      onPress={() => handleBookSelection(item)}
    >
      <View style={styles.bookItemCover}>
        <Image 
          source={{ uri: item.coverURL }}
          style={styles.bookItemImage}
        />
      </View>
      <View style={styles.bookItemInfo}>
        <Text style={styles.bookItemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookItemAuthor}>{item.author}</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { 
            color: item.status === 'READING' ? Colors.primary : 
                   item.status === 'COMPLETED' ? '#34C759' : '#FF9500'
          }]}>
            {item.status === 'READING' ? 'Okuyorum' : 
             item.status === 'COMPLETED' ? 'Tamamlandı' : 'Okuma Listem'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const currentTime = formatTime(sessionSeconds);
  // Bugünkü toplam süre: daha önce kaydedilen session'lar (saniye) + mevcut session (saniye)
  const todayTime = formatTime(todayMinutes + sessionSeconds);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
      
      {/* Modern Gradient Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.modernHeader}>
          <TouchableOpacity 
            style={styles.modernBackButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modernHeaderTitle}>Okuma Zamanlayıcı</Text>
          <TouchableOpacity 
            style={styles.modernStatsButton}
            onPress={goToStats}
          >
            <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Selection Card - Modern */}
        <TouchableOpacity onPress={selectBook} style={styles.modernBookCard}>
          <View style={styles.modernBookCardContent}>
            {selectedBook ? (
              <>
                <View style={styles.modernBookInfo}>
                  <View style={styles.modernBookCoverContainer}>
                    <Image 
                      source={{ uri: selectedBook.coverURL || 'https://via.placeholder.com/80x120?text=Kapak+Yok' }}
                      style={styles.modernBookCoverImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.modernBookDetails}>
                    <Text style={styles.modernBookTitle} numberOfLines={2}>
                      {selectedBook.title}
                    </Text>
                    <Text style={styles.modernBookAuthor}>
                      {selectedBook.author}
                    </Text>
                    <View style={styles.modernBookProgress}>
                      <MaterialCommunityIcons name="bookmark" size={16} color="#FF6B6B" />
                      <Text style={styles.modernBookProgressText}>
                        Sayfa {selectedBook.currentPage} / {selectedBook.pageCount}
                      </Text>
                    </View>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </>
            ) : (
              <View style={styles.modernBookEmptyState}>
                <View style={styles.modernBookEmptyIcon}>
                  <MaterialCommunityIcons name="book-plus" size={48} color="#007AFF" />
                </View>
                <Text style={styles.modernBookEmptyTitle}>Kitap Seçin</Text>
                <Text style={styles.modernBookEmptySubtitle}>
                  Okuma seansını başlatmak için bir kitap seçin
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Modern Timer Display */}
        <View style={styles.modernTimerCard}>
          <View style={styles.modernTimerHeader}>
            <Text style={styles.modernTimerTitle}>Okuma Süresi</Text>
            <View style={[styles.modernStatusBadge, {
              backgroundColor: !isRunning ? '#F3F4F6' : isPaused ? '#FFF3CD' : '#D1F7C4'
            }]}>
              <View style={[styles.modernStatusDot, {
                backgroundColor: !isRunning ? '#9CA3AF' : isPaused ? '#FFB800' : '#4CAF50'
              }]} />
              <Text style={[styles.modernStatusText, {
                color: !isRunning ? '#6B7280' : isPaused ? '#D97706' : '#16A34A'
              }]}>
                {!isRunning ? 'Beklemede' : isPaused ? 'Duraklatıldı' : 'Okuma devam ediyor'}
              </Text>
            </View>
          </View>

          {/* Main Timer Display */}
          <View style={styles.mainTimerDisplay}>
            <Text style={styles.mainTimerTime}>{currentTime.formatted}</Text>
            <Text style={styles.mainTimerLabel}>Bu Oturum</Text>
          </View>

          {/* Modern Control Buttons */}
          <View style={styles.modernControlsContainer}>
            {sessionSeconds > 0 && (
              <TouchableOpacity 
                style={styles.modernSecondaryButton}
                onPress={stopTimer}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#FF6B6B" />
                <Text style={styles.modernSecondaryButtonText}>Durdur & Kaydet</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.modernPrimaryButton, {
                backgroundColor: !isRunning ? '#007AFF' : isPaused ? '#4CAF50' : '#FF9500',
                flex: sessionSeconds > 0 ? 1 : 1
              }]}
              onPress={() => {
                if (!isRunning) {
                  startTimer();
                } else if (isPaused) {
                  resumeTimer();
                } else {
                  pauseTimer();
                }
              }}
              disabled={!selectedBook}
            >
              <MaterialCommunityIcons 
                name={!isRunning ? 'play' : isPaused ? 'play' : 'pause'} 
                size={24} 
                color="white" 
              />
              <Text style={styles.modernPrimaryButtonText}>
                {!isRunning ? 'Başla' : isPaused ? 'Devam Et' : 'Duraklat'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Statistics Cards */}
        <View style={styles.modernStatsContainer}>
          <Text style={styles.modernSectionTitle}>📊 Okuma İstatistikleri</Text>
          
          <View style={styles.modernStatsGrid}>
            <View style={[styles.modernStatCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <View style={styles.modernStatIcon}>
                <MaterialCommunityIcons name="calendar-today" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.modernStatValue}>{todayTime.formatted}</Text>
              <Text style={styles.modernStatLabel}>Bugün Toplam</Text>
            </View>

            <View style={[styles.modernStatCard, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <View style={styles.modernStatIcon}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.modernStatValue}>
                {readingStats ? formatTime(readingStats.totalSecondsRead).formatted : '00:00:00'}
              </Text>
              <Text style={styles.modernStatLabel}>Genel Toplam</Text>
            </View>
          </View>

          <View style={styles.modernStatsGrid}>
            <View style={[styles.modernStatCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <View style={styles.modernStatIcon}>
                <MaterialCommunityIcons name="trending-up" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.modernStatValue}>
                {readingStats && readingStats.totalSessions > 0 
                  ? formatTime(readingStats.averageSessionDuration).formatted 
                  : '00:00:00'}
              </Text>
              <Text style={styles.modernStatLabel}>Ortalama/Gün</Text>
            </View>

            <View style={[styles.modernStatCard, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
              <View style={styles.modernStatIcon}>
                <MaterialCommunityIcons name="fire" size={24} color="#FFB800" />
              </View>
              <Text style={styles.modernStatValue}>
                {readingStats?.currentStreak || 0}
              </Text>
              <Text style={styles.modernStatLabel}>Gün Streak</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Selection Modal */}
      <Modal
        visible={showBookSelectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kitap Seçin</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowBookSelectionModal(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={reduxBooks}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.booksList}
          />
        </SafeAreaView>
      </Modal>
      
      {/* Custom Toast */}
      <CustomToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        action={toast.action}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modernBackButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modernHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  modernStatsButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modernScrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modernBookCard: {
    backgroundColor: Colors.primaryLight,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernBookCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernBookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernBookCoverContainer: {
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBookCoverImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  modernBookDetails: {
    flex: 1,
  },
  modernBookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modernBookAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modernBookProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernBookProgressText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modernBookEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBookEmptyIcon: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBookEmptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  modernBookEmptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSizes.md * 1.4,
  },
  modernTimerCard: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernTimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modernTimerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  modernStatusBadge: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundGray,
  },
  modernStatusDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  modernStatusText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  mainTimerDisplay: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainTimerTime: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  mainTimerLabel: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  modernControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  modernSecondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  modernSecondaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#666666',
    marginLeft: Spacing.xs,
  },
  modernPrimaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    flex: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  modernPrimaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
  modernStatsContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  modernStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modernStatCard: {
    backgroundColor: Colors.backgroundGray,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    flex: 1,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernStatIcon: {
    width: 24,
    height: 24,
    marginBottom: Spacing.sm,
  },
  modernStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modernStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  booksList: {
    padding: Spacing.md,
  },
  bookSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bookItemCover: {
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  bookItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  bookItemInfo: {
    flex: 1,
  },
  bookItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  bookItemAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  headerSafeArea: {
    backgroundColor: '#007AFF',
  },
});

export default ReadingTimerScreen; 