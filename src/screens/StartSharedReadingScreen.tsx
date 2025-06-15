import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  getFriends,
  startSharedReadingSession,
  User,
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

const StartSharedReadingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { partnerId } = (route.params || {}) as { partnerId?: string };

  // Redux store'dan kitapları al
  const reduxBooks = useSelector((state: RootState) => state.books.items);
  
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>(partnerId ? [partnerId] : []);
  const [readingMode, setReadingMode] = useState<'same_book' | 'different_books' | 'book_club'>('same_book');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showBookSelection, setShowBookSelection] = useState(false);

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

  const readingModes = [
    {
      value: 'same_book' as const,
      title: 'Aynı Kitap',
      description: 'Hep birlikte aynı kitabı okuyun',
      emoji: '📖',
      requiresBook: true,
      color: '#3B82F6',
    },
    {
      value: 'different_books' as const,
      title: 'Farklı Kitaplar',
      description: 'Herkes kendi kitabını seçer, ilerlemeleri paylaşır',
      emoji: '📚',
      requiresBook: false,
      color: '#10B981',
    },
    {
      value: 'book_club' as const,
      title: 'Kitap Kulübü',
      description: '3+ kişilik grup okuma deneyimi',
      emoji: '👥',
      requiresBook: true,
      color: '#8B5CF6',
    },
  ];

  const loadData = useCallback(async () => {
    try {
      const friendsData = await getFriends().catch(() => []);
      setFriends(friendsData);
      console.log('📚 Kütüphane kitapları:', reduxBooks.length);
      showToast('Veriler başarıyla yüklendi', 'success');
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }, [reduxBooks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Generate default title based on mode and participants
    if (selectedPartners.length > 0) {
      const partnerNames = selectedPartners
        .map(id => friends.find(f => f.id === id)?.displayName)
        .filter(Boolean)
        .join(', ');
      
      const modeText = readingModes.find(m => m.value === readingMode)?.title || '';
      setSessionTitle(`${modeText} - ${partnerNames}`);
    }
  }, [selectedPartners, readingMode, friends]);

  const togglePartnerSelection = (partnerId: string) => {
    setSelectedPartners(prev => 
      prev.includes(partnerId)
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  const handleCreateSession = async () => {
    if (selectedPartners.length === 0) {
      showToast('En az bir partner seçmelisiniz', 'error');
      return;
    }

    if (!sessionTitle.trim()) {
      showToast('Oturum başlığı gereklidir', 'error');
      return;
    }

    const selectedMode = readingModes.find(m => m.value === readingMode);
    if (selectedMode?.requiresBook && !selectedBookId) {
      showToast('Bu okuma modu için kitap seçimi gereklidir', 'error');
      return;
    }

    if (readingMode === 'book_club' && selectedPartners.length < 2) {
      showToast('Kitap kulübü için en az 3 kişi gereklidir (siz dahil)', 'error');
      return;
    }

    setCreating(true);
    try {
      const sessionData: any = {
        partnerIds: selectedPartners,
        readingMode,
        bookId: selectedBookId || undefined,
        title: sessionTitle.trim(),
        description: sessionDescription.trim() || undefined,
      };

      // Seçilen kitap bilgilerini ekle
      if (selectedBook) {
        sessionData.bookInfo = {
          title: selectedBook.title,
          author: selectedBook.author,
          totalPages: selectedBook.pageCount || selectedBook.totalPages || 300,
          coverUrl: selectedBook.cover_image_url || selectedBook.coverImageUrl,
        };
      }

      const session = await startSharedReadingSession(sessionData);

      showToast('Ortak okuma oturumu başlatıldı!', 'success');

      // Navigate after short delay
      setTimeout(() => {
        navigation.navigate('SharedReadingSession' as never, { sessionId: session.id });
      }, 1500);

    } catch (error) {
      console.error('Error creating session:', error);
      showToast('Oturum oluşturulurken bir hata oluştu', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleBookSelection = (bookId: string) => {
    const book = reduxBooks.find(b => b.id === bookId);
    setSelectedBookId(bookId);
    setSelectedBook(book);
    setShowBookSelection(false);
    console.log('📖 Seçilen kitap:', book?.title);
    showToast(`Kitap seçildi: ${book?.title}`, 'success');
  };

  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.bookItem,
        selectedBookId === item.id && styles.bookItemSelected,
      ]}
      onPress={() => handleBookSelection(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.bookCover}>
        {item.coverURL || item.cover_image_url ? (
          <Image 
            source={{ uri: item.coverURL || item.cover_image_url }}
            style={styles.bookCoverImage}
            onError={() => console.log('Image load error for:', item.title)}
          />
        ) : (
          <View style={styles.bookCoverPlaceholder}>
            <MaterialCommunityIcons name="book" size={24} color="#3B82F6" />
          </View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
        <Text style={styles.bookPages}>
          {item.pageCount || item.totalPages || 'N/A'} sayfa
        </Text>
      </View>
      {selectedBookId === item.id && (
        <View style={styles.selectedIndicator}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Arkadaş listesi yükleniyor...</Text>
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
            <Text style={styles.headerTitle}>Ortak Okuma Başlat</Text>
            <Text style={styles.headerSubtitle}>Arkadaşlarınla okuma deneyimi oluştur</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Reading Mode Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 Okuma Modu</Text>
            <Text style={styles.sectionSubtitle}>Bu modda herkes farklı kitap okuyabilir, önce siz bir kitap seçin</Text>
            
            <View style={styles.readingModeGrid}>
              {readingModes.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.readingModeCard,
                    readingMode === mode.value && styles.readingModeSelected,
                  ]}
                  onPress={() => setReadingMode(mode.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modeIcon, { backgroundColor: mode.color }]}>
                    <Text style={styles.modeEmoji}>{mode.emoji}</Text>
                  </View>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  <Text style={styles.modeDescription}>{mode.description}</Text>
                  {readingMode === mode.value && (
                    <View style={styles.selectedCheckmark}>
                      <MaterialCommunityIcons name="check-circle" size={24} color={mode.color} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Book Selection */}
          {readingModes.find(m => m.value === readingMode)?.requiresBook && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📚 Sizin Kitabınız</Text>
              <Text style={styles.sectionSubtitle}>
                {readingMode === 'same_book' 
                  ? 'Bu modda herkes farklı kitap okuyabilir, önce siz bir kitap seçin'
                  : 'Ortak okuma için kitap seçin'}
              </Text>
              
              {selectedBook ? (
                <View style={styles.selectedBookCard}>
                  <View style={styles.selectedBookContent}>
                    <View style={styles.selectedBookCover}>
                      {selectedBook.coverURL || selectedBook.cover_image_url ? (
                        <Image 
                          source={{ uri: selectedBook.coverURL || selectedBook.cover_image_url }}
                          style={styles.selectedBookImage}
                        />
                      ) : (
                        <MaterialCommunityIcons name="book" size={32} color="#3B82F6" />
                      )}
                    </View>
                    <View style={styles.selectedBookInfo}>
                      <Text style={styles.selectedBookTitle}>{selectedBook.title}</Text>
                      <Text style={styles.selectedBookAuthor}>{selectedBook.author}</Text>
                      <Text style={styles.selectedBookPages}>
                        {selectedBook.pageCount || selectedBook.totalPages || 'Bilinmeyen'} sayfa
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.changeBookButton}
                    onPress={() => setShowBookSelection(true)}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectBookCard}
                  onPress={() => setShowBookSelection(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="book-plus" size={32} color="#3B82F6" />
                  <Text style={styles.selectBookText}>Kitap Seç</Text>
                  <Text style={styles.selectBookSubtext}>Kütüphanenizden kitap seçin</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Partner Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👥 Partnerler</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{selectedPartners.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>Okuma oturumuna katılacak arkadaşlarınızı seçin</Text>
            
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-plus-outline" size={64} color="rgba(255, 255, 255, 0.4)" />
                <Text style={styles.emptyStateTitle}>Henüz arkadaşınız yok</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Ortak okuma için önce arkadaş eklemelisiniz
                </Text>
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={() => navigation.navigate('PartnerSearch' as never)}
                >
                  <MaterialCommunityIcons name="account-search" size={20} color="#fff" />
                  <Text style={styles.addFriendText}>Arkadaş Ara</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.friendsList}>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={[
                      styles.friendCard,
                      selectedPartners.includes(friend.id) && styles.friendCardSelected,
                    ]}
                    onPress={() => togglePartnerSelection(friend.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.friendAvatar}>
                      <MaterialCommunityIcons name="account" size={32} color="#3B82F6" />
                      {selectedPartners.includes(friend.id) && (
                        <View style={styles.friendSelectedBadge}>
                          <MaterialCommunityIcons name="check" size={16} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.displayName || friend.email?.split('@')[0]}
                    </Text>
                    <Text style={styles.friendEmail} numberOfLines={1}>
                      {friend.email}
                    </Text>
                    <TouchableOpacity
                      style={styles.profileButton}
                      onPress={() => navigation.navigate('FriendProfile' as never, { friendId: friend.id } as never)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="account-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Session Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Oturum Detayları</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Oturum Başlığı *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Oturum için bir başlık girin"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={sessionTitle}
                onChangeText={setSessionTitle}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Açıklama (İsteğe bağlı)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Oturum hakkında açıklama yazın..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={sessionDescription}
                onChangeText={setSessionDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Create Button */}
          <View style={styles.createSection}>
            <TouchableOpacity
              style={[
                styles.createButton,
                (selectedPartners.length === 0 || !sessionTitle.trim() || creating) && styles.createButtonDisabled,
              ]}
              onPress={handleCreateSession}
              disabled={selectedPartners.length === 0 || !sessionTitle.trim() || creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="rocket-launch" size={24} color="#fff" />
              )}
              <Text style={styles.createButtonText}>
                {creating ? 'Oturum Oluşturuluyor...' : 'Oturumu Başlat'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Book Selection Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showBookSelection}
          onRequestClose={() => setShowBookSelection(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kitap Seçin</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowBookSelection(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Kütüphanenizden okuma oturumu için kitap seçin
              </Text>

              {reduxBooks.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <MaterialCommunityIcons name="book-outline" size={64} color="#6B7280" />
                  <Text style={styles.modalEmptyTitle}>Kütüphanenizde kitap yok</Text>
                  <Text style={styles.modalEmptySubtitle}>
                    Önce kütüphanenize kitap ekleyin
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={reduxBooks}
                  renderItem={renderBookItem}
                  keyExtractor={(item) => item.id}
                  style={styles.booksList}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={styles.bookSeparator} />}
                />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
  readingModeGrid: {
    gap: 16,
  },
  readingModeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  readingModeSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeEmoji: {
    fontSize: 24,
  },
  modeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modeDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  selectedBookCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectedBookContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedBookCover: {
    width: 60,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  selectedBookImage: {
    width: '100%',
    height: '100%',
  },
  selectedBookInfo: {
    flex: 1,
  },
  selectedBookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedBookAuthor: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  selectedBookPages: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  changeBookButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  selectBookCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  selectBookText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  selectBookSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  emptyState: {
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
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  addFriendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  friendCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (width - 64) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  friendAvatar: {
    position: 'relative',
    marginBottom: 12,
  },
  friendSelectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  friendEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  profileButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  createButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptySubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  booksList: {
    flex: 1,
    marginBottom: 20,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  bookItemSelected: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bookAuthor: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  bookPages: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  bookSeparator: {
    height: 12,
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

export default StartSharedReadingScreen; 