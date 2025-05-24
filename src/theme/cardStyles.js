import { Platform } from 'react-native';

// Platform spesifik gölgeler
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  android: {
    elevation: 2,
  },
});

// Beyaz kart stili (iOS görünümlü)
export const whiteCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  margin: 16,
  marginBottom: 8,
  ...cardShadow,
};

// Tab stil ayarları
export const activeTabStyle = {
  color: '#007AFF',
};

// Statü renkleri
export const statusColors = {
  not_started: '#8E8E93', // Gri
  reading: '#007AFF',     // Mavi
  completed: '#34C759',   // Yeşil
};

// İlerleme çubuğu stili
export const progressBarStyle = {
  height: 6,
  backgroundColor: '#E9E9EB',
  borderRadius: 3,
};

// Buton stilleri
export const primaryButtonStyle = {
  backgroundColor: '#007AFF',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
};

export const primaryButtonTextStyle = {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '600',
};

// Ortak başlık stili
export const sectionTitleStyle = {
  fontSize: 17,
  fontWeight: '600',
  color: '#000000',
  marginBottom: 16,
}; 