import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text, 
  TextInput, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';

// Geçici kitap verisi (düzenleme durumu için)
const existingBook = {
  id: '1',
  title: 'İçimizdeki Şeytan',
  author: 'Sabahattin Ali',
  coverURL: 'https://i.dr.com.tr/cache/600x600-0/originals/0000000064552-1.jpg',
  genre: 'Roman',
  publishYear: 1940,
  publisher: 'YKY',
  pageCount: 250,
  isbn: '9789753638029',
};

// Kitap türleri
const genres = [
  'Roman', 'Öykü', 'Şiir', 'Tarih', 'Bilim', 'Felsefe', 
  'Biyografi', 'Anı', 'Gezi', 'Fantastik', 'Bilim Kurgu'
];

const EditBookScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  
  // Düzenleme modunda mı yoksa yeni kitap eklemede mi olduğumuzu kontrol et
  const isEditing = route.params?.bookId !== undefined;
  
  // Form state'lerini oluştur
  const [title, setTitle] = useState(isEditing ? existingBook.title : '');
  const [author, setAuthor] = useState(isEditing ? existingBook.author : '');
  const [coverURL, setCoverURL] = useState(isEditing ? existingBook.coverURL : '');
  const [genre, setGenre] = useState(isEditing ? existingBook.genre : '');
  const [publishYear, setPublishYear] = useState(
    isEditing ? existingBook.publishYear.toString() : ''
  );
  const [publisher, setPublisher] = useState(isEditing ? existingBook.publisher : '');
  const [pageCount, setPageCount] = useState(
    isEditing ? existingBook.pageCount.toString() : ''
  );
  const [isbn, setISBN] = useState(isEditing ? existingBook.isbn : '');
  
  // Form doğrulama hataları
  const [errors, setErrors] = useState({
    title: false,
    author: false,
    pageCount: false,
    publishYear: false,
  });

  // Kitap tarayıcı ekranına git
  const scanBook = () => {
    navigation.navigate('BookScanner');
  };

  // Formu doğrula
  const validateForm = () => {
    const newErrors = {
      title: !title.trim(),
      author: !author.trim(),
      pageCount: !pageCount.trim() || isNaN(Number(pageCount)) || Number(pageCount) <= 0,
      publishYear: publishYear.trim() && 
        (isNaN(Number(publishYear)) || 
        Number(publishYear) < 1000 || 
        Number(publishYear) > new Date().getFullYear()),
    };
    
    setErrors(newErrors);
    
    // Hata var mı kontrol et
    return !Object.values(newErrors).some(Boolean);
  };

  // Formu gönder
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // Kitap verisini hazırla
    const bookData = {
      title,
      author,
      coverURL,
      genre,
      publishYear: publishYear ? Number(publishYear) : null,
      publisher,
      pageCount: Number(pageCount),
      isbn,
      // Diğer varsayılan alanlar
      status: 'TO_READ',
      currentPage: 0,
      progress: 0,
      notes: [],
    };
    
    if (isEditing) {
      // Mevcut kitabı güncelle
      // Firebase güncellemesi burada yapılacak
      console.log('Kitap güncellendi', { ...bookData, id: route.params.bookId });
    } else {
      // Yeni kitap ekle
      // Firebase ekleme işlemi burada yapılacak
      console.log('Yeni kitap eklendi', bookData);
    }
    
    // Başarılı işlemden sonra geri dön
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Kitap Düzenle' : 'Yeni Kitap Ekle'}
        </Text>
        <TouchableOpacity style={styles.scanButton} onPress={scanBook}>
          <MaterialCommunityIcons name="barcode-scan" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Kapak Görseli Bölümü */}
        <Surface style={styles.coverSection}>
          <Text style={styles.sectionTitle}>Kapak Görseli</Text>
          {coverURL ? (
            <View style={styles.coverContainer}>
              <Image source={{ uri: coverURL }} style={styles.coverImage} />
              <TouchableOpacity
                style={styles.editCoverButton}
                onPress={() => {}} // Kapak değiştirme işlevi eklenecek
              >
                <MaterialCommunityIcons name="pencil" size={20} color={Colors.surface} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noCoverContainer}>
              <MaterialCommunityIcons name="book-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.noCoverText}>Kapak görseli ekleyin</Text>
              <CustomButton mode="outlined" onPress={() => {}} style={styles.addCoverButton}>
                Görsel Ekle
              </CustomButton>
            </View>
          )}
        </Surface>

        {/* Form Bölümü */}
        <Surface style={styles.formSection}>
          <Text style={styles.sectionTitle}>Kitap Bilgileri</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kitap Adı *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Kitap adını girin"
              placeholderTextColor={Colors.textTertiary}
            />
            {errors.title && (
              <Text style={styles.errorText}>Kitap adı gerekli</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Yazar *</Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              style={[styles.input, errors.author && styles.inputError]}
              placeholder="Yazar adını girin"
              placeholderTextColor={Colors.textTertiary}
            />
            {errors.author && (
              <Text style={styles.errorText}>Yazar adı gerekli</Text>
            )}
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.halfInput, styles.inputContainer]}>
              <Text style={styles.inputLabel}>Sayfa Sayısı *</Text>
              <TextInput
                value={pageCount}
                onChangeText={setPageCount}
                keyboardType="numeric"
                style={[styles.input, errors.pageCount && styles.inputError]}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
              {errors.pageCount && (
                <Text style={styles.errorText}>Geçerli sayfa sayısı girin</Text>
              )}
            </View>
            
            <View style={[styles.halfInput, styles.inputContainer]}>
              <Text style={styles.inputLabel}>Yayın Yılı</Text>
              <TextInput
                value={publishYear}
                onChangeText={setPublishYear}
                keyboardType="numeric"
                style={[styles.input, errors.publishYear && styles.inputError]}
                placeholder="2023"
                placeholderTextColor={Colors.textTertiary}
              />
              {errors.publishYear && (
                <Text style={styles.errorText}>Geçerli bir yıl girin</Text>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Yayınevi</Text>
            <TextInput
              value={publisher}
              onChangeText={setPublisher}
              style={styles.input}
              placeholder="Yayınevi adını girin"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ISBN</Text>
            <TextInput
              value={isbn}
              onChangeText={setISBN}
              style={styles.input}
              placeholder="ISBN numarasını girin"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* Tür Seçimi */}
          <View style={styles.genreSection}>
            <Text style={styles.inputLabel}>Tür</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
              <View style={styles.genreContainer}>
                {genres.map((genreName) => (
                  <TouchableOpacity
                    key={genreName}
                    style={[
                      styles.genreChip,
                      genreName === genre ? styles.selectedGenreChip : null
                    ]}
                    onPress={() => setGenre(genreName)}
                  >
                    <Text
                      style={[
                        styles.genreChipText,
                        genreName === genre ? styles.selectedGenreChipText : null
                      ]}
                    >
                      {genreName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <CustomButton 
              mode="outlined" 
              onPress={() => navigation.goBack()} 
              style={styles.cancelButton}
            >
              İptal
            </CustomButton>
            
            <CustomButton 
              mode="contained" 
              onPress={handleSubmit}
              style={styles.saveButton}
            >
              {isEditing ? 'Güncelle' : 'Kaydet'}
            </CustomButton>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

// Stil tanımlamaları
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
    paddingVertical: Spacing.md,
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
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  scanButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  coverSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  coverContainer: {
    position: 'relative',
    width: 150,
    height: 225,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.shadowMedium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  noCoverContainer: {
    width: 150,
    height: 225,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundGray,
  },
  noCoverText: {
    color: Colors.textTertiary,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  addCoverButton: {
    marginTop: Spacing.sm,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    backgroundColor: Colors.surface,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  genreSection: {
    marginBottom: Spacing.lg,
  },
  genreScroll: {
    flexGrow: 0,
  },
  genreContainer: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
  },
  genreChip: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedGenreChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genreChipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  selectedGenreChipText: {
    color: Colors.surface,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  cancelButton: {
    borderColor: Colors.textSecondary,
  },
  saveButton: {
    minWidth: 100,
  },
});

export default EditBookScreen; 