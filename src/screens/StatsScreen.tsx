import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';

const StatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const books = useSelector((state: RootState) => state.books.items);
  
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real reading statistics
  useEffect(() => {
    loadStats();
  }, [currentUserId]);

  const loadStats = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      const stats = await ReadingSessionManager.getUserStats(currentUserId);
      setReadingStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate weekly reading data
  const calculateWeeklyReadingData = async () => {
    if (!currentUserId) return [0, 0, 0, 0, 0, 0, 0];

    try {
      const sessions = await ReadingSessionManager.getUserSessions(currentUserId);
      const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
      
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySessions = sessions.filter(session => 
          session.date === dateStr && session.endTime
        );
        
        // Convert seconds to hours for display
        const totalSeconds = daySessions.reduce((sum, session) => sum + session.duration, 0);
        weeklyData[i] = Math.round((totalSeconds / 3600) * 10) / 10; // Hours with 1 decimal
      }

      return weeklyData;
    } catch (error) {
      console.error('Error calculating weekly data:', error);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  };

  // Use real weekly data
  const [weeklyReadingData, setWeeklyReadingData] = useState([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const loadWeeklyData = async () => {
      const weeklyData = await calculateWeeklyReadingData();
      setWeeklyReadingData(weeklyData);
    };
    
    if (currentUserId) {
      loadWeeklyData();
    }
  }, [currentUserId, readingStats]);

  // Calculate real statistics from user data
  const userBooks = books.filter(book => book.userId === currentUserId);
  const completedBooks = userBooks.filter(book => book.status === 'COMPLETED');
  const totalBooks = userBooks.length;
  const totalPagesRead = readingStats ? readingStats.totalPagesRead : 0;
  const readingTimeHours = readingStats ? Math.round(readingStats.totalMinutesRead / 60) : 0;

  // Calculate genre distribution from real books
  const genreDistribution = calculateGenreDistribution(userBooks);

  // Calculate average rating
  const booksWithRatings = userBooks.filter(book => (book as any).rating > 0);
  const averageRating = booksWithRatings.length > 0 
    ? (booksWithRatings.reduce((sum, book) => sum + (book as any).rating, 0) / booksWithRatings.length).toFixed(1)
    : '0.0';

  // Real statistics object
  const stats = {
    totalBooks,
    booksCompleted: completedBooks.length,
    pagesRead: totalPagesRead,
    readingTime: readingTimeHours,
    averageRating: parseFloat(averageRating),
    currentStreak: readingStats ? readingStats.currentStreak : 0,
    longestStreak: readingStats ? readingStats.longestStreak : 0,
    weeklyReadingData,
    genreDistribution,
  };

  // Calculate genre distribution
  function calculateGenreDistribution(books: any[]) {
    if (books.length === 0) {
      return [
        { genre: 'Henüz kitap yok', percentage: 100, color: '#9CA3AF' }
      ];
    }

    const genreCounts: Record<string, number> = {};
    books.forEach(book => {
      const genre = book.genre || 'Diğer';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });

    const genreEntries = Object.entries(genreCounts);
    const total = books.length;

    const colors = ['#007AFF', '#4CAF50', '#FF6B6B', '#8B5CF6', '#FFB800'];
    
    return genreEntries
      .map(([genre, count], index) => ({
        genre,
        percentage: Math.round((count / total) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 genres
  }

  const StatCard = ({ icon, label, value, color = Colors.primary, subtitle = '' }) => (
    <Surface style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color={Colors.surface} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </Surface>
  );

  const StreakCard = ({ currentStreak, longestStreak }) => (
    <Surface style={styles.streakCard}>
      <View style={styles.streakHeader}>
        <MaterialCommunityIcons name="fire" size={28} color={Colors.warning} />
        <Text style={styles.streakTitle}>Okuma Serisi</Text>
      </View>
      <View style={styles.streakStats}>
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>Mevcut Seri</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>{longestStreak}</Text>
          <Text style={styles.streakLabel}>En Uzun Seri</Text>
        </View>
      </View>
    </Surface>
  );

  const GenreChart = ({ genreDistribution }) => (
    <Surface style={styles.genreCard}>
      <View style={styles.genreHeader}>
        <MaterialCommunityIcons name="chart-pie" size={24} color={Colors.primary} />
        <Text style={styles.genreTitle}>Tür Dağılımı</Text>
      </View>
      <View style={styles.genreList}>
        {genreDistribution.map((item, index) => (
          <View key={index} style={styles.genreItem}>
            <View style={styles.genreInfo}>
              <View style={[styles.genreColorDot, { backgroundColor: item.color }]} />
              <Text style={styles.genreLabel}>{item.genre}</Text>
            </View>
            <View style={styles.genreBarContainer}>
              <View 
                style={[
                  styles.genreBar, 
                  { 
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }
                ]} 
              />
            </View>
            <Text style={styles.genrePercentage}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </Surface>
  );

  const WeeklyChart = ({ weeklyData }) => {
    const maxHours = Math.max(...weeklyData, 1); // Minimum 1 to avoid division by zero
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    
    return (
      <Surface style={styles.weeklyCard}>
        <View style={styles.weeklyHeader}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={Colors.primary} />
          <Text style={styles.weeklyTitle}>Haftalık Okuma</Text>
        </View>
        <View style={styles.weeklyContainer}>
          {weeklyData.map((hours, index) => (
            <View key={index} style={styles.weeklyDayContainer}>
              <View style={styles.weeklyBarContainer}>
                <View 
                  style={[
                    styles.weeklyBar, 
                    { 
                      height: `${Math.max((hours / maxHours) * 100, 5)}%`, // Minimum 5% height
                      backgroundColor: hours > 0 ? Colors.primary : Colors.backgroundGray
                    }
                  ]} 
                />
              </View>
              <Text style={styles.weeklyDay}>{days[index]}</Text>
              <Text style={styles.weeklyHours}>{hours > 0 ? `${hours}s` : '0s'}</Text>
            </View>
          ))}
        </View>
        {weeklyData.every(h => h === 0) && (
          <Text style={styles.emptyWeeklyText}>Bu hafta henüz okuma yapılmamış</Text>
        )}
      </Surface>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#8B5CF6" barStyle="light-content" />
        <View style={styles.modernHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İstatistikler</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="chart-line" size={64} color="#8B5CF6" />
          <Text style={styles.loadingText}>İstatistikler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#8B5CF6" barStyle="light-content" />
      
      {/* Modern Gradient Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İstatistikler</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Stats Cards */}
        <View style={styles.heroStatsContainer}>
          <View style={styles.heroStatCard}>
            <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialCommunityIcons name="book-multiple" size={24} color="#4CAF50" />
            </View>
            <View style={styles.heroStatContent}>
              <Text style={styles.heroStatValue}>{stats.totalBooks}</Text>
              <Text style={styles.heroStatLabel}>Toplam Kitap</Text>
            </View>
          </View>

          <View style={styles.heroStatCard}>
            <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#FF6B6B" />
            </View>
            <View style={styles.heroStatContent}>
              <Text style={styles.heroStatValue}>{stats.booksCompleted}</Text>
              <Text style={styles.heroStatLabel}>Tamamlanan</Text>
            </View>
          </View>
        </View>

        {/* Reading Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <MaterialCommunityIcons name="file-document" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.pagesRead}</Text>
              <Text style={styles.statLabel}>Okunan Sayfa</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB800" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.readingTime}</Text>
              <Text style={styles.statLabel}>Okuma Saati</Text>
            </View>
          </View>
        </View>

        {/* Streak Section */}
        <View style={styles.modernStreakCard}>
          <View style={styles.modernStreakHeader}>
            <MaterialCommunityIcons name="fire" size={28} color="#FF6B6B" />
            <Text style={styles.modernStreakTitle}>Okuma Serisi</Text>
          </View>
          <View style={styles.modernStreakStats}>
            <View style={styles.modernStreakItem}>
              <Text style={styles.modernStreakValue}>{stats.currentStreak}</Text>
              <Text style={styles.modernStreakLabel}>Mevcut Seri</Text>
            </View>
            <View style={styles.modernStreakDivider} />
            <View style={styles.modernStreakItem}>
              <Text style={styles.modernStreakValue}>{stats.longestStreak}</Text>
              <Text style={styles.modernStreakLabel}>En Uzun Seri</Text>
            </View>
          </View>
        </View>

        {/* Weekly Reading Chart */}
        <View style={styles.modernWeeklyCard}>
          <View style={styles.modernWeeklyHeader}>
            <MaterialCommunityIcons name="chart-bar" size={24} color="#007AFF" />
            <Text style={styles.modernWeeklyTitle}>📊 Haftalık Okuma</Text>
          </View>
          <View style={styles.modernWeeklyChart}>
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => {
              const value = weeklyReadingData[index] || 0;
              // If no data, show some sample data so chart isn't completely empty
              const displayValue = value > 0 ? value : (Math.random() * 0.5 + 0.1); 
              const maxValue = Math.max(...weeklyReadingData, 1);
              const height = Math.max((displayValue / Math.max(maxValue, 1)) * 100, 5);
              
              return (
                <View key={day} style={styles.modernChartBar}>
                  <View style={[styles.modernBarFill, { 
                    height: `${height}%`,
                    backgroundColor: value > 0 ? '#007AFF' : '#E5E7EB'
                  }]} />
                  <Text style={styles.modernBarValue}>
                    {value > 0 ? `${value.toFixed(1)}h` : '0.0h'}
                  </Text>
                  <Text style={styles.modernBarLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Genre Distribution */}
        <View style={styles.modernGenreCard}>
          <View style={styles.modernGenreHeader}>
            <MaterialCommunityIcons name="chart-pie" size={24} color="#4CAF50" />
            <Text style={styles.modernGenreTitle}>📚 Tür Dağılımı</Text>
          </View>
          <View style={styles.modernGenreList}>
            {genreDistribution.map((item, index) => (
              <View key={index} style={styles.modernGenreItem}>
                <View style={styles.modernGenreInfo}>
                  <View style={[styles.modernGenreColorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.modernGenreLabel}>{item.genre}</Text>
                </View>
                <View style={styles.modernGenreBarContainer}>
                  <View 
                    style={[
                      styles.modernGenreBar, 
                      { 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.modernGenrePercentageText}>{item.percentage}%</Text>
              </View>
            ))}
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
    backgroundColor: Colors.background,
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: '#8B5CF6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  backButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  heroStatCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  heroStatContent: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  heroStatLabel: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  streakStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  streakLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  genreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  genreTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  genreList: {
    gap: Spacing.md,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  genreColorDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  genreLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  genreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  genreBar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  genrePercentage: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    width: 40,
    textAlign: 'right',
  },
  weeklyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  weeklyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  weeklyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  weeklyDayContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  weeklyBarContainer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  weeklyBar: {
    width: 16,
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  weeklyDay: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  weeklyHours: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    fontWeight: '600',
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
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
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  ratingTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  ratingContent: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: Spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyWeeklyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modernStreakCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  modernStreakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modernStreakTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  modernStreakStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernStreakItem: {
    flex: 1,
    alignItems: 'center',
  },
  modernStreakValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  modernStreakLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modernStreakUnit: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  modernStreakDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  modernWeeklyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  modernWeeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modernWeeklyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  modernWeeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  modernChartBar: {
    flex: 1,
    alignItems: 'center',
  },
  modernBarFill: {
    flex: 1,
    height: 80,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  modernBarValue: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    fontWeight: '600',
  },
  modernBarLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modernGenreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  modernGenreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modernGenreTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  modernGenreList: {
    gap: Spacing.md,
  },
  modernGenreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modernGenreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  modernGenreColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  modernGenreLabel: {
    fontSize: FontSizes.sm,
    color: '#2C3E50',
    fontWeight: '500',
    flex: 1,
  },
  modernGenreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  modernGenreBar: {
    height: '100%',
    borderRadius: 4,
  },
  modernGenrePercentageText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#2C3E50',
    width: 45,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: Spacing.xxl,
  },
});

export default StatsScreen; 