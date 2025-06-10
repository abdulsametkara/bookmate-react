import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  Text, 
  Dimensions, 
  Alert,
  StatusBar,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../store';
import UserManager, { User } from '../utils/userManager';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import { loadBooks, setBooks } from '../store/bookSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';
import { saveBooks } from '../utils/storageUtils';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUserId = useAppSelector((state) => state.books.currentUserId);
  const books = useAppSelector((state) => state.books.items);
  const isLoading = useAppSelector((state) => state.books.loading);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load books data
  const loadBooksData = useCallback(async () => {
    if (currentUserId) {
      try {
        const loadedBooks = await loadBooks(currentUserId);
        dispatch(setBooks(loadedBooks));
      } catch (error) {
        console.error('Error loading books:', error);
      }
    }
  }, [currentUserId, dispatch]);

  // Load user data and reading stats
  const loadUserData = useCallback(async () => {
    if (currentUserId) {
      try {
        // Load user data
        const user = await UserManager.getUserById(currentUserId);
        setCurrentUser(user);

        // Load reading statistics (total stats)
        const stats = await ReadingSessionManager.getUserStats(currentUserId);
        setReadingStats(stats);

        // Load today's reading statistics
        const todayData = await ReadingSessionManager.getTodayStats(currentUserId);
        setTodayStats(todayData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Focus effect to reload books and user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBooksData();
      loadUserData();
    }, [currentUserId, loadBooksData, loadUserData])
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

  // Refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooksData();
    setRefreshing(false);
  }, []);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

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
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.appName}>
            {currentUser?.displayName?.split(' ')[0] || 'BookMate Kullanıcısı'}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={goToProfile}>
          <View style={styles.profileButtonInner}>
            <MaterialCommunityIcons name="account" size={24} color="#007AFF" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
        {/* Hero Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{completedBooks.length}</Text>
            <Text style={styles.statLabel}>Bitirilen</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="book-open-variant" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.statValue}>{currentlyReadingBooks.length}</Text>
            <Text style={styles.statLabel}>Okunuyor</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="book-multiple" size={28} color="#4ECDC4" />
            </View>
            <Text style={styles.statValue}>{totalBooks}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        {/* Current Reading Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Şu Anda Okuduğunuz</Text>
          
          {currentlyReading ? (
            <TouchableOpacity 
              style={styles.progressCard}
              onPress={goToReadingTimer}
            >
              <View style={styles.progressContent}>
                <View style={styles.bookCoverContainer}>
                  <Image 
                    source={{ uri: currentlyReading.coverURL || 'https://via.placeholder.com/80x120?text=Kapak+Yok' }}
                    style={styles.bookCover}
                    resizeMode="cover"
                  />
                  <View style={styles.progressOverlay}>
                    <Text style={styles.progressText}>{Math.round(currentlyReading.progress || 0)}%</Text>
                  </View>
                </View>
                
                <View style={styles.bookDetails}>
                  <Text style={styles.bookTitle}>{currentlyReading.title}</Text>
                  <Text style={styles.bookAuthor}>{currentlyReading.author}</Text>
                  <Text style={styles.pageInfo}>
                    {currentlyReading.currentPage || 0} / {currentlyReading.pageCount || 0} sayfa
                  </Text>
                  
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${currentlyReading.progress || 0}%` }]} 
                      />
                    </View>
                  </View>
                </View>

                <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIcon}>
                <MaterialCommunityIcons name="book-plus" size={48} color="#007AFF" />
              </View>
              <Text style={styles.emptyStateTitle}>Henüz kitap okumuyorsunuz</Text>
              <Text style={styles.emptyStateText}>
                Kütüphanenizden bir kitap seçip okumaya başlayın!
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Library')}
              >
                <MaterialCommunityIcons name="library" size={18} color="#fff" />
                <Text style={styles.emptyStateButtonText}>Kütüphaneye Git</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Partner Updates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📚 Ortak Okuma</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddPartner}>
              <MaterialCommunityIcons name="plus" size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.partnerCard}>
            <View style={styles.partnerIcon}>
              <MaterialCommunityIcons name="account-multiple-plus" size={32} color="#007AFF" />
            </View>
            <Text style={styles.partnerTitle}>Partnerinizi Ekleyin</Text>
            <Text style={styles.partnerSubtitle}>
              Sevgiliniz, arkadaşınız veya ailenizle birlikte okuma deneyimi yaşayın
            </Text>
            <TouchableOpacity style={styles.partnerButton} onPress={handleAddPartner}>
              <Text style={styles.partnerButtonText}>Yakında</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Reading Goal */}
        {readingStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Günlük Hedef</Text>
            
            <View style={styles.goalCard}>
              <View style={styles.goalProgress}>
                <View style={styles.goalIconContainer}>
                  <MaterialCommunityIcons name="target" size={24} color="#4ECDC4" />
                </View>
                                  <View style={styles.goalDetails}>
                    <Text style={styles.goalText}>
                     {todayStats?.todayTotalMinutes || 0} / {currentUser?.preferences?.readingGoal || 30} dakika
                    </Text>
                    <Text style={styles.goalSubtext}>Günlük okuma hedefiniz</Text>
                  </View>
              </View>
              
              <View style={styles.goalBarContainer}>
                <View style={styles.goalBar}>
                  <View 
                    style={[
                      styles.goalFill, 
                                              { 
                          width: `${Math.min(
                           ((todayStats?.todayTotalMinutes || 0) / (currentUser?.preferences?.readingGoal || 30)) * 100, 
                           100
                          )}%` 
                        }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Recommended Books Section */}
        <View style={styles.section}>
          <View style={styles.recommendedSection}>
            <View style={styles.recommendedHeader}>
              <View style={styles.recommendedIcon}>
                <MaterialCommunityIcons name="star-circle" size={28} color="#fff" />
              </View>
              <Text style={styles.recommendedTitle}>📖 Önerilen Kitaplar</Text>
            </View>

            <View style={styles.recommendedGrid}>
              <View style={styles.recommendedRow}>
                <View style={[styles.recommendedCard, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#007AFF" />
                  <Text style={styles.recommendedCardTitle}>Popüler</Text>
                  <Text style={styles.recommendedCardDesc}>En çok okunan kitaplar</Text>
                </View>

                <View style={[styles.recommendedCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialCommunityIcons name="account-heart" size={24} color="#4CAF50" />
                  <Text style={styles.recommendedCardTitle}>Size Özel</Text>
                  <Text style={styles.recommendedCardDesc}>Okuma geçmişinize göre</Text>
                </View>
              </View>

              <View style={styles.recommendedRow}>
                <View style={[styles.recommendedCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color="#8B5CF6" />
                  <Text style={styles.recommendedCardTitle}>Klasikler</Text>
                  <Text style={styles.recommendedCardDesc}>Zamanın test ettiği eserler</Text>
                </View>

                <View style={[styles.recommendedCard, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
                  <MaterialCommunityIcons name="star-outline" size={24} color="#FFB800" />
                  <Text style={styles.recommendedCardTitle}>Yeni Çıkanlar</Text>
                  <Text style={styles.recommendedCardDesc}>Son eklenen kitaplar</Text>
                </View>
              </View>
            </View>

            <View style={styles.comingSoonBanner}>
              <MaterialCommunityIcons name="rocket-launch" size={20} color="#FF6B6B" />
              <Text style={styles.comingSoonText}>
                Detaylı kitap önerileri ve kategoriler yakında geliyor! 🚀
              </Text>
            </View>
          </View>
        </View>
        
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
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
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  appName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  profileButtonInner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: -20, // Overlap with header
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookCoverContainer: {
    position: 'relative',
    marginRight: Spacing.lg,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#fff',
  },
  bookDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    marginBottom: Spacing.sm,
  },
  pageInfo: {
    fontSize: FontSizes.sm,
    color: '#9CA3AF',
    marginBottom: Spacing.md,
  },
  progressBarContainer: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  goalDetails: {
    flex: 1,
  },
  goalText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  goalSubtext: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  goalBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBar: {
    height: '100%',
    width: '100%',
  },
  goalFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  addButton: {
    padding: Spacing.sm,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
  },
  bottomSpacing: {
    height: Spacing.xxl,
  },
  recommendedSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  recommendedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  recommendedTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
  },
  recommendedGrid: {
    marginBottom: Spacing.xl,
  },
  recommendedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  recommendedCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  recommendedCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  recommendedCardDesc: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  comingSoonText: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginLeft: Spacing.sm,
  },
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  partnerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  partnerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  partnerSubtitle: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  partnerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  partnerButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default HomeScreen; 