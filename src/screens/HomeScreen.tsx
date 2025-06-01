import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity, SafeAreaView, Text, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store';
import UserManager, { User } from '../utils/userManager';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import { loadBooks, setBooks } from '../store/bookSlice';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.books.currentUserId);
  const books = useAppSelector((state) => state.books.items);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);

  // Backend API'den reading kitapları yükle
  const loadReadingBooksFromAPI = async () => {
    if (!currentUserId) return;
    
    try {
      // Backend'den 'reading' statusündeki kitapları getir
      const APIService = (await import('../utils/apiService')).default;
      const result = await APIService.getBooksByStatus('reading');
      
      if (result.success && result.books) {
        console.log('HomeScreen loading reading books:', {
          userId: currentUserId,
          readingBooksCount: result.books.length,
          books: result.books.map(b => ({ 
            id: b.id, 
            title: b.title, 
            current_page: b.current_page,
            page_count: b.page_count,
            status: b.status 
          }))
        });
        
        // Backend UserBook'ları uygulama Book formatına çevir (sadece reading olanlar)
        const convertedBooks = result.books.map(convertUserBookToBook);
        
        // Mevcut Redux kitaplarını al ve reading olanları güncelle
        const allBooks = books.filter(b => b.userId !== currentUserId || b.status !== 'READING');
        const updatedBooks = [...allBooks, ...convertedBooks];
        
        dispatch(setBooks(updatedBooks));
      } else {
        console.error('❌ Reading books loading failed:', result.message);
      }
    } catch (error) {
      console.error('Error loading reading books in HomeScreen:', error);
    }
  };
  
  // Backend UserBook'u uygulama Book modeline çevir
  function convertUserBookToBook(userBook: any): any {
    const currentPage = userBook.current_page || 0;
    const progress = userBook.page_count > 0 ? 
      Math.round((currentPage / userBook.page_count) * 100) : 0;

    return {
      id: userBook.id,
      title: userBook.title,
      author: userBook.author,
      coverURL: userBook.cover_image_url || 'https://via.placeholder.com/200x300?text=Kapak+Yok',
      pageCount: userBook.page_count || 0,
      currentPage: currentPage,
      progress: progress,
      status: 'READING',
      createdAt: new Date(userBook.createdAt),
      notes: [],
      genre: userBook.genre || 'Genel',
      publishYear: new Date().getFullYear(),
      publisher: 'Bilinmiyor',
      description: '',
      userId: currentUserId,
    };
  }

  // Load user data and reading stats
  useEffect(() => {
    const loadData = async () => {
      if (currentUserId) {
        try {
          // Load user data
          const user = await UserManager.getUserById(currentUserId);
          setCurrentUser(user);

          // Load reading statistics
          const stats = await ReadingSessionManager.getUserStats(currentUserId);
          setReadingStats(stats);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [currentUserId]);

  // Focus effect to reload books when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadReadingBooksFromAPI();
    }, [currentUserId])
  );

  // Calculate real statistics from books and reading sessions
  const userBooks = books.filter(book => book.userId === currentUserId);
  const completedBooks = userBooks.filter(book => book.status === 'COMPLETED');
  const currentlyReadingBooks = userBooks.filter(book => book.status === 'READING');
  const totalBooks = userBooks.length;
  
  // Calculate total pages read
  const totalPagesRead = userBooks.reduce((total, book) => {
    return total + (book.currentPage || 0);
  }, 0);

  // Find currently reading book
  const currentlyReading = currentlyReadingBooks.length > 0 ? currentlyReadingBooks[0] : null;

  // Statistics data - using real reading session data
  const statistics = [
    {
      id: '1',
      value: completedBooks.length.toString(),
      label: 'Bitirilen Kitap',
      icon: 'check-circle',
      color: Colors.success,
    },
    {
      id: '2',
      value: totalBooks.toString(),
      label: 'Toplam Kitap',
      icon: 'book-multiple',
      color: Colors.primary,
    },
    {
      id: '3',
      value: readingStats ? readingStats.totalPagesRead.toString() : '0',
      label: 'Okunan Sayfa',
      icon: 'book',
      color: Colors.warning,
    },
  ];

  // Partner updates - başta boş, ileride couple system eklenecek
  const partnerUpdates: any[] = [];

  const goToReadingTimer = () => {
    navigation.navigate('ReadingTimer');
  };

  const goToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleAddPartner = () => {
    Alert.alert(
      'Ortak Okuma',
      'Ortak okuma özelliği yakında eklenecek! Partnerinizle birlikte okuma deneyimini paylaşabileceksiniz.',
      [{ text: 'Tamam' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Ana Sayfa</Text>
          <Text style={styles.appName}>BookMate</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={goToProfile}>
          <MaterialCommunityIcons name="cog" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Reading Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Okuma İlerlemeniz</Text>
          
          {currentlyReading ? (
            <TouchableOpacity 
              style={styles.progressCard}
              onPress={goToReadingTimer}
            >
              <View style={styles.progressHeader}>
                <Text style={styles.currentlyReadingLabel}>ŞU ANDA OKUNAN:</Text>
              </View>
              
              <View style={styles.progressContent}>
                <View style={styles.bookCoverContainer}>
                  <Image 
                    source={{ uri: currentlyReading.coverURL || 'https://picsum.photos/80/120?random=1' }}
                    style={styles.bookCover}
                    resizeMode="cover"
                  />
                </View>
                
                <View style={styles.bookDetails}>
                  <Text style={styles.bookTitle}>{currentlyReading.title}</Text>
                  <Text style={styles.bookAuthor}>{currentlyReading.author}</Text>
                  <Text style={styles.pageInfo}>
                    {currentlyReading.currentPage || 0}/{currentlyReading.pageCount || 0} sayfa
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressPercentage}>%{Math.round(currentlyReading.progress || 0)} Tamamlandı</Text>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${currentlyReading.progress || 0}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyStateCard}>
              <MaterialCommunityIcons name="book-plus" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>Henüz kitap okumuyorsunuz</Text>
              <Text style={styles.emptyStateText}>
                Kütüphanenizden bir kitap seçin ve okumaya başlayın!
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Library')}
              >
                <Text style={styles.emptyStateButtonText}>Kütüphaneye Git</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Partner Updates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ortak Güncellemeler</Text>
            <TouchableOpacity onPress={handleAddPartner}>
              <MaterialCommunityIcons name="plus" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.updatesContainer}>
            {partnerUpdates.length > 0 ? (
              partnerUpdates.map((update) => (
                <View key={update.id} style={styles.updateCard}>
                  <View style={styles.updateContent}>
                    <View style={styles.avatarContainer}>
                      <Image 
                        source={{ uri: update.avatar }}
                        style={styles.avatar}
                      />
                    </View>
                    <View style={styles.updateTextContainer}>
                      <Text style={styles.updateText}>
                        <Text style={styles.partnerName}>{update.name}</Text>
                        <Text style={styles.updateActivity}> {update.activity}</Text>
                      </Text>
                      <Text style={styles.updateTime}>{update.time}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.heartButton}>
                    <MaterialCommunityIcons 
                      name="heart-outline" 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyUpdatesCard}>
                <MaterialCommunityIcons name="heart-plus" size={32} color={Colors.textSecondary} />
                <Text style={styles.emptyUpdatesTitle}>Henüz ortak okuma yapmıyorsunuz</Text>
                <Text style={styles.emptyUpdatesText}>
                  Partnerinizi ekleyerek birlikte okuma deneyimi yaşayın!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Library')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary }]}>
                <MaterialCommunityIcons name="library" size={24} color="white" />
              </View>
              <Text style={styles.quickActionText}>Kütüphane</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={goToReadingTimer}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.success }]}>
                <MaterialCommunityIcons name="timer" size={24} color="white" />
              </View>
              <Text style={styles.quickActionText}>Zamanlayıcı</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          
          <View style={styles.statisticsContainer}>
            {statistics.map((stat, index) => (
              <View key={stat.id} style={[styles.statCard, index === 1 && styles.middleStatCard]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color="white" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  appName: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsButton: {
    padding: Spacing.sm,
    marginTop: -Spacing.xs,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.full,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  progressHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.sectionBackground,
  },
  currentlyReadingLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.cardBackground,
  },
  bookCoverContainer: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  pageInfo: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
  progressSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.cardBackground,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressPercentage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressBarContainer: {},
  progressBar: {
    height: 6,
    backgroundColor: Colors.progressBackground,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  updatesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  updateCard: {
    backgroundColor: Colors.warm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  updateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  updateTextContainer: {
    flex: 1,
  },
  updateText: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  partnerName: {
    fontWeight: '600',
    color: Colors.text,
  },
  updateActivity: {
    color: Colors.textSecondary,
  },
  updateTime: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  heartButton: {
    padding: Spacing.xs,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.full,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  quickActionCard: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.coolGray,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  statCard: {
    backgroundColor: Colors.coolGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.xs,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  middleStatCard: {
    marginHorizontal: Spacing.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyStateCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  emptyStateButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptyUpdatesCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyUpdatesTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyUpdatesText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});

export default HomeScreen; 