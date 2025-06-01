import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch } from '../store';
import { setCurrentUser, setBooks, loadBooks, saveBooks } from '../store/bookSlice';
import UserManager from '../utils/userManager';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { MOCK_BOOKS } from '../data/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl } from '../config/api';
import ProgressModal from '../components/ProgressModal';
import CustomToast from '../components/CustomToast';

// MOCK_BOOKS'u Redux Book formatına çevir
const convertMockBooksToReduxFormat = (mockBooks: any[]) => {
  return mockBooks.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverURL: book.coverURL || '',
    pageCount: book.pageCount || 0,
    currentPage: book.currentPage || 0,
    progress: book.progress || 0,
    status: book.status || 'TO_READ',
    genre: book.genre,
    publishYear: book.publishYear,
    publisher: book.publisher,
    description: book.description,
    isbn: book.isbn,
    notes: book.notes || [],
    createdAt: book.createdAt ? new Date(book.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: book.updatedAt ? new Date(book.updatedAt).toISOString() : new Date().toISOString(),
    userId: book.userId,
    isJointReading: book.isJointReading || false,
    startDate: book.startDate ? new Date(book.startDate).toISOString() : undefined,
    isFavorite: book.isFavorite || false,
  }));
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'progress' | 'status' | 'completion' | 'error' | 'warning' | 'info' | 'loading' | 'delete' | 'favorite'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastMessage, setToastMessage] = useState('');

  // Route params'dan email'i al
  useEffect(() => {
    if (route.params?.prefilledEmail) {
      setEmail(route.params.prefilledEmail);
    }
  }, [route.params]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Email ve şifre alanları zorunludur.');
      return;
    }

    if (!isValidEmail(email)) {
      showToast('error', 'Geçerli bir email adresi giriniz.');
      return;
    }

    setLoading(true);

    try {
      // UserManager ile authentication
      const user = await UserManager.authenticateUser(email.trim(), password);

      if (!user) {
        showToast('error', 'Email veya şifre hatalı.');
        setLoading(false);
        return;
      }

      console.log('Login successful for user:', user.id);
      
      // Session oluştur
      await UserManager.setCurrentUserSession(user.id);
      
      // Redux state'i güncelle
      dispatch(setCurrentUser(user.id));

      // Kullanıcının kitaplarını yükle
      console.log('About to load books for user after login:', user.id);
      const storedBooks = await loadBooks(user.id);
      console.log('Login - Loaded books from AsyncStorage:', {
        userId: user.id,
        bookCount: storedBooks.length,
        books: storedBooks.map(b => ({ id: b.id, title: b.title, userId: b.userId }))
      });
      dispatch(setBooks(storedBooks));
      
      // Save books to AsyncStorage after setting Redux state
      await saveBooks(storedBooks, user.id);

      // Form alanlarını temizle
      setEmail('');
      setPassword('');

      showToast('success', 'Başarıyla giriş yaptınız!');

      console.log('Login completed, user should be authenticated now');

    } catch (error) {
      console.error('Login error:', error);
      showToast('error', 'Giriş yaparken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const continueAsGuest = () => {
    showModal('info', 'Misafir Olarak Devam Et', 'Hesap oluşturmadan devam etmek istediğinizden emin misiniz? Verileriniz sadece bu cihazda saklanacak.');
  };

  const handleGuestContinue = async () => {
    setModalVisible(false);
    const guestUserId = await UserManager.initializeGuestSession();
    dispatch(setCurrentUser(guestUserId));
    showToast('info', 'Misafir olarak devam ediyorsunuz.');
  };

  // Animation helper functions
  const showModal = (type: typeof modalType, title: string, subtitle: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalSubtitle(subtitle);
    setModalVisible(true);
  };

  const showToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="book-open-variant" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.title}>BookMate</Text>
            <Text style={styles.subtitle}>Okuma serüveninize hoş geldiniz</Text>
          </View>

          {/* Login Form */}
          <Surface style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email adresinizi giriniz"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifrenizi giriniz"
                  placeholderTextColor={Colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.loginButtonText}>Giriş yapılıyor...</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={20} color={Colors.surface} />
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.registerButton} onPress={navigateToRegister}>
              <MaterialCommunityIcons name="account-plus" size={20} color={Colors.primary} />
              <Text style={styles.registerButtonText}>Hesap Oluştur</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestButton} onPress={continueAsGuest}>
              <MaterialCommunityIcons name="account-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.guestButtonText}>Misafir olarak devam et</Text>
            </TouchableOpacity>
          </Surface>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Hesap oluşturarak okuma verilerinizi güvende tutabilir ve cihazlar arası senkronize edebilirsiniz.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Progress Modal */}
      <ProgressModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        type={modalType}
        title={modalTitle}
        subtitle={modalSubtitle}
      />
      
      {/* Custom Toast */}
      <CustomToast
        visible={toastVisible}
        type={toastType}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  registerButton: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  guestButton: {
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginLeft: Spacing.sm,
  },
  infoContainer: {
    marginTop: Spacing.md,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSizes.sm * 1.4,
  },
});

export default LoginScreen; 