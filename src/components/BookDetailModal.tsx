import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  BounceIn,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { RecommendedBook } from '../utils/recommendationManager';
import GoogleBooksService from '../services/googleBooksService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BookDetailModalProps {
  visible: boolean;
  book: RecommendedBook | null;
  onClose: () => void;
  onAddToWishlist: (book: any) => void;
  onAddToLibrary?: (book: any) => void;
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({
  visible,
  book,
  onClose,
  onAddToWishlist,
  onAddToLibrary,
}) => {
  // State
  const [modalShown, setModalShown] = useState(false);

  // Effects
  useEffect(() => {
    if (visible && book) {
      console.log('🎭 Opening modal for:', book.title);
      setModalShown(true);
    } else if (!visible) {
      console.log('🔽 Closing modal...');
      setModalShown(false);
    }
  }, [visible, book]);

  if (!modalShown || !book) {
    return null;
  }

  const handleClose = () => {
    console.log('🔽 Modal close triggered');
    onClose();
  };

  const handleAddToWishlist = () => {
    onAddToWishlist(book);
  };

  const handleAddToLibrary = () => {
    if (onAddToLibrary) {
      onAddToLibrary(book);
    }
  };

  console.log('📱 Modal rendering for:', book.title);
  console.log('📊 Book data:', {
    title: book.title,
    author: book.author,
    description: book.description ? 'Yes' : 'No',
    recommendationReason: book.recommendationReason ? 'Yes' : 'No',
    pageCount: book.pageCount,
    genre: book.genre
  });

  return (
    <Modal
      visible={modalShown}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.7)" barStyle="light-content" />
      
      {/* Background Overlay */}
      <View style={styles.overlay} />

      {/* Modal Content Container */}
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          
          {/* Header with Close Button */}
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>Kitap Detayları</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* All Content in ScrollView */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Book Cover Section */}
            <View style={styles.bookCoverSection}>
              <Image
                source={{
                          uri: book.coverURL && book.coverURL.includes('http')
          ? book.coverURL
          : GoogleBooksService.getFallbackCover(book.title || 'Kitap')
                }}
                style={styles.bookCover}
                resizeMode="cover"
              />
              
              {/* Score Badge */}
              <View style={styles.scoreBadge}>
                <MaterialCommunityIcons name="star" size={16} color="#333" />
                <Text style={styles.scoreText}>{book.score}</Text>
              </View>
            </View>

            {/* Book Title & Author */}
            <View style={styles.titleSection}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>✍️ {book.author}</Text>
            </View>

            {/* Quick Info */}
            <View style={styles.quickInfoSection}>
              <View style={styles.quickInfoItem}>
                <MaterialCommunityIcons name="book-open" size={20} color="#007AFF" />
                <Text style={styles.quickInfoText}>{book.pageCount} sayfa</Text>
              </View>
              
              <View style={styles.quickInfoItem}>
                <MaterialCommunityIcons name="tag" size={20} color="#007AFF" />
                <Text style={styles.quickInfoText}>{book.genre}</Text>
              </View>
              
              {book.publishYear && (
                <View style={styles.quickInfoItem}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.quickInfoText}>{book.publishYear}</Text>
                </View>
              )}
            </View>

            {/* AI Recommendation */}
            {book.recommendationReason && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤖 AI Öneri Sebebi</Text>
                <Text style={styles.sectionText}>{book.recommendationReason}</Text>
              </View>
            )}

            {/* Description */}
            {book.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📖 Kitap Hakkında</Text>
                <Text style={styles.sectionText}>{book.description}</Text>
              </View>
            )}

            {/* Additional Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Detaylar</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sayfa Sayısı:</Text>
                <Text style={styles.detailValue}>{book.pageCount} sayfa</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tür:</Text>
                <Text style={styles.detailValue}>{book.genre}</Text>
              </View>
              
              {book.publishYear && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Yayın Yılı:</Text>
                  <Text style={styles.detailValue}>{book.publishYear}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>AI Kalite Skoru:</Text>
                <Text style={styles.detailValue}>{book.score}/100</Text>
              </View>
              
              {book.pageCount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tahmini Okuma Süresi:</Text>
                  <Text style={styles.detailValue}>{Math.ceil(book.pageCount / 50)} saat</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.actionButton, styles.wishlistButton]}
                onPress={handleAddToWishlist}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="heart-plus" size={20} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
                  İstek Listesine Ekle
                </Text>
              </TouchableOpacity>

              {onAddToLibrary && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.libraryButton]}
                  onPress={handleAddToLibrary}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus-box" size={20} color="#007AFF" />
                  <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                    Kütüphaneye Ekle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    height: screenHeight * 0.9,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookCoverSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    position: 'relative',
    marginHorizontal: -20,
    marginBottom: 10,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scoreBadge: {
    position: 'absolute',
    top: 5,
    right: -5,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 2,
  },
  titleSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f9f9f9',
    marginHorizontal: -20,
    marginVertical: 10,
  },
  quickInfoItem: {
    alignItems: 'center',
  },
  quickInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginHorizontal: -20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'justify',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 5,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  buttonSection: {
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  wishlistButton: {
    borderColor: '#FF6B6B',
  },
  libraryButton: {
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BookDetailModal; 