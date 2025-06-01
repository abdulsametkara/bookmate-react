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
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    publisher?: string;
  };
}

interface WishlistItem {
  id: string;
  user_id: string;
  book_id: string;
  priority: number;
  notes?: string;
  createdAt: string;
  title: string;
  author: string;
  cover_image_url: string;
  page_count: number;
  publisher?: string;
}

interface BackendBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  published_year?: number;
  page_count?: number;
  genre?: string;
  description?: string;
  cover_image_url?: string;
  language?: string;
}

const WishlistScreen = () => {
  const navigation = useNavigation();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Sayfa yüklendiğinde kullanıcının istek listesini getir
  useEffect(() => {
    if (currentUserId) {
      loadWishlist();
    }
  }, [currentUserId]);

  // Backend API'den istek listesini yükle
  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const apiUrl = getApiUrl('/api/user/wishlists');
      console.log('🎯 WishlistScreen - İstek URL:', apiUrl);
      console.log('🔐 WishlistScreen - Token var:', !!token);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
        console.log('✅ İstek listesi yüklendi:', data.length, 'kitap');
      } else {
        const errorData = await response.json();
        console.error('❌ İstek listesi yükleme hatası:', errorData);
      }
    } catch (error) {
      console.error('❌ İstek listesi yükleme hatası:', error);
      Alert.alert('Hata', 'İstek listesi yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Books API ile arama
  const searchBooks = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=tr`
      );
      const data = await response.json();
      
      if (data.items) {
        setSearchResults(data.items);
        setShowResults(true);
        console.log('📚 Arama sonuçları:', data.items.length, 'kitap bulundu');
      } else {
        setSearchResults([]);
        Alert.alert('Sonuç Bulunamadı', 'Aradığınız kitap bulunamadı.');
      }
    } catch (error) {
      console.error('❌ Arama hatası:', error);
      Alert.alert('Hata', 'Kitap arama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  // Kitabı backend'e ekle ve sonra istek listesine ekle
  const addToWishlist = async (googleBook: GoogleBook) => {
    try {
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      // 1. Önce kitabı backend books tablosuna ekle
      const bookData: Partial<BackendBook> = {
        title: googleBook.volumeInfo.title,
        author: googleBook.volumeInfo.authors?.join(', ') || 'Bilinmeyen Yazar',
        isbn: googleBook.volumeInfo.industryIdentifiers?.[0]?.identifier || '',
        publisher: googleBook.volumeInfo.publisher || '',
        published_year: googleBook.volumeInfo.publishedDate ? 
          parseInt(googleBook.volumeInfo.publishedDate.substring(0, 4)) : undefined,
        page_count: googleBook.volumeInfo.pageCount || 0,
        genre: 'Genel',
        description: googleBook.volumeInfo.description || '',
        cover_image_url: googleBook.volumeInfo.imageLinks?.thumbnail || '',
        language: 'tr'
      };

      console.log('📚 Backend\'e kitap ekleniyor:', bookData.title);

      const bookResponse = await fetch(getApiUrl('/api/books'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bookData),
      });

      let bookId: string;

      if (bookResponse.ok) {
        const bookResult = await bookResponse.json();
        bookId = bookResult.book.id;
        console.log('✅ Kitap backend\'e eklendi, ID:', bookId);
      } else if (bookResponse.status === 409) {
        // Kitap zaten varsa, ID'sini al (bu endpoint'i eklememiz gerekebilir)
        Alert.alert('Uyarı', 'Bu kitap zaten sistemde mevcut.');
        return;
      } else {
        const errorData = await bookResponse.json();
        console.error('❌ Kitap ekleme hatası:', errorData);
        Alert.alert('Hata', 'Kitap sisteme eklenirken bir hata oluştu.');
        return;
      }

      // 2. Kitabı istek listesine ekle
      const wishlistData = {
        book_id: bookId,
        priority: 3,
        notes: ''
      };

      console.log('🎯 İstek listesine ekleniyor...');

      const wishlistResponse = await fetch(getApiUrl('/api/user/wishlists'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(wishlistData),
      });

      if (wishlistResponse.ok) {
        const wishlistResult = await wishlistResponse.json();
        console.log('✅ İstek listesine eklendi:', wishlistResult);
        
        // Başarılı, listeyiç yeniden yükle
        await loadWishlist();
        
        Alert.alert(
          'Başarılı',
          `"${bookData.title}" istek listenize eklendi.`,
          [{ text: 'Tamam' }]
        );
        
        setShowResults(false);
        setSearchQuery('');
      } else {
        const errorData = await wishlistResponse.json();
        console.error('❌ İstek listesi hatası:', errorData);
        Alert.alert('Hata', errorData.message || 'İstek listesine eklenirken bir hata oluştu.');
      }

    } catch (error) {
      console.error('❌ İstek listesine ekleme hatası:', error);
      Alert.alert('Hata', 'İstek listesine eklerken bir hata oluştu.');
    }
  };

  // İstek listesinden kaldır
  const removeFromWishlist = async (wishlistId: string, bookTitle: string) => {
    Alert.alert(
      'Kitabı Kaldır',
      `"${bookTitle}" adlı kitabı istek listenizden kaldırmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('bookmate_auth_token');
              
              const response = await fetch(getApiUrl(`/api/user/wishlists/${wishlistId}`), {
                method: 'DELETE',
                headers: getAuthHeaders(token || ''),
              });

              if (response.ok) {
                await loadWishlist();
                Alert.alert('Başarılı', 'Kitap istek listenizden kaldırıldı.');
              } else {
                Alert.alert('Hata', 'Kitap kaldırılırken bir hata oluştu.');
              }
            } catch (error) {
              console.error('❌ Kaldırma hatası:', error);
              Alert.alert('Hata', 'Kitap kaldırılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  // Kitabı kütüphaneye ekle ve istek listesinden kaldır
  const addToLibrary = async (wishlistItem: WishlistItem) => {
    try {
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      const response = await fetch(getApiUrl('/api/user/books'), {
        method: 'POST',
        headers: getAuthHeaders(token || ''),
        body: JSON.stringify({
          book_id: wishlistItem.book_id,
          status: 'to_read',
          is_favorite: false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Kütüphaneye eklendi:', result);
        
        // İstek listesini yeniden yükle (otomatik kaldırılmış olacak)
        await loadWishlist();
        
        Alert.alert(
          'Başarılı',
          result.message || 'Kitap kütüphanenize eklendi.',
          [{ text: 'Tamam' }]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Hata', errorData.message || 'Kütüphaneye eklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('❌ Kütüphaneye ekleme hatası:', error);
      Alert.alert('Hata', 'Kütüphaneye eklerken bir hata oluştu.');
    }
  };

  const showWishlistBookOptions = (item: WishlistItem) => {
    Alert.alert(
      item.title,
      'Bu kitap için ne yapmak istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kütüphaneye Ekle',
          onPress: () => addToLibrary(item)
        },
        {
          text: 'Listeden Kaldır',
          style: 'destructive',
          onPress: () => removeFromWishlist(item.id, item.title)
        }
      ]
    );
  };

  const showBookOptions = (book: GoogleBook) => {
    Alert.alert(
      book.volumeInfo.title,
      'Bu kitabı istek listenize eklemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İstek Listesine Ekle',
          onPress: () => addToWishlist(book)
        }
      ]
    );
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity onPress={() => showWishlistBookOptions(item)}>
      <Surface style={styles.wishlistItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ uri: item.cover_image_url || 'https://via.placeholder.com/60x80?text=Kapak+Yok' }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          <Text style={styles.priority}>Öncelik: {item.priority}</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => showWishlistBookOptions(item)}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: GoogleBook }) => (
    <TouchableOpacity onPress={() => showBookOptions(item)}>
      <Surface style={styles.searchResultItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ 
              uri: item.volumeInfo.imageLinks?.thumbnail || 
                   'https://via.placeholder.com/60x80?text=Kapak+Yok' 
            }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.volumeInfo.title}</Text>
          <Text style={styles.bookAuthor}>
            {item.volumeInfo.authors?.join(', ') || 'Bilinmeyen Yazar'}
          </Text>
          {item.volumeInfo.publishedDate && (
            <Text style={styles.publishYear}>
              {item.volumeInfo.publishedDate.substring(0, 4)}
            </Text>
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
              onRefresh={loadWishlist}
              refreshing={isLoading}
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  searchResultsList: {
    padding: Spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  booksList: {
    padding: Spacing.md,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  bookImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    marginBottom: Spacing.xs,
  },
  publishYear: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  priority: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WishlistScreen; 