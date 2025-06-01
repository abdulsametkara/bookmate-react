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
  Modal,
  Text as RNText,
  Vibration
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Text, Button, Surface, Divider, IconButton, FAB } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { BookStatus } from '../models';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateBook, deleteBook, saveBooks, addBook, Book } from '../store/bookSlice';
import { updateBookProgress, updateBookStatus } from '../store/bookSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from '../utils/apiService';
import ProgressModal from '../components/ProgressModal';
import CustomToast from '../components/CustomToast';

const { width, height } = Dimensions.get('window');

const BookDetailScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Get route params
  const { bookId, bookData } = route.params as { bookId: string; bookData?: Book };
  
  // Redux states
  const libraryBooks = useSelector((state: RootState) => state.books.items);
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  
  // Get book data
  const book = bookData || libraryBooks.find(b => b.id === bookId);
  
  // States
  const [currentPage, setCurrentPage] = useState(book?.currentPage || 0);
  const [showPageModal, setShowPageModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Array<{id: string, text: string, date: string}>>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [pageInputText, setPageInputText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [bookStatus, setBookStatus] = useState<'TO_READ' | 'READING' | 'COMPLETED' | 'PAUSED'>(book?.status || 'TO_READ');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  
  // Add animation refs for menu and delete
  const menuScaleAnim = useRef(new Animated.Value(0)).current;
  const deleteShakeAnim = useRef(new Animated.Value(0)).current;
  const deleteProgressAnim = useRef(new Animated.Value(0)).current;
  
  // Update local state when book changes
  useEffect(() => {
    if (book) {
      setBookStatus(book.status);
      setCurrentPage(book.currentPage);
      setPageInputText(book.currentPage.toString());
      loadNotes();
    }
  }, [book?.status, book?.currentPage, bookId]);

  // Load notes from AsyncStorage
  const loadNotes = async () => {
    try {
      const notesKey = `book_notes_${bookId}`;
      const savedNotes = await AsyncStorage.getItem(notesKey);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  // Save notes to AsyncStorage
  const saveNotesToStorage = async (notesToSave: Array<{id: string, text: string, date: string}>) => {
    try {
      const notesKey = `book_notes_${bookId}`;
      await AsyncStorage.setItem(notesKey, JSON.stringify(notesToSave));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="book-off" size={100} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Ops! Kitap Bulunamadı</Text>
          <Text style={styles.errorDescription}>
            Bu kitap artık mevcut değil veya kaldırılmış olabilir.
          </Text>
          <TouchableOpacity 
            style={styles.backToLibraryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            <Text style={styles.backToLibraryText}>Kütüphaneye Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate progress
  const progress = book.pageCount > 0 ? (currentPage / book.pageCount) * 100 : 0;

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
      })
    ]).start();
  }, [progress]);

  // Haptic feedback
  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
  };

  // Status helpers
  const getStatusInfo = () => {
    switch (bookStatus) {
      case 'READING':
        return {
          color: '#FF6B6B',
          icon: 'book-open',
          text: 'Okuyorum',
          emoji: '📖',
          bgGradient: ['#FF6B6B', '#FF8E53']
        };
      case 'COMPLETED':
        return {
          color: '#4ECDC4',
          icon: 'check-circle',
          text: 'Tamamlandı',
          emoji: '✅',
          bgGradient: ['#4ECDC4', '#26D0CE']
        };
      case 'TO_READ':
        return {
          color: '#FFE66D',
          icon: 'bookmark',
          text: 'Okunacak',
          emoji: '📚',
          bgGradient: ['#FFE66D', '#FFCC02']
        };
      default:
        return {
          color: '#A8E6CF',
          icon: 'book',
          text: 'Bilinmiyor',
          emoji: '❓',
          bgGradient: ['#A8E6CF', '#88D8C0']
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Update functions
  const updatePageNumber = async (newPage: number) => {
    const pageNum = Math.max(0, Math.min(newPage, book.pageCount));
    setCurrentPage(pageNum);
    setPageInputText(pageNum.toString());
    triggerHaptic();
    
    try {
      if (bookId) {
        await APIService.updateUserBook(bookId, {
          current_page: pageNum
        });
      }
      
      const bookUpdate = {
        ...book,
        currentPage: pageNum,
        progress: book.pageCount > 0 ? (pageNum / book.pageCount) * 100 : 0,
        coverURL: book.coverURL || 'https://via.placeholder.com/200x300?text=Kapak+Yok',
        createdAt: book.createdAt || new Date().toISOString(),
        userId: currentUserId || undefined,
        notes: book.notes || []
      };
      
      dispatch(updateBook(bookUpdate));
      displayToast('success', '📖 Sayfa güncellendi!');
    } catch (error) {
      displayToast('error', '❌ Güncelleme başarısız');
    }
  };

  const updateReadingStatus = async (status: BookStatus) => {
    triggerHaptic();
    
    // Convert BookStatus enum to store string type immediately
    let storeStatus: 'TO_READ' | 'READING' | 'COMPLETED' | 'PAUSED';
    switch (status) {
      case BookStatus.READING:
        storeStatus = 'READING';
        break;
      case BookStatus.COMPLETED:
        storeStatus = 'COMPLETED';
        break;
      case BookStatus.TO_READ:
        storeStatus = 'TO_READ';
        break;
      default:
        storeStatus = 'PAUSED';
        break;
    }
    
    // Immediately update local state for instant UI feedback
    setBookStatus(storeStatus);
    
    try {
      const statusMapping = {
        [BookStatus.READING]: 'reading',
        [BookStatus.COMPLETED]: 'completed',
        [BookStatus.TO_READ]: 'to_read'
      };
      
      if (bookId) {
        await APIService.updateUserBook(bookId, {
          status: statusMapping[status]
        });
      }
      
      const bookUpdate = {
        ...book,
        status: storeStatus,
        coverURL: book.coverURL || 'https://via.placeholder.com/200x300?text=Kapak+Yok',
        createdAt: book.createdAt || new Date().toISOString(),
        userId: currentUserId || undefined,
        currentPage: book.currentPage || currentPage,
        progress: book.progress || 0,
        notes: book.notes || []
      };
      
      dispatch(updateBook(bookUpdate));
      
      if (status === BookStatus.COMPLETED) {
        setShowProgressModal(true);
        displayToast('success', '🎉 Tebrikler! Kitabı bitirdin!');
      } else {
        displayToast('success', '✨ Durum güncellendi');
      }
    } catch (error) {
      console.error('Status update error:', error);
      // Revert local state on error
      setBookStatus(book?.status || 'TO_READ');
      displayToast('error', '❌ Güncelleme başarısız');
    }
  };

  const displayToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Note management functions
  const saveNote = async () => {
    if (!noteText.trim()) return;
    triggerHaptic();
    
    try {
      const newNote = {
        id: editingNoteId || Date.now().toString(),
        text: noteText.trim(),
        date: new Date().toLocaleDateString('tr-TR')
      };

      let updatedNotes;
      if (editingNoteId) {
        // Update existing note
        updatedNotes = notes.map(note => 
          note.id === editingNoteId ? newNote : note
        );
        displayToast('success', '📝 Not güncellendi!');
      } else {
        // Add new note
        updatedNotes = [...notes, newNote];
        displayToast('success', '📝 Not kaydedildi!');
      }

      setNotes(updatedNotes);
      await saveNotesToStorage(updatedNotes);
      
      setNoteText('');
      setEditingNoteId(null);
      setShowNoteModal(false);
    } catch (error) {
      displayToast('error', '❌ Not kaydedilemedi');
    }
  };

  const editNote = (noteId: string) => {
    const noteToEdit = notes.find(note => note.id === noteId);
    if (noteToEdit) {
      setNoteText(noteToEdit.text);
      setEditingNoteId(noteId);
      setShowNoteModal(true);
      triggerHaptic();
    }
  };

  const deleteNote = async (noteId: string) => {
    triggerHaptic();
    
    try {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      await saveNotesToStorage(updatedNotes);
      displayToast('success', '🗑️ Not silindi');
    } catch (error) {
      displayToast('error', '❌ Not silinemedi');
    }
  };

  const openNewNote = () => {
    setNoteText('');
    setEditingNoteId(null);
    setShowNoteModal(true);
  };

  const handlePageInputChange = (text: string) => {
    setPageInputText(text);
    const num = parseInt(text) || 0;
    const validPage = Math.max(0, Math.min(num, book.pageCount));
    setCurrentPage(validPage);
  };

  const handlePageInputSubmit = () => {
    updatePageNumber(currentPage);
  };

  const handleSliderChange = (value: number) => {
    const pageNum = Math.round(value);
    setCurrentPage(pageNum);
    setPageInputText(pageNum.toString());
  };

  const handleSliderComplete = (value: number) => {
    triggerHaptic();
    updatePageNumber(Math.round(value));
  };

  // Delete book function
  const deleteBookFromCollection = async () => {
    // Animate shake effect
    Animated.sequence([
      Animated.timing(deleteShakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(deleteShakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(deleteShakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert(
      '🗑️ Kitabı Sil',
      `"${book.title}" kitabını kütüphanenizden silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm notlarınız silinecektir.`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              setDeleteProgress(0);
              triggerHaptic();
              
              console.log(`🗑️ Deleting book: ${book.title} (ID: ${book.id})`);
              
              // Start progress animation
              deleteProgressAnim.setValue(0);
              const progressAnimation = Animated.timing(deleteProgressAnim, {
                toValue: 100,
                duration: 2000,
                useNativeDriver: false,
              });
              progressAnimation.start();
              
              // Update progress state for text display
              const progressInterval = setInterval(() => {
                setDeleteProgress((prev) => {
                  if (prev >= 95) {
                    clearInterval(progressInterval);
                    return 95; // Wait for API response
                  }
                  return prev + 5;
                });
              }, 100);
              
              const result = await APIService.removeBookFromCollection(book.id);
              
              clearInterval(progressInterval);
              setDeleteProgress(100);
              deleteProgressAnim.setValue(100);
              
              // Wait a bit to show completion
              await new Promise(resolve => setTimeout(resolve, 500));
              
              if (result.success) {
                displayToast('success', '✅ Kitap başarıyla silindi');
                
                // Fade out animation before navigation
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  // Navigate back to library with refresh signal
                  navigation.navigate('Library', { shouldRefresh: true });
                });
                
                console.log('✅ Book deleted successfully');
              } else {
                displayToast('error', `❌ Kitap silinemedi: ${result.message}`);
                console.error('❌ Delete failed:', result.message);
              }
            } catch (error) {
              console.error('💥 Delete error:', error);
              displayToast('error', '❌ Bir hata oluştu');
            } finally {
              setIsDeleting(false);
              setDeleteProgress(0);
              setShowMenuModal(false);
            }
          }
        }
      ]
    );
  };

  // Menu animation functions
  const showMenu = () => {
    setShowMenuModal(true);
    Animated.spring(menuScaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const hideMenu = () => {
    Animated.timing(menuScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowMenuModal(false);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{book.title}</Text>
          <Text style={styles.headerSubtitle}>by {book.author}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={showMenu}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ translateX: deleteShakeAnim }] }}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#2C3E50" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Book Cover Card */}
        <Animated.View 
          style={[
            styles.bookCoverCard,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.bookCoverContainer}>
            <Image
              source={{ uri: book.coverURL }}
              style={styles.bookCover}
              resizeMode="cover"
            />
            
            {/* Floating Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.statusEmoji}>{statusInfo.emoji}</Text>
              <Text style={styles.statusText}>{statusInfo.text}</Text>
            </View>

            {/* Reading Progress Ring */}
            {bookStatus === 'READING' && (
              <View style={styles.progressRingContainer}>
                <View style={[styles.progressRing, { borderColor: statusInfo.color }]}>
                  <Text style={[styles.progressPercentage, { color: statusInfo.color }]}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Book Info */}
          <View style={styles.bookInfoContainer}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>✍️ {book.author}</Text>
            
            {/* Book Stats */}
            <View style={styles.bookStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{book.pageCount}</Text>
                <Text style={styles.statLabel}>Sayfa</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentPage}</Text>
                <Text style={styles.statLabel}>Okunan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{book.pageCount - currentPage}</Text>
                <Text style={styles.statLabel}>Kalan</Text>
              </View>
            </View>

            {/* Page Input & Slider */}
            <View style={styles.pageControlContainer}>
              <Text style={styles.pageControlLabel}>Hangi sayfadasın?</Text>
              
              <View style={styles.pageInputRow}>
                <TouchableOpacity 
                  style={[styles.pageInputButton, { backgroundColor: statusInfo.color }]}
                  onPress={() => updatePageNumber(Math.max(0, currentPage - 1))}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="#fff" />
                </TouchableOpacity>
                
                <TextInput
                  style={[styles.pageInput, { borderColor: statusInfo.color }]}
                  value={pageInputText}
                  onChangeText={handlePageInputChange}
                  onSubmitEditing={handlePageInputSubmit}
                  keyboardType="numeric"
                  textAlign="center"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                />
                
                <TouchableOpacity 
                  style={[styles.pageInputButton, { backgroundColor: statusInfo.color }]}
                  onPress={() => updatePageNumber(Math.min(book.pageCount, currentPage + 1))}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.pageInputInfo}>/ {book.pageCount} sayfa</Text>

              {/* Slider */}
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={book.pageCount}
                  value={currentPage}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor={statusInfo.color}
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor={statusInfo.color}
                  step={1}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>0</Text>
                  <Text style={styles.sliderLabel}>{book.pageCount}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Status Change Card */}
        <Animated.View 
          style={[
            styles.statusCard,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.cardTitle}>📚 Okuma Durumu</Text>
          
          <View style={styles.statusOptions}>
            {[
              { status: BookStatus.READING, storeStatus: 'READING', icon: 'play-circle', text: 'Okuyorum', color: '#FF6B6B' },
              { status: BookStatus.COMPLETED, storeStatus: 'COMPLETED', icon: 'check-circle', text: 'Tamamlandı', color: '#4ECDC4' },
              { status: BookStatus.TO_READ, storeStatus: 'TO_READ', icon: 'bookmark', text: 'Okunacak', color: '#FFE66D' }
            ].map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.statusOption,
                  bookStatus === option.storeStatus && { 
                    backgroundColor: option.color + '20',
                    borderColor: option.color,
                    borderWidth: 2
                  }
                ]}
                onPress={() => updateReadingStatus(option.status)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={option.icon as any} size={24} color={option.color} />
                <Text style={[styles.statusOptionText, { color: option.color }]}>
                  {option.text}
                </Text>
                {bookStatus === option.storeStatus && (
                  <MaterialCommunityIcons name="check" size={16} color={option.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Notes Card */}
        <Animated.View 
          style={[
            styles.notesCard,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.notesHeader}>
            <Text style={styles.cardTitle}>📝 Notlarım ({notes.length})</Text>
            <TouchableOpacity 
              style={styles.addNoteButton}
              onPress={openNewNote}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {notes.length > 0 ? (
            <View style={styles.notesList}>
              {notes.map((note, index) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <MaterialCommunityIcons name="format-quote-open" size={16} color="#9CA3AF" />
                    <Text style={styles.noteDate}>{note.date}</Text>
                    <View style={styles.noteActions}>
                      <TouchableOpacity 
                        onPress={() => editNote(note.id)}
                        style={styles.noteActionButton}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="pencil" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteNote(note.id)}
                        style={styles.noteActionButton}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="delete" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.noteText}>{note.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notesEmpty}>
              <MaterialCommunityIcons name="note-plus-outline" size={48} color="#E5E7EB" />
              <Text style={styles.notesEmptyTitle}>Henüz not yok</Text>
              <Text style={styles.notesEmptySubtitle}>
                Bu kitap hakkındaki düşüncelerini paylaş
              </Text>
              <TouchableOpacity 
                style={styles.firstNoteButton}
                onPress={openNewNote}
                activeOpacity={0.8}
              >
                <Text style={styles.firstNoteButtonText}>İlk notunu ekle</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Reading Session Card */}
        <Animated.View 
          style={[
            styles.sessionCard,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.cardTitle}>⏱️ Okuma Seansı</Text>
          <Text style={styles.sessionDescription}>
            Zamanını takip et ve odaklanmış okuma deneyimi yaşa
          </Text>
          
          <TouchableOpacity 
            style={[styles.startSessionButton, { backgroundColor: statusInfo.color }]}
            onPress={() => navigation.navigate('ReadingTimer', { bookId })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="play" size={24} color="#fff" />
            <Text style={styles.startSessionText}>Okuma Seansı Başlat</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNoteId ? '✏️ Not Düzenle' : '📝 Yeni Not'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowNoteModal(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.noteInput, { borderColor: statusInfo.color }]}
              placeholder="Bu kitap hakkında ne düşünüyorsun?"
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                  setEditingNoteId(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, { backgroundColor: statusInfo.color }]}
                onPress={saveNote}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingNoteId ? 'Güncelle' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideMenu}
      >
        <TouchableOpacity 
          style={styles.modernMenuOverlay}
          activeOpacity={1}
          onPress={hideMenu}
        >
          <Animated.View 
            style={[
              styles.modernMenuContainer,
              {
                transform: [
                  {
                    scale: menuScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
                opacity: menuScaleAnim,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.modernMenuHeader}>
              <Text style={styles.modernMenuTitle}>📚 Kitap Menüsü</Text>
              <TouchableOpacity onPress={hideMenu} style={styles.modernMenuCloseButton}>
                <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.modernMenuItems}>
              {/* Add Note */}
              <TouchableOpacity 
                style={[styles.modernMenuItem, styles.modernMenuItemNote]}
                onPress={() => {
                  hideMenu();
                  setTimeout(() => setShowNoteModal(true), 300);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.modernMenuItemIcon, { backgroundColor: '#4ECDC4' }]}>
                  <MaterialCommunityIcons name="note-plus" size={20} color="#fff" />
                </View>
                <View style={styles.modernMenuItemContent}>
                  <Text style={styles.modernMenuItemTitle}>Not Ekle</Text>
                  <Text style={styles.modernMenuItemSubtitle}>Kitap hakkında düşüncelerini yaz</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#C3C9D0" />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.modernMenuDivider} />

              {/* Delete Book */}
              <TouchableOpacity 
                style={[styles.modernMenuItem, styles.modernMenuItemDelete]}
                onPress={() => {
                  hideMenu();
                  setTimeout(() => deleteBookFromCollection(), 300);
                }}
                activeOpacity={0.8}
                disabled={isDeleting}
              >
                <View style={[styles.modernMenuItemIcon, { backgroundColor: isDeleting ? '#FCA5A5' : '#FF6B6B' }]}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="delete" size={20} color="#fff" />
                  )}
                </View>
                <View style={styles.modernMenuItemContent}>
                  <Text style={[styles.modernMenuItemTitle, { color: '#FF6B6B' }]}>
                    {isDeleting ? 'Siliniyor...' : 'Kitabı Sil'}
                  </Text>
                  <Text style={styles.modernMenuItemSubtitle}>
                    {isDeleting ? 'Lütfen bekleyin' : 'Kütüphaneden kalıcı olarak kaldır'}
                  </Text>
                </View>
                {isDeleting ? (
                  <View style={styles.modernDeleteProgress}>
                    <Text style={styles.modernDeleteProgressText}>%{Math.round(deleteProgress)}</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#FFB3B3" />
                )}
              </TouchableOpacity>

              {/* Progress Bar for Delete */}
              {isDeleting && (
                <View style={styles.modernDeleteProgressContainer}>
                  <View style={styles.modernDeleteProgressBackground}>
                    <Animated.View 
                      style={[
                        styles.modernDeleteProgressBar,
                        {
                          width: deleteProgressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Progress Modal */}
      {showProgressModal && (
        <ProgressModal
          visible={showProgressModal}
          type="completion"
          title="Tebrikler! 🎉"
          message="Kitabı başarıyla tamamladınız!"
          onClose={() => setShowProgressModal(false)}
        />
      )}

      {/* Toast */}
      {showToast && (
        <CustomToast
          visible={showToast}
          type={toastType}
          message={toastMessage}
          onHide={() => setShowToast(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  backToLibraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    gap: Spacing.sm,
  },
  backToLibraryText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  bookCoverCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  bookCoverContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  bookCover: {
    width: 200,
    height: 300,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statusBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  statusEmoji: {
    fontSize: FontSizes.md,
  },
  statusText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  progressRingContainer: {
    position: 'absolute',
    bottom: -20,
    right: -20,
  },
  progressRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  progressPercentage: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  bookInfoContainer: {
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  bookAuthor: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  bookStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  pageControlContainer: {
    width: '100%',
    alignItems: 'center',
  },
  pageControlLabel: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  pageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pageInputButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageInput: {
    width: 80,
    height: 40,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  pageInputInfo: {
    fontSize: FontSizes.sm,
    color: '#9CA3AF',
    marginBottom: Spacing.lg,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sliderLabel: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: Spacing.lg,
  },
  statusOptions: {
    gap: Spacing.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    gap: Spacing.md,
  },
  statusOptionText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addNoteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesList: {
    gap: Spacing.md,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    padding: Spacing.md,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  noteDate: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  noteActionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontSize: FontSizes.md,
    color: '#2C3E50',
    marginVertical: Spacing.xs,
    lineHeight: 20,
  },
  notesEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  notesEmptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  notesEmptySubtitle: {
    fontSize: FontSizes.md,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  firstNoteButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },
  firstNoteButtonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  sessionDescription: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  startSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: 15,
    gap: Spacing.md,
  },
  startSessionText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#2C3E50',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInput: {
    borderWidth: 2,
    borderRadius: 15,
    padding: Spacing.lg,
    fontSize: FontSizes.md,
    color: '#2C3E50',
    minHeight: 150,
    marginBottom: Spacing.xl,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  modernMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modernMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modernMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modernMenuTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#2C3E50',
  },
  modernMenuCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernMenuItems: {
    gap: Spacing.md,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    gap: Spacing.md,
  },
  modernMenuItemNote: {
    backgroundColor: '#F8FAFC',
  },
  modernMenuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernMenuItemContent: {
    flex: 1,
  },
  modernMenuItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#2C3E50',
  },
  modernMenuItemSubtitle: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
  },
  modernMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Spacing.lg,
  },
  modernMenuItemDelete: {
    backgroundColor: '#FEF2F2',
  },
  modernDeleteProgress: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernDeleteProgressText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
  modernDeleteProgressContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modernDeleteProgressBackground: {
    height: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 2,
    overflow: 'hidden',
  },
  modernDeleteProgressBar: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
});

export default BookDetailScreen; 