import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getFriendProfile, FriendProfile } from '../services/sharedReadingApi';

const { width } = Dimensions.get('window');

const FriendProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { friendId } = route.params as { friendId: string };

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const profileData = await getFriendProfile(friendId);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading friend profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [friendId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}s ${remainingMinutes}d` : `${hours} saat`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}g ${remainingHours}s` : `${days} gün`;
  };

  const getProgressPercentage = (current: number, total: number) => {
    return total > 0 ? Math.round((current / total) * 100) : 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Profil Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="person-remove" size={64} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.errorText}>Profil yüklenemedi</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Arkadaş Profili</Text>
            <Text style={styles.headerSubtitle}>Profil detaylarını görüntüleyin</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.friend.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            <Text style={styles.displayName}>{profile.friend.displayName}</Text>
            {profile.friend.username && (
              <Text style={styles.username}>@{profile.friend.username}</Text>
            )}
            <Text style={styles.joinDate}>
              {new Date(profile.friend.joinDate).toLocaleDateString('tr-TR')} tarihinde katıldı
            </Text>
          </View>

          {/* Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Okuma İstatistikleri</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="library" size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{profile.statistics.total_books}</Text>
                <Text style={styles.statLabel}>Toplam Kitap</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.statNumber}>{profile.statistics.completed_books}</Text>
                <Text style={styles.statLabel}>Tamamlandı</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#FF9800" />
                <Text style={styles.statNumber}>
                  {formatReadingTime(profile.statistics.total_reading_time)}
                </Text>
                <Text style={styles.statLabel}>Okuma Süresi</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#2196F3" />
                <Text style={styles.statNumber}>
                  {profile.statistics.total_pages_read.toLocaleString('tr-TR')}
                </Text>
                <Text style={styles.statLabel}>Okunan Sayfa</Text>
              </View>
            </View>
          </View>

          {/* Currently Reading */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 Şu Anda Okuyor ({profile.currentReading.length})</Text>
            {profile.currentReading.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.emptyStateText}>Şu anda okumadığı kitap yok</Text>
              </View>
            ) : (
              profile.currentReading.map((book) => (
                <View key={book.user_book_id} style={styles.bookCard}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${getProgressPercentage(book.current_page, book.total_pages)}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {book.current_page}/{book.total_pages} sayfa (%{getProgressPercentage(book.current_page, book.total_pages)})
                      </Text>
                    </View>
                    <View style={styles.bookStats}>
                      <View style={styles.bookStat}>
                        <Ionicons name="calendar" size={16} color="rgba(255, 255, 255, 0.7)" />
                        <Text style={styles.bookStatText}>
                          {new Date(book.start_date).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <View style={styles.bookStat}>
                        <Ionicons name="time" size={16} color="rgba(255, 255, 255, 0.7)" />
                        <Text style={styles.bookStatText}>
                          {formatReadingTime(book.total_reading_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Recent Books */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Son Tamamlanan Kitaplar</Text>
            {profile.recentBooks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.emptyStateText}>Henüz tamamlanan kitap yok</Text>
              </View>
            ) : (
              profile.recentBooks.map((book, index) => (
                <View key={index} style={styles.recentBookCard}>
                  <View style={styles.recentBookInfo}>
                    <Text style={styles.recentBookTitle}>{book.title}</Text>
                    <Text style={styles.recentBookAuthor}>{book.author}</Text>
                    <View style={styles.recentBookStats}>
                      <View style={styles.recentBookStat}>
                        <Ionicons name="calendar-outline" size={14} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.recentBookStatText}>
                          {new Date(book.end_date).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <View style={styles.recentBookStat}>
                        <Ionicons name="document-text-outline" size={14} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.recentBookStatText}>{book.total_pages} sayfa</Text>
                      </View>
                      <View style={styles.recentBookStat}>
                        <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.recentBookStatText}>
                          {formatReadingTime(book.total_reading_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  
  // Section
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  
  // Statistics
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (width - 60) / 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Currently Reading
  bookCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookStatText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
  },
  
  // Recent Books
  recentBookCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentBookInfo: {
    flex: 1,
  },
  recentBookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  recentBookAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  recentBookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentBookStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentBookStatText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 2,
  },
});

export default FriendProfileScreen; 