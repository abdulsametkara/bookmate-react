import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { addBookToSharedLibrary } from '../services/sharedReadingApi';
import { useToastContext } from '../providers/ToastProvider';

interface Book {
  id: string;
  title: string;
  author: string;
  coverURL?: string;
  pageCount: number;
  genre?: string;
  description?: string;
}

interface RouteParams {
  libraryId: string;
  onBooksSelected?: () => void;
}

const SelectBooksForLibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { success, error: showError } = useToastContext();
  
  // Get parameters from route
  const { libraryId, onBooksSelected } = route.params as {
    libraryId: string;
    onBooksSelected?: () => void;
  };

  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserBooks();
  }, []);

  const loadUserBooks = async () => {
    try {
      setLoading(true);
      // Kullanıcının kişisel kitap koleksiyonunu getir
      const response = await fetch('http://10.0.2.2:5000/api/user/books', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kitaplar yüklenemedi');
      }

      const data = await response.json();
      console.log('📚 User books loaded:', data.books?.length || 0);
      setBooks(data.books || []);
    } catch (error) {
      console.error('❌ Error loading user books:', error);
      showError('Kitaplar yüklenirken hata oluştu');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('bookmate_auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  useEffect(() => {
    // Filter books based on search query
    const filtered = books.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBooks(filtered);
  }, [books, searchQuery]);

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleAddSelectedBooks = async () => {
    if (selectedBooks.length === 0) {
      showError('Lütfen en az bir kitap seçin.');
      return;
    }

    setAdding(true);
    try {
      // Add books one by one to the shared library
      for (const bookId of selectedBooks) {
        await addBookToSharedLibrary(parseInt(libraryId), bookId);
      }

      success(`${selectedBooks.length} kitap başarıyla kütüphaneye eklendi! 🎉`);
      
      // Small delay to show toast before navigating
      setTimeout(() => {
        if (onBooksSelected) {
          onBooksSelected();
        }
        navigation.goBack();
      }, 1500);
      
    } catch (error) {
      console.error('Error adding books to library:', error);
      showError('Kitaplar eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setAdding(false);
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const isSelected = selectedBooks.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.bookCard, isSelected && styles.selectedBookCard]}
        onPress={() => toggleBookSelection(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.bookInfo}>
          <View style={styles.bookIcon}>
            <MaterialCommunityIcons 
              name="book" 
              size={24} 
              color={isSelected ? "#4CAF50" : "#3B82F6"} 
            />
          </View>
          <View style={styles.bookDetails}>
            <Text style={[styles.bookTitle, isSelected && styles.selectedBookTitle]}>
              {item.title}
            </Text>
            <Text style={[styles.bookAuthor, isSelected && styles.selectedBookAuthor]}>
              {item.author}
            </Text>
            {item.genre && (
              <Text style={[styles.bookGenre, isSelected && styles.selectedBookGenre]}>
                {item.genre}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
          {isSelected && (
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Kitap Seç</Text>
            <Text style={styles.headerSubtitle}>
              Kütüphaneye eklemek için kitapları seçin
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Kitaplar yükleniyor...</Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Kitap ara..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Selection Info */}
            {selectedBooks.length > 0 && (
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionText}>
                  {selectedBooks.length} kitap seçildi
                </Text>
              </View>
            )}

            {/* Books List */}
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              renderItem={renderBookItem}
              style={styles.booksList}
              contentContainerStyle={styles.booksListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="book-outline" size={48} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'Arama kriterlerine uygun kitap bulunamadı' : 'Henüz kitabınız yok'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? 'Farklı bir arama terimi deneyin' : 'Önce kütüphanenize kitap ekleyin'}
                  </Text>
                </View>
              }
            />

            {/* Add Button */}
            {selectedBooks.length > 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddSelectedBooks}
                disabled={adding}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.addButtonGradient}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                      <Text style={styles.addButtonText}>
                        {selectedBooks.length} Kitabı Ekle
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
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
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
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
  
  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  
  // Selection Info
  selectionInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
  },
  selectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Books List
  booksList: {
    flex: 1,
  },
  booksListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  bookCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBookCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookIcon: {
    marginRight: 15,
  },
  bookDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedBookTitle: {
    color: '#2E7D32',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  selectedBookAuthor: {
    color: '#4CAF50',
  },
  bookGenre: {
    fontSize: 12,
    color: '#999',
  },
  selectedBookGenre: {
    color: '#66BB6A',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Add Button
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default SelectBooksForLibraryScreen; 