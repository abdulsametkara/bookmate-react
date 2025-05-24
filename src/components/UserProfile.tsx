import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet 
} from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import * as bookSliceActions from '../store/bookSlice';
import UserManager from '../utils/userManager';
import type { User } from '../utils/userManager';
import ReadingSessionManager from '../utils/readingSessionManager';
import type { ReadingStats } from '../utils/readingSessionManager';
import { DebugUtils } from '../utils/debugUtils';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

interface UserProfileProps {
  onNavigateToSettings?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  onNavigateToSettings 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const books = useSelector((state: RootState) => state.books.items);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data and reading stats
  useEffect(() => {
    const loadData = async () => {
      try {
        if (currentUserId) {
          const user = await UserManager.getUserById(currentUserId);
          setCurrentUser(user);

          // Load reading statistics
          const stats = await ReadingSessionManager.getUserStats(currentUserId);
          setReadingStats(stats);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUserId]);

  // Calculate stats
  const userBooks = books.filter(book => book.userId === currentUserId);
  const completedBooks = userBooks.filter(book => book.status === 'COMPLETED').length;
  const currentlyReading = userBooks.filter(book => book.status === 'READING').length;
  const totalBooks = userBooks.length;
  
  // Get actual reading time from reading sessions
  const totalReadingTime = readingStats ? readingStats.totalMinutesRead : 0;

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Logout pressed - starting logout process');
              
              // Use UserManager logout
              const success = await UserManager.logout();
              
              if (success) {
                console.log('Logout completed successfully');
                // AppNavigator will automatically detect session change and redirect to login
              } else {
                Alert.alert('Hata', 'Çıkış yaparken bir hata oluştu.');
              }
              
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Hata', 'Çıkış yaparken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const isGuestUser = currentUserId === 'guest_user';

  // Handle guest user actions
  const handleGuestRegister = () => {
    Alert.alert('Bilgi', 'Hesap oluşturma özelliği yakında eklenecek.');
  };

  const handleGuestLogin = () => {
    Alert.alert('Bilgi', 'Giriş özelliği yakında eklenecek.');
  };

  if (loading) {
    return (
      <Surface style={styles.container}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </Surface>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Profile Card */}
      <Surface style={styles.profileCard}>
        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons 
              name={isGuestUser ? "account-outline" : "account"} 
              size={64} 
              color={isGuestUser ? Colors.textSecondary : Colors.primary} 
            />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {currentUser?.displayName || 'Misafir Kullanıcı'}
            </Text>
            {currentUser?.email && (
              <Text style={styles.email}>{currentUser.email}</Text>
            )}
            <View style={styles.userTypeContainer}>
              <MaterialCommunityIcons 
                name={isGuestUser ? "account-outline" : "shield-check"} 
                size={16} 
                color={isGuestUser ? Colors.warning : Colors.success} 
              />
              <Text style={[styles.userType, { 
                color: isGuestUser ? Colors.warning : Colors.success 
              }]}>
                {isGuestUser ? 'Misafir Kullanıcı' : 'Kayıtlı Kullanıcı'}
              </Text>
            </View>
          </View>
        </View>

        {/* User Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="book-multiple" size={24} color="#1f2d50" />
            <Text style={styles.statValue}>{totalBooks}</Text>
            <Text style={styles.statLabel}>Kitaplar</Text>
          </View>
          
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="timer-outline" size={24} color="#1f2d50" />
            <Text style={styles.statValue}>{totalReadingTime} dk</Text>
            <Text style={styles.statLabel}>Okuma Süresi</Text>
          </View>
          
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="target" size={24} color="#1f2d50" />
            <Text style={styles.statValue}>
              {currentUser?.preferences?.readingGoal || 30} dk
            </Text>
            <Text style={styles.statLabel}>Günlük Hedef</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isGuestUser ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGuestRegister}>
                <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Hesap Oluştur</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleGuestLogin}>
                <MaterialCommunityIcons name="login" size={20} color="#1f2d50" />
                <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.settingsButton} onPress={onNavigateToSettings}>
                <MaterialCommunityIcons name="cog" size={20} color="#1f2d50" />
                <Text style={styles.settingsButtonText}>Ayarlar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={async () => {
                  if (currentUserId) {
                    await DebugUtils.logUserData(currentUserId);
                  }
                }}
              >
                <MaterialCommunityIcons name="bug" size={20} color="#1f2d50" />
                <Text style={styles.debugButtonText}>Debug Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Surface>

      {/* Additional Info Cards */}
      {totalBooks > 0 && (
        <Surface style={styles.additionalCard}>
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Okuma İlerlemesi</Text>
            <View style={styles.progressStats}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{completedBooks}</Text>
                <Text style={styles.progressLabel}>Tamamlandı</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{currentlyReading}</Text>
                <Text style={styles.progressLabel}>Okunuyor</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{totalBooks - completedBooks - currentlyReading}</Text>
                <Text style={styles.progressLabel}>Bekliyor</Text>
              </View>
            </View>
          </View>
        </Surface>
      )}

      {/* Info Section for Guest Users */}
      {isGuestUser && (
        <Surface style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="information" size={24} color={Colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Hesap Oluşturun</Text>
              <Text style={styles.infoDescription}>
                Verilerinizi güvende tutmak ve cihazlar arası senkronizasyon için hesap oluşturun.
              </Text>
            </View>
          </View>
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userType: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#1f2d50',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  secondaryButton: {
    backgroundColor: '#e6ebff',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d9ff',
  },
  secondaryButtonText: {
    color: '#1f2d50',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  settingsButton: {
    backgroundColor: '#e6ebff',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsButtonText: {
    color: '#1f2d50',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  debugButton: {
    backgroundColor: '#e6ebff',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  debugButtonText: {
    color: '#1f2d50',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  additionalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#1f2d50',
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  infoCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: FontSizes.sm * 1.4,
  },
});

export default UserProfile; 