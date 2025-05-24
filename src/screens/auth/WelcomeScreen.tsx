import React from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/theme';

const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>BookMate</Text>
        <Text style={styles.subtitle}>Çiftler için okuma uygulaması</Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featureTitle}>Kitap okuma deneyiminizi partnerinizle paylaşın</Text>
        <Text style={styles.featureText}>
          • Okuma ilerlemelerinizi takip edin{'\n'}
          • Kitap koleksiyonunuzu yönetin{'\n'}
          • 3D kitaplık görselleştirmesi oluşturun{'\n'}
          • Okuma hedeflerinizi belirleyin{'\n'}
          • Kitaplar hakkında notlar alın ve paylaşın
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          onPress={() => navigation.navigate('Login')}
        >
          Giriş Yap
        </Button>
        
        <Button
          mode="outlined"
          style={[styles.button, styles.registerButton]}
          labelStyle={styles.registerButtonLabel}
          onPress={() => navigation.navigate('Register')}
        >
          Hesap Oluştur
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  featuresContainer: {
    alignItems: 'flex-start',
    marginVertical: 30,
    paddingHorizontal: 10,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
    alignSelf: 'center',
  },
  featureText: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    marginVertical: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    paddingVertical: 2,
  },
  registerButton: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  registerButtonLabel: {
    fontSize: 16,
    color: Colors.primary,
    paddingVertical: 2,
  },
});

export default WelcomeScreen; 