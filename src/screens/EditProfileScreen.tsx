import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  Image, 
  Switch, 
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Text, TextInput, Surface, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '../store';
import UserManager, { User } from '../utils/userManager';
import { FontSizes, Spacing, BorderRadius, Colors } from '../theme/theme';
import CustomToast from '../components/CustomToast';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const currentUserId = useAppSelector((state) => state.books.currentUserId);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [readingGoal, setReadingGoal] = useState('30');
  const [notifications, setNotifications] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Şifre değiştirme state'leri
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Toast state'leri
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastMessage, setToastMessage] = useState('');
  
  // Hata state'leri
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    readingGoal: false,
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Toast gösterme fonksiyonu
  const showToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  };

  // Kullanıcı verilerini yükle
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUserId) {
        try {
          const user = await UserManager.getUserById(currentUserId);
          if (user) {
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setReadingGoal(user.preferences?.readingGoal?.toString() || '30');
            setNotifications(user.preferences?.notifications || true);
            setProfileImage(user.avatar || '');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
      setLoading(false);
    };

    loadUserData();
  }, [currentUserId]);

  // Formu doğrula
  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors = {
      name: !name.trim(),
      email: !email.trim() || !emailRegex.test(email),
      readingGoal: !readingGoal.trim() || isNaN(Number(readingGoal)) || Number(readingGoal) < 1,
    };
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(Boolean);
  };

  // Formu gönder
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!currentUserId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    setSaving(true);
    
    try {
      // Kullanıcı bilgilerini güncelle
      const user = await UserManager.getUserById(currentUserId);
      if (user) {
        const updatedUser: User = {
          ...user,
          displayName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatar: profileImage,
          preferences: {
            ...user.preferences,
            readingGoal: Number(readingGoal),
            notifications: notifications,
          },
          updatedAt: new Date().toISOString(),
        };

        await UserManager.updateUser(updatedUser);
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Şifre değiştirme modalını aç
  const openPasswordModal = () => {
    console.log('🔐 Opening password modal for user:', currentUserId);
    
    setPasswordModalVisible(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  // Şifre değiştirme modalını kapat
  const closePasswordModal = () => {
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordErrors({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setChangingPassword(false);
  };

  // Şifre doğrulama - geliştirilmiş
  const validatePassword = () => {
    const newErrors = {
      currentPassword: !currentPassword.trim(),
      newPassword: !newPassword.trim() || newPassword.length < 6,
      confirmPassword: !confirmPassword.trim() || newPassword !== confirmPassword,
    };
    
    setPasswordErrors(newErrors);
    
    // Özel hata mesajları
    if (newErrors.currentPassword) {
      setTimeout(() => showToast('error', 'Mevcut şifrenizi girmelisiniz.'), 100);
    } else if (newErrors.newPassword) {
      setTimeout(() => showToast('error', 'Yeni şifre en az 6 karakter olmalıdır.'), 100);
    } else if (newErrors.confirmPassword) {
      setTimeout(() => showToast('error', 'Şifre tekrarı eşleşmiyor.'), 100);
    }
    
    return !Object.values(newErrors).some(Boolean);
  };

  // Şifre değiştirme işlemi
  const handleChangePassword = async () => {
    console.log('🔐 Starting password change process...');
    console.log('📝 Form data:', {
      currentPasswordLength: currentPassword.length,
      newPasswordLength: newPassword.length,
      confirmPasswordLength: confirmPassword.length,
      currentUserId: currentUserId
    });

    if (!validatePassword()) {
      console.log('❌ Form validation failed');
      showToast('error', 'Lütfen tüm alanları doğru şekilde doldurun.');
      return;
    }

    if (!currentUserId) {
      console.log('❌ No current user ID');
      showToast('error', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    // Guest kullanıcı kontrolü
    if (currentUserId === 'guest_user') {
      console.log('❌ Guest user tried to change password');
      showToast('warning', 'Misafir kullanıcılar şifre değiştiremez. Lütfen önce hesap oluşturun.');
      closePasswordModal();
      return;
    }

    setChangingPassword(true);
    
    try {
      console.log('🔍 Verifying current password...');
      // Önce mevcut şifreyi doğrula
      const isCurrentPasswordValid = await UserManager.verifyCurrentPassword(currentUserId, currentPassword);
      console.log('✅ Current password verification result:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        console.log('❌ Current password verification failed');
        setPasswordErrors(prev => ({ ...prev, currentPassword: true }));
        showToast('error', 'Mevcut şifreniz hatalı. Lütfen doğru şifreyi giriniz.');
        setChangingPassword(false);
        return;
      }

      // Şifre aynı mı kontrol et
      if (currentPassword === newPassword) {
        console.log('❌ New password same as current password');
        setPasswordErrors(prev => ({ ...prev, newPassword: true }));
        showToast('warning', 'Yeni şifreniz mevcut şifrenizden farklı olmalıdır.');
        setChangingPassword(false);
        return;
      }

      console.log('🔄 Changing password...');
      // Şifreyi değiştir
      const result = await UserManager.changePassword(currentUserId, currentPassword, newPassword);
      console.log('🔐 Password change result:', result);
      
      if (result.success) {
        // Başarılı durumda
        console.log('✅ Password changed successfully');
        closePasswordModal();
        showToast('success', result.message + ' 🎉');
      } else {
        // Hata durumda
        console.log('❌ Password change failed:', result.message);
        showToast('error', result.message);
      }
      
    } catch (error) {
      console.error('❌ Unexpected error during password change:', error);
      showToast('error', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
        <View style={styles.loadingContent}>
          <MaterialCommunityIcons name="account-circle" size={64} color="#007AFF" />
          <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Avatar'ı render et
  const renderAvatar = () => {
    if (profileImage) {
      return <Image source={{ uri: profileImage }} style={styles.avatar} />;
    } else {
      // İlk harfleri kullanarak avatar oluştur
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
      return (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{initials.substring(0, 2)}</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}></Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Modern Profil Fotoğrafı Bölümü */}
        <Surface style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            <TouchableOpacity 
              style={styles.editIconContainer}
              onPress={() => Alert.alert('Profil Fotoğrafı', 'Profil fotoğrafı yükleme özelliği yakında eklenecek.')}
              disabled={saving}
            >
              <MaterialCommunityIcons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={() => Alert.alert('Profil Fotoğrafı', 'Profil fotoğrafı yükleme özelliği yakında eklenecek.')} 
            disabled={saving}
          >
            <Text style={styles.changePhotoText}>Profil Fotoğrafını Değiştir</Text>
          </TouchableOpacity>
        </Surface>

        {/* Modern Kişisel Bilgiler Kartı */}
        <Surface style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                disabled={saving}
                placeholder="Adınızı ve soyadınızı giriniz"
                placeholderTextColor="#999"
              />
            </View>
            {errors.name && (
              <Text style={styles.errorText}>Ad Soyad gerekli</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>E-posta</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
                disabled={saving}
                placeholder="E-posta adresinizi giriniz"
                placeholderTextColor="#999"
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>Geçerli bir e-posta adresi girin</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Telefon (Opsiyonel)</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                disabled={saving}
                placeholder="Telefon numaranızı giriniz"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </Surface>

        {/* Modern Okuma Tercihleri Kartı */}
        <Surface style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color="#4ECDC4" />
            <Text style={styles.sectionTitle}>Okuma Tercihleri</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Günlük Okuma Hedefi (dakika)</Text>
            <View style={[styles.inputWrapper, errors.readingGoal && styles.inputError]}>
              <MaterialCommunityIcons name="target" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                value={readingGoal}
                onChangeText={setReadingGoal}
                keyboardType="numeric"
                style={styles.input}
                disabled={saving}
                placeholder="Günlük okuma hedefinizi giriniz"
                placeholderTextColor="#999"
              />
            </View>
            {errors.readingGoal && (
              <Text style={styles.errorText}>Geçerli bir sayı girin (minimum 1 dakika)</Text>
            )}
          </View>
        </Surface>

        {/* Modern Uygulama Ayarları Kartı */}
        <Surface style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={24} color="#FF6B6B" />
            <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
          </View>
          
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <MaterialCommunityIcons name="bell" size={20} color="#666" />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Bildirimler</Text>
                <Text style={styles.switchDescription}>Okuma hatırlatmaları ve güncellemeler</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              disabled={saving}
              trackColor={{ false: '#E5E7EB', true: '#007AFF40' }}
              thumbColor={notifications ? '#007AFF' : '#9CA3AF'}
            />
          </View>
        </Surface>

        {/* Modern Hesap Güvenliği Kartı */}
        <Surface style={styles.securitySection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Hesap Güvenliği</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.passwordButton}
            onPress={openPasswordModal}
            disabled={saving}
          >
            <View style={styles.passwordButtonContent}>
              <MaterialCommunityIcons name="lock-reset" size={20} color="#8B5CF6" />
              <View style={styles.passwordButtonText}>
                <Text style={styles.passwordButtonTitle}>Şifre Değiştir</Text>
                <Text style={styles.passwordButtonSubtitle}>Hesap güvenliğinizi güncelleyin</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Surface>

        {/* Modern Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.saveButtonContent}>
                <MaterialCommunityIcons name="loading" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
              </View>
            ) : (
              <View style={styles.saveButtonContent}>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Şifre Değiştirme Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePasswordModal} disabled={changingPassword}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Info Card */}
            <Surface style={styles.infoCard}>
              <MaterialCommunityIcons name="information" size={24} color={Colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Güvenlik Bilgisi</Text>
                <Text style={styles.infoText}>
                  Yeni şifreniz en az 6 karakter olmalı ve güvenli olmalıdır.
                </Text>
              </View>
            </Surface>

            {/* Mevcut Şifre */}
            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordLabel}>Mevcut Şifre</Text>
              <View style={[styles.passwordInputWrapper, passwordErrors.currentPassword && styles.inputError]}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  style={styles.passwordInput}
                  placeholder="Mevcut şifrenizi giriniz"
                  disabled={changingPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                  disabled={changingPassword}
                >
                  <MaterialCommunityIcons 
                    name={showCurrentPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.currentPassword && (
                <Text style={styles.passwordErrorText}>Mevcut şifre gerekli</Text>
              )}
            </View>

            {/* Yeni Şifre */}
            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordLabel}>Yeni Şifre</Text>
              <View style={[styles.passwordInputWrapper, passwordErrors.newPassword && styles.inputError]}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  style={styles.passwordInput}
                  placeholder="Yeni şifrenizi giriniz (min. 6 karakter)"
                  disabled={changingPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                  disabled={changingPassword}
                >
                  <MaterialCommunityIcons 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.newPassword && (
                <Text style={styles.passwordErrorText}>
                  Yeni şifre en az 6 karakter olmalı
                </Text>
              )}
            </View>

            {/* Şifre Tekrar */}
            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordLabel}>Yeni Şifre (Tekrar)</Text>
              <View style={[styles.passwordInputWrapper, passwordErrors.confirmPassword && styles.inputError]}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                  placeholder="Yeni şifrenizi tekrar giriniz"
                  disabled={changingPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  disabled={changingPassword}
                >
                  <MaterialCommunityIcons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.confirmPassword && (
                <Text style={styles.passwordErrorText}>
                  Şifreler eşleşmiyor
                </Text>
              )}
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: Colors.surface }]}
                onPress={closePasswordModal}
                disabled={changingPassword}
              >
                <Text style={[styles.modalCancelButtonText, { color: Colors.text }]}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSaveButton, changingPassword && styles.modalSaveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <View style={styles.modalSaveButtonContent}>
                    <MaterialCommunityIcons name="loading" size={20} color="#fff" />
                    <Text style={styles.modalSaveButtonText}>Değiştiriliyor...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSaveButtonText}>Şifre Değiştir</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // backButton ile dengeleme için
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xxl,
    margin: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  changePhotoText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#2C3E50',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: '#FF3B30',
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#2C3E50',
  },
  switchDescription: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    marginTop: 2,
  },
  securitySection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F5FF',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  passwordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passwordButtonText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  passwordButtonTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#2C3E50',
  },
  passwordButtonSubtitle: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  infoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    lineHeight: 20,
  },
  passwordInputContainer: {
    marginBottom: Spacing.lg,
  },
  passwordLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  passwordErrorText: {
    fontSize: FontSizes.xs,
    color: '#ef4444',
    marginTop: Spacing.xs,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  modalSaveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
    marginLeft: Spacing.xs,
  },
});

export default EditProfileScreen; 