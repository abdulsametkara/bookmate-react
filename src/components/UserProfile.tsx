import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/core';
import type { RootState, AppDispatch } from '../store';
import * as bookSliceActions from '../store/bookSlice';
import UserManager, { User } from '../utils/userManager';
import ReadingSessionManager, { ReadingStats } from '../utils/readingSessionManager';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/theme';
import ProgressModal from '../components/ProgressModal';
import CustomToast from '../components/CustomToast';

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
  
  // Modal ve toast state'leri
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastMessage, setToastMessage] = useState('');

  // Debug modal state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 UserProfile Modal state changed - visible:', logoutModalVisible);
    }
  }, [logoutModalVisible]);

  // Toast gösterme fonksiyonu
  const showToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // Load user data and reading stats
  const loadData = useCallback(async () => {
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
  }, [currentUserId]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when screen comes into focus (after editing profile)
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadData();
      }
    }, [currentUserId, loadData])
  );

  // Calculate stats
  const userBooks = books.filter(book => book.userId === currentUserId);
  const completedBooks = userBooks.filter(book => book.status === 'COMPLETED').length;
  const currentlyReading = userBooks.filter(book => book.status === 'READING').length;
  const totalBooks = userBooks.length;
  
  // Get actual reading time from reading sessions
  const totalReadingTime = readingStats ? readingStats.totalMinutesRead : 0;

  // Handle logout
  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  // Gerçek çıkış işlemini gerçekleştir
  const performLogout = async () => {
    try {
      console.log('Logout pressed - starting logout process');
      
      // Use UserManager logout
      const success = await UserManager.logout();
      
      if (success) {
        console.log('Logout completed successfully');
        setLogoutModalVisible(false);
        showToast('success', 'Başarıyla çıkış yapıldı');
        // AppNavigator will automatically detect session change and redirect to login
      } else {
        setLogoutModalVisible(false);
        showToast('error', 'Çıkış yaparken bir hata oluştu.');
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutModalVisible(false);
      showToast('error', 'Çıkış yaparken bir hata oluştu.');
    }
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
        {/* Header with Title - Remove duplicate "Profil" */}
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.cardTitle}>Hesap Bilgileri</Text>
          </View>
          {!isGuestUser && (
            <TouchableOpacity style={styles.settingsIcon} onPress={onNavigateToSettings}>
              <MaterialCommunityIcons name="cog" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons 
              name={isGuestUser ? "account-outline" : "account"} 
              size={72} 
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
                size={18} 
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
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="book-multiple" size={28} color="#007AFF" />
            </View>
            <Text style={styles.statValue}>{totalBooks}</Text>
            <Text style={styles.statLabel}>Kitaplar</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="timer-outline" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.statValue}>{totalReadingTime} dk</Text>
            <Text style={styles.statLabel}>Okuma Süresi</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="target" size={28} color="#4ECDC4" />
            </View>
            <Text style={styles.statValue}>
              {currentUser?.preferences?.readingGoal || 30} dk
            </Text>
            <Text style={styles.statLabel}>Günlük Hedef</Text>
          </View>
        </View>

        {/* Compact Action Buttons */}
        <View style={styles.actionsContainer}>
          {isGuestUser ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGuestRegister}>
                <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Hesap Oluştur</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleGuestLogin}>
                <MaterialCommunityIcons name="login" size={20} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.compactLogoutButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={16} color="#FF3B30" />
              <Text style={styles.compactLogoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          )}
        </View>
      </Surface>



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

      {/* Logout Modal */}
      <ProgressModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        type="warning"
        title="Çıkış Yap"
        subtitle="Hesabınızdan çıkmak istediğinizden emin misiniz?"
        actionType="logout"
        onAction={(action) => {
          if (action === 'logout') {
            performLogout();
          }
        }}
      />
      
      {/* Custom Toast */}
      <CustomToast
        visible={toastVisible}
        type={toastType}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: '#FAFAFA',
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Spacing.xxl,
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsIcon: {
    padding: Spacing.md,
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    elevation: 2,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userType: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xxl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  secondaryButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  compactLogoutButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE5E5',
    alignSelf: 'flex-start',
  },
  compactLogoutText: {
    color: '#FF3B30',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  additionalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
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
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#2C3E50',
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  infoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: FontSizes.md * 1.5,
  },
});

export default UserProfile; 