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
  Animated,
  Dimensions,
  StatusBar,
  Platform
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
import { LinearGradient } from 'expo-linear-gradient';

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
}

const ReadingTimerScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
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
  
  // Real reading stats from ReadingSessionManager
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  
  // Book selection state
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookSelectionModal, setShowBookSelectionModal] = useState(false);

  // AsyncStorage keys
  const TIMER_STATE_KEY = `timer_state_${currentUserId}`;

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
    if (isRunning && !isPaused) {
      const startPulse = () => {
        Animated.sequence([
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
        ]).start(() => {
          if (isRunning && !isPaused) {
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
  }, [isRunning, isPaused]);

  // Dot pulse animation
  useEffect(() => {
    if (isRunning && !isPaused) {
      const startDotPulse = () => {
        Animated.sequence([
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
        ]).start(() => {
          if (isRunning && !isPaused) {
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
  }, [isRunning, isPaused]);

  // Subtitle fade animation
  useEffect(() => {
    const startSubtitleFade = () => {
      Animated.sequence([
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
      ]).start(() => startSubtitleFade());
    };
    startSubtitleFade();
  }, []);

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
      showError('Okuma oturumu başlatılamadı');
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
    showInfo('Okuma oturumu duraklatıldı ⏸️');
  };

  const resumeTimer = () => {
    setIsPaused(false);
    showSuccess('Okuma oturumu devam ediyor! ▶️');
  };

  const stopTimer = async () => {
    if (sessionSeconds === 0) {
      showError('Henüz okuma yapmadınız');
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
      showSuccess(`Okuma oturumu kaydedildi! 🎉\nSüre: ${timeFormatted.formatted}`);
      
    } catch (error) {
      console.error('Error stopping timer:', error);
      showError('Okuma oturumu kaydedilemedi');
    }
  };

  const goToStats = () => {
    navigation.navigate('ReadingStatsScreen');
  };

  const selectBook = () => {
    setShowBookSelectionModal(true);
  };

  const handleBookSelection = (book) => {
    setSelectedBook(book);
    setShowBookSelectionModal(false);
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
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Background Gradient - Space-like */}
      <LinearGradient
        colors={['#0F0F23', '#1A1A2E', '#16213E', '#0F3460', '#001122']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <LinearGradient
          colors={['rgba(15, 15, 35, 0.95)', 'rgba(26, 26, 46, 0.9)', 'rgba(15, 52, 96, 0.85)']}
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
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
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
            <MaterialCommunityIcons name="chart-line" size={24} color="#FFFFFF" />
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
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
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
                      <MaterialCommunityIcons name="swap-horizontal" size={16} color="#64FFDA" />
                      <Text style={styles.changeBookText}>Kitap Değiştir</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noBookContainer}>
                  <View style={styles.noBookIcon}>
                    <MaterialCommunityIcons name="book-plus" size={48} color="#64FFDA" />
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

        {/* Clean Timer Card */}
        <Animated.View style={[styles.newTimerContainer, {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          }) }]
        }]}>
          
          {/* Timer Card */}
          <Animated.View style={[styles.timerCard, {
            transform: [{ scale: pulseAnim }]
          }]}>
            
            {/* Card Background Gradient */}
            <LinearGradient
              colors={[
                'rgba(16, 33, 62, 0.9)',
                'rgba(15, 52, 96, 0.8)',
                'rgba(26, 26, 46, 0.9)'
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timerCardGradient}
            />
            
            {/* Modern Space Timer Content */}
            <View style={styles.spaceTimerContent}>
              
              {/* Modern Glassmorphism Timer */}
              <Animated.View style={[styles.modernTimerBox, {
                transform: [{ scale: pulseAnim }]
              }]}>
                {/* Glassmorphism Background */}
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.12)',
                    'rgba(255, 255, 255, 0.06)'
                  ]}
                  style={styles.glassTimerGradient}
                >
                  <Text style={[styles.ultraModernTime, {
                    color: isRunning && !isPaused ? '#FFFFFF' : 
                           isPaused ? '#FFD93D' : '#B8BCC8'
                  }]}>
                    {Math.floor(sessionSeconds / 3600).toString().padStart(2, '0')}:
                    {Math.floor((sessionSeconds % 3600) / 60).toString().padStart(2, '0')}:
                    {(sessionSeconds % 60).toString().padStart(2, '0')}
                  </Text>
                </LinearGradient>
                
                {/* Subtle Status Indicator */}
                <Animated.View style={[styles.subtleStatusIndicator, {
                  backgroundColor: isRunning && !isPaused ? '#00E676' : 
                                 isPaused ? '#FFD93D' : '#6C7B7F',
                  transform: [{ scale: dotPulseAnim }]
                }]} />
              </Animated.View>
              
            </View>
            
          </Animated.View>
          
        </Animated.View>

        {/* Controls Section */}
        <Animated.View 
          style={[
            styles.modernTimerCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.timerCardGradient}
          >
            {/* Control Buttons */}
            <View style={styles.modernControlsContainer}>
              <TouchableOpacity 
                style={[styles.modernControlButton, styles.modernStopButton]}
                onPress={stopTimer}
                disabled={sessionSeconds === 0}
              >
                <LinearGradient
                  colors={sessionSeconds === 0 ? ['#424242', '#616161'] : ['#F44336', '#D32F2F']}
                  style={styles.controlButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name="stop" 
                    size={20} 
                    color={sessionSeconds === 0 ? '#9E9E9E' : '#FFFFFF'} 
                  />
                  <Text style={[styles.modernControlText, {
                    color: sessionSeconds === 0 ? '#9E9E9E' : '#FFFFFF'
                  }]}>
                    Kaydet & Durdur
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modernControlButton, styles.modernMainButton]}
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
                <LinearGradient
                  colors={!isRunning ? ['#4CAF50', '#388E3C'] : 
                         isPaused ? ['#2196F3', '#1976D2'] : ['#FF9800', '#F57C00']}
                  style={styles.controlButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name={!isRunning ? 'play' : isPaused ? 'play' : 'pause'} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.modernControlText}>
                    {!isRunning ? 'Başla' : isPaused ? 'Devam Et' : 'Duraklat'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Statistics Card */}
        <Animated.View 
          style={[
            styles.modernStatsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
            style={styles.statsCardGradient}
          >
            <View style={styles.modernStatsHeader}>
              <MaterialCommunityIcons name="chart-arc" size={24} color="#64FFDA" />
              <Text style={styles.modernStatsTitle}>Okuma İstatistikleri</Text>
            </View>
            
            <View style={styles.modernStatsGrid}>
              <View style={styles.modernStatItem}>
                <LinearGradient
                  colors={['rgba(100, 255, 218, 0.2)', 'rgba(100, 255, 218, 0.1)']}
                  style={styles.statItemGradient}
                >
                  <MaterialCommunityIcons name="timer-outline" size={24} color="#64FFDA" />
                  <Text style={styles.modernStatLabel}>Bu Oturum</Text>
                  <Text style={styles.modernStatValue}>{currentTime.formatted}</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.modernStatItem}>
                <LinearGradient
                  colors={['rgba(33, 150, 243, 0.2)', 'rgba(33, 150, 243, 0.1)']}
                  style={styles.statItemGradient}
                >
                  <MaterialCommunityIcons name="calendar-today" size={24} color="#2196F3" />
                  <Text style={styles.modernStatLabel}>Bugün Toplam</Text>
                  <Text style={styles.modernStatValue}>{todayTime.formatted}</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.modernStatsGrid}>
              <View style={styles.modernStatItem}>
                <LinearGradient
                  colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                  style={styles.statItemGradient}
                >
                  <MaterialCommunityIcons name="book-multiple" size={24} color="#4CAF50" />
                  <Text style={styles.modernStatLabel}>Genel Toplam</Text>
                  <Text style={styles.modernStatValue}>
                    {readingStats ? formatTime(readingStats.totalSecondsRead).formatted : '00:00:00'}
                  </Text>
                </LinearGradient>
              </View>
              
              <View style={styles.modernStatItem}>
                <LinearGradient
                  colors={['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.1)']}
                  style={styles.statItemGradient}
                >
                  <MaterialCommunityIcons name="chart-line" size={24} color="#FF9800" />
                  <Text style={styles.modernStatLabel}>Ortalama/Gün</Text>
                  <Text style={styles.modernStatValue}>
                    {readingStats && readingStats.totalSessions > 0 
                      ? formatTime(readingStats.averageSessionDuration).formatted 
                      : '00:00:00'}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
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
            colors={['#1a1a2e', '#16213e']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>Kitap Seçin</Text>
              <TouchableOpacity 
                style={styles.modernModalCloseButton}
                onPress={() => setShowBookSelectionModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
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
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
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
  },
  modernHeaderSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  modernStatsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modernBookAuthor: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  changeBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBookText: {
    fontSize: FontSizes.sm,
    color: '#64FFDA',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noBookSubtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modernTimerCard: {
    marginBottom: Spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  modernTimerDisplay: {
    marginBottom: Spacing.lg,
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  modernStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  modernStatusText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // New Futuristic Timer Styles
  futuristicTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
    aspectRatio: 1.2,
    minHeight: 320,
    position: 'relative',
  },
  glowingCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    shadowColor: '#64FFDA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  timerContentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    shadowColor: '#64FFDA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  giantTimerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  gradientTextMask: {
    borderRadius: 15,
    padding: 20,
  },
  giantTimerText: {
    fontSize: 72,
    fontWeight: Platform.OS === 'ios' ? '100' : '100',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  modernSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(100, 255, 218, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64FFDA',
    marginHorizontal: 4,
    shadowColor: '#64FFDA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Modern Rectangular Timer Styles
  newTimerContainer: {
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  timerCard: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 120,
    paddingVertical: Spacing.lg,
  },
  timerCardGradient: {
    flex: 1,
    padding: Spacing.lg,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  timerCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  // Modern Space Timer Styles
  spaceTimerContent: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  glowingRing: {
    position: 'absolute',
    width: '95%',
    height: '90%',
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'transparent',
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  timerDisplayContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerGlowBackground: {
    position: 'absolute',
    width: '90%',
    height: '80%',
    borderRadius: 12,
  },
  timeUnitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timeUnit: {
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  timeNumber: {
    fontSize: 36,
    fontWeight: Platform.OS === 'ios' ? '300' : '300',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '200',
    marginHorizontal: Spacing.xs,
    opacity: 0.8,
  },
  modernStatusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mainTimerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTimerText: {
    fontSize: 42,
    fontWeight: Platform.OS === 'ios' ? '200' : '200',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  modernControlsContainer: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  modernControlButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernStopButton: {
    marginBottom: Spacing.sm,
  },
  modernMainButton: {
    // Ana buton için özel style
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  modernControlText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernStatsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statsCardGradient: {
    padding: Spacing.xl,
  },
  modernStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modernStatsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  modernStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modernStatItem: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statItemGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  modernStatLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  modernStatValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  modernBooksList: {
    padding: Spacing.lg,
  },
  bookSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bookItemAuthor: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Modern Timer Display Styles
  unifiedTimeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#64FFDA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 140,
    aspectRatio: 2.8,
    overflow: 'hidden',
  },
  statusIndicatorRow: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  modernStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  mainTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  mainTimerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto Light',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timerLabelContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  timerMainLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Modern Digital Timer Styles
  modernTimerDisplayContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  modernTimerBackground: {
    position: 'absolute',
    width: '95%',
    height: '85%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  digitalTimeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    minHeight: 80,
  },
  modernDigitalTime: {
    fontSize: 42,
    fontWeight: Platform.OS === 'ios' ? '300' : '300',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  statusDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modern Glassmorphism Timer Styles
  modernTimerBox: {
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
    // iOS specific blur
    ...(Platform.OS === 'ios' && {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }),
  },
  glassTimerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  ultraModernTime: {
    fontSize: 32,
    fontWeight: Platform.OS === 'ios' ? '200' : '200',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto Thin',
    letterSpacing: 1.5,
    textAlign: 'center',
    // Subtle text shadow for depth
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtleStatusIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default ReadingTimerScreen; 