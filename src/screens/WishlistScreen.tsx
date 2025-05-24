import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  Text,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useDispatch, useSelector } from 'react-redux';
import { addBook, saveBooks } from '../store/bookSlice';
import { RootState } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WishlistItem {
  id: string;
  title: string;
  author: string;
  coverURL: string;
  publishYear?: string;
  pageCount?: number;
  description?: string;
  isbn?: string;
  publisher?: string;
}

const WishlistScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const books = useSelector((state: RootState) => state.books.items);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Wishlist storage key
  const WISHLIST_KEY = `bookmate_wishlist_${currentUserId}`;

  // Load wishlist from AsyncStorage on mount
  useEffect(() => {
    loadWishlist();
  }, [currentUserId]);

  const loadWishlist = async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      const savedWishlist = await AsyncStorage.getItem(WISHLIST_KEY);
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWishlist = async (newWishlist: WishlistItem[]) => {
    if (!currentUserId) return;

    try {
      await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(newWishlist));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  // Google Books API ile arama fonksiyonu
  const searchBooks = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=tr`
      );
      const data = await response.json();
      
      if (data.items) {
        const formattedBooks = data.items.map((item: any) => ({
          id: item.id,
          title: item.volumeInfo.title || 'Başlık Bilinmiyor',
          author: item.volumeInfo.authors?.join(', ') || 'Yazar Bilinmiyor',
          coverURL: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail || 'https://via.placeholder.com/60x80?text=Kapak+Yok',
          publishYear: item.volumeInfo.publishedDate?.substring(0, 4) || null,
          pageCount: item.volumeInfo.pageCount || 0,
          description: item.volumeInfo.description || '',
          isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || '',
          publisher: item.volumeInfo.publisher || ''
        }));
        setSearchResults(formattedBooks);
        setShowResults(true);
      } else {
        setSearchResults([]);
        Alert.alert('Sonuç Bulunamadı', 'Aradığınız kitap bulunamadı.');
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      Alert.alert('Hata', 'Kitap arama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  const addToWishlist = async (book: any) => {
    // Kitabın zaten listede olup olmadığını kontrol et
    const alreadyExists = wishlist.some(item => item.id === book.id);
    
    if (alreadyExists) {
      Alert.alert('Zaten Mevcut', 'Bu kitap zaten istek listenizde bulunuyor.');
      return;
    }

    // Kitabı listeye ekle
    const newWishlist = [...wishlist, book];
    setWishlist(newWishlist);
    await saveWishlist(newWishlist);
    
    Alert.alert(
      'Kitap Eklendi',
      `"${book.title}" istek listenize eklendi.`,
      [{ text: 'Tamam' }]
    );
    setShowResults(false);
    setSearchQuery('');
  };

  const removeFromWishlist = async (bookId: string, bookTitle: string) => {
    Alert.alert(
      'Kitabı Kaldır',
      `"${bookTitle}" adlı kitabı istek listenizden kaldırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const newWishlist = wishlist.filter(item => item.id !== bookId);
            setWishlist(newWishlist);
            await saveWishlist(newWishlist);
            Alert.alert('Başarılı', 'Kitap istek listenizden kaldırıldı.');
          }
        }
      ]
    );
  };

  const addToLibrary = async (book: any) => {
    if (!currentUserId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    try {
      // Kitabı Redux formatına çevir
      const libraryBook = {
        id: book.id || `wishlist_${Date.now()}`,
        title: book.title,
        author: book.author,
        coverURL: book.coverURL || '',
        genre: book.genre || 'Genel',
        publishYear: book.publishYear ? parseInt(book.publishYear) : new Date().getFullYear(),
        publisher: book.publisher || 'Bilinmiyor',
        pageCount: book.pageCount || 0,
        currentPage: 0,
        progress: 0,
        status: 'TO_READ' as const,
        description: book.description || '',
        notes: [],
        isSharedWithPartner: false,
        lastReadingDate: new Date().toISOString(),
        userId: currentUserId,
      };

      // Redux store'a ekle
      dispatch(addBook(libraryBook));

      // AsyncStorage'a kaydet
      const currentBooks = books.filter(book => book.userId === currentUserId);
      const updatedBooks = [...currentBooks, libraryBook];
      await saveBooks(updatedBooks, currentUserId);

      // İstek listesinden kaldır
      const newWishlist = wishlist.filter(item => item.id !== book.id);
      setWishlist(newWishlist);
      await saveWishlist(newWishlist);

      Alert.alert(
        'Başarılı', 
        `"${book.title}" kütüphanenize eklendi ve istek listenizden kaldırıldı.`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Kütüphaneye ekleme hatası:', error);
      Alert.alert('Hata', 'Kitap kütüphaneye eklenirken bir hata oluştu.');
    }
  };

  const showBookOptions = (book: any) => {
    Alert.alert(
      book.title,
      'Bu kitap için ne yapmak istiyorsunuz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'İstek Listesine Ekle',
          onPress: () => addToWishlist(book)
        }
      ]
    );
  };

  const showWishlistBookOptions = (book: any) => {
    Alert.alert(
      book.title,
      'Bu kitap için ne yapmak istiyorsunuz?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Kütüphaneye Ekle',
          onPress: () => {
            addToLibrary(book);
          }
        },
        {
          text: 'Detayları Görüntüle',
          onPress: () => {
            navigation.navigate('BookDetail', { bookId: book.id });
          }
        },
        {
          text: 'Silmek İstiyorum',
          style: 'destructive',
          onPress: () => {
            removeFromWishlist(book.id, book.title);
          }
        }
      ]
    );
  };

  const renderWishlistItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => showWishlistBookOptions(item)}>
      <Surface style={styles.bookItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ uri: item.coverURL }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          {item.publishYear && (
            <Text style={styles.publishYear}>{item.publishYear}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            removeFromWishlist(item.id, item.title);
          }}
        >
          <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => showBookOptions(item)}>
      <Surface style={styles.searchResultItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ uri: item.coverURL }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          {item.publishYear && (
            <Text style={styles.publishYear}>{item.publishYear}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={(e) => {
            e.stopPropagation();
            showBookOptions(item);
          }}
        >
          <MaterialCommunityIcons name="plus" size={20} color={Colors.surface} />
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>İstek Listesi</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Bir kitap ara..."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchBooks(searchQuery)}
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
      </View>

      {/* Search Results */}
      {showResults && (
        <View style={styles.searchResultsContainer}>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>Arama Sonuçları</Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchResultsList}
          />
        </View>
      )}

      {/* Wishlist Items */}
      {!showResults && (
        <>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>İstek listeniz yükleniyor...</Text>
            </View>
          ) : wishlist.length > 0 ? (
            <FlatList
              data={wishlist}
              renderItem={renderWishlistItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.booksList}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="heart-outline" size={48} color="#BBBBBB" />
              </View>
              <Text style={styles.emptyStateTitle}>İstek listeniz boş</Text>
              <Text style={styles.emptyStateSubtitle}>
                Okumak istediğiniz kitapları arayarak istek listenize ekleyin
              </Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  booksList: {
    paddingHorizontal: Spacing.lg,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookCover: {
    width: 50,
    height: 70,
    backgroundColor: Colors.bookCover,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  publishYear: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
    opacity: 0.6,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  searchResultsTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  searchResultsList: {
    padding: Spacing.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
});

export default WishlistScreen; 