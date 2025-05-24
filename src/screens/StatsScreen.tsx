import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
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
        
        const totalMinutes = daySessions.reduce((sum, session) => sum + session.duration, 0);
        weeklyData[i] = Math.round(totalMinutes / 60 * 10) / 10; // Hours with 1 decimal
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
        { genre: 'Henüz kitap yok', percentage: 100, color: Colors.textSecondary }
      ];
    }

    const genreCounts: Record<string, number> = {};
    books.forEach(book => {
      const genre = book.genre || 'Diğer';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });

    const genreEntries = Object.entries(genreCounts);
    const total = books.length;

    const colors = [Colors.primary, Colors.success, Colors.warning, Colors.info, Colors.error];
    
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
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İstatistikler</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İstatistikler</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        <View style={styles.overviewGrid}>
          <StatCard
            icon="book-multiple"
            label="Toplam Kitap"
            value={stats.totalBooks}
            color={Colors.primary}
          />
          <StatCard
            icon="check-circle"
            label="Tamamlanan"
            value={stats.booksCompleted}
            color={Colors.success}
          />
          <StatCard
            icon="file-document"
            label="Okunan Sayfa"
            value={stats.pagesRead.toLocaleString()}
            color={Colors.info}
          />
          <StatCard
            icon="clock"
            label="Okuma Süresi"
            value={stats.readingTime}
            subtitle="saat"
            color={Colors.warning}
          />
        </View>

        {/* Reading Streak */}
        <StreakCard 
          currentStreak={stats.currentStreak}
          longestStreak={stats.longestStreak}
        />

        {/* Genre Distribution */}
        <GenreChart genreDistribution={stats.genreDistribution} />

        {/* Weekly Reading */}
        <WeeklyChart weeklyData={stats.weeklyReadingData} />

        {/* Average Rating */}
        <Surface style={styles.ratingCard}>
          <View style={styles.ratingHeader}>
            <MaterialCommunityIcons name="star" size={24} color={Colors.warning} />
            <Text style={styles.ratingTitle}>Ortalama Değerlendirme</Text>
          </View>
          <View style={styles.ratingContent}>
            <Text style={styles.ratingValue}>{stats.averageRating}</Text>
            <View style={styles.starsContainer}>
              {Array.from({ length: 5 }, (_, index) => {
                const star = index + 1;
                return (
                  <React.Fragment key={`star-${star}`}>
                    <MaterialCommunityIcons
                      name={star <= stats.averageRating ? "star" : "star-outline"}
                      size={20}
                      color={Colors.warning}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </Surface>
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
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
});

export default StatsScreen; 