import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  respondToFriendRequest,
  FriendRequest,
} from '../services/sharedReadingApi';

const { width } = Dimensions.get('window');

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

const FriendRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingToRequest, setRespondingToRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const relationshipEmojis: { [key: string]: string } = {
    'lover': '💕',
    'best_friend': '👫',
    'reading_buddy': '📚',
    'family': '👨‍👩‍👧‍👦',
    'classmate': '🎓',
  };

  const relationshipLabels: { [key: string]: string } = {
    'lover': 'Sevgili/Eş',
    'best_friend': 'En Yakın Arkadaş',
    'reading_buddy': 'Okuma Arkadaşı',
    'family': 'Aile Üyesi',
    'classmate': 'Okul Arkadaşı',
  };

    const loadRequests = useCallback(async () => {
    try {
      setError(null); // Clear previous errors
      
      // 10 saniyelik timeout ekle
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const result = await Promise.race([
        Promise.all([
          getIncomingFriendRequests().catch(err => {
            console.error('❌ Incoming requests error:', err);
            throw err; // Re-throw to be caught by outer catch
          }),
          getOutgoingFriendRequests().catch(err => {
            console.error('❌ Outgoing requests error:', err);
            throw err; // Re-throw to be caught by outer catch
          }),
        ]),
        timeoutPromise
      ]);

      const [incoming, outgoing] = result as [any[], any[]];
      
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setError(null);
    } catch (error) {
      console.error('❌ FriendRequestsScreen: Error loading friend requests:', error);
      
      // Hata durumunda boş listeler set et ve kullanıcıya bilgi ver
      setIncomingRequests([]);
      setOutgoingRequests([]);
      
      if (error.message === 'Request timeout') {
        setError('Bağlantı zaman aşımına uğradı. Backend server çalışmıyor olabilir.');
        showToast('Bağlantı zaman aşımına uğradı', 'error');
      } else if (error.message?.includes('Network request failed')) {
        setError('İnternet bağlantınızı kontrol edin veya backend server çalışmıyor.');
        showToast('Ağ bağlantı hatası', 'error');
      } else {
        setError('Sunucu hatası. Backend API çalışmıyor olabilir.');
        showToast('Sunucu hatası', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

    useEffect(() => {
    loadRequests();
    
    // Entrance animation
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [loadRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [loadRequests]);

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setRespondingToRequest(requestId);
    
    try {
      await respondToFriendRequest(requestId, action);
      
      // Remove the request from incoming list
      setIncomingRequests(prev => prev.filter(req => req.id !== requestId));
      
      const actionText = action === 'accept' ? 'kabul edildi' : 'reddedildi';
      showToast(`Arkadaşlık isteği ${actionText}`, 'success');
    } catch (error) {
      console.error('Error responding to request:', error);
      showToast('İstek yanıtlanırken bir hata oluştu', 'error');
    } finally {
      setRespondingToRequest(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Az önce';
    } else if (diffInHours < 24) {
      return `${diffInHours} saat önce`;
    } else if (diffInHours < 24 * 7) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  console.log('📋 FriendRequestsScreen: Current state - loading:', loading, 'incoming:', incomingRequests.length, 'outgoing:', outgoingRequests.length, 'error:', error);
  console.log('📋 FriendRequestsScreen: ActiveTab:', activeTab);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingContent, { opacity: animatedValue }]}>
              <MaterialCommunityIcons name="email" size={64} color="#3B82F6" />
              <ActivityIndicator size="large" color="#3B82F6" style={styles.loadingIndicator} />
              <Text style={styles.loadingText}>Arkadaşlık İstekleri Yükleniyor...</Text>
              <Text style={styles.loadingSubtext}>İstekleriniz hazırlanıyor</Text>
            </Animated.View>
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
            <Text style={styles.headerTitle}>Arkadaşlık İstekleri</Text>
            <Text style={styles.headerSubtitle}>Gelen ve giden isteklerinizi yönetin</Text>
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity: animatedValue }]}>
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                <MaterialCommunityIcons name="inbox" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{incomingRequests.length}</Text>
              <Text style={styles.statLabel}>Gelen</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{outgoingRequests.length}</Text>
              <Text style={styles.statLabel}>Giden</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
                <MaterialCommunityIcons name="clock" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>
                {incomingRequests.filter(r => r.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Bekleyen</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
              onPress={() => setActiveTab('incoming')}
            >
              <MaterialCommunityIcons 
                name="inbox" 
                size={18} 
                color={activeTab === 'incoming' ? '#fff' : 'rgba(255, 255, 255, 0.7)'} 
              />
              <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
                Gelen ({incomingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
              onPress={() => setActiveTab('outgoing')}
            >
              <MaterialCommunityIcons 
                name="send" 
                size={18} 
                color={activeTab === 'outgoing' ? '#fff' : 'rgba(255, 255, 255, 0.7)'} 
              />
              <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
                Giden ({outgoingRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
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
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === 'incoming' ? (
              <View style={styles.requestsList}>
                {incomingRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons 
                      name={error ? "server-network-off" : "inbox-outline"} 
                      size={80} 
                      color="rgba(255, 255, 255, 0.3)" 
                    />
                    <Text style={styles.emptyStateTitle}>
                      {error ? "Bağlantı Sorunu" : "Gelen arkadaşlık isteğiniz yok"}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {error || "Yeni arkadaşlık istekleri burada görünecek"}
                    </Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={error ? onRefresh : () => navigation.navigate('PartnerSearch' as never)}
                    >
                      <MaterialCommunityIcons 
                        name={error ? "refresh" : "account-search"} 
                        size={20} 
                        color="#fff" 
                      />
                      <Text style={styles.actionButtonText}>
                        {error ? "Tekrar Dene" : "Partner Ara"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  incomingRequests.map((request) => (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                              {request.sender?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </Text>
                          </View>
                          <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                              {request.sender?.displayName || 'Bilinmeyen kullanıcı'}
                            </Text>
                            <View style={styles.relationshipBadge}>
                              <Text style={styles.relationshipEmoji}>
                                {relationshipEmojis[request.relationship_type] || '👥'}
                              </Text>
                              <Text style={styles.relationshipText}>
                                {relationshipLabels[request.relationship_type] || request.relationship_type}
                              </Text>
                            </View>
                            <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
                          </View>
                        </View>
                      </View>

                      {request.message && (
                        <View style={styles.messageContainer}>
                          <MaterialCommunityIcons name="format-quote-open" size={16} color="#3B82F6" />
                          <Text style={styles.messageText}>"{request.message}"</Text>
                        </View>
                      )}

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButtonSmall, styles.rejectButton]}
                          onPress={() => handleRespondToRequest(request.id, 'reject')}
                          disabled={respondingToRequest === request.id}
                        >
                          {respondingToRequest === request.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <MaterialCommunityIcons name="close" size={18} color="#fff" />
                          )}
                          <Text style={styles.actionButtonTextSmall}>Reddet</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionButtonSmall, styles.acceptButton]}
                          onPress={() => handleRespondToRequest(request.id, 'accept')}
                          disabled={respondingToRequest === request.id}
                        >
                          {respondingToRequest === request.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <MaterialCommunityIcons name="check" size={18} color="#fff" />
                          )}
                          <Text style={styles.actionButtonTextSmall}>Kabul Et</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.requestsList}>
                {outgoingRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons 
                      name={error ? "server-network-off" : "send-outline"} 
                      size={80} 
                      color="rgba(255, 255, 255, 0.3)" 
                    />
                    <Text style={styles.emptyStateTitle}>
                      {error ? "Bağlantı Sorunu" : "Gönderilmiş arkadaşlık isteğiniz yok"}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {error || "Partner arayarak yeni arkadaşlık istekleri gönderebilirsiniz"}
                    </Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={error ? onRefresh : () => navigation.navigate('PartnerSearch' as never)}
                    >
                      <MaterialCommunityIcons 
                        name={error ? "refresh" : "account-search"} 
                        size={20} 
                        color="#fff" 
                      />
                      <Text style={styles.actionButtonText}>
                        {error ? "Tekrar Dene" : "Partner Ara"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  outgoingRequests.map((request) => (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                              {request.receiver?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </Text>
                          </View>
                          <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                              {request.receiver?.displayName || 'Bilinmeyen kullanıcı'}
                            </Text>
                            <View style={styles.relationshipBadge}>
                              <Text style={styles.relationshipEmoji}>
                                {relationshipEmojis[request.relationship_type] || '👥'}
                              </Text>
                              <Text style={styles.relationshipText}>
                                {relationshipLabels[request.relationship_type] || request.relationship_type}
                              </Text>
                            </View>
                            <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                          <MaterialCommunityIcons 
                            name={request.status === 'pending' ? 'clock' : 
                                  request.status === 'accepted' ? 'check' : 'close'} 
                            size={12} 
                            color="#fff" 
                          />
                          <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
                        </View>
                      </View>

                      {request.message && (
                        <View style={styles.messageContainer}>
                          <MaterialCommunityIcons name="format-quote-open" size={16} color="#3B82F6" />
                          <Text style={styles.messageText}>"{request.message}"</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
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
  loadingContent: {
    alignItems: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    fontSize: 24,
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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  requestsList: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 32,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  relationshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  relationshipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  relationshipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  requestDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
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
    fontSize: 11,
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
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
});

export default FriendRequestsScreen; 