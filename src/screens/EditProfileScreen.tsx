import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Image, Switch, Modal } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
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
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <Text style={[styles.loadingText, { color: Colors.text }]}>Yükleniyor...</Text>
      </View>
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
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Profil Fotoğrafı Bölümü */}
      <Surface style={[styles.profileSection, { backgroundColor: Colors.surface }]}>
        <View style={styles.avatarContainer}>
          {renderAvatar()}
          <TouchableOpacity 
            style={styles.editIconContainer}
            onPress={() => Alert.alert('Profil Fotoğrafı', 'Profil fotoğrafı yükleme özelliği yakında eklenecek.', [
              { text: 'Tamam', style: 'cancel' }
            ])}
            disabled={saving}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => Alert.alert('Profil Fotoğrafı', 'Profil fotoğrafı yükleme özelliği yakında eklenecek.', [
          { text: 'Tamam', style: 'cancel' }
        ])} disabled={saving}>
          <Text style={styles.changePhotoText}>Profil Fotoğrafını Değiştir</Text>
        </TouchableOpacity>
      </Surface>

      {/* Kişisel Bilgiler */}
      <Surface style={[styles.formSection, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>Kişisel Bilgiler</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ad Soyad</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, errors.name && styles.inputError]}
            disabled={saving}
            placeholder="Adınızı ve soyadınızı giriniz"
          />
          {errors.name && (
            <HelperText type="error" style={styles.errorText}>Ad Soyad gerekli</HelperText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={[styles.input, errors.email && styles.inputError]}
            disabled={saving}
            placeholder="E-posta adresinizi giriniz"
          />
          {errors.email && (
            <HelperText type="error" style={styles.errorText}>Geçerli bir e-posta adresi girin</HelperText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Telefon (Opsiyonel)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            disabled={saving}
            placeholder="Telefon numaranızı giriniz"
          />
        </View>
      </Surface>

      {/* Okuma Tercihleri */}
      <Surface style={[styles.formSection, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>Okuma Tercihleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Günlük Okuma Hedefi (dakika)</Text>
          <TextInput
            value={readingGoal}
            onChangeText={setReadingGoal}
            keyboardType="numeric"
            style={[styles.input, errors.readingGoal && styles.inputError]}
            disabled={saving}
            placeholder="Günlük okuma hedefinizi giriniz"
          />
          {errors.readingGoal && (
            <HelperText type="error" style={styles.errorText}>Geçerli bir sayı girin (minimum 1 dakika)</HelperText>
          )}
        </View>
      </Surface>

      {/* Uygulama Ayarları */}
      <Surface style={[styles.formSection, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>Uygulama Ayarları</Text>
        
        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <MaterialCommunityIcons name="bell" size={24} color="#6366f1" />
            <Text style={[styles.switchLabel, { color: Colors.text }]}>Bildirimler</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            disabled={saving}
            trackColor={{ false: '#f3f4f6', true: '#6366f1' }}
            thumbColor={notifications ? '#fff' : '#9ca3af'}
          />
        </View>
      </Surface>

      {/* Hesap Güvenliği */}
      <Surface style={[styles.securitySection, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>Hesap Güvenliği</Text>
        
        <TouchableOpacity 
          style={[styles.passwordButton, { backgroundColor: Colors.surface }]}
          onPress={openPasswordModal}
          disabled={saving}
        >
          <MaterialCommunityIcons name="lock-reset" size={20} color="#7c3aed" />
          <Text style={[styles.passwordButtonText, { color: Colors.text }]}>Şifre Değiştir</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Surface>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: Colors.surface }]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={[styles.cancelButtonText, { color: Colors.text }]}>İptal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <Text style={[styles.saveButtonText, { color: Colors.text }]}>Kaydediliyor...</Text>
          ) : (
            <Text style={[styles.saveButtonText, { color: Colors.text }]}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  profileSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    margin: Spacing.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: '#6366f1',
    textAlign: 'center',
  },
  formSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#333',
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: '#333',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: '#ef4444',
    marginTop: Spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  securitySection: {
    backgroundColor: '#f3f0ff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: '#7c3aed',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: Spacing.lg,
    marginTop: 0,
    marginBottom: Spacing.xxl,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#e0ebff',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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