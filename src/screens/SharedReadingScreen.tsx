import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  getSharedReadingSessions,
  getFriends,
  getIncomingFriendRequests,
  getUserBadges,
  SharedReadingSession,
  User,
  FriendRequest,
} from '../services/sharedReadingApi';

const { width, height } = Dimensions.get('window');

// Enhanced Toast Component
const Toast = ({ visible, message, type = 'success', onHide }: {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onHide: () => void;
}) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const getToastColor = () => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'info': return '#3B82F6';
      default: return '#10B981';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getToastColor(),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <MaterialCommunityIcons 
        name={type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'information'} 
        size={20} 
        color="#fff" 
      />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const SharedReadingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<SharedReadingSession[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 SharedReadingScreen: Loading data...');
      
      const [sessionsData, friendsData, requestsData, badgesData] = await Promise.allSettled([
        getSharedReadingSessions(),
        getFriends(),
        getIncomingFriendRequests(),
        getUserBadges(),
      ]);

      if (sessionsData.status === 'fulfilled') {
        console.log('✅ Sessions loaded:', sessionsData.value.length);
        setSessions(sessionsData.value);
      } else {
        console.error('❌ Sessions failed:', sessionsData.reason);
        setSessions([]);
      }

      if (friendsData.status === 'fulfilled') {
        console.log('✅ Friends loaded:', friendsData.value.length);
        setFriends(friendsData.value);
      } else {
        console.error('❌ Friends failed:', friendsData.reason);
        setFriends([]);
      }

      if (requestsData.status === 'fulfilled') {
        console.log('✅ Friend requests loaded:', requestsData.value.length);
        setFriendRequests(requestsData.value);
      } else {
        console.error('❌ Friend requests failed:', requestsData.reason);
        setFriendRequests([]);
      }

      if (badgesData.status === 'fulfilled') {
        console.log('✅ Badges loaded:', badgesData.value.length);
        setBadges(badgesData.value);
      } else {
        console.error('❌ Badges failed:', badgesData.reason);
        setBadges([]);
      }

      console.log('✅ SharedReadingScreen: All data loaded');
    } catch (error) {
      console.error('❌ SharedReadingScreen: Error loading data:', error);
      showToast('Veriler yüklenirken bir hata oluştu', 'error');
    } finally {
      console.log('✅ SharedReadingScreen: Setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 SharedReadingScreen: Component mounted');
    
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ SharedReadingScreen: Loading timeout reached, forcing content to show');
      setLoading(false);
    }, 5000);

    loadData();
    
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 SharedReadingScreen focused, reloading data...');
      loadData();
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [loadData, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleStartSharedReading = () => {
    if (friends.length === 0) {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      Alert.alert(
        '👥 Arkadaş Gerekli!',
        'Ortak okuma başlatmak için önce arkadaş eklemelisiniz. Partner Ara butonuna tıklayarak arkadaş bulabilirsiniz.',
        [
          { text: 'Partner Ara', onPress: () => navigation.navigate('PartnerSearch' as never) },
          { text: 'Tamam', style: 'cancel' },
        ]
      );
      return;
    }
    navigation.navigate('StartSharedReading' as never);
  };

  const getReadingModeText = (mode: string) => {
    const modeMap: { [key: string]: string } = {
      'same_book': 'Aynı Kitap',
      'different_books': 'Farklı Kitaplar',
      'book_club': 'Kitap Kulübü',
    };
    return modeMap[mode] || mode;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'active': '#10B981',
      'paused': '#F59E0B',
      'completed': '#3B82F6',
    };
    return colorMap[status] || '#6B7280';
  };

  const getStatusIcon = (status: string) => {
    const iconMap: { [key: string]: string } = {
      'active': 'play-circle',
      'paused': 'pause-circle',
      'completed': 'checkmark-circle',
    };
    return iconMap[status] || 'ellipse';
  };

  if (loading) {
    const spinValue = new Animated.Value(0);
    
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#fff" />
            </Animated.View>
            <Text style={styles.loadingText}>Ortak Okuma Yükleniyor...</Text>
            <Text style={styles.loadingSubtext}>Arkadaşlarınız ve oturumlarınız hazırlanıyor</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ortak Okuma</Text>
            <Text style={styles.headerSubtitle}>Arkadaşlarınla okuma deneyimini paylaş</Text>
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity: animatedValue }]}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor="#fff"
                colors={['#3B82F6']}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{friends.length}</Text>
                <Text style={styles.statLabel}>Arkadaş</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{sessions.length}</Text>
                <Text style={styles.statLabel}>Aktif Oturum</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="trophy" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{badges.length}</Text>
                <Text style={styles.statLabel}>Rozet</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate('PartnerSearch' as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#EF4444' }]}>
                    <MaterialCommunityIcons name="account-search" size={28} color="#fff" />
                  </View>
                  <Text style={styles.quickActionTitle}>Partner Ara</Text>
                  <Text style={styles.quickActionSubtitle}>Yeni arkadaşlar bul</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={handleStartSharedReading}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
                    <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                  </View>
                  <Text style={styles.quickActionTitle}>Yeni Oturum</Text>
                  <Text style={styles.quickActionSubtitle}>Okuma başlat</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate('SharedLibraries' as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
                    <MaterialCommunityIcons name="library" size={28} color="#fff" />
                  </View>
                  <Text style={styles.quickActionTitle}>Ortak Kütüphane</Text>
                  <Text style={styles.quickActionSubtitle}>Kitap koleksiyonları</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => navigation.navigate('FriendRequests' as never)}
                  activeOpacity={0.8}
                  style={[styles.quickActionCard, friendRequests.length === 0 && { opacity: 0.6 }]}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
                    <MaterialCommunityIcons name="email" size={28} color="#fff" />
                    {friendRequests.length > 0 && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>{friendRequests.length}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickActionTitle}>İstekler</Text>
                  <Text style={styles.quickActionSubtitle}>
                    {friendRequests.length > 0 ? `${friendRequests.length} yeni` : 'Bekleyen yok'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active Sessions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📖 Aktif Oturumlar</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{sessions.length}</Text>
                </View>
              </View>
              
              {sessions.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialCommunityIcons name="book-outline" size={64} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.emptyStateTitle}>Henüz aktif oturumun yok</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Arkadaşlarınla okuma macerasına başla!
                  </Text>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartSharedReading}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>İlk Oturumunu Başlat</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => navigation.navigate('SharedReadingSession' as never, { sessionId: session.id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.sessionHeader}>
                      <View style={styles.sessionTitleContainer}>
                        <Text style={styles.sessionTitle}>{session.title}</Text>
                        <View style={styles.sessionModeContainer}>
                          <MaterialCommunityIcons name="book-variant" size={14} color="#9CA3AF" />
                          <Text style={styles.sessionModeText}>{getReadingModeText(session.reading_mode)}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                        <MaterialCommunityIcons name={getStatusIcon(session.status) as any} size={12} color="#fff" />
                        <Text style={styles.statusText}>{session.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    {session.description && (
                      <Text style={styles.sessionDescription} numberOfLines={2}>
                        {session.description}
                      </Text>
                    )}
                    
                    <View style={styles.sessionFooter}>
                      <View style={styles.participantInfo}>
                        <MaterialCommunityIcons name="account-group" size={16} color="#3B82F6" />
                        <Text style={styles.participantCount}>
                          {session.partner_ids.length + 1} Katılımcı
                        </Text>
                      </View>
                      <Text style={styles.sessionDate}>
                        {new Date(session.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.sessionProgress}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '65%' }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Friends Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👥 Arkadaşlarım</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{friends.length}</Text>
                </View>
              </View>
              
              {friends.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialCommunityIcons name="account-plus-outline" size={64} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.emptyStateTitle}>Henüz arkadaşın yok</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Okuma arkadaşları bularak deneyimini zenginleştir
                  </Text>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate('PartnerSearch' as never)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="account-search" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>Arkadaş Ara</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsList}>
                  {friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('FriendProfile' as never, { friendId: friend.id } as never)}
                    >
                      <View style={styles.friendAvatar}>
                        {(friend as any).avatar ? (
                          <Image source={{ uri: (friend as any).avatar }} style={styles.friendAvatarImage} />
                        ) : (
                          <MaterialCommunityIcons name="account" size={32} color="#3B82F6" />
                        )}
                        <View style={[styles.statusIndicator, { backgroundColor: (friend as any).status === 'online' ? '#10B981' : '#6B7280' }]} />
                      </View>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {friend.displayName || friend.email?.split('@')[0]}
                      </Text>
                      <Text style={styles.friendStatus}>
                        {(friend as any).relationshipType || 'Arkadaş'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>

        {/* Toast */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },

  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sectionCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sessionModeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sessionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  sessionProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  friendsList: {
    paddingLeft: 0,
  },
  friendCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    width: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendAvatar: {
    position: 'relative',
    marginBottom: 12,
  },
  friendAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  friendName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  friendStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default SharedReadingScreen; 