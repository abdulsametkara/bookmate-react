import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Text, 
  StatusBar, 
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { Book, BookStatus } from '../models';

// Kitapları 3D görünüm için dönüştürme fonksiyonu
const convertBookFor3D = (book: Book) => {
  // Kitap türüne göre sırt rengi belirleme
  const getSpineColor = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return '#007AFF'; // Mavi
      case BookStatus.COMPLETED: return '#34C759'; // Yeşil
      case BookStatus.TO_READ: return '#8E8E93'; // Gri
      default: return '#8B4513'; // Kahverengi
    }
  };

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverURL: book.coverURL,
    spineColor: getSpineColor(book.status),
  };
};

// 3D Kitap bileşeni
const Book3D: React.FC<{ book: any; onPress: () => void; width: number; height: number }> = ({ 
  book, 
  onPress, 
  width = 80, 
  height = 120 
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.book3DContainer, { width: width + 12, height: height + 8 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.bookWrapper3D, { width, height }]}>
        {/* Ana kitap kapağı */}
        {!imageError ? (
          <Image 
            source={{ uri: book.coverURL }} 
            style={[styles.bookCover3D, { width, height }]}
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
          <View style={[styles.bookCoverPlaceholder3D, { width, height }]}>
            <MaterialCommunityIcons name="book-variant" size={32} color={Colors.textTertiary} />
            <Text style={styles.placeholderTitle} numberOfLines={2}>{book.title}</Text>
          </View>
        )}
        
        {imageLoading && (
          <View style={[styles.loadingOverlay, { width, height }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {/* 3D Sağ kenar (spine) */}
        <View style={[
          styles.bookSpine3D, 
          { 
            backgroundColor: book.spineColor || '#8B4513',
            height: height,
            left: width - 2
          }
        ]}>
          <Text style={styles.spineText} numberOfLines={1}>
            {book.title.substring(0, 12)}
          </Text>
        </View>

        {/* 3D Alt kenar */}
        <View style={[
          styles.bookBottom3D, 
          { 
            backgroundColor: book.spineColor || '#8B4513',
            width: width,
            top: height - 2
          }
        ]} />
      </View>
    </TouchableOpacity>
  );
};

// Kitaplık rafı
const BookShelf: React.FC<{ books: any[]; shelfIndex: number; onBookPress: (bookId: string) => void }> = ({ 
  books, 
  shelfIndex, 
  onBookPress 
}) => {
  const bookWidth = 70;
  const bookHeight = 100;
  
  return (
    <View style={styles.shelfContainer3D}>
      {/* Kitaplar */}
      <View style={styles.booksRow3D}>
        {books.map((book, index) => (
          <Book3D
            key={book.id}
            book={book}
            onPress={() => onBookPress(book.id)}
            width={bookWidth}
            height={bookHeight}
          />
        ))}
      </View>
      
      {/* Ahşap raf */}
      <View style={styles.woodenShelf}>
        <View style={styles.shelfTop} />
        <View style={styles.shelfFront} />
        <View style={styles.shelfShadow} />
      </View>
    </View>
  );
};

const BookShelf3DScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Route'dan gelen kitapları al, yoksa boş array kullan
  const libraryBooks = route.params?.books || [];
  const books3D = libraryBooks.map(convertBookFor3D);
  
  const goBack = () => {
    navigation.goBack();
  };
  
  const openBookDetails = (bookId) => {
    navigation.navigate('BookDetail', { bookId });
  };

  // Kitapları raflara böl (4'er kitap per raf)
  const booksPerShelf = 4;
  const shelves = Array.from(
    { length: Math.ceil(books3D.length / booksPerShelf) },
    (_, i) => books3D.slice(i * booksPerShelf, (i + 1) * booksPerShelf)
  );
  
  // Eğer kitap yoksa empty state göster
  if (books3D.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#F5F2E8" barStyle="dark-content" />
        
        {/* Header */}
        <Surface style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={goBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>3D Kitaplık</Text>
            <Text style={styles.headerSubtitle}>Kitaplarınız sanal kitaplığınızda</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={goBack}
          >
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </Surface>
        
        {/* Empty State */}
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="bookshelf" size={100} color="#8B7355" />
          <Text style={styles.emptyStateTitle}>Kitaplık Boş</Text>
          <Text style={styles.emptyStateText}>
            Kütüphanenizde henüz kitap bulunmuyor.{'\n'}
            Kitap ekleyerek 3D görünümü deneyimleyin!
          </Text>
          <TouchableOpacity 
            style={styles.addBookButton}
            onPress={() => navigation.navigate('Library')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text style={styles.addBookButtonText}>Kitap Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F5F2E8" barStyle="dark-content" />
      
      {/* Header */}
      <Surface style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={goBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>3D Kitaplık</Text>
          <Text style={styles.headerSubtitle}>Kitaplarınız sanal kitaplığınızda</Text>
        </View>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={goBack}
        >
          <Text style={styles.closeButtonText}>Kapat</Text>
        </TouchableOpacity>
      </Surface>
      
      {/* 3D Kitaplık Görünümü */}
      <ScrollView 
        style={styles.libraryContainer}
        contentContainerStyle={styles.libraryContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.library3D}>
          {shelves.map((shelfBooks, index) => (
            <BookShelf
              key={`shelf-${index}`}
              books={shelfBooks}
              shelfIndex={index}
              onBookPress={openBookDetails}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2E8', // Warm library background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    backgroundColor: '#F5F2E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E1D3',
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#5D4E37', // Dark brown
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: '#8B7355',
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '500',
  },
  libraryContainer: {
    flex: 1,
  },
  libraryContent: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  library3D: {
    backgroundColor: '#F5F2E8',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  shelfContainer3D: {
    marginBottom: Spacing.xxl,
    position: 'relative',
  },
  booksRow3D: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: 'rgba(245, 242, 232, 0.8)',
    borderTopLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.sm,
  },
  book3DContainer: {
    marginHorizontal: 2,
    marginBottom: 8,
  },
  bookWrapper3D: {
    position: 'relative',
  },
  bookCover3D: {
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    backgroundColor: '#FFF',
  },
  bookCoverPlaceholder3D: {
    borderRadius: 3,
    backgroundColor: '#E8E1D3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#D3C7B8',
  },
  placeholderTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 242, 232, 0.8)',
    borderRadius: 3,
  },
  bookSpine3D: {
    position: 'absolute',
    top: 2,
    width: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  spineText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    transform: [{ rotate: '90deg' }],
    textAlign: 'center',
  },
  bookBottom3D: {
    position: 'absolute',
    left: 2,
    height: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  woodenShelf: {
    position: 'relative',
    height: 20,
    marginHorizontal: Spacing.sm,
  },
  shelfTop: {
    height: 12,
    backgroundColor: '#A0522D', // Sienna brown
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shelfFront: {
    height: 8,
    backgroundColor: '#8B4513', // Saddle brown
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  shelfShadow: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#5D4E37',
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    fontSize: FontSizes.sm,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  addBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addBookButtonText: {
    fontSize: FontSizes.md,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
});

export default BookShelf3DScreen; 