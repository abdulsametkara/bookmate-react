import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  StatusBar, 
  Alert, 
  ActivityIndicator, 
  Platform,
  Animated,
  SafeAreaView
} from 'react-native';
import { Text, Button, Surface, Divider, IconButton, FAB } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { Book, BookStatus } from '../models';
import { MOCK_BOOKS } from '../data/mockData';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateBook, deleteBook, saveBooks, addBook } from '../store/bookSlice';
// import * as ReduxModels from '../store/slices/booksSlice'; // Temporary disable
import CustomProgressBar from '../components/CustomProgressBar';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from '../utils/apiService';

const { width } = Dimensions.get('window');

const BookDetailScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Get bookId and bookData from route params
  const { bookId, bookData } = route.params as { bookId: string; bookData?: Book };
  
  console.log('🔍 BookDetailScreen - Params:', { bookId, bookData: !!bookData });
  
  // State for image loading
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Get books from Redux store
  const libraryBooks = useSelector((state: RootState) => state.books.items);
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  
  // Find book from Library or Mock Wishlist
  const MOCK_WISHLIST_BOOKS: Book[] = [
    {
      id: '6',
      title: 'Savaş ve Barış',
      author: 'Lev Tolstoy',
      coverURL: 'https://m.media-amazon.com/images/I/91SXh9vn2jL._AC_UF1000,1000_QL80_.jpg',
      pageCount: 1225,
      currentPage: 0,
      progress: 0,
      status: BookStatus.TO_READ,
      notes: [],
      createdAt: new Date('2023-04-15'),
      priority: 'high',
    },
    {
      id: '7',
      title: 'Suç ve Ceza',
      author: 'Fyodor Dostoyevski',
      coverURL: 'https://img.kitapyurdu.com/v1/getImage/fn:11762751/wh:true/wi:800',
      pageCount: 687,
      currentPage: 0,
      progress: 0,
      status: BookStatus.TO_READ,
      notes: [],
      createdAt: new Date('2023-05-20'),
      priority: 'medium',
    },
    {
      id: '8',
      title: 'Araba Sevdası',
      author: 'Recaizade Mahmut Ekrem',
      coverURL: 'https://www.iskultur.com.tr/dosyalar/2017/04/araba-sevdasi.jpg',
      pageCount: 288,
      currentPage: 120,
      progress: 42,
      status: BookStatus.READING,
      notes: [],
      createdAt: new Date('2023-06-30'),
      priority: 'medium',
    }
  ];
  
  // Define a unified book model to handle type differences
  interface UnifiedBook {
    id: string;
    title: string;
    author: string;
    coverURL: string;
    pageCount: number;
    currentPage: number;
    progress: number;
    status: BookStatus | string;
    publishYear?: number;
    genre?: string;
    description?: string;
    notes?: Array<{
      id?: string;
      content?: string;
      page?: number;
      createdAt?: Date | string;
    }>;
  }
  
  // First check Redux store (type-safe conversion)
  let reduxBook = libraryBooks.find(b => b.id === bookId);
  let mockBook = MOCK_BOOKS.find(b => b.id === bookId);
  let wishlistBook = MOCK_WISHLIST_BOOKS.find(b => b.id === bookId);
  
  // Create unified book data from available source
  let book: UnifiedBook | undefined;
  
  // PRIORITY 1: Use bookData passed from LibraryScreen (backend data)
  if (bookData) {
    book = {
      id: bookData.id,
      title: bookData.title,
      author: bookData.author,
      coverURL: bookData.coverURL,
      pageCount: bookData.pageCount || 0,
      currentPage: bookData.currentPage || 0,
      progress: bookData.progress || 0,
      status: bookData.status,
      publishYear: bookData.publishYear || undefined,
      genre: bookData.genre || undefined,
      description: bookData.description || undefined
    };
  } else if (reduxBook) {
    book = {
      id: reduxBook.id,
      title: reduxBook.title,
      author: reduxBook.author,
      coverURL: reduxBook.coverURL,
      pageCount: reduxBook.pageCount || 0,
      currentPage: reduxBook.currentPage || 0,
      progress: reduxBook.progress || 0,
      status: reduxBook.status,
      publishYear: reduxBook.publishYear || undefined,
      genre: reduxBook.genre || undefined
    };
  } else if (mockBook) {
    book = {
      id: mockBook.id,
      title: mockBook.title,
      author: mockBook.author,
      coverURL: mockBook.coverURL || '',
      pageCount: mockBook.pageCount,
      currentPage: mockBook.currentPage,
      progress: mockBook.progress || 0,
      status: mockBook.status,
      publishYear: mockBook.publishYear,
      genre: mockBook.genre
    };
  } else if (wishlistBook) {
    book = {
      id: wishlistBook.id,
      title: wishlistBook.title,
      author: wishlistBook.author,
      coverURL: wishlistBook.coverURL || '',
      pageCount: wishlistBook.pageCount || 0,
      currentPage: wishlistBook.currentPage || 0,
      progress: wishlistBook.progress || 0,
      status: wishlistBook.status,
      publishYear: undefined,
      genre: undefined
    };
  }

  // Animation start on component mount
  useEffect(() => {
    // Kullanım öncesi objelerin düzgün bir şekilde oluşturulduğundan emin olalım
    const fadeValue = new Animated.Value(0);
    const slideValue = new Animated.Value(50);
    
    // Değerleri ref'lere aktaralım
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    const animationSequence = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]);
    
    // Animasyonu çalıştırmadan önce değerleri sıfırlayalım
    setTimeout(() => {
      animationSequence.start();
    }, 100);
    
    return () => {
      animationSequence.stop();
    };
  }, []);

  // If book not found, show error and go back
  if (!book) {
    // Biraz bekleyelim sonra hata gösterip geri dönelim
    // Bu şekilde sonsuz döngüye girmekten kaçınıyoruz
    setTimeout(() => {
      Alert.alert('Hata', 'Kitap bulunamadı');
      navigation.goBack();
    }, 100);
    
    // Yükleniyor içeriği göster
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }
  
  // Bu noktada kitap bulunmuştur, bilgisine erişilebilir
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [readingStatus, setReadingStatus] = useState(book.status);

  // Kitap durumu değiştiğinde ana ekranı güncelle
  const updateMainScreen = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Sayfa numarasını güncelle
  const updatePageNumber = (page: number) => {
    if (page > book.pageCount) {
      setCurrentPage(book.pageCount);
    } else if (page < 0) {
      setCurrentPage(0);
    } else {
      setCurrentPage(page);
    }
  };

  // Progress bar'a tıklandığında ilerlemeyi güncelle
  const updateProgressFromTouch = (event: any) => {
    const { locationX, width } = event.nativeEvent;
    const percentage = locationX / width;
    const newPage = Math.round(percentage * book.pageCount);
    updatePageNumber(newPage);
  };

  // İlerlemeyi kaydet
  const saveProgress = async () => {
    // Önceki değeri sakla
    const prevPage = book.currentPage;
    
    try {
      console.log('saveProgress called with:', {
        bookId: book.id,
        currentPage,
        prevPage,
        currentUserId,
        hasBookData: !!bookData
      });
      
      // Backend'e ilerleme güncellemesi gönder (öncelik)
      if (bookData && bookData.id) {
        console.log('🔄 Backend\'e ilerleme güncellemesi gönderiliyor:', { bookId: bookData.id, currentPage });
        
        // Status otomatik güncellemesi için
        let statusUpdate = {};
        if (currentPage >= book.pageCount && book.status !== BookStatus.COMPLETED) {
          statusUpdate = { 
            status: 'completed',
            finish_date: new Date().toISOString()
          };
        } else if (currentPage > 0 && book.status === BookStatus.TO_READ) {
          statusUpdate = { 
            status: 'reading',
            start_date: new Date().toISOString()
          };
        }
        
        const result = await APIService.updateUserBook(bookData.id, {
          current_page: currentPage, // Sayfa ilerlemesini backend'e gönder
          ...statusUpdate
        });
        
        if (result.success) {
          console.log('✅ Backend ilerleme güncellemesi başarılı');
        } else {
          console.error('❌ Backend ilerleme güncellemesi başarısız:', result.message);
          Alert.alert("Hata", result.message || "İlerleme kaydedilirken bir hata oluştu.");
          return;
        }
      }
      
      // Redis kitabını güncelle (varsa)
      if (reduxBook) {
        const updatedBook = {
          ...reduxBook,
          currentPage,
          progress: Math.round((currentPage / book.pageCount) * 100),
          status: currentPage >= book.pageCount 
            ? 'COMPLETED' 
            : currentPage > 0 
            ? 'READING' 
            : reduxBook.status,
          lastReadingDate: new Date().toISOString(),
        };
        
        console.log('Updating Redux book:', {
          bookId: updatedBook.id,
          oldCurrentPage: reduxBook.currentPage,
          newCurrentPage: updatedBook.currentPage,
          oldProgress: reduxBook.progress,
          newProgress: updatedBook.progress
        });
        
        dispatch(updateBook(updatedBook));
        
        // AsyncStorage'a kaydet
        if (currentUserId) {
          const allBooks = libraryBooks.map(b => 
            b.id === updatedBook.id ? updatedBook : b
          );
          await saveBooks(allBooks, currentUserId);
        }
      }
      
      // Local book nesnesini güncelle
      book.currentPage = currentPage;
      book.progress = Math.round((currentPage / book.pageCount) * 100);
      
      // Status güncellemesi (local)
      if (currentPage >= book.pageCount && book.status !== BookStatus.COMPLETED) {
        book.status = BookStatus.COMPLETED;
        setReadingStatus(BookStatus.COMPLETED);
      } else if (currentPage > 0 && book.status === BookStatus.TO_READ) {
        book.status = BookStatus.READING;
        setReadingStatus(BookStatus.READING);
      }
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        "İlerleme Güncellendi",
        `Kitap ilerlemeniz ${currentPage}. sayfa olarak kaydedildi.${
          prevPage !== currentPage && currentPage >= book.pageCount 
            ? '\n\nTebrikler! Kitabı tamamladınız.' 
            : ''
        }`,
        [{ 
          text: "Tamam",
          onPress: () => {
            // Kitap tamamlandıysa, kitaplık ekranına dön
            if (prevPage !== currentPage && currentPage >= book.pageCount) {
              setTimeout(updateMainScreen, 500);
            }
          }
        }]
      );
    } catch (error) {
      console.error("İlerleme kaydetme hatası:", error);
      Alert.alert("Hata", "İlerleme kaydedilirken bir hata oluştu.");
    }
  };

  // Okuma durumunu güncelle
  const updateReadingStatus = async (status: BookStatus) => {
    try {
      // Önceki durumu sakla
      const prevStatus = readingStatus;
      
      // Durumu güncelle
      setReadingStatus(status);
      
      // Backend API status değerlerini map et
      const apiStatus = status === BookStatus.READING ? 'reading' :
                      status === BookStatus.COMPLETED ? 'completed' : 'to_read';
      
      // Backend'e durum değişikliğini gönder (öncelik)
      if (bookData && bookData.id) {
        console.log('🔄 Backend\'e durum güncellemesi gönderiliyor:', { bookId: bookData.id, status: apiStatus });
        
        const result = await APIService.updateUserBook(bookData.id, { 
          status: apiStatus,
          // Tamamlandıysa finish_date ekle
          finish_date: status === BookStatus.COMPLETED ? new Date().toISOString() : undefined,
          // Okumaya başlandıysa start_date ekle
          start_date: status === BookStatus.READING && prevStatus === BookStatus.TO_READ ? new Date().toISOString() : undefined
        });
        
        if (result.success) {
          console.log('✅ Backend durum güncellemesi başarılı');
          
          // Local book nesnesini güncelle
          book.status = status;
          
          // Tamamlandıysa progress ve currentPage'i güncelle
          if (status === BookStatus.COMPLETED) {
            book.currentPage = book.pageCount;
            book.progress = 100;
            setCurrentPage(book.pageCount);
          } else if (status === BookStatus.READING && prevStatus === BookStatus.TO_READ) {
            // Okumaya başlanırsa sayfa 1'e ayarla
            book.currentPage = Math.max(book.currentPage, 1);
            setCurrentPage(book.currentPage);
          }
        } else {
          console.error('❌ Backend durum güncellemesi başarısız:', result.message);
          // Hata durumunda eski duruma geri dön
          setReadingStatus(prevStatus);
          Alert.alert("Hata", result.message || "Kitap durumu güncellenirken bir hata oluştu.");
          return;
        }
      }
      
      // Redux kitabını da güncelle (varsa)
      if (reduxBook) {
        const updatedBook = {
          ...reduxBook,
          status: (status === BookStatus.READING ? 'READING' :
                status === BookStatus.COMPLETED ? 'COMPLETED' : 'TO_READ') as 'READING' | 'COMPLETED' | 'TO_READ',
          currentPage: status === BookStatus.COMPLETED ? book.pageCount : book.currentPage,
          progress: status === BookStatus.COMPLETED ? 100 : book.progress,
          lastReadingDate: new Date().toISOString(),
        };
        dispatch(updateBook(updatedBook));
        
        // AsyncStorage'a kaydet
        if (currentUserId) {
          const allBooks = libraryBooks.map(b => 
            b.id === updatedBook.id ? updatedBook : b
          );
          await saveBooks(allBooks, currentUserId);
        }
      }
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        "Durum Güncellendi",
        `Kitap durumu "${status === BookStatus.READING ? 'Okuyorum' : 
          status === BookStatus.COMPLETED ? 'Tamamlandı' : 'Okuma Listem'}" olarak değiştirildi.`,
        [{ 
          text: "Tamam",
          onPress: () => {
            // Kütüphane ekranına dönüldüğünde yenilenmesini sağla
            if (status !== prevStatus) {
              setTimeout(() => {
                navigation.goBack();
              }, 500);
            }
          }
        }]
      );
    } catch (error) {
      console.error("Durum güncelleme hatası:", error);
      Alert.alert("Hata", "Kitap durumu güncellenirken bir hata oluştu.");
      // Hata durumunda eski duruma geri dön
      setReadingStatus(prevStatus);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const showBookMenu = () => {
    Alert.alert(
      'Kitap Seçenekleri',
      'Bu kitap için ne yapmak istiyorsunuz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Düzenle',
          onPress: () => {
            navigation.navigate('EditBook', { bookId: book.id });
          }
        },
        {
          text: 'Kitabı Sil',
          style: 'destructive',
          onPress: handleDeleteBook
        }
      ]
    );
  };

  const handleDeleteBook = () => {
    Alert.alert(
      'Kitabı Sil',
      `"${book.title}" adlı kitabı kütüphanenizden kaldırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            try {
              if (reduxBook) {
                // Redux'tan sil
                dispatch(deleteBook(book.id));
                Alert.alert('Başarılı', 'Kitap kütüphanenizden kaldırıldı.');
                navigation.goBack();
              } else {
                // Mock data'dan sil (geliştirme aşamasında)
                Alert.alert('Başarılı', 'Kitap listeden kaldırıldı.');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Silme hatası:', error);
              Alert.alert('Hata', 'Kitap silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {/* Modern başlık çubuğu */}
      <SafeAreaView style={styles.headerSafeArea}>
        <Surface style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kitap Detayları</Text>
          <TouchableOpacity style={styles.actionButton} onPress={showBookMenu}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </Surface>
      </SafeAreaView>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Kitap bilgisi kartı */}
        <Surface style={styles.bookCard}>
          <View style={styles.bookHeader}>
            <View style={styles.coverShadowContainer}>
              <View style={styles.coverContainer}>
                {imageLoading && (
                  <View style={[styles.coverLoading, { width: width * 0.35, height: width * 0.5 }]}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                  </View>
                )}
                
                <Image
                  source={{ uri: book.coverURL || 'https://via.placeholder.com/300x450?text=Kapak+Yok' }}
                  style={[
                    styles.coverImage, 
                    { width: width * 0.35, height: width * 0.5 }
                  ]}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              </View>
            </View>

            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={3}>{book.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
              
              <View style={styles.statsContainer}>
                {/* Sayfa sayısı */}
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={16} color={Colors.primary} />
                  <Text style={styles.statLabel}>{book.pageCount} sayfa</Text>
                </View>
                
                {/* Yayın yılı */}
                {book.publishYear && (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar" size={16} color={Colors.primary} />
                    <Text style={styles.statLabel}>{book.publishYear}</Text>
                  </View>
                )}
                
                {/* Tür bilgisi */}
                {book.genre && (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="tag" size={16} color={Colors.primary} />
                    <Text style={styles.statLabel}>{book.genre}</Text>
                  </View>
                )}
              </View>

              {/* Durum bilgisi etiketi */}
              <View style={styles.statusChipContainer}>
                <Surface style={[styles.statusChip, { backgroundColor: getStatusColor(book.status) }]}>
                  <MaterialCommunityIcons 
                    name={
                      book.status === BookStatus.READING 
                        ? 'book-open' 
                        : book.status === BookStatus.COMPLETED 
                          ? 'check-circle' 
                          : 'bookmark'
                    } 
                    size={16} 
                    color={Colors.surface} 
                    style={{marginRight: 4}}
                  />
                  <Text style={styles.statusText}>
                    {book.status === BookStatus.READING 
                      ? 'Okuyorum' 
                      : book.status === BookStatus.COMPLETED 
                        ? 'Tamamlandı' 
                        : 'Okuma Listem'}
                  </Text>
                </Surface>
              </View>
            </View>
          </View>

          {/* İlerleme bölümü - sadece READING durumunda */}
          {book.status === BookStatus.READING && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionTitle}>Okuma İlerlemesi</Text>
                <Text style={styles.progressPercent}>
                  %{book.progress || Math.round((currentPage / book.pageCount) * 100)}
                </Text>
              </View>
              
              {/* Progress bar için dokunulabilir alan */}
              <TouchableOpacity 
                style={styles.progressBarContainer} 
                onPress={(event) => updateProgressFromTouch(event)}
              >
                <CustomProgressBar
                  progress={currentPage / book.pageCount}
                  color={getProgressColor(currentPage / book.pageCount)}
                  style={styles.progressBar}
                />
              </TouchableOpacity>
              
              <View style={styles.pageInputSection}>
                <Text style={styles.currentPageLabel}>Mevcut Sayfa</Text>
                <View style={styles.pageControlContainer}>
                  <View style={styles.pageControls}>
                    <IconButton
                      icon="minus"
                      size={20}
                      mode="contained"
                      containerColor="#F2F2F7"
                      iconColor={Colors.text}
                      onPress={() => updatePageNumber(currentPage - 1)}
                      disabled={currentPage <= 0}
                    />
                    <Text style={styles.currentPageValue}>{currentPage}</Text>
                    <IconButton
                      icon="plus"
                      size={20}
                      mode="contained"
                      containerColor="#F2F2F7"
                      iconColor={Colors.text}
                      onPress={() => updatePageNumber(currentPage + 1)}
                      disabled={currentPage >= book.pageCount}
                    />
                  </View>
                  <CustomButton 
                    mode="contained" 
                    onPress={saveProgress}
                    style={styles.saveButton}
                    labelStyle={styles.saveButtonLabel}
                  >
                    Kaydet
                  </CustomButton>
                </View>
              </View>
            </View>
          )}
        </Surface>

        {/* Okuma Durumu Seçim Kartı */}
        <Surface style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Okuma Durumu</Text>
          
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton, 
                book.status === BookStatus.TO_READ && styles.statusButtonActive,
                {backgroundColor: book.status === BookStatus.TO_READ ? getStatusColor(BookStatus.TO_READ) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.TO_READ)}
            >
              <MaterialCommunityIcons 
                name="bookmark-outline" 
                size={16} 
                color={book.status === BookStatus.TO_READ ? Colors.surface : getStatusColor(BookStatus.TO_READ)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: book.status === BookStatus.TO_READ ? Colors.surface : getStatusColor(BookStatus.TO_READ)}
              ]}>
                Okuma Listem
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                book.status === BookStatus.READING && styles.statusButtonActive,
                {backgroundColor: book.status === BookStatus.READING ? getStatusColor(BookStatus.READING) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.READING)}
            >
              <MaterialCommunityIcons 
                name="book-open-variant" 
                size={16} 
                color={book.status === BookStatus.READING ? Colors.surface : getStatusColor(BookStatus.READING)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: book.status === BookStatus.READING ? Colors.surface : getStatusColor(BookStatus.READING)}
              ]}>
                Okuyorum
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                book.status === BookStatus.COMPLETED && styles.statusButtonActive,
                {backgroundColor: book.status === BookStatus.COMPLETED ? getStatusColor(BookStatus.COMPLETED) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.COMPLETED)}
            >
              <MaterialCommunityIcons 
                name="check-circle-outline" 
                size={16} 
                color={book.status === BookStatus.COMPLETED ? Colors.surface : getStatusColor(BookStatus.COMPLETED)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: book.status === BookStatus.COMPLETED ? Colors.surface : getStatusColor(BookStatus.COMPLETED)}
              ]}>
                Tamamlandı
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Notlar bölümü */}
        <View style={[styles.sectionCard, {backgroundColor: 'white'}]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="note-text-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Notlar</Text>
          </View>
          
          {book.notes && book.notes.length > 0 ? (
            <View style={styles.notesList}>
              {book.notes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Text style={styles.noteContent}>{note.content || 'Not içeriği'}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.notePage}>Sayfa: {note.page || '?'}</Text>
                    <Text style={styles.noteDate}>
                      {note.createdAt ? (typeof note.createdAt === 'string' ? note.createdAt : new Date(note.createdAt).toLocaleDateString()) : 'Tarih yok'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyNotesContainer}>
              <MaterialCommunityIcons name="notebook-outline" size={50} color="#E0E0E0" />
              <Text style={styles.emptyNotesText}>Henüz not eklenmemiş</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => {/* Not ekleme fonksiyonu */}}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" style={{marginRight: 8}} />
            <Text style={styles.addNoteButtonLabel}>Not Ekle</Text>
          </TouchableOpacity>
        </View>
        
        {/* Kitap hakkında bölümü - opsiyonel */}
        {book.description && book.description.trim() !== '' && (
          <Surface style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information-outline" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Kitap Hakkında</Text>
            </View>
            <Text style={styles.descriptionText}>{book.description}</Text>
          </Surface>
        )}
      </ScrollView>
      
      {/* Okuma zamanlayıcısı butonu */}
      <FAB
        style={styles.fab}
        icon="timer-outline"
        label="OKUMAYA BAŞLA"
        onPress={() => navigation.navigate('ReadingTimer', { bookId: book.id })}
        color="#FFF"
      />
    </View>
  );
};

// Helper function to get progress color based on completion
const getProgressColor = (progress: number) => {
  if (progress >= 0.8) return '#34C759'; // Green
  if (progress >= 0.4) return '#007AFF'; // Blue
  return '#FF9500'; // Orange
};

// Helper function to get color based on book status
const getStatusColor = (status: BookStatus | string) => {
  if (status === BookStatus.READING) return '#007AFF'; // Blue
  if (status === BookStatus.COMPLETED) return '#34C759'; // Green
  return '#FF9500'; // Orange for TO_READ
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.surface,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  bookCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.xl,
  },
  coverShadowContainer: {
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  coverContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  coverImage: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bookCover,
  },
  coverLoading: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
  },
  bookInfo: {
    flex: 1,
    paddingLeft: Spacing.lg,
    justifyContent: 'flex-start',
  },
  bookTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    color: Colors.text,
    lineHeight: FontSizes.xl * 1.3,
  },
  bookAuthor: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  statsContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.coolGray,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  statusChipContainer: {
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  progressSection: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressPercent: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.progressBackground,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  pageInputSection: {
    marginTop: Spacing.sm,
  },
  currentPageLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  pageControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentPageValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
    color: Colors.text,
    marginHorizontal: Spacing.sm,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 48,
  },
  statusButtonActive: {
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  statusButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  notesList: {
    marginBottom: Spacing.lg,
  },
  noteItem: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.cardBackground,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteContent: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: FontSizes.md * 1.5,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  notePage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  noteDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyNotesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyNotesText: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  addNoteButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  addNoteButtonLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: FontSizes.md * 1.6,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    left: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    elevation: 6,
    height: 56,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    flex: 1,
    marginBottom: Spacing.xl,
  },
});

export default BookDetailScreen; 