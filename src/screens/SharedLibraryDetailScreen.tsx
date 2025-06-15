import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSharedLibraryDetails, deleteSharedLibrary, SharedLibraryDetails } from '../services/sharedReadingApi';
import { useToastContext } from '../providers/ToastProvider';

const SharedLibraryDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { libraryId } = route.params as { libraryId: string };
  const { success, error: showError, info } = useToastContext();
  
  const [libraryDetails, setLibraryDetails] = useState<SharedLibraryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'members'>('books');

  useEffect(() => {
    loadLibraryDetail();
  }, [libraryId]);

  const loadLibraryDetail = async () => {
    try {
      const details = await getSharedLibraryDetails(libraryId);
      setLibraryDetails(details);
    } catch (error) {
      console.error('Error loading library detail:', error);
      showError('Kütüphane detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLibraryDetail();
  };

  const handleDeleteLibrary = async () => {
    try {
      setLoading(true);
      await deleteSharedLibrary(parseInt(libraryId));
      
      success('Kütüphane başarıyla silindi! 🗑️');
      
      // Başarılı silme sonrası otomatik geri dön
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
      
    } catch (error: any) {
      setLoading(false);
      showError(error.message || 'Kütüphane silinirken hata oluştu');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const handleAddBook = () => {
    if (activeTab === 'books') {
      // Navigate to book selection screen
      navigation.navigate('SelectBooksForLibrary' as never, { 
        libraryId: libraryId,
        onBooksSelected: loadLibraryDetail // Refresh the library when books are added
      } as never);
    } else {
      // Handle add member logic here - only owners can add members
      if (currentUserRole === 'owner') {
        info('Üye ekleme özelliği yakında eklenecek.');
      } else {
        showError('Sadece kütüphane sahibi yeni üye ekleyebilir.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Kütüphane Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!libraryDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.errorText}>Kütüphane bulunamadı</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const { library, members, books } = libraryDetails;
  const currentUserRole = library.user_role || library.userRole;

  console.log('🔍 SharedLibraryDetailScreen Debug:', {
    libraryId,
    currentUserRole,
    activeTab,
    shouldShowButton: (currentUserRole === 'owner' || currentUserRole === 'member'),
    library: library,
    isOwner: currentUserRole === 'owner'
  });

  // Show delete button only for owners
  const shouldShowDeleteButton = currentUserRole === 'owner';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{library.name}</Text>
            <Text style={styles.headerSubtitle}>
              {members.length} üye • {books.length} kitap
            </Text>
          </View>
          {shouldShowDeleteButton && (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteLibrary}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsButton}>
                <Ionicons name="settings" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Library Info */}
        <View style={styles.libraryInfo}>
          <Text style={styles.libraryDescription}>
            {library.description || 'Bu kütüphane için henüz açıklama eklenmemiş.'}
          </Text>
          <Text style={styles.libraryMeta}>
            {formatDate(library.createdAt)} tarihinde oluşturuldu
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'books' && styles.activeTab]}
            onPress={() => setActiveTab('books')}
          >
            <Text style={[styles.tabText, activeTab === 'books' && styles.activeTabText]}>
              Kitaplar ({books.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              Üyeler ({members.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'books' ? (
            <View style={styles.booksContainer}>
              {books.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.emptyStateText}>Henüz kitap eklenmemiş</Text>
                  <Text style={styles.emptyStateSubtext}>
                    İlk kitabı ekleyerek kütüphaneyi oluşturmaya başlayın
                  </Text>
                </View>
              ) : (
                books.map((book) => (
                  <View key={book.id} style={styles.bookCard}>
                    <View style={styles.bookIcon}>
                      <Ionicons name="book" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      <Text style={styles.bookAuthor}>{book.author}</Text>
                      <Text style={styles.bookMeta}>
                        {book.added_by_name} tarafından {formatDate(book.added_at)} tarihinde eklendi
                      </Text>
                      {book.notes && (
                        <Text style={styles.bookNotes}>{book.notes}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.membersContainer}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.display_name}</Text>
                    <View style={styles.memberRole}>
                      <Ionicons 
                        name={member.role === 'owner' ? "star" : "person"} 
                        size={16} 
                        color={member.role === 'owner' ? "#FFD700" : "#9CA3AF"} 
                      />
                      <Text style={styles.memberRoleText}>
                        {member.role === 'owner' ? 'Yönetici' : 'Üye'}
                      </Text>
                    </View>
                    <Text style={styles.memberMeta}>
                      {formatDate(member.joined_at)} tarihinde katıldı
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddBook}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>
              {activeTab === 'books' ? 'Kitap Ekle' : (currentUserRole === 'owner' ? 'Üye Ekle' : 'Kitap Ekle')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Library Info
  libraryInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  libraryDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  libraryMeta: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Books
  booksContainer: {
    flex: 1,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  bookIcon: {
    marginRight: 15,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookMeta: {
    fontSize: 12,
    color: '#999',
  },
  bookNotes: {
    fontSize: 12,
    color: '#666',
  },
  
  // Members
  membersContainer: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberRoleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  memberMeta: {
    fontSize: 12,
    color: '#999',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Add Button
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SharedLibraryDetailScreen; 