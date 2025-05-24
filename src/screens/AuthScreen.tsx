import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserManager from '../utils/userManager';

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre gerekli.');
      return;
    }

    setLoading(true);
    try {
      const user = await UserManager.authenticateUser(email, password);
      if (user) {
        await UserManager.setCurrentUserSession(user.id);
        console.log('✅ Kullanıcı giriş yaptı:', user.email);
        // AppNavigator otomatik olarak session değişikliğini algılayacak
      } else {
        Alert.alert('Giriş Hatası', 'Geçersiz email veya şifre.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir sorun oluştu.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      // Email zaten kayıtlı mı kontrol et
      const isEmailRegistered = await UserManager.isEmailRegistered(email);
      if (isEmailRegistered) {
        Alert.alert('Hata', 'Bu email adresi zaten kayıtlı.');
        setLoading(false);
        return;
      }

      const newUser = await UserManager.registerUser(email, password, displayName);
      console.log('✅ Kullanıcı kaydoldu:', newUser.email);
      
      Alert.alert('Başarılı!', 'Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.', [
        {
          text: 'Tamam',
          onPress: () => {
            setShowRegister(false);
            clearForm();
            // Email'i login ekranında hazır göster
            setEmail(email);
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Hesap oluşturulurken bir sorun oluştu.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await UserManager.initializeGuestSession();
      console.log('✅ Misafir girişi yapıldı');
      // AppNavigator otomatik olarak session değişikliğini algılayacak
    } catch (error) {
      Alert.alert('Hata', 'Misafir girişi yapılırken bir sorun oluştu.');
      console.error('Guest login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  if (showRegister) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>BookMate</Text>
            <Text style={styles.subtitle}>Hesap oluşturun</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            
            {/* Name Input */}
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Adınızı giriniz"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email adresinizi giriniz"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Şifre</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Şifrenizi giriniz (en az 6 karakter)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
              />
            </View>

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Şifre Tekrar</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Şifrenizi tekrar giriniz"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="account-plus" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Hesap Oluştur</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setShowRegister(false);
                clearForm();
              }}
            >
              <MaterialCommunityIcons name="login" size={20} color="#4A90E2" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Zaten hesabım var</Text>
            </TouchableOpacity>

          </View>

          {/* Guest Login */}
          <TouchableOpacity 
            style={styles.guestButton} 
            onPress={handleGuestLogin}
            disabled={loading}
          >
            <MaterialCommunityIcons name="account-outline" size={16} color="#999" />
            <Text style={styles.guestButtonText}>Misafir olarak devam et</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>BookMate</Text>
          <Text style={styles.subtitle}>Okuma serüveninize hoş geldiniz</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          
          {/* Email Input */}
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Email adresinizi giriniz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Şifre</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Şifrenizi giriniz"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="login" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Giriş Yap</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowRegister(true)}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={20} color="#4A90E2" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Hesap Oluştur</Text>
          </TouchableOpacity>

        </View>

        {/* Guest Login */}
        <TouchableOpacity 
          style={styles.guestButton} 
          onPress={handleGuestLogin}
          disabled={loading}
        >
          <MaterialCommunityIcons name="account-outline" size={16} color="#999" />
          <Text style={styles.guestButtonText}>Misafir olarak devam et</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 20,
  },
  secondaryButton: {
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  guestButtonText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default AuthScreen; 