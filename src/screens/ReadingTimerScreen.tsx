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
  AppState
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerSafeArea}>
        <Surface style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Okuma Zamanlayıcı</Text>
          <TouchableOpacity 
            style={styles.statsButton}
            onPress={goToStats}
          >
            <MaterialCommunityIcons name="chart-bar" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </Surface>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Selection Card */}
        <TouchableOpacity onPress={selectBook}>
          <Surface style={styles.bookSelectionCard}>
            {selectedBook ? (
              <View style={styles.selectedBookContainer}>
                <View style={styles.selectedBookCover}>
                  <Image 
                    source={{ uri: selectedBook.coverURL }}
                    style={styles.selectedBookImage}
                  />
                </View>
                <View style={styles.selectedBookInfo}>
                  <Text style={styles.selectedBookTitle} numberOfLines={2}>
                    {selectedBook.title}
                  </Text>
                  <Text style={styles.selectedBookAuthor}>
                    {selectedBook.author}
                  </Text>
                  <Text style={styles.changeBookHint}>
                    Değiştirmek için dokunun
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.bookSelectionTitle}>Bir kitap seçin</Text>
                <Text style={styles.bookSelectionSubtitle}>
                  Kütüphanenizden bir kitap seçmek için dokunun
                </Text>
              </>
            )}
          </Surface>
        </TouchableOpacity>

        {/* Timer Display Card */}
        <Surface style={styles.timerCard}>
          <View style={styles.timerDisplay}>
            <View style={styles.timeUnit}>
              <Text style={styles.timeNumber}>{currentTime.hours}</Text>
              <Text style={styles.timeLabel}>Saat</Text>
            </View>
            
            <View style={styles.timeSeparator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            <View style={styles.timeUnit}>
              <Text style={styles.timeNumber}>{currentTime.minutes}</Text>
              <Text style={styles.timeLabel}>Dakika</Text>
            </View>
            
            <View style={styles.timeSeparator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            <View style={styles.timeUnit}>
              <Text style={styles.timeNumber}>{currentTime.seconds}</Text>
              <Text style={styles.timeLabel}>Saniye</Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>
              {!isRunning ? 'Okuma başlatılmadı' : 
               isPaused ? 'Okuma duraklatıldı' : 'Okuma devam ediyor'}
            </Text>
            {isRunning && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  backgroundColor: isPaused ? '#FF9500' : '#34C759',
                  width: isPaused ? '50%' : '100%'
                }]} />
              </View>
            )}
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopTimer}
              disabled={sessionSeconds === 0}
            >
              <MaterialCommunityIcons name="stop" size={18} color="#666" />
              <Text style={styles.stopButtonText}>Kaydet & Durdur</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.mainButton, {
                backgroundColor: !isRunning ? '#007AFF' : isPaused ? '#007AFF' : '#FF9500'
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
            >
              <MaterialCommunityIcons 
                name={!isRunning ? 'play' : isPaused ? 'play' : 'pause'} 
                size={18} 
                color="white" 
              />
              <Text style={styles.mainButtonText}>
                {!isRunning ? 'Başla' : isPaused ? 'Devam Et' : 'Duraklat'}
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Statistics Card */}
        <Surface style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Okuma İstatistikleri</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Bu Oturum</Text>
              <Text style={styles.statValue}>{currentTime.formatted}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Bugün Toplam</Text>
              <Text style={styles.statValue}>{todayTime.formatted}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Genel Toplam</Text>
              <Text style={styles.statValue}>
                {readingStats ? formatTime(readingStats.totalSecondsRead).formatted : '00:00:00'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ortalama/Gün</Text>
              <Text style={styles.statValue}>
                {readingStats && readingStats.totalSessions > 0 
                  ? formatTime(readingStats.averageSessionDuration).formatted 
                  : '00:00:00'}
              </Text>
            </View>
          </View>
        </Surface>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  statsButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  bookSelectionCard: {
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
  bookSelectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  bookSelectionSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSizes.md * 1.4,
  },
  timerCard: {
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
  timerDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  timeUnit: {
    backgroundColor: Colors.backgroundGray,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeNumber: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  timeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timeSeparator: {
    width: 20,
    alignItems: 'center',
  },
  separatorText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statusSection: {
    marginBottom: Spacing.xl,
  },
  statusLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.progressBackground,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  controlButton: {
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
  stopButton: {
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stopButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#666666',
    marginLeft: Spacing.xs,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    marginLeft: Spacing.md,
    flex: 2,
  },
  mainButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
  statsCard: {
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
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    backgroundColor: Colors.backgroundGray,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    flex: 1,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
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
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  selectedBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedBookCover: {
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  selectedBookImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  selectedBookInfo: {
    flex: 1,
  },
  selectedBookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  selectedBookAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  changeBookHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
});

export default ReadingTimerScreen; 