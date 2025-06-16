import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../store';
import { updateBookStatus, updateBook, saveBooks } from '../store/bookSlice';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomToast from '../components/CustomToast';
import { useToast } from '../hooks/useToast';
import { LinearGradient } from 'expo-linear-gradient';
import { updateReadingProgress } from '../services/sharedReadingApi';

const { width, height } = Dimensions.get('window');

// Timer durumu için interface
interface TimerState {
  sessionSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  currentSessionId: string | null;
  startPage: number;
  selectedBookId: string | null;
  lastUpdateTime: string;
  sharedSessionId?: string | null; // Shared session tracking
}

const ReadingTimerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { showToast, success: showSuccess, error: showError, info: showInfo } = useToast();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  // Route params'dan shared session ID'sini al
  const routeSharedSessionId = (route.params as any)?.sharedSessionId;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotPulseAnim = useRef(new Animated.Value(1)).current;
  const subtitleFadeAnim = useRef(new Animated.Value(1)).current;
  
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
  const [sharedSessionId, setSharedSessionId] = useState<string | null>(null);
  
  // Real reading stats from ReadingSessionManager
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  

  
  // Book selection state
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookSelectionModal, setShowBookSelectionModal] = useState(false);

  // AsyncStorage keys
  const TIMER_STATE_KEY = `timer_state_${currentUserId}`;

  // Update selected book when Redux store changes
  useEffect(() => {
    if (selectedBook && reduxBooks.length > 0) {
      const updatedBook = reduxBooks.find(b => b.id === selectedBook.id);
      if (updatedBook && (
        updatedBook.currentPage !== selectedBook.currentPage ||
        updatedBook.progress !== selectedBook.progress ||
        updatedBook.status !== selectedBook.status
      )) {
        setSelectedBook(updatedBook);
        console.log('Selected book updated from Redux store:', {
          id: updatedBook.id,
          title: updatedBook.title,
          currentPage: updatedBook.currentPage,
          progress: updatedBook.progress
        });
      }
    }
  }, [reduxBooks, selectedBook]);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation for running timer
  useEffect(() => {
    let animationRef = null;
    
    if (isRunning && !isPaused) {
      const startPulse = () => {
        animationRef = Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]);
        
        animationRef.start(({ finished }) => {
          if (finished && isRunning && !isPaused) {
            startPulse();
          }
        });
      };
      
      startPulse();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      if (animationRef) {
        animationRef.stop();
      }
    };
  }, [isRunning, isPaused, pulseAnim]);

  // Dot pulse animation
  useEffect(() => {
    let dotAnimationRef = null;
    
    if (isRunning && !isPaused) {
      const startDotPulse = () => {
        dotAnimationRef = Animated.sequence([
          Animated.timing(dotPulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dotPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]);
        
        dotAnimationRef.start(({ finished }) => {
          if (finished && isRunning && !isPaused) {
            startDotPulse();
          }
        });
      };
      
      startDotPulse();
    } else {
      Animated.timing(dotPulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      if (dotAnimationRef) {
        dotAnimationRef.stop();
      }
    };
  }, [isRunning, isPaused, dotPulseAnim]);

  // Subtitle fade animation
  useEffect(() => {
    let subtitleAnimationRef = null;
    
    const startSubtitleFade = () => {
      subtitleAnimationRef = Animated.sequence([
        Animated.timing(subtitleFadeAnim, {
          toValue: 0.7,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleFadeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]);
      
      subtitleAnimationRef.start(({ finished }) => {
        if (finished) {
          startSubtitleFade();
        }
      });
    };
    
    startSubtitleFade();
    
    return () => {
      if (subtitleAnimationRef) {
        subtitleAnimationRef.stop();
      }
    };
  }, [subtitleFadeAnim]);

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
    
    // Set shared session ID if provided
    if (routeSharedSessionId) {
      setSharedSessionId(routeSharedSessionId);
      console.log('📱 Timer opened from shared session:', routeSharedSessionId);
    }
  }, [currentUserId, reduxBooks, routeSharedSessionId]);

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
      // Use timeout to prevent rapid state updates
      const timeoutId = setTimeout(() => {
        saveTimerState();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionSeconds, isRunning, isPaused, currentSessionId, selectedBook?.id, isAppStateChanging]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changing from', appState.current, 'to', nextAppState);
      setIsAppStateChanging(true);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground');
        // Reload timer state when coming back to foreground
        loadTimerState();
      }
      
      setTimeout(() => {
        setIsAppStateChanging(false);
      }, 1000); // Reset after 1 second
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Timer effect - update every second when running
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const loadReadingStats = async () => {
    if (!currentUserId) return;
    
    try {
      console.log('Loading reading stats for user:', currentUserId);
      const stats = await ReadingSessionManager.getUserStats(currentUserId);
      console.log('getUserStats result:', stats);
      setReadingStats(stats);
      
      const todayStats = await ReadingSessionManager.getTodayStats(currentUserId);
      console.log("Today's reading stats:", todayStats);
      setTodayMinutes(todayStats.todayTotalSeconds || 0);
    } catch (error) {
      console.error('Error loading reading stats:', error);
    }
  };

  // Format time helper
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
      showError('Lütfen önce bir kitap seçin');
      return;
    }

    try {
      // Create new reading session
      const sessionId = await ReadingSessionManager.startSession(
        currentUserId,
        selectedBook.id,
        selectedBook.currentPage || 0
      );
      
      setCurrentSessionId(sessionId);
      setStartPage(selectedBook.currentPage || 0);
      setIsRunning(true);
      setIsPaused(false);
      
      showSuccess('Okuma oturumu başlatıldı! 📚');
      console.log('Timer started with session ID:', sessionId);
    } catch (error) {
      console.error('Error starting timer:', error);
      showError('Hata', 'Okuma oturumu başlatılamadı');
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
    showInfo('Duraklatıldı', 'Okuma oturumu duraklatıldı ⏸️');
  };

  const resumeTimer = () => {
    setIsPaused(false);
    showSuccess('Devam', 'Okuma oturumu devam ediyor! ▶️');
  };

  const stopTimer = async () => {
    if (sessionSeconds === 0) {
      showError('Hata', 'Henüz okuma yapmadınız');
      return;
    }

    try {
      if (currentSessionId) {
        // End the reading session
        await ReadingSessionManager.endSession(
          currentSessionId,
          selectedBook?.currentPage || startPage
        );
        
        console.log('Reading session ended:', {
          sessionId: currentSessionId,
          duration: sessionSeconds,
          startPage,
          endPage: selectedBook?.currentPage || startPage
        });
      }

      // Update book progress in Redux store if there's a selected book
      if (selectedBook && selectedBook.currentPage !== undefined) {
        const updatedBook = {
          ...selectedBook,
          currentPage: selectedBook.currentPage,
          progress: selectedBook.pageCount > 0 ? (selectedBook.currentPage / selectedBook.pageCount) * 100 : 0,
          updatedAt: new Date().toISOString(),
          lastReadAt: new Date().toISOString()
        };
        
        // Update Redux store
        dispatch(updateBook(updatedBook));
        
        // Save to AsyncStorage
        const allBooks = reduxBooks.map(b => b.id === selectedBook.id ? updatedBook : b);
        if (currentUserId) {
          await saveBooks(allBooks, currentUserId);
        }
        
        console.log('Book progress updated:', {
          bookId: selectedBook.id,
          title: selectedBook.title,
          currentPage: selectedBook.currentPage,
          progress: updatedBook.progress
        });
        
        // Update shared session progress if in shared session
        if (sharedSessionId && selectedBook) {
          try {
            await updateReadingProgress({
              sessionId: sharedSessionId,
              bookId: selectedBook.id,
              currentPage: selectedBook.currentPage || 0,
              totalPages: selectedBook.pageCount || 300
            });
            console.log('📊 Shared session progress updated:', {
              sessionId: sharedSessionId,
              bookId: selectedBook.id,
              currentPage: selectedBook.currentPage,
              totalPages: selectedBook.pageCount
            });
          } catch (progressError) {
            console.warn('⚠️ Failed to update shared session progress:', progressError);
          }
        }
      }

      // Reset timer state
      setIsRunning(false);
      setIsPaused(false);
      setSessionSeconds(0);
      setCurrentSessionId(null);
      setStartPage(0);
      
      // Clear saved state
      await clearTimerState();
      
      // Reload stats
      await loadReadingStats();
      
      const timeFormatted = formatTime(sessionSeconds);
      showSuccess('Kaydedildi', `Okuma oturumu kaydedildi! 🎉\nSüre: ${timeFormatted.formatted}`);
      
    } catch (error) {
      console.error('Error stopping timer:', error);
      showError('Hata', 'Okuma oturumu kaydedilemedi');
    }
  };

  const goToStats = () => {
    navigation.navigate('ReadingStatsScreen');
  };

  const selectBook = () => {
    setShowBookSelectionModal(true);
  };

  const handleBookSelection = (book) => {
    // Get the latest version of the book from Redux store
    const latestBook = reduxBooks.find(b => b.id === book.id) || book;
    setSelectedBook(latestBook);
    setStartPage(latestBook.currentPage || 0);
    setShowBookSelectionModal(false);
    console.log('Book selected for reading:', {
      id: latestBook.id,
      title: latestBook.title,
      currentPage: latestBook.currentPage,
      progress: latestBook.progress
    });
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
        <Text style={styles.bookItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookItemAuthor}>
          {item.author}
        </Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.modernStatusText, { 
            color: item.status === 'READING' ? '#007AFF' : '#666' 
          }]}>
            {item.status === 'READING' ? 'Okunuyor' : 
             item.status === 'COMPLETED' ? 'Tamamlandı' : 'Okunacak'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Format current time for display
  const currentTime = formatTime(sessionSeconds);
  
  // Bugünkü toplam süre: daha önce kaydedilen session'lar (saniye) + mevcut session (saniye)
  const todayTime = formatTime(todayMinutes + sessionSeconds);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#007AFF" />
      
      {/* Background Gradient - Light theme like library screen */}
      <LinearGradient
        colors={['#007AFF', '#4A90E2', '#64B5F6', '#90CAF9', '#BBDEFB']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <LinearGradient
          colors={['rgba(0, 122, 255, 0.95)', 'rgba(74, 144, 226, 0.9)', 'rgba(100, 181, 246, 0.85)']}
          style={styles.headerGradient}
        >
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
          <TouchableOpacity 
            style={styles.modernBackButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.modernHeaderTitle}>Okuma Zamanlayıcısı</Text>
            <Text style={styles.modernHeaderSubtitle}>
              Odaklanın ve keyfini çıkarın
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.modernStatsButton}
            onPress={goToStats}
          >
            <MaterialCommunityIcons name="chart-line" size={24} color="#007AFF" />
          </TouchableOpacity>
        </Animated.View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Selection Card */}
        <Animated.View 
          style={[
            styles.modernBookCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) }]
            }
          ]}
        >
          <TouchableOpacity onPress={selectBook} style={styles.bookCardContent}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.8)']}
              style={styles.bookCardGradient}
            >
              {selectedBook ? (
                <View style={styles.selectedBookContainer}>
                  <View style={styles.modernBookCover}>
                    <Image 
                      source={{ uri: selectedBook.coverURL }}
                      style={styles.modernBookImage}
                    />
                    <View style={styles.bookCoverOverlay}>
                      <MaterialCommunityIcons name="book-open" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.selectedBookInfo}>
                    <Text style={styles.modernBookTitle} numberOfLines={2}>
                      {selectedBook.title}
                    </Text>
                    <Text style={styles.modernBookAuthor}>
                      {selectedBook.author}
                    </Text>
                    <View style={styles.changeBookContainer}>
                      <MaterialCommunityIcons name="swap-horizontal" size={16} color="#007AFF" />
                      <Text style={styles.changeBookText}>Kitap Değiştir</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noBookContainer}>
                  <View style={styles.noBookIcon}>
                    <MaterialCommunityIcons name="book-plus" size={48} color="#007AFF" />
                  </View>
                  <Text style={styles.noBookTitle}>Kitap Seçin</Text>
                  <Text style={styles.noBookSubtitle}>
                    Okumaya başlamak için bir kitap seçin
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Modern Circular Timer Display */}
        <Animated.View style={[styles.circularTimerContainer, {
          opacity: fadeAnim,
          transform: [
            { scale: pulseAnim },
            { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }]}>
          
          {/* Outer Progress Circle */}
          <Animated.View style={[styles.outerProgressRing, {
            borderColor: isRunning && !isPaused ? '#007AFF' : 
                       isPaused ? '#FF9800' : '#9CA3AF',
            shadowColor: isRunning && !isPaused ? '#007AFF' : 
                       isPaused ? '#FF9800' : '#9CA3AF',
            transform: [{ rotate: `${(sessionSeconds % 60) * 6}deg` }]
          }]} />
          
          {/* Inner Progress Circle */}
          <Animated.View style={[styles.innerProgressRing, {
            borderColor: isRunning && !isPaused ? 'rgba(0, 122, 255, 0.3)' : 
                       isPaused ? 'rgba(255, 152, 0, 0.3)' : 'rgba(156, 163, 175, 0.2)',
            transform: [{ rotate: `${(sessionSeconds % 3600) / 60 * 360}deg` }]
          }]} />
          
          {/* Main Circular Container */}
          <LinearGradient
            colors={
              isRunning && !isPaused 
                ? ['rgba(255, 255, 255, 0.95)', 'rgba(240, 248, 255, 0.9)', 'rgba(219, 234, 254, 0.85)']
                : isPaused 
                ? ['rgba(255, 255, 255, 0.95)', 'rgba(255, 251, 235, 0.9)', 'rgba(254, 243, 199, 0.85)']
                : ['rgba(255, 255, 255, 0.95)', 'rgba(249, 250, 251, 0.9)', 'rgba(243, 244, 246, 0.85)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.circularTimerBase}
          >
            
            {/* Central Timer Content */}
            <View style={styles.timerCenterContent}>
              
              {/* Large Time Display */}
              <Text style={[styles.circularTimerText, {
                color: isRunning && !isPaused ? '#007AFF' : 
                      isPaused ? '#FF9800' : '#6B7280'
              }]}>
                {Math.floor(sessionSeconds / 3600).toString().padStart(2, '0')}:
                {Math.floor((sessionSeconds % 3600) / 60).toString().padStart(2, '0')}:
                {(sessionSeconds % 60).toString().padStart(2, '0')}
              </Text>
              
              {/* Minimal Status Indicator */}
              <View style={styles.minimalStatusContainer}>
                <Animated.View style={[styles.statusDot, {
                  backgroundColor: isRunning && !isPaused ? '#4CAF50' : 
                                 isPaused ? '#FF9800' : '#9CA3AF',
                  transform: [{ scale: dotPulseAnim }]
                }]} />
                <Text style={[styles.statusLabel, {
                  color: isRunning && !isPaused ? '#007AFF' : 
                        isPaused ? '#FF9800' : '#6B7280'
                }]}>
                  {!isRunning ? 'Beklemede' : isPaused ? 'Duraklatıldı' : 'Aktif'}
                </Text>
              </View>
              
            </View>
            
          </LinearGradient>
          
          {/* Floating Center Icon */}
          <Animated.View style={[styles.centerIcon, {
            opacity: pulseAnim.interpolate({
              inputRange: [0.8, 1],
              outputRange: [0.6, 1]
            })
          }]}>
            <MaterialCommunityIcons 
              name="book-open-variant" 
              size={24} 
              color={isRunning && !isPaused ? '#007AFF' : 
                    isPaused ? '#FF9800' : '#9CA3AF'} 
            />
          </Animated.View>
          
          {/* Timer Label */}
          <View style={styles.circularTimerLabel}>
            <Text style={[styles.labelText, {
              color: isRunning && !isPaused ? '#007AFF' : 
                    isPaused ? '#FF9800' : '#6B7280'
            }]}></Text>
          </View>
          
        </Animated.View>

        {/* Professional Controls Section */}
        <Animated.View 
          style={[
            styles.professionalControlsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) }]
            }
          ]}
        >
          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton, {
                opacity: sessionSeconds === 0 ? 0.5 : 1
              }]}
              onPress={stopTimer}
              disabled={sessionSeconds === 0}
            >
              <MaterialCommunityIcons 
                name="stop" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.controlButtonText}>
                Kaydet & Durdur
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.mainButton, {
                backgroundColor: !isRunning ? '#4CAF50' : 
                               isPaused ? '#2196F3' : '#FF9800'
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
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.controlButtonText}>
                {!isRunning ? 'Başla' : isPaused ? 'Devam Et' : 'Duraklat'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Professional Statistics Section */}
        <Animated.View 
          style={[
            styles.professionalStatsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) }]
            }
          ]}
        >
          {/* Stats Header */}
          <View style={styles.statsHeaderSection}>
            <MaterialCommunityIcons name="chart-arc" size={24} color="#007AFF" />
            <Text style={styles.statsHeaderTitle}>Okuma İstatistikleri</Text>
          </View>
          
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Current Session */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <MaterialCommunityIcons name="timer-outline" size={20} color="#007AFF" />
              </View>
              <Text style={styles.statLabel}>Bu Oturum</Text>
              <Text style={[styles.statValue, { color: '#007AFF' }]}>{currentTime.formatted}</Text>
            </View>
            
            {/* Today Total */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                <MaterialCommunityIcons name="calendar-today" size={20} color="#2196F3" />
              </View>
              <Text style={styles.statLabel}>Bugün</Text>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>{todayTime.formatted}</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            {/* Total */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialCommunityIcons name="book-multiple" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statLabel}>Toplam</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {readingStats ? formatTime(readingStats.totalSecondsRead).formatted : '00:00:00'}
              </Text>
            </View>
            
            {/* Average */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                <MaterialCommunityIcons name="chart-line" size={20} color="#FF9800" />
              </View>
              <Text style={styles.statLabel}>Ortalama</Text>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {readingStats && readingStats.totalSessions > 0 
                  ? formatTime(readingStats.averageSessionDuration).formatted 
                  : '00:00:00'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Book Selection Modal */}
      <Modal
        visible={showBookSelectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
      >
        <View style={styles.modernModalContainer}>
          <LinearGradient
            colors={['#F5F7FA', '#FFFFFF']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>Kitap Seçin</Text>
              <TouchableOpacity 
                style={styles.modernModalCloseButton}
                onPress={() => setShowBookSelectionModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={reduxBooks}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modernBooksList}
            />
          </SafeAreaView>
        </View>
      </Modal>
      
      {/* Custom Toast already handled by useToast hook */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Şeffaf, gradient göstermek için
  },
  headerSafeArea: {
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: 'transparent', // Şeffaf, gradient göstermek için
  },
  modernBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modernHeaderTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernHeaderSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernStatsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modernBookCard: {
    marginBottom: Spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  bookCardContent: {
    minHeight: 120,
  },
  bookCardGradient: {
    padding: Spacing.xl,
  },
  selectedBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernBookCover: {
    width: 60,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: Spacing.lg,
    position: 'relative',
  },
  modernBookImage: {
    width: '100%',
    height: '100%',
  },
  bookCoverOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBookInfo: {
    flex: 1,
  },
  modernBookTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modernBookAuthor: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    marginBottom: 8,
  },
  changeBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBookText: {
    fontSize: FontSizes.sm,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  noBookContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noBookIcon: {
    marginBottom: Spacing.md,
  },
  noBookTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  noBookSubtitle: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
  },
  professionalTimerCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  timerDisplayWrapper: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusDotWrapper: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  professionalControlsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  controlsContainer: {
    gap: Spacing.md,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: '#F44336',
    marginBottom: Spacing.sm,
  },
  mainButton: {
    // Dynamic backgroundColor applied inline
  },
  controlButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  professionalStatsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  statsHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  modernModalContainer: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
  },
  modernModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#FFFFFF',
  },
  modernModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
  },
  modernModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  modernBooksList: {
    padding: Spacing.lg,
  },
  bookSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookItemCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  bookItemImage: {
    width: '100%',
    height: '100%',
  },
  bookItemInfo: {
    flex: 1,
  },
  bookItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  bookItemAuthor: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernStatusText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Modern Circular Timer Styles
  circularTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
    width: 280,
    height: 280,
    position: 'relative',
    alignSelf: 'center',
  },
  outerProgressRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  innerProgressRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    backgroundColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    top: 10,
    left: 10,
  },
  circularTimerBase: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    margin: 30,
  },
  timerCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circularTimerText: {
    fontSize: 36,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  minimalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  statusLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerIcon: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    zIndex: 1,
  },
  circularTimerLabel: {
    position: 'absolute',
    bottom: -45,
    alignSelf: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
});

export default ReadingTimerScreen; 