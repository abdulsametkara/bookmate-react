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
  Image
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';

const ReadingTimerScreen = () => {
  const navigation = useNavigation();
  const intervalRef = useRef(null);
  
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

  // Load reading stats on mount
  useEffect(() => {
    loadReadingStats();
  }, [currentUserId]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
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
  }, [isRunning, isPaused]);

  const loadReadingStats = async () => {
    if (!currentUserId) return;
    
    try {
      const stats = await ReadingSessionManager.getUserStats(currentUserId);
      setReadingStats(stats);

      // Calculate today's reading time
      const allSessions = await ReadingSessionManager.getUserSessions(currentUserId);
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = allSessions.filter(session => session.date === today && session.endTime);
      const todayTotal = todaySessions.reduce((sum, session) => sum + session.duration, 0);
      setTodayMinutes(todayTotal);
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
      Alert.alert('Kitap Seçin', 'Lütfen önce okuyacağınız kitabı seçin.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    try {
      // Start a new reading session
      const sessionId = await ReadingSessionManager.startSession(
        currentUserId, 
        selectedBook.id, 
        selectedBook.currentPage || 0
      );
      
      setCurrentSessionId(sessionId);
      setStartPage(selectedBook.currentPage || 0);
      setIsRunning(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error starting reading session:', error);
      Alert.alert('Hata', 'Okuma seansı başlatılamadı.');
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsPaused(false);
  };

  const stopTimer = async () => {
    if (sessionSeconds > 0 && currentSessionId) {
      Alert.alert(
        'Oturumu Sonlandır',
        `Bu oturumda ${formatTime(sessionSeconds).formatted} okudunuz. Kaç sayfa okudunuz?`,
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Devam',
            onPress: () => showPageInputAlert()
          }
        ]
      );
    } else {
      setIsRunning(false);
      setIsPaused(false);
      setSessionSeconds(0);
      setCurrentSessionId(null);
    }
  };

  const showPageInputAlert = () => {
    Alert.prompt(
      'Okunan Sayfa Sayısı',
      `Başlangıç: ${startPage}. Şu anda hangi sayfadasınız?`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Tamam',
          onPress: (endPageStr) => {
            const endPage = parseInt(endPageStr || startPage.toString());
            if (isNaN(endPage) || endPage < startPage) {
              Alert.alert('Hata', 'Geçerli bir sayfa numarası girin.');
              return;
            }
            finishSession(endPage);
          }
        }
      ],
      'plain-text',
      startPage.toString()
    );
  };

  const finishSession = async (endPage: number) => {
    if (!currentSessionId) return;

    try {
      // End the reading session
      await ReadingSessionManager.endSession(currentSessionId, endPage);
      
      // Reset timer state
      setIsRunning(false);
      setIsPaused(false);
      setSessionSeconds(0);
      setCurrentSessionId(null);
      
      // Reload stats
      await loadReadingStats();
      
      Alert.alert('Başarılı', `Okuma seansınız kaydedildi!\n${endPage - startPage} sayfa okudunuz.`);
    } catch (error) {
      console.error('Error ending reading session:', error);
      Alert.alert('Hata', 'Okuma seansı kaydedilemedi.');
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
    Alert.alert('Kitap Seçildi', `"${book.title}" zamanlayıcı için seçildi.`);
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
              <Text style={styles.stopButtonText}>Durdur</Text>
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
                {readingStats ? formatTime(readingStats.totalMinutesRead * 60).formatted : '00:00:00'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ortalama/Gün</Text>
              <Text style={styles.statValue}>
                {readingStats && readingStats.totalSessions > 0 
                  ? formatTime(readingStats.averageSessionDuration * 60).formatted 
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