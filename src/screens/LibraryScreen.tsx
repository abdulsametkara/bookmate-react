import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, SafeAreaView, ScrollView, Image, Platform } from 'react-native';
import { 
  Text, 
  Card, 
  Surface, 
  Button, 
  Avatar, 
  IconButton,
  TextInput,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cardShadow, whiteCardStyle, sectionTitleStyle, statusColors } from '../theme/cardStyles';
import { Book, BookStatus } from '../models';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

const BookItem = ({ book, onPress, viewMode }: { book: Book; onPress: () => void; viewMode: string }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // iOS uyumlu renk kodları
  const getStatusColor = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return '#007AFF'; // iOS mavi
      case BookStatus.COMPLETED: return '#34C759'; // iOS yeşil
      case BookStatus.TO_READ: return '#8E8E93'; // iOS gri
      default: return '#007AFF';
    }
  };

  const getStatusText = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return 'Okunuyor';
      case BookStatus.COMPLETED: return 'Tamamlandı';
      case BookStatus.TO_READ: return 'Okunacak';
      default: return '';
    }
  };

  // iOS tarzı kart tasarımı
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.bookItem,
        viewMode === 'grid' ? styles.bookItemGrid : styles.bookItemList
      ]}
    >
      <Surface style={[
        styles.bookCard,
        viewMode === 'grid' ? styles.bookCardGrid : styles.bookCardList
      ]}>
        <View style={[
          styles.bookCoverContainer,
          viewMode === 'grid' ? styles.bookCoverContainerGrid : styles.bookCoverContainerList
        ]}>
          {!imageError ? (
            <Image 
              source={{ uri: book.coverURL }}
              style={styles.bookCover}
              resizeMode="cover"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.noCoverPlaceholder}>
              <MaterialCommunityIcons name="book-variant" size={viewMode === 'grid' ? 40 : 30} color="#CCCCCC" />
              <Text style={styles.noCoverText} numberOfLines={1}>{book.title}</Text>
            </View>
          )}
          
          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator animating={true} color={getStatusColor(book.status)} size={24} />
            </View>
          )}
          
          {/* Durum göstergesi */}
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(book.status) }
          ]}>
            <Text style={styles.statusBadgeText}>
              {getStatusText(book.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookContent}>
          <View style={styles.bookTitleContainer}>
            <Text 
              numberOfLines={viewMode === 'grid' ? 1 : 2} 
              style={styles.bookTitle}
            >
              {book.title}
            </Text>
            <Text 
              numberOfLines={1} 
              style={styles.bookAuthor}
            >
              {book.author}
            </Text>
          </View>
          
          {book.status === BookStatus.READING && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBackground} />
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${book.progress}%`,
                      backgroundColor: getStatusColor(book.status)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                <Text style={[styles.progressValue, { color: getStatusColor(book.status) }]}>
                  {book.currentPage}
                </Text>
                <Text style={styles.progressTotal}>/{book.pageCount}</Text>
              </Text>
            </View>
          )}
          
          {viewMode === 'list' && (
            <View style={styles.bookActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: getStatusColor(book.status) }]}
                onPress={onPress}
              >
                <MaterialCommunityIcons 
                  name={book.status === BookStatus.READING ? 'book-open-page-variant' : 
                        book.status === BookStatus.COMPLETED ? 'check' : 'bookmark-outline'} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.actionButtonText}>
                  {book.status === BookStatus.READING ? 'Devam Et' : 
                   book.status === BookStatus.COMPLETED ? 'Tekrar Oku' : 'Okumaya Başla'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const LibraryScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Hepsi');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [refreshKey, setRefreshKey] = useState(0); // Add this to force refresh

  // Redux ile kitapları al
  const reduxBooks = useSelector((state: RootState) => state.books.items);
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  const loading = useSelector((state: RootState) => state.books.loading);
  
  // Kullanıcıya ait kitapları filtrele ve Redux modelini uygulama modeline çevir
  const books = reduxBooks
    .filter(book => book.userId === currentUserId)
    .map(convertReduxBook);

  // Redux kitap modelini uygulama kitap modeline çevir
  function convertReduxBook(reduxBook: any): Book {
    return {
      id: reduxBook.id,
      title: reduxBook.title,
      author: reduxBook.author,
      coverURL: reduxBook.coverURL,
      pageCount: reduxBook.pageCount,
      currentPage: reduxBook.currentPage,
      progress: reduxBook.progress,
      status: reduxBook.status === 'TO_READ' ? BookStatus.TO_READ :
              reduxBook.status === 'READING' ? BookStatus.READING :
              reduxBook.status === 'COMPLETED' ? BookStatus.COMPLETED : 
              BookStatus.TO_READ,
      notes: [],
      createdAt: new Date(),
      genre: reduxBook.genre,
      publishYear: reduxBook.publishYear,
      publisher: reduxBook.publisher,
      description: reduxBook.description,
    };
  }

  // Arama fonksiyonu
  const onChangeSearch = (query) => setSearchQuery(query);

  // Filtre fonksiyonu
  const filterBooks = () => {
    // Öncelikle arama filtrelemesi yap
    let filtered = books;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query)
      );
    }
    
    // Sonra durum filtrelemesi yap
    if (activeFilter === 'Hepsi') return filtered;
    if (activeFilter === 'Okuyor') return filtered.filter(book => book.status === BookStatus.READING);
    if (activeFilter === 'Tamamlandı') return filtered.filter(book => book.status === BookStatus.COMPLETED);
    if (activeFilter === 'Okunacak') return filtered.filter(book => book.status === BookStatus.TO_READ);
    return filtered;
  };

  // Kitap detayına git
  const goToBookDetail = (bookId) => {
    navigation.navigate('BookDetail', { 
      bookId,
      onStatusChangeKey: refreshKey // fonksiyon yerine bir key gönder
    });
  };

  // Status değişikliğini dinle
  useFocusEffect(
    useCallback(() => {
      // Ekran odaklandığında kitap listesini güncelle
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // 3D Kitaplık görünümüne geç
  const showLibrary3D = () => {
    console.log('3D Kitaplık görünümü açılıyor...');
    // 3D Kitaplık ekranına geçiş yap
    navigation.navigate('BookShelf3D', { 
      books: filteredBooks // Kütüphanedeki kitapları geçir
    });
  };

  const filteredBooks = filterBooks();

  const stats = {
    total: filteredBooks.length,
    reading: filteredBooks.filter(book => book.status === BookStatus.READING).length,
    completed: filteredBooks.filter(book => book.status === BookStatus.COMPLETED).length
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Kütüphane</Text>
          <Text style={styles.headerSubtitle}>{stats.total} kitap</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton3D}
            onPress={showLibrary3D}
          >
            <MaterialCommunityIcons name="cube-outline" size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>3D</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <MaterialCommunityIcons
              name={viewMode === 'list' ? 'view-grid' : 'format-list-bulleted'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
            <Text style={styles.searchPlaceholder}>Kitap veya yazar ara</Text>
          </View>
        </View>
      </View>

      {/* Filters and Stats Section */}
      <View style={styles.filtersSection}>
        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipContainer}
        >
          <TouchableOpacity 
            style={[
              styles.filterChip, 
              activeFilter === 'Hepsi' && styles.filterChipActive
            ]}
            onPress={() => setActiveFilter('Hepsi')}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === 'Hepsi' && styles.filterChipTextActive
            ]}>
              Tümü
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterChip, 
              activeFilter === 'Okuyor' && styles.filterChipActive
            ]}
            onPress={() => setActiveFilter('Okuyor')}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === 'Okuyor' && styles.filterChipTextActive
            ]}>
              Okuduklarım
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterChip, 
              activeFilter === 'Tamamlandı' && styles.filterChipActive
            ]}
            onPress={() => setActiveFilter('Tamamlandı')}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === 'Tamamlandı' && styles.filterChipTextActive
            ]}>
              Tamamlananlar
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterChip, 
              activeFilter === 'Okunacak' && styles.filterChipActive
            ]}
            onPress={() => setActiveFilter('Okunacak')}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === 'Okunacak' && styles.filterChipTextActive
            ]}>
              Okunacaklar
            </Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="book-multiple" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="book-open" size={18} color={Colors.warning} />
            <Text style={styles.statValue}>{stats.reading}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
            <Text style={styles.statValue}>{stats.completed}</Text>
          </View>
        </View>
      </View>

      {/* Book List */}
      {filteredBooks.length > 0 ? (
        <FlatList
          data={filteredBooks}
          renderItem={({ item }) => (
            <BookItem 
              book={item} 
              onPress={() => goToBookDetail(item.id)} 
              viewMode={viewMode} 
            />
          )}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={`${viewMode}-${refreshKey}`}
          contentContainerStyle={styles.bookListContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons 
            name="book-open-variant" 
            size={70} 
            color={Colors.textTertiary}
          />
          <Text style={styles.emptyStateText}>Henüz kitap eklenmemiş</Text>
          <Text style={styles.emptyStateSubtitle}>
            İstek listesinden kitap ekleyebilir veya manuel olarak kitap ekleyebilirsiniz
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton3D: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    height: 44,
    minWidth: 60,
  },
  headerButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    marginLeft: Spacing.xs,
    fontSize: FontSizes.sm,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchContainer: {},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  filtersSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    backgroundColor: Colors.backgroundGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.surface,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coolGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  bookListContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  bookItem: {
    marginBottom: Spacing.md,
  },
  bookItemGrid: {
    flex: 0.5,
    marginHorizontal: Spacing.xs,
  },
  bookItemList: {
    marginHorizontal: Spacing.sm,
  },
  bookCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookCardGrid: {
    aspectRatio: 0.7,
  },
  bookCardList: {
    flexDirection: 'row',
    aspectRatio: 3,
  },
  bookCoverContainer: {
    backgroundColor: Colors.bookCover,
    position: 'relative',
  },
  bookCoverContainerGrid: {
    flex: 2,
  },
  bookCoverContainerList: {
    width: 80,
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },
  bookContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  bookTitleContainer: {
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E0E0E0',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E0E0E0',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#007AFF',
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  progressValue: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  progressTotal: {
    color: '#666666',
    fontWeight: '600',
  },
  bookActions: {
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateText: {
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  emptyStateSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
  },
  noCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    padding: Spacing.md,
  },
  noCoverText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default LibraryScreen; 