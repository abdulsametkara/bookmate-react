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
  SafeAreaView,
  TextInput,
  Modal
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
import { updateBookProgress, updateBookStatus } from '../store/bookSlice';
import CustomProgressBar from '../components/CustomProgressBar';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from '../utils/apiService';
import PageInput from '../components/PageInput';
import ProgressModal from '../components/ProgressModal';
import CustomToast from '../components/CustomToast';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  BookDetail: { bookId: string; bookData?: Book };
  EditBook: { bookId: string };
  ReadingTimer: { bookId: string };
};

const BookDetailScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Get bookId and bookData from route params - use directly without state
  const { bookId, bookData } = route.params as { bookId: string; bookData?: Book };
  
  console.log('🔍 BookDetailScreen - Route params:', { 
    bookId, 
    bookData: !!bookData ? {
      id: bookData.id,
      title: bookData.title,
      author: bookData.author,
      pageCount: bookData.pageCount,
      currentPage: bookData.currentPage,
      status: bookData.status
    } : 'NO_BOOK_DATA'
  });
  console.log('🔍 BookDetailScreen - Raw bookData type:', typeof bookData);
  console.log('🔍 BookDetailScreen - Raw bookData:', bookData);
  
  // State for image loading
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // State for loading book data from backend
  const [isLoadingBookData, setIsLoadingBookData] = useState(false);
  const [fetchedBookData, setFetchedBookData] = useState<Book | null>(null);
  
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
      createdAt: new Date('2023-04-15').toISOString(),
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
      createdAt: new Date('2023-05-20').toISOString(),
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
      createdAt: new Date('2023-06-30').toISOString(),
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
  
  // PRIORITY 1: Use fetchedBookData from backend (if we had to fetch it manually)
  if (fetchedBookData) {
    book = {
      id: fetchedBookData.id,
      title: fetchedBookData.title,
      author: fetchedBookData.author,
      coverURL: fetchedBookData.coverURL,
      pageCount: fetchedBookData.pageCount || 0,
      currentPage: fetchedBookData.currentPage || 0,
      progress: fetchedBookData.progress || 0,
      status: fetchedBookData.status,
      publishYear: fetchedBookData.publishYear || undefined,
      genre: fetchedBookData.genre || undefined,
      description: fetchedBookData.description || undefined
    };
  } 
  // PRIORITY 2: Use bookData passed from LibraryScreen (backend data)
  else if (bookData && typeof bookData === 'object' && bookData.id) {
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

  // Modal states
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Toast states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastMessage, setToastMessage] = useState('');

  // Note management states
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notes, setNotes] = useState<Array<{
    id?: string; 
    content?: string; 
    createdAt?: string | Date;
  }>>([]);

  // Kitap işlemleri için modal state'leri
  const [bookActionModalVisible, setBookActionModalVisible] = useState(false);
  const [bookActionModalTitle, setBookActionModalTitle] = useState('');
  const [bookActionModalSubtitle, setBookActionModalSubtitle] = useState('');
  const [actionType, setActionType] = useState('');

  // Sync notes when book data changes
  useEffect(() => {
    if (book && book.id) {
      setNotes(book.notes || []);
    }
  }, [book?.id, book?.notes?.length]); // Only re-run when book ID or notes length changes

  // Load notes from backend and AsyncStorage when component mounts
  useEffect(() => {
    const loadNotes = async () => {
      if (!book?.id || !currentUserId) return;

      console.log('📝 Loading notes for book:', book.id);

      try {
        let loadedNotes: any[] = [];

        // 1. Önce Redux'dan kontrol et
        if (reduxBook && reduxBook.notes && reduxBook.notes.length > 0) {
          console.log('📝 Redux\'dan notlar yüklendi:', reduxBook.notes.length);
          loadedNotes = reduxBook.notes;
        }
        // 2. Backend'den not yüklemeyi dene (eğer bookData varsa) - Optional
        else if (bookData && bookData.id) {
          console.log('📝 Backend\'den notlar yükleniyor...');
          try {
            const result = await APIService.getUserBookNotes(bookData.id);
            if (result.success && result.notes && result.notes.length > 0) {
              console.log('✅ Backend\'den notlar yüklendi:', result.notes.length);
              loadedNotes = result.notes.map((note: any) => ({
                id: note.id,
                content: note.content,
                createdAt: note.created_at || note.createdAt
              }));
            } else {
              console.log('📝 Backend\'de not bulunamadı veya endpoint mevcut değil');
            }
          } catch (error) {
            console.log('⚠️ Backend not endpoint mevcut değil, AsyncStorage kullanılıyor');
          }
        }

        // 3. Eğer henüz not yoksa AsyncStorage'dan yükle
        if (loadedNotes.length === 0) {
          try {
            const noteStorageKey = `bookmate_notes_${book.id}_${currentUserId}`;
            const storedNotes = await AsyncStorage.getItem(noteStorageKey);
            if (storedNotes) {
              const parsedNotes = JSON.parse(storedNotes);
              if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                console.log('📝 AsyncStorage\'dan notlar yüklendi:', parsedNotes.length);
                loadedNotes = parsedNotes;
              }
            }
          } catch (error) {
            console.error('❌ AsyncStorage not yükleme hatası:', error);
          }
        }

        // Notları state'e set et
        if (loadedNotes.length > 0) {
          setNotes(loadedNotes);
          console.log('📝 Toplam yüklenen not sayısı:', loadedNotes.length);
        } else {
          console.log('📝 Hiç not bulunamadı');
          setNotes([]);
        }

      } catch (error) {
        console.error('❌ Not yükleme genel hatası:', error);
        setNotes([]);
      }
    };

    loadNotes();
  }, [book?.id, currentUserId, bookData?.id, reduxBook?.id]); // Dependencies for note loading

  // Toast helper function
  const showToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // If book not found, show error and go back
  if (!book) {
    if (isLoadingBookData) {
      return (
        <View style={[styles.container, styles.loadingContainer]}>
          <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Kitap bilgileri yükleniyor...</Text>
        </View>
      );
    }
    
    showToast('error', 'Kitap bulunamadı');
    navigation.goBack();
    return null;
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
          showToast('error', result.message || "İlerleme kaydedilirken bir hata oluştu.");
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
        // Kitap tamamlandı modal'ı göster
        setCompletionModalVisible(true);
      } else if (currentPage > 0 && book.status === BookStatus.TO_READ) {
        book.status = BookStatus.READING;
        setReadingStatus(BookStatus.READING);
        // İlerleme modal'ı göster
        setProgressModalVisible(true);
      } else {
        // Normal ilerleme modal'ı göster
        setProgressModalVisible(true);
      }
      
    } catch (error) {
      console.error("İlerleme kaydetme hatası:", error);
      showToast('error', "İlerleme kaydedilirken bir hata oluştu.");
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
          showToast('error', result.message || "Kitap durumu güncellenirken bir hata oluştu.");
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
      
      // Durum değişikliği modal'ını göster
      const statusMessages = {
        [BookStatus.READING]: 'Kitap "Okuyorum" listesine eklendi',
        [BookStatus.COMPLETED]: 'Tebrikler! Kitabı tamamladınız',
        [BookStatus.TO_READ]: 'Kitap "Okuma Listem"e eklendi'
      };
      
      setModalMessage(statusMessages[status]);
      
      if (status === BookStatus.COMPLETED) {
        setCompletionModalVisible(true);
      } else {
        setStatusModalVisible(true);
      }
      
    } catch (error) {
      console.error("Durum güncelleme hatası:", error);
      showToast('error', "Kitap durumu güncellenirken bir hata oluştu.");
      // Hata durumunda eski duruma geri dön
      setReadingStatus(readingStatus);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const showBookMenu = () => {
    showBookActionModal('book-menu', 'Kitap Seçenekleri', 'Bu kitap için ne yapmak istiyorsunuz?');
  };

  const handleBookMenuAction = (action: string) => {
    setBookActionModalVisible(false);
    setTimeout(() => {
      if (action === 'edit') {
        navigation.navigate('EditBook', { bookId: book.id });
      } else if (action === 'delete') {
        handleDeleteConfirmation();
      } else if (action === 'confirm-delete') {
        handleDeleteBook();
      }
    }, 300);
  };

  // Kitap silme onay fonksiyonu
  const handleDeleteConfirmation = () => {
    showBookActionModal('warning', 'Kitabı Sil', `"${book.title}" adlı kitabı kütüphanenizden kaldırmak istediğinizden emin misiniz?`);
    setActionType('confirm-delete');
  };

  // Kitabı silme işlemi
  const handleDeleteBook = async () => {
    try {
      if (bookData && bookData.id) {
        // Backend'den kitabı sil - bookData.id kullanarak user_book ID'sini kullan
        console.log('🗑️ Backend\'den kitap siliniyor, ID:', bookData.id);
        
        const result = await APIService.deleteUserBook(bookData.id);
        if (result.success) {
          console.log('✅ Backend\'den silme başarılı');
          showToast('success', 'Kitap kütüphanenizden kaldırıldı.');
          setTimeout(() => {
            navigation.goBack();
          }, 300);
        } else {
          console.error('❌ Backend silme hatası:', result.message);
          showToast('error', result.message || 'Kitap silinirken bir hata oluştu.');
        }
      } else if (reduxBook) {
        // Redux'tan sil
        console.log('🗑️ Redux\'tan kitap siliniyor, ID:', book.id);
        dispatch(deleteBook(book.id));
        showToast('success', 'Kitap kütüphanenizden kaldırıldı.');
        setTimeout(() => {
          navigation.goBack();
        }, 300);
      } else {
        // Mock data'dan sil (geliştirme aşamasında)
        console.log('🗑️ Mock data\'dan kitap siliniyor');
        showToast('success', 'Kitap listeden kaldırıldı.');
        setTimeout(() => {
          navigation.goBack();
        }, 300);
      }
    } catch (error) {
      console.error('❌ Silme hatası:', error);
      showToast('error', 'Kitap silinirken bir hata oluştu.');
    }
  };

  // Kitap işlemleri için modal gösterme fonksiyonu
  const showBookActionModal = (type: string, title: string, subtitle: string) => {
    setActionType(type);
    setBookActionModalTitle(title);
    setBookActionModalSubtitle(subtitle);
    setBookActionModalVisible(true);
  };

  // Not ekleme fonksiyonları
  const openNoteModal = () => {
    setNewNoteContent('');
    setIsEditMode(false);
    setEditingNoteId(null);
    setNoteModalVisible(true);
  };

  const openEditNoteModal = (note: any) => {
    setNewNoteContent(note.content || '');
    setIsEditMode(true);
    setEditingNoteId(note.id);
    setNoteModalVisible(true);
  };

  const saveNote = async () => {
    if (!newNoteContent.trim()) {
      showToast('warning', 'Not içeriği boş olamaz');
      return;
    }

    try {
      if (isEditMode && editingNoteId) {
        // Not düzenleme modu
        const updatedNotes = notes.map(note => 
          note.id === editingNoteId 
            ? { ...note, content: newNoteContent.trim(), updatedAt: new Date().toISOString() }
            : note
        );
        setNotes(updatedNotes);

        // Backend'e güncelleme gönder (eğer bookData varsa) - Optional, hata olursa devam et
        if (bookData && bookData.id) {
          console.log('📝 Backend\'de not güncelleniyor:', { bookId: bookData.id, noteId: editingNoteId });
          try {
            const result = await APIService.updateUserBookNote(bookData.id, editingNoteId, {
              content: newNoteContent.trim()
            });
            if (result.success) {
              console.log('✅ Backend not güncellemesi başarılı');
            } else {
              console.log('⚠️ Backend not güncellemesi mevcut değil, sadece local kayıt yapılıyor');
            }
          } catch (error) {
            console.log('⚠️ Backend not endpoint mevcut değil, sadece local kayıt yapılıyor');
          }
        }

        // Redux'ta da güncelle (eğer reduxBook varsa)
        if (reduxBook) {
          const updatedBook = {
            ...reduxBook,
            notes: updatedNotes
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

        // Eğer Redux book yoksa, notları AsyncStorage'a ayrı olarak kaydet
        if (!reduxBook) {
          const noteStorageKey = `bookmate_notes_${book.id}_${currentUserId}`;
          await AsyncStorage.setItem(noteStorageKey, JSON.stringify(updatedNotes));
          console.log('📝 Notlar AsyncStorage\'a kaydedildi:', noteStorageKey);
        }

        showToast('success', 'Not başarıyla güncellendi');
      } else {
        // Yeni not ekleme modu
        const newNote = {
          id: Date.now().toString(),
          content: newNoteContent.trim(),
          createdAt: new Date().toISOString()
        };

        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);

        // Backend'e not kaydet (eğer bookData varsa) - Optional, hata olursa devam et
        if (bookData && bookData.id) {
          console.log('📝 Backend\'e not kaydediliyor:', { bookId: bookData.id, note: newNote });
          try {
            const result = await APIService.addUserBookNote(bookData.id, {
              content: newNote.content
            });
            if (result.success) {
              console.log('✅ Backend not kaydetme başarılı');
              // Backend'den dönen note ID'sini kullan
              if (result.note && result.note.id) {
                newNote.id = result.note.id;
                const finalNotes = updatedNotes.map(n => n.id === Date.now().toString() ? newNote : n);
                setNotes(finalNotes);
              }
            } else {
              console.log('⚠️ Backend not kaydetme mevcut değil, sadece local kayıt yapılıyor');
            }
          } catch (error) {
            console.log('⚠️ Backend not endpoint mevcut değil, sadece local kayıt yapılıyor');
          }
        }
        
        // Redux'ta da güncelle (eğer reduxBook varsa)
        if (reduxBook) {
          const updatedBook = {
            ...reduxBook,
            notes: updatedNotes
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

        // Eğer Redux book yoksa, notları AsyncStorage'a ayrı olarak kaydet
        if (!reduxBook) {
          const noteStorageKey = `bookmate_notes_${book.id}_${currentUserId}`;
          await AsyncStorage.setItem(noteStorageKey, JSON.stringify(updatedNotes));
          console.log('📝 Notlar AsyncStorage\'a kaydedildi:', noteStorageKey);
        }
        
        showToast('success', 'Not başarıyla kaydedildi');
      }
      
      setNoteModalVisible(false);
      setNewNoteContent('');
      setIsEditMode(false);
      setEditingNoteId(null);
      
    } catch (error) {
      console.error('❌ Not kaydetme hatası:', error);
      showToast('error', 'Not kaydedilirken bir hata oluştu');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      
      // Backend'den not sil (eğer bookData varsa) - Optional, hata olursa devam et
      if (bookData && bookData.id) {
        console.log('🗑️ Backend\'den not siliniyor:', { bookId: bookData.id, noteId });
        try {
          const result = await APIService.deleteUserBookNote(bookData.id, noteId);
          if (result.success) {
            console.log('✅ Backend not silme başarılı');
          } else {
            console.log('⚠️ Backend not silme mevcut değil, sadece local silme yapılıyor');
          }
        } catch (error) {
          console.log('⚠️ Backend not endpoint mevcut değil, sadece local silme yapılıyor');
        }
      }
      
      // Redux'ta da güncelle (eğer reduxBook varsa)
      if (reduxBook) {
        const updatedBook = {
          ...reduxBook,
          notes: updatedNotes
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

      // Eğer Redux book yoksa, notları AsyncStorage'a ayrı olarak kaydet
      if (!reduxBook) {
        const noteStorageKey = `bookmate_notes_${book.id}_${currentUserId}`;
        await AsyncStorage.setItem(noteStorageKey, JSON.stringify(updatedNotes));
        console.log('🗑️ Notlar AsyncStorage\'dan silindi:', noteStorageKey);
      }
      
      showToast('success', 'Not silindi');
      
    } catch (error) {
      console.error('❌ Not silme hatası:', error);
      showToast('error', 'Not silinirken bir hata oluştu');
    }
  };

  // If bookData is not passed or invalid, fetch from backend
  useEffect(() => {
    const loadBookDataFromBackend = async () => {
      if (!bookData || typeof bookData !== 'object' || !bookData.id) {
        console.log('🔄 BookDetailScreen - bookData invalid, fetching from backend with bookId:', bookId);
        setIsLoadingBookData(true);
        
        try {
          // Fetch all books from backend and find the one we need
          const result = await APIService.getUserBooks();
          if (result.success && result.books) {
            const foundBook = result.books.find((userBook: any) => userBook.id === bookId);
            if (foundBook) {
              console.log('✅ BookDetailScreen - Found book in backend:', {
                id: foundBook.id,
                title: foundBook.title,
                author: foundBook.author
              });
              
              // Convert UserBook to Book format
              const convertedBook: Book = {
                id: foundBook.id,
                title: foundBook.title,
                author: foundBook.author,
                coverURL: foundBook.cover_image_url || 'https://via.placeholder.com/200x300?text=Kapak+Yok',
                pageCount: foundBook.page_count || 0,
                currentPage: foundBook.current_page || 0,
                progress: foundBook.page_count > 0 ? Math.round((foundBook.current_page || 0) / foundBook.page_count * 100) : 0,
                status: foundBook.status === 'reading' ? BookStatus.READING :
                        foundBook.status === 'completed' ? BookStatus.COMPLETED : BookStatus.TO_READ,
                createdAt: foundBook.createdAt || new Date().toISOString(),
                updatedAt: foundBook.updatedAt || new Date().toISOString(),
                notes: [],
                genre: foundBook.genre || 'Genel',
                publishYear: new Date().getFullYear(),
                publisher: 'Bilinmiyor',
                description: '',
              };
              
              setFetchedBookData(convertedBook);
            } else {
              console.log('❌ BookDetailScreen - Book not found in backend');
            }
          }
        } catch (error) {
          console.error('❌ BookDetailScreen - Error fetching book data:', error);
        } finally {
          setIsLoadingBookData(false);
        }
      }
    };
    
    loadBookDataFromBackend();
  }, [bookId, bookData]);

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
                  source={{ uri: bookData.coverURL || 'https://via.placeholder.com/300x450?text=Kapak+Yok' }}
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
              <Text style={styles.bookTitle} numberOfLines={3}>{bookData.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>{bookData.author}</Text>
              
              <View style={styles.statsContainer}>
                {/* Sayfa sayısı */}
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={16} color={Colors.primary} />
                  <Text style={styles.statLabel}>{bookData.pageCount} sayfa</Text>
                </View>
                
                {/* Yayın yılı */}
                {bookData.publishYear && (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar" size={16} color={Colors.primary} />
                    <Text style={styles.statLabel}>{bookData.publishYear}</Text>
                  </View>
                )}
                
                {/* Tür bilgisi */}
                {bookData.genre && (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="tag" size={16} color={Colors.primary} />
                    <Text style={styles.statLabel}>{bookData.genre}</Text>
                  </View>
                )}
              </View>

              {/* Durum bilgisi etiketi */}
              <View style={styles.statusChipContainer}>
                <Surface style={[styles.statusChip, { backgroundColor: getStatusColor(bookData.status) }]}>
                  <MaterialCommunityIcons 
                    name={
                      bookData.status === BookStatus.READING 
                        ? 'book-open' 
                        : bookData.status === BookStatus.COMPLETED 
                          ? 'check-circle' 
                          : 'bookmark'
                    } 
                    size={16} 
                    color={Colors.surface} 
                    style={{marginRight: 4}}
                  />
                  <Text style={styles.statusText}>
                    {bookData.status === BookStatus.READING 
                      ? 'Okuyorum' 
                      : bookData.status === BookStatus.COMPLETED 
                        ? 'Tamamlandı' 
                        : 'Okuma Listem'}
                  </Text>
                </Surface>
              </View>
            </View>
          </View>

          {/* İlerleme bölümü - sadece READING durumunda */}
          {bookData.status === BookStatus.READING && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionTitle}>Okuma İlerlemesi</Text>
                <Text style={styles.progressPercent}>
                  %{bookData.progress || Math.round((currentPage / bookData.pageCount) * 100)}
                </Text>
              </View>
              
              {/* Progress bar için dokunulabilir alan */}
              <TouchableOpacity 
                style={styles.progressBarContainer} 
                onPress={(event) => updateProgressFromTouch(event)}
              >
                <CustomProgressBar
                  progress={currentPage / bookData.pageCount}
                  color={getProgressColor(currentPage / bookData.pageCount)}
                  style={styles.progressBar}
                />
              </TouchableOpacity>
              
              <View style={styles.pageInputSection}>
                <Text style={styles.currentPageLabel}>Mevcut Sayfa</Text>
                <View style={styles.pageControlContainer}>
                  <PageInput
                    currentPage={currentPage}
                    maxPage={bookData.pageCount}
                    onPageChange={updatePageNumber}
                  />
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
                bookData.status === BookStatus.TO_READ && styles.statusButtonActive,
                {backgroundColor: bookData.status === BookStatus.TO_READ ? getStatusColor(BookStatus.TO_READ) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.TO_READ)}
            >
              <MaterialCommunityIcons 
                name="bookmark-outline" 
                size={16} 
                color={bookData.status === BookStatus.TO_READ ? Colors.surface : getStatusColor(BookStatus.TO_READ)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: bookData.status === BookStatus.TO_READ ? Colors.surface : getStatusColor(BookStatus.TO_READ)}
              ]}>
                Okuma Listem
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                bookData.status === BookStatus.READING && styles.statusButtonActive,
                {backgroundColor: bookData.status === BookStatus.READING ? getStatusColor(BookStatus.READING) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.READING)}
            >
              <MaterialCommunityIcons 
                name="book-open-variant" 
                size={16} 
                color={bookData.status === BookStatus.READING ? Colors.surface : getStatusColor(BookStatus.READING)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: bookData.status === BookStatus.READING ? Colors.surface : getStatusColor(BookStatus.READING)}
              ]}>
                Okuyorum
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                bookData.status === BookStatus.COMPLETED && styles.statusButtonActive,
                {backgroundColor: bookData.status === BookStatus.COMPLETED ? getStatusColor(BookStatus.COMPLETED) : Colors.surface}
              ]}
              onPress={() => updateReadingStatus(BookStatus.COMPLETED)}
            >
              <MaterialCommunityIcons 
                name="check-circle-outline" 
                size={16} 
                color={bookData.status === BookStatus.COMPLETED ? Colors.surface : getStatusColor(BookStatus.COMPLETED)} 
              />
              <Text style={[
                styles.statusButtonText,
                {color: bookData.status === BookStatus.COMPLETED ? Colors.surface : getStatusColor(BookStatus.COMPLETED)}
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
          
          {notes && notes.length > 0 ? (
            <View style={styles.notesList}>
              {notes.map((note, index) => (
                <View key={note.id || index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTitle}>Not {index + 1}</Text>
                    <View style={styles.noteActions}>
                      <TouchableOpacity 
                        onPress={() => openEditNoteModal(note)}
                        style={styles.editNoteButton}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#2196F3" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteNote(note.id)}
                        style={styles.deleteNoteButton}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>
                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Tarih yok'}
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
            style={styles.noteButton}
            onPress={openNoteModal}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" style={{marginRight: 8}} />
            <Text style={styles.addNoteButtonLabel}>Not Ekle</Text>
          </TouchableOpacity>
        </View>
        
        {/* Kitap hakkında bölümü - opsiyonel */}
        {bookData.description && bookData.description.trim() !== '' && (
          <Surface style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information-outline" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Kitap Hakkında</Text>
            </View>
            <Text style={styles.descriptionText}>{bookData.description}</Text>
          </Surface>
        )}
      </ScrollView>
      
      {/* Okuma zamanlayıcısı butonu */}
      <FAB
        style={styles.fab}
        icon="timer-outline"
        label="OKUMAYA BAŞLA"
        onPress={() => navigation.navigate('ReadingTimer', { bookId: bookData.id })}
        color="#FFF"
      />

      {/* Modern Progress Modals */}
      <ProgressModal
        visible={progressModalVisible}
        onClose={() => setProgressModalVisible(false)}
        page={currentPage}
        totalPages={bookData.pageCount}
        bookTitle={bookData.title}
        type="progress"
      />

      <ProgressModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          // Durum değişikliğinden sonra ana ekrana dön
          setTimeout(() => navigation.goBack(), 300);
        }}
        page={currentPage}
        totalPages={bookData.pageCount}
        bookTitle={bookData.title}
        type="status"
        message={modalMessage}
      />

      <ProgressModal
        visible={completionModalVisible}
        onClose={() => {
          setCompletionModalVisible(false);
          // Kitap tamamlandıktan sonra ana ekrana dön
          setTimeout(() => navigation.goBack(), 300);
        }}
        page={currentPage}
        totalPages={bookData.pageCount}
        bookTitle={bookData.title}
        type="completion"
      />

      {/* Custom Toast */}
      <CustomToast
        visible={toastVisible}
        type={toastType}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setNoteModalVisible(false);
          setNewNoteContent('');
        }}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContainer}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>
                {isEditMode ? 'Not Düzenle' : 'Not Ekle'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setNoteModalVisible(false);
                  setNewNoteContent('');
                  setIsEditMode(false);
                  setEditingNoteId(null);
                }}
                style={styles.noteModalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.noteModalSubtitle}>
              "{book.title}" kitabı hakkında {isEditMode ? 'notunuzu düzenleyin' : 'genel notunuzu yazın'}
            </Text>
            
            <View style={styles.noteModalContent}>
              <TextInput
                style={styles.noteTextInput}
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                placeholder="Notunuzu buraya yazın..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />
              
              <View style={styles.noteModalActions}>
                <TouchableOpacity
                  style={[styles.noteModalButton, styles.noteModalCancelButton]}
                  onPress={() => {
                    setNoteModalVisible(false);
                    setNewNoteContent('');
                    setIsEditMode(false);
                    setEditingNoteId(null);
                  }}
                >
                  <Text style={styles.noteModalCancelText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.noteModalButton, styles.noteModalSaveButton]}
                  onPress={saveNote}
                >
                  <MaterialCommunityIcons name="content-save" size={16} color={Colors.surface} />
                  <Text style={styles.noteModalSaveText}>
                    {isEditMode ? 'Güncelle' : 'Kaydet'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Book Action Modal */}
      <ProgressModal
        visible={bookActionModalVisible}
        onClose={() => setBookActionModalVisible(false)}
        page={currentPage}
        totalPages={book.pageCount}
        bookTitle={book.title}
        type={actionType === 'confirm-delete' ? 'warning' : 'book-menu'}
        title={bookActionModalTitle}
        subtitle={bookActionModalSubtitle}
        actionType={actionType}
        onAction={handleBookMenuAction}
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  noteTitle: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editNoteButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
    marginRight: Spacing.sm,
  },
  deleteNoteButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
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
  noteButton: {
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
  noteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.md,
  },
  noteModalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    maxHeight: '80%',
    minHeight: '60%',
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  noteModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  noteModalCloseButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  noteModalSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  noteModalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  noteTextInput: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSizes.md,
    flex: 1,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
  },
  noteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteModalButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: Spacing.xs,
  },
  noteModalCancelButton: {
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteModalSaveButton: {
    backgroundColor: Colors.primary,
  },
  noteModalCancelText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  noteModalSaveText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
});

export default BookDetailScreen; 