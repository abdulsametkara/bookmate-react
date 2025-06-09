import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import { Colors, FontSizes, Spacing } from '../theme/theme';

const { width } = Dimensions.get('window');

const ReadingStatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const books = useSelector((state: RootState) => state.books.items);
  
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const userBooks = books.filter(book => book.userId === currentUserId);
  const completedBooks = userBooks.filter(book => book.status === 'COMPLETED');
  const totalBooks = userBooks.length;
  const totalPagesRead = readingStats ? readingStats.totalPagesRead : 0;
  const readingTimeHours = readingStats ? Math.round(readingStats.totalMinutesRead / 60) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0F23', '#1A1A2E', '#16213E', '#0F3460', '#001122']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Custom Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Okuma İstatistikleri</Text>
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
                <LinearGradient
                  colors={['rgba(76, 175, 80, 0.3)', 'rgba(76, 175, 80, 0.1)']}
                  style={styles.heroStatGradient}
                >
                  <MaterialCommunityIcons name="book-multiple" size={32} color="#4CAF50" />
                  <Text style={styles.heroStatValue}>{totalBooks}</Text>
                  <Text style={styles.heroStatLabel}>Toplam Kitap</Text>
                </LinearGradient>
              </View>

              <View style={styles.heroStatCard}>
                <LinearGradient
                  colors={['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.1)']}
                  style={styles.heroStatGradient}
                >
                  <MaterialCommunityIcons name="check-circle" size={32} color="#FF6B6B" />
                  <Text style={styles.heroStatValue}>{completedBooks.length}</Text>
                  <Text style={styles.heroStatLabel}>Tamamlanan</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Reading Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                  style={styles.statCardGradient}
                >
                  <MaterialCommunityIcons name="file-document" size={24} color="#8B5CF6" />
                  <Text style={styles.statValue}>{totalPagesRead}</Text>
                  <Text style={styles.statLabel}>Okunan Sayfa</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.1)']}
                  style={styles.statCardGradient}
                >
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#FFB800" />
                  <Text style={styles.statValue}>{readingTimeHours}</Text>
                  <Text style={styles.statLabel}>Okuma Saati</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Streak Section */}
            <View style={styles.streakCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.streakGradient}
              >
                <View style={styles.streakHeader}>
                  <MaterialCommunityIcons name="fire" size={28} color="#FF6B6B" />
                  <Text style={styles.streakTitle}>Okuma Serisi</Text>
                </View>
                <View style={styles.streakStats}>
                  <View style={styles.streakItem}>
                    <Text style={styles.streakValue}>{readingStats?.currentStreak || 0}</Text>
                    <Text style={styles.streakLabel}>Mevcut Seri</Text>
                  </View>
                  <View style={styles.streakDivider} />
                  <View style={styles.streakItem}>
                    <Text style={styles.streakValue}>{readingStats?.longestStreak || 0}</Text>
                    <Text style={styles.streakLabel}>En Uzun Seri</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Average Reading Speed */}
            <View style={styles.speedCard}>
              <LinearGradient
                colors={['rgba(100, 255, 218, 0.1)', 'rgba(100, 255, 218, 0.05)']}
                style={styles.speedGradient}
              >
                <View style={styles.speedHeader}>
                  <MaterialCommunityIcons name="speedometer" size={24} color="#64FFDA" />
                  <Text style={styles.speedTitle}>Ortalama Okuma Hızı</Text>
                </View>
                <View style={styles.speedContent}>
                  <Text style={styles.speedValue}>
                    {readingStats && readingStats.totalSessions > 0 
                      ? Math.round((readingStats.totalPagesRead / (readingStats.totalMinutesRead / 60))) 
                      : 0
                    }
                  </Text>
                  <Text style={styles.speedLabel}>sayfa/saat</Text>
                </View>
              </LinearGradient>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  heroStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroStatGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: Spacing.sm,
  },
  heroStatLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  streakCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  streakGradient: {
    padding: Spacing.xl,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  streakLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  speedCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  speedGradient: {
    padding: Spacing.xl,
  },
  speedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  speedTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  speedContent: {
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#64FFDA',
  },
  speedLabel: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
});

export default ReadingStatsScreen; 