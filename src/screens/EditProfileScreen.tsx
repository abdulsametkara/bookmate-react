import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Image, Switch } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import UserManager, { User } from '../utils/userManager';
import { FontSizes, Spacing, BorderRadius } from '../theme/theme';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const currentUserId = useAppSelector((state) => state.books.currentUserId);
  const { theme, isDark, setThemeMode } = useTheme();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [readingGoal, setReadingGoal] = useState('30');
  const [notifications, setNotifications] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Hata state'leri
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    readingGoal: false,
  });

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

  // Dark mode toggle handler
  const handleDarkModeToggle = (value: boolean) => {
    const newMode = value ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Profil fotoğrafını değiştir
  const changeProfileImage = () => {
    Alert.alert(
      'Profil Fotoğrafı',
      'Profil fotoğrafı yükleme özelliği yakında eklenecek.',
      [
        { text: 'Tamam', style: 'cancel' }
      ]
    );
  };

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
            theme: isDark ? 'dark' : 'light',
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Yükleniyor...</Text>
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Profil Fotoğrafı Bölümü */}
      <Surface style={[styles.profileSection, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarContainer}>
          {renderAvatar()}
          <TouchableOpacity 
            style={styles.editIconContainer}
            onPress={changeProfileImage}
            disabled={saving}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={changeProfileImage} disabled={saving}>
          <Text style={styles.changePhotoText}>Profil Fotoğrafını Değiştir</Text>
        </TouchableOpacity>
      </Surface>

      {/* Kişisel Bilgiler */}
      <Surface style={[styles.formSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Kişisel Bilgiler</Text>
        
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
      <Surface style={[styles.formSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Okuma Tercihleri</Text>
        
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
      <Surface style={[styles.formSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Uygulama Ayarları</Text>
        
        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <MaterialCommunityIcons name="theme-light-dark" size={24} color="#6366f1" />
            <Text style={[styles.switchLabel, { color: theme.text }]}>Karanlık Mod</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleDarkModeToggle}
            disabled={saving}
            trackColor={{ false: '#f3f4f6', true: '#6366f1' }}
            thumbColor={isDark ? '#fff' : '#9ca3af'}
          />
        </View>

        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <MaterialCommunityIcons name="bell" size={24} color="#6366f1" />
            <Text style={[styles.switchLabel, { color: theme.text }]}>Bildirimler</Text>
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
      <Surface style={[styles.securitySection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Hesap Güvenliği</Text>
        
        <TouchableOpacity 
          style={[styles.passwordButton, { backgroundColor: theme.surface }]}
          onPress={() => Alert.alert('Bilgi', 'Şifre değiştirme özelliği yakında eklenecek.')}
          disabled={saving}
        >
          <MaterialCommunityIcons name="lock-reset" size={20} color="#7c3aed" />
          <Text style={[styles.passwordButtonText, { color: theme.text }]}>Şifre Değiştir</Text>
        </TouchableOpacity>
      </Surface>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: theme.surface }]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>İptal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <Text style={[styles.saveButtonText, { color: theme.text }]}>Kaydediliyor...</Text>
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.text }]}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'center',
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
});

export default EditProfileScreen; 