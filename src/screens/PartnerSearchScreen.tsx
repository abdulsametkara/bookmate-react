import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchUsers, sendFriendRequest, SearchUser } from '../services/sharedReadingApi';

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

const relationshipTypes = [
  { value: 'lover', label: 'Sevgili/Eş', emoji: '💕', description: 'Romantik partner', color: '#EF4444' },
  { value: 'best_friend', label: 'En Yakın Arkadaş', emoji: '👫', description: 'Sırdaş ve yakın arkadaş', color: '#8B5CF6' },
  { value: 'reading_buddy', label: 'Okuma Arkadaşı', emoji: '📚', description: 'Kitap okuma partneri', color: '#10B981' },
  { value: 'family', label: 'Aile Üyesi', emoji: '👨‍👩‍👧‍👦', description: 'Aile fertleri', color: '#F59E0B' },
  { value: 'classmate', label: 'Okul Arkadaşı', emoji: '🎓', description: 'Okul veya üniversite arkadaşı', color: '#3B82F6' },
];

const PartnerSearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState(relationshipTypes[2].value);
  const [message, setMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));
  const [searchError, setSearchError] = useState('');

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setSearchError('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchError('En az 2 karakter girmelisiniz');
      return;
    }

    setLoading(true);
    setSearchError('');

    try {
      console.log('🔍 Searching for:', query);
      const results = await searchUsers(query);
      console.log('✅ Search results:', results);
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('Arama sonucu bulunamadı');
      }
    } catch (error: any) {
      console.error('❌ Search error:', error);
      setSearchError(error.message || 'Arama sırasında bir hata oluştu');
      showToast(error.message || 'Arama sırasında bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: SearchUser) => {
    setSelectedUser(user);
    setModalVisible(true);
    setMessage('');
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;

    setSendingRequest(true);
    try {
      const response = await sendFriendRequest({
        receiverId: selectedUser.id,
        message: message.trim() || undefined,
      });
      console.log('Arkadaşlık isteği gönderildi:', response);
      
      showToast(`${selectedUser.displayName} kullanıcısına arkadaşlık isteği gönderildi`, 'success');
      
      // Remove user from search results
      setSearchResults(prev => prev.filter(u => u.id !== selectedUser.id));
      setModalVisible(false);
      
    } catch (error: any) {
      console.error('Arkadaşlık isteği gönderme hatası:', error);
      showToast(error.message || 'Arkadaşlık isteği gönderilemedi', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const getSearchPlaceholder = () => {
    return 'İsim, kullanıcı adı veya email ile ara...';
  };

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
            <Text style={styles.headerTitle}>Partner Ara</Text>
            <Text style={styles.headerSubtitle}>İsim, kullanıcı adı veya email ile arkadaş bulun</Text>
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity: animatedValue }]}>
          
          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>🔍 Arkadaş Ara</Text>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={getSearchPlaceholder()}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchError('');
                    }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Search filters */}
              <View style={styles.searchFilters}>
                <TouchableOpacity style={[styles.filterButton, styles.filterButtonActive]}>
                  <MaterialCommunityIcons name="account" size={16} color="#fff" />
                  <Text style={styles.filterButtonText}>İsim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <MaterialCommunityIcons name="at" size={16} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={[styles.filterButtonText, { color: 'rgba(255, 255, 255, 0.7)' }]}>Kullanıcı adı</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                  <MaterialCommunityIcons name="email" size={16} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={[styles.filterButtonText, { color: 'rgba(255, 255, 255, 0.7)' }]}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Loading */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Aranıyor...</Text>
              </View>
            )}

            {/* Search Error */}
            {searchError && !loading && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Arama Hatası</Text>
                <Text style={styles.errorText}>{searchError}</Text>
              </View>
            )}

            {/* Empty state when no query */}
            {!searchQuery && !loading && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-search" size={80} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyStateTitle}>Arkadaş Keşfet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Arama çubuğuna en az 2 karakter girerek arkadaş aramaya başlayın
                </Text>
                
                {/* Search tips */}
                <View style={styles.searchTips}>
                  <View style={styles.tipItem}>
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" />
                    <Text style={styles.tipText}>Hızlı Arama</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Güvenli</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#3B82F6" />
                    <Text style={styles.tipText}>Sosyal</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && !loading && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsTitle}>
                  📋 Arama Sonuçları ({searchResults.length})
                </Text>
                <View style={styles.resultsList}>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userCard}
                      onPress={() => handleUserPress(user)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.displayName}</Text>
                        {user.username && (
                          <Text style={styles.userUsername}>@{user.username}</Text>
                        )}
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleUserPress(user)}
                      >
                        <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Friend Request Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💌 Arkadaşlık İsteği</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedUser && (
                <View style={styles.selectedUserSection}>
                  <View style={styles.selectedUserInfo}>
                    <View style={styles.selectedUserAvatar}>
                      <Text style={styles.selectedUserAvatarText}>
                        {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.selectedUserDetails}>
                      <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                      {selectedUser.username && (
                        <Text style={styles.selectedUserUsername}>@{selectedUser.username}</Text>
                      )}
                      <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                    </View>
                  </View>

                  {/* Relationship Type Selection */}
                  <View style={styles.relationshipSection}>
                    <Text style={styles.relationshipTitle}>🏷️ İlişki Türü</Text>
                    <View style={styles.relationshipGrid}>
                      {relationshipTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.relationshipCard,
                            selectedRelationship === type.value && styles.relationshipCardSelected,
                          ]}
                          onPress={() => setSelectedRelationship(type.value)}
                        >
                          <View style={[styles.relationshipIcon, { backgroundColor: type.color }]}>
                            <Text style={styles.relationshipEmoji}>{type.emoji}</Text>
                          </View>
                          <Text style={styles.relationshipLabel}>{type.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Message Input */}
                  <View style={styles.messageSection}>
                    <Text style={styles.messageLabel}>💬 Mesaj (İsteğe bağlı)</Text>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Arkadaşlık isteğiniz ile birlikte kısa bir mesaj..."
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={message}
                      onChangeText={setMessage}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                      textAlignVertical="top"
                    />
                    <Text style={styles.characterCount}>{message.length}/200</Text>
                  </View>

                  {/* Send Button */}
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      sendingRequest && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendRequest}
                    disabled={sendingRequest}
                    activeOpacity={0.8}
                  >
                    {sendingRequest ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons name="send" size={20} color="#fff" />
                    )}
                    <Text style={styles.sendButtonText}>
                      {sendingRequest ? 'Gönderiliyor...' : 'İstek Gönder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

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
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchContainer: {
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchFilters: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  searchTips: {
    flexDirection: 'row',
    gap: 24,
  },
  tipItem: {
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  resultsList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  userUsername: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 2,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedUserSection: {
    paddingBottom: 32,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  selectedUserAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedUserAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  selectedUserDetails: {
    flex: 1,
  },
  selectedUserName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedUserUsername: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 2,
  },
  selectedUserEmail: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  relationshipSection: {
    marginBottom: 24,
  },
  relationshipTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: (width - 64) / 2 - 6,
  },
  relationshipCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  relationshipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  relationshipEmoji: {
    fontSize: 16,
  },
  relationshipLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  messageSection: {
    marginBottom: 24,
  },
  messageLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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

export default PartnerSearchScreen; 
export default PartnerSearchScreen; 