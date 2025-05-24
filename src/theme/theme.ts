// BookMate tema renkleri - Daha warm ve soft görünüm
export const LightTheme = {
  // Ana renkler
  primary: '#2D7DD2', // Mavi ana renk (zamanlayıcı, butonlar)
  primaryLight: '#E8F4FD', // Çok açık mavi arka plan
  secondary: '#6366F1', // İkincil renk
  accent: '#34C759', // Yeşil vurgu rengi
  
  // Arka plan renkleri - Çok daha soft ve warm tonlar
  background: '#F5F7FA', // Ana arka plan (belirgin gri-beyaz)
  backgroundSecondary: '#EEF2F6', // İkincil arka plan
  backgroundGray: '#E8ECF0', // Gri arka plan alanları
  surface: '#FAFBFC', // Kartlar için soft beyaz
  surfaceSoft: '#F8F9FB', // Daha soft yüzey rengi
  
  // Metin renkleri
  text: '#1A1A1A', // Ana metin
  textSecondary: '#6B7280', // İkincil metin
  textTertiary: '#9CA3AF', // Üçüncül metin
  textPlaceholder: '#D1D5DB', // Placeholder metin
  
  // UI elementleri - Daha belirgin border'lar
  border: '#DDE1E6', // Border rengi (daha belirgin)
  borderLight: '#E8ECF0', // Açık border
  borderSoft: '#E0E4E8', // Soft border
  shadow: 'rgba(0, 0, 0, 0.08)', // Daha belirgin gölge
  shadowMedium: 'rgba(0, 0, 0, 0.12)', // Orta gölge
  
  // Durum renkleri
  success: '#10B981', // Başarı yeşili
  warning: '#F59E0B', // Uyarı sarısı
  error: '#EF4444', // Hata kırmızısı
  info: '#3B82F6', // Bilgi mavisi
  
  // Progress ve rating
  progressComplete: '#2D7DD2', // Tamamlanan progress
  progressBackground: '#DDE1E6', // Progress arka plan (belirgin)
  rating: '#FCD34D', // Yıldız rating
  
  // Toggle ve switch
  toggleActive: '#2D7DD2',
  toggleInactive: '#DDE1E6',
  
  // Özel renkler
  bookCover: '#E8ECF0', // Kitap kapağı arka planı
  avatar: '#6366F1', // Avatar arka planı
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#EF4444',
  
  // Yeni warm ve soft renkler
  cardBackground: '#F8F9FB', // Kart arka planları için (daha gri)
  sectionBackground: '#F0F3F7', // Bölüm arka planları için (belirgin gri)
  divider: '#E0E4E8', // Ayırıcı çizgiler için
  headerBackground: '#FAFBFC', // Header için
  warm: '#F9FAFB', // Warm ton
  coolGray: '#F1F5F9', // Cool gray ton
  
  // Türler için renkler
  fiction: '#8B5CF6', // Kurgu türü için mor
};

export const DarkTheme = {
  // Ana renkler
  primary: '#60A5FA', // Açık mavi
  primaryLight: '#1E3A8A', // Koyu mavi arka plan
  secondary: '#8B5CF6', // İkincil renk
  accent: '#34D399', // Açık yeşil
  
  // Arka plan renkleri
  background: '#111827', // Koyu ana arka plan
  backgroundSecondary: '#1F2937', // Koyu ikincil arka plan
  backgroundGray: '#374151', // Koyu gri arka plan
  surface: '#1F2937',
  surfaceSoft: '#242A37',
  
  // Metin renkleri
  text: '#F9FAFB', // Açık ana metin
  textSecondary: '#D1D5DB', // Açık ikincil metin
  textTertiary: '#9CA3AF', // Açık üçüncül metin
  textPlaceholder: '#6B7280', // Koyu placeholder
  
  // UI elementleri
  border: '#374151', // Koyu border
  borderLight: '#4B5563', // Açık koyu border
  borderSoft: '#3F4956',
  shadow: 'rgba(0, 0, 0, 0.3)', // Koyu gölge
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  
  // Durum renkleri
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  // Progress ve rating
  progressComplete: '#60A5FA',
  progressBackground: '#374151',
  rating: '#FDE047',
  
  // Toggle ve switch
  toggleActive: '#60A5FA',
  toggleInactive: '#4B5563',
  
  // Özel renkler
  bookCover: '#374151',
  avatar: '#8B5CF6',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  notification: '#F87171',
  
  // Dark mode soft renkler
  cardBackground: '#1F2937',
  sectionBackground: '#1A202C',
  divider: '#374151',
  headerBackground: '#1F2937',
  warm: '#1F2937',
  coolGray: '#1A202C',
  
  // Türler için renkler
  fiction: '#A78BFA', // Kurgu türü için açık mor
};

// Export current theme (will be replaced by context)
export const Colors = LightTheme;

// Spacing değerleri
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font boyutları
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius değerleri
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
}; 