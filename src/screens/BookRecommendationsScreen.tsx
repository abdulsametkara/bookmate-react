import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import RecommendationManager, { RecommendedBook, CategoryRecommendations } from '../utils/recommendationManager';
import BookDetailModal from '../components/BookDetailModal';
import AnimatedToast from '../components/AnimatedToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getAuthHeaders } from '../config/api';
import GoogleBooksService from '../services/googleBooksService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

interface RouteParams {
  category: 'popular' | 'personalized' | 'classics' | 'new';
  title: string;
}

const BookRecommendationsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { category, title } = route.params as RouteParams;
  
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  
  const [recommendations, setRecommendations] = useState<CategoryRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBook, setSelectedBook] = useState<RecommendedBook | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastIcon, setToastIcon] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info', icon?: string) => {
    setToastMessage(message);
    setToastType(type);
    setToastIcon(icon || '');
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      let result: CategoryRecommendations;

      console.log(`🎯 ${category} önerileri yükleniyor...`);
      
      switch (category) {
        case 'popular':
          result = await RecommendationManager.getPopularBooks();
          break;
        case 'personalized':
          console.log('👤 Kişiselleştirilmiş öneriler için kullanıcı:', currentUserId);
          result = await RecommendationManager.getPersonalizedBooks(currentUserId || 'guest_user');
          console.log('📊 Alınan öneri kategorisi:', result.category);
          console.log('🤖 AI aktif mi?', result.category.includes('AI'));
          break;
        case 'classics':
          result = await RecommendationManager.getClassicBooks();
          break;
        case 'new':
          result = await RecommendationManager.getNewReleases();
          break;
        default:
          result = await RecommendationManager.getPopularBooks();
      }

      setRecommendations(result);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      Alert.alert('Hata', 'Öneriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [category, currentUserId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  useFocusEffect(
    useCallback(() => {
      // Her sayfa odaklandığında yenile, özellikle kişiselleştirilmiş öneriler için
      if (category === 'personalized') {
        console.log('🔄 PersonalizedRecommendations: Sayfa odaklandı, yenileniyor...');
      }
      loadRecommendations();
    }, [loadRecommendations])
  );

  // Books değişimini dinle (kitap eklendiğinde otomatik güncelleme)
  useEffect(() => {
    if (category === 'personalized' && currentUserId) {
      const checkForBookChanges = async () => {
        try {
          const storageKey = `bookmate_books_${currentUserId}`;
          const booksData = await AsyncStorage.getItem(storageKey);
          const books = booksData ? JSON.parse(booksData) : [];
          
          // Kitap sayısı değişti mi kontrol et
          const currentBookCount = books.length;
          const lastBookCount = await AsyncStorage.getItem(`recommendations_last_book_count_${currentUserId}`);
          
          if (lastBookCount && parseInt(lastBookCount) !== currentBookCount) {
            console.log(`📚 Kitap sayısı değişti: ${lastBookCount} → ${currentBookCount}, öneriler yenileniyor...`);
            await loadRecommendations();
            await AsyncStorage.setItem(`recommendations_last_book_count_${currentUserId}`, currentBookCount.toString());
          } else if (!lastBookCount) {
            await AsyncStorage.setItem(`recommendations_last_book_count_${currentUserId}`, currentBookCount.toString());
          }
        } catch (error) {
          console.error('Book change detection error:', error);
        }
      };

      checkForBookChanges();
      
      // Her 5 saniyede bir kitap değişimini kontrol et (sadece kişiselleştirilmiş öneriler için)
      const interval = setInterval(checkForBookChanges, 5000);
      
      return () => clearInterval(interval);
    }
  }, [category, currentUserId, loadRecommendations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, [loadRecommendations]);

  // Enhanced refresh with cover reload option
  const handleCoverRefresh = useCallback(async () => {
    try {
      showToast('Kitap kapakları yenileniyor...', 'info', 'image');
      
      // Force refresh book covers
      await RecommendationManager.refreshBookCovers();
      
      // Reload recommendations with new covers
      await loadRecommendations();
      
      showToast('Kitap kapakları başarıyla yenilendi!', 'success', 'check');
    } catch (error) {
      console.error('Cover refresh error:', error);
      showToast('Kapaklar yenilenirken hata oluştu', 'error', 'alert-circle');
    }
  }, [loadRecommendations]);

  const handleBookPress = (book: RecommendedBook) => {
    console.log('🔍 Selected book data:', {
      title: book.title,
      author: book.author,
      description: book.description?.substring(0, 50) + '...',
      recommendationReason: book.recommendationReason?.substring(0, 50) + '...',
      pageCount: book.pageCount,
      genre: book.genre,
      hasAllFields: !!(book.title && book.author && book.description && book.recommendationReason)
    });
    
    console.log('📖 Setting selected book:', book.title);
    setSelectedBook(book);
    console.log('🎭 Opening modal for:', book.title);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    console.log('🔽 Modal close triggered');
    setModalVisible(false);
    setTimeout(() => {
      console.log('🧹 Clearing selected book');
      setSelectedBook(null);
    }, 300); // Modal kapanma animasyonu tamamlandıktan sonra temizle
  };

  const handleAddToWishlist = async (book: any) => {
    try {
      if (!currentUserId) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
        return;
      }

      showToast('Kitap ekleniyor...', 'info', 'loading');
      
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        showToast('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'error', 'alert-circle');
        return;
      }

      // 1. Önce kitabı backend books tablosuna ekle
      const bookData = {
        title: book.title.replace(/\u0000/g, ''),
        author: (book.author || 'Bilinmeyen Yazar').replace(/\u0000/g, ''),
        isbn: `AI-${Date.now().toString().slice(-8)}`, // Unique ISBN for AI recommendations (max 11 chars)
        publisher: 'AI Öneri Sistemi',
        published_year: book.publishYear || undefined,
        page_count: book.pageCount || 0,
        genre: book.genre || 'Genel',
        description: (book.description || '').replace(/\u0000/g, ''),
        cover_image_url: (book.coverURL || '').replace(/\u0000/g, ''),
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
        // Kitap zaten varsa, error response'da ID'yi kontrol et
        const errorData = await bookResponse.json();
        console.log('📚 Kitap conflict hatası:', errorData);
        
        if (errorData.existingBookId) {
          bookId = errorData.existingBookId;
          console.log('✅ Existing book ID found:', bookId);
        } else {
          // Unique ISBN ile tekrar dene
                     bookData.isbn = `AI-${Date.now().toString().slice(-10)}`;
          bookData.title = `${bookData.title} (AI Önerisi)`;
          
          const retryResponse = await fetch(getApiUrl('/api/books'), {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(bookData),
          });
          
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            bookId = retryResult.book.id;
            console.log('✅ Kitap unique identifier ile eklendi, ID:', bookId);
          } else {
            console.error('❌ Retry attempt failed');
            showToast('Bu kitap zaten istek listenizde olabilir.', 'warning', 'alert');
            return;
          }
        }
      } else if (bookResponse.status === 401) {
        showToast('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', 'error', 'alert-circle');
        return;
      } else {
        const errorData = await bookResponse.json();
        console.error('❌ Kitap ekleme hatası:', errorData);
        showToast('Kitap sisteme eklenirken bir hata oluştu.', 'error', 'alert-circle');
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
        
        showToast(`"${bookData.title}" istek listenize eklendi! 💕`, 'success', 'heart-plus');
      } else {
        const errorData = await wishlistResponse.json();
        console.error('❌ İstek listesi hatası:', errorData);
        showToast(errorData.message || 'İstek listesine eklenirken bir hata oluştu.', 'error', 'alert-circle');
      }

    } catch (error) {
      console.error('❌ İstek listesine ekleme hatası:', error);
      showToast('İstek listesine eklerken bir hata oluştu.', 'error', 'alert-circle');
    }
  };

  const handleAddToLibrary = async (book: any) => {
    try {
      console.log('📚 Adding to library:', book.title);
      
      if (!currentUserId) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
        return;
      }

      showToast('Kitap kütüphaneye ekleniyor...', 'info', 'loading');
      
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        showToast('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 'error', 'alert-circle');
        return;
      }

      // 1. Önce kitabı backend books tablosuna ekle
      const bookData = {
        title: book.title.replace(/\u0000/g, ''),
        author: (book.author || 'Bilinmeyen Yazar').replace(/\u0000/g, ''),
        isbn: `AI-LIB-${Date.now().toString().slice(-8)}`, // Unique ISBN for library books
        publisher: 'AI Öneri Sistemi',
        published_year: book.publishYear || undefined,
        page_count: book.pageCount || 0,
        genre: book.genre || 'Genel',
        description: (book.description || '').replace(/\u0000/g, ''),
        cover_image_url: (book.coverURL || '').replace(/\u0000/g, ''),
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
        // Kitap zaten varsa, error response'da ID'yi kontrol et
        const errorData = await bookResponse.json();
        console.log('📚 Kitap conflict hatası:', errorData);
        
        if (errorData.existingBookId) {
          bookId = errorData.existingBookId;
          console.log('✅ Existing book ID found:', bookId);
        } else {
          // Unique ISBN ile tekrar dene
          bookData.isbn = `AI-LIB-${Date.now().toString().slice(-10)}`;
          bookData.title = `${bookData.title} (AI Kütüphane)`;
          
          const retryResponse = await fetch(getApiUrl('/api/books'), {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(bookData),
          });
          
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            bookId = retryResult.book.id;
            console.log('✅ Kitap unique identifier ile eklendi, ID:', bookId);
          } else {
            console.error('❌ Retry attempt failed');
            showToast('Bu kitap zaten kütüphanenizde olabilir.', 'warning', 'alert');
            return;
          }
        }
      } else if (bookResponse.status === 401) {
        showToast('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', 'error', 'alert-circle');
        return;
      } else {
        const errorData = await bookResponse.json();
        console.error('❌ Kitap ekleme hatası:', errorData);
        showToast('Kitap sisteme eklenirken bir hata oluştu.', 'error', 'alert-circle');
        return;
      }

      // 2. Kitabı kütüphaneye ekle
      const libraryData = {
        book_id: bookId,
        status: 'to_read',
        is_favorite: false
      };

      console.log('📚 Kütüphaneye ekleniyor...');

      const libraryResponse = await fetch(getApiUrl('/api/user/books'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(libraryData),
      });

      if (libraryResponse.ok) {
        const libraryResult = await libraryResponse.json();
        console.log('✅ Kütüphaneye eklendi:', libraryResult);
        
        showToast(`"${bookData.title}" kütüphanenize eklendi! 📚`, 'success', 'library-plus');
      } else {
        const errorData = await libraryResponse.json();
        console.error('❌ Kütüphane ekleme hatası:', errorData);
        showToast(errorData.message || 'Kütüphaneye eklenirken bir hata oluştu.', 'error', 'alert-circle');
      }

    } catch (error) {
      console.error('❌ Kütüphaneye ekleme hatası:', error);
      showToast('Kütüphaneye eklerken bir hata oluştu.', 'error', 'alert-circle');
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'popular': return 'trending-up';
      case 'personalized': return 'account-heart';
      case 'classics': return 'book-open-variant';
      case 'new': return 'star-outline';
      default: return 'book';
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'popular': return '#007AFF';
      case 'personalized': return '#4CAF50';
      case 'classics': return '#8B5CF6';
      case 'new': return '#FFB800';
      default: return '#007AFF';
    }
  };

  const renderBookItem = ({ item }: { item: RecommendedBook }) => {
    const getImageSource = () => {
      if (!item.coverURL || !item.coverURL.includes('http')) {
        return { uri: GoogleBooksService.getFallbackCover(item.title) };
      }
      return { uri: item.coverURL };
    };

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.bookImageContainer}>
          <Image
            source={getImageSource()}
            style={styles.bookImage}
            resizeMode="cover"
            defaultSource={{ uri: GoogleBooksService.getFallbackCover(item.title) }}
            onLoad={() => {
              console.log(`✅ Card image loaded: ${item.title}`);
            }}
            onError={(error) => {
              console.log(`❌ Card image failed for ${item.title}:`, error.nativeEvent);
            }}
          />
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.score}</Text>
          </View>
        </View>
        
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>
          <Text style={styles.bookGenre} numberOfLines={1}>
            {item.genre}
          </Text>
          <Text style={styles.recommendationReason} numberOfLines={2}>
            {item.recommendationReason}
          </Text>
          <View style={styles.bookMeta}>
            <Text style={styles.pageCount}>{item.pageCount} sayfa</Text>
            {item.publishYear && (
              <Text style={styles.publishYear}>{item.publishYear}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={getCategoryIcon()} 
        size={64} 
        color={getCategoryColor()} 
      />
      <Text style={styles.emptyTitle}>Henüz öneri yok</Text>
      <Text style={styles.emptySubtitle}>
        Bu kategori için öneriler hazırlanıyor
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons 
            name={getCategoryIcon()} 
            size={48} 
            color={getCategoryColor()} 
          />
          <Text style={styles.loadingText}>Öneriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons 
            name={getCategoryIcon()} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleCoverRefresh}
        >
          <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {recommendations && recommendations.books.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {recommendations.totalCount} öneri • {recommendations.category}
          </Text>
          
          {/* AI Status Indicator */}
          {category === 'personalized' && (
            <View style={[
              styles.aiStatusContainer,
              {
                backgroundColor: recommendations.category.includes('AI') ? '#EBF8FF' : '#FEF3C7'
              }
            ]}>
              <MaterialCommunityIcons 
                name={recommendations.category.includes('AI') ? "robot" : "information"} 
                size={16} 
                color={recommendations.category.includes('AI') ? "#007AFF" : "#F59E0B"} 
              />
              <Text style={[
                styles.aiStatusText,
                {
                  color: recommendations.category.includes('AI') ? "#007AFF" : "#F59E0B"
                }
              ]}>
                {recommendations.category.includes('AI') ? 
                  'Gerçek AI Analizi Aktif' : 
                  'Demo Mode (2+ kitap ekleyin)'
                }
              </Text>
            </View>
          )}
          
          {/* Debug bilgisi */}
          {__DEV__ && category === 'personalized' && (
            <Text style={styles.debugText}>
              Debug: Kategori = "{recommendations.category}"
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={recommendations?.books || []}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getCategoryColor()}
            colors={[getCategoryColor()]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Book Detail Modal */}
      <BookDetailModal
        visible={modalVisible}
        book={selectedBook}
        onClose={handleCloseModal}
        onAddToWishlist={handleAddToWishlist}
        onAddToLibrary={handleAddToLibrary}
      />

      {/* Animated Toast */}
      <AnimatedToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        icon={toastIcon}
        onHide={hideToast}
        duration={3000}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    marginLeft: Spacing.sm,
  },
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  aiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    alignSelf: 'center',
  },
  aiStatusText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  bookCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  bookImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  scoreContainer: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  scoreText: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  bookInfo: {
    padding: Spacing.md,
  },
  bookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    marginBottom: Spacing.xs,
  },
  bookGenre: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
    marginBottom: Spacing.sm,
  },
  recommendationReason: {
    fontSize: FontSizes.xs,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageCount: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
  },
  publishYear: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
  },
  separator: {
    height: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    marginTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  refreshButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.md,
  },
});

export default BookRecommendationsScreen; 