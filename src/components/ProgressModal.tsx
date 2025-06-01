import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

const { width, height } = Dimensions.get('window');

interface ProgressModalProps {
  visible: boolean;
  onClose: () => void;
  page?: number;
  totalPages?: number;
  bookTitle?: string;
  type?: 'progress' | 'status' | 'completion' | 'error' | 'warning' | 'info' | 'loading' | 'delete' | 'favorite' | 'action' | 'menu' | 'book-menu';
  message?: string;
  title?: string;
  subtitle?: string;
  actionType?: string;
  onAction?: (action: string) => void;
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  visible,
  onClose,
  page,
  totalPages,
  bookTitle,
  type = 'progress',
  message,
  title,
  subtitle,
  actionType,
  onAction,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show modal animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon animation with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      translateY.setValue(50);
      scale.setValue(0.8);
      iconScale.setValue(0);
      iconRotate.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getModalConfig = () => {
    switch (type) {
      case 'completion':
        return {
          icon: 'trophy',
          iconColor: '#FFD700',
          title: title || 'Tebrikler!',
          subtitle: subtitle || 'Kitabı tamamladınız',
          buttonColor: '#10B981',
          buttonText: 'Tamam',
          backgroundColor: '#F0FDF4',
        };
      case 'error':
        return {
          icon: 'alert-circle',
          iconColor: '#EF4444',
          title: title || 'Hata!',
          subtitle: subtitle || message || 'Bir hata oluştu',
          buttonColor: '#EF4444',
          buttonText: 'Anladım',
          backgroundColor: '#FEF2F2',
        };
      case 'warning':
        return {
          icon: 'alert',
          iconColor: '#F59E0B',
          title: title || 'Uyarı',
          subtitle: subtitle || message || 'Bu işlemi yapmak istediğinizden emin misiniz?',
          buttonColor: '#F59E0B',
          buttonText: actionType === 'add-to-library' ? 'Evet' : actionType === 'logout' ? 'Evet' : 'Evet',
          cancelButtonText: 'İptal',
          backgroundColor: '#FFFBEB',
        };
      case 'info':
        return {
          icon: 'information',
          iconColor: '#3B82F6',
          title: title || 'Bilgi',
          subtitle: subtitle || message || 'Bilgilendirme mesajı',
          buttonColor: '#3B82F6',
          buttonText: 'Anladım',
          backgroundColor: '#EFF6FF',
        };
      case 'menu':
        return {
          icon: 'menu',
          iconColor: '#3B82F6',
          title: title || 'Kitap Seçenekleri',
          subtitle: subtitle || message || 'Bu kitap için ne yapmak istiyorsunuz?',
          buttonColor: '#3B82F6',
          buttonText: 'Kütüphaneye Ekle',
          backgroundColor: '#EFF6FF',
        };
      case 'loading':
        return {
          icon: 'loading',
          iconColor: '#6B7280',
          title: title || 'Yükleniyor...',
          subtitle: subtitle || message || 'Lütfen bekleyin',
          buttonColor: '#6B7280',
          buttonText: 'Bekle',
          backgroundColor: '#F9FAFB',
        };
      case 'delete':
        return {
          icon: 'delete',
          iconColor: '#EF4444',
          title: title || 'Silindi!',
          subtitle: subtitle || message || 'İşlem başarıyla tamamlandı',
          buttonColor: '#EF4444',
          buttonText: 'Tamam',
          backgroundColor: '#FEF2F2',
        };
      case 'favorite':
        return {
          icon: 'heart',
          iconColor: '#EC4899',
          title: title || 'Favorilere Eklendi!',
          subtitle: subtitle || message || 'Kitap favorilerinize eklendi',
          buttonColor: '#EC4899',
          buttonText: actionType === 'add' ? 'Evet' : 'Harika!',
          cancelButtonText: actionType === 'add' ? 'İptal' : undefined,
          backgroundColor: '#FDF2F8',
        };
      case 'status':
        return {
          icon: 'bookmark-check',
          iconColor: '#3B82F6',
          title: title || 'Durum Güncellendi',
          subtitle: subtitle || message || 'Kitap durumu başarıyla değiştirildi',
          buttonColor: '#3B82F6',
          buttonText: 'Anladım',
          backgroundColor: '#EFF6FF',
        };
      case 'action':
        return {
          icon: 'check-circle',
          iconColor: '#10B981',
          title: title || 'İşlem Tamamlandı',
          subtitle: subtitle || message || 'İşlem başarıyla tamamlandı',
          buttonColor: '#3B82F6',
          buttonText: 'Anladım',
          backgroundColor: '#F0FDF4',
        };
      case 'book-menu':
        return {
          icon: 'book',
          iconColor: '#3B82F6',
          title: title || 'Kitap Menüsü',
          subtitle: subtitle || message || 'Bu kitap için ne yapmak istiyorsunuz?',
          buttonColor: '#3B82F6',
          buttonText: 'Kitap Detayı',
          backgroundColor: '#EFF6FF',
        };
      default: // progress
        return {
          icon: 'check-circle',
          iconColor: '#10B981',
          title: title || 'İlerleme Kaydedildi',
          subtitle: subtitle || (page ? `${page}. sayfa olarak güncellendi` : 'İlerleme başarıyla kaydedildi'),
          buttonColor: '#3B82F6',
          buttonText: 'Devam Et',
          backgroundColor: '#F0FDF4',
        };
    }
  };

  const config = getModalConfig();
  
  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.overlayBackground}
        onPress={handleClose}
        activeOpacity={1}
      />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            transform: [{ translateY }, { scale }],
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Animated Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            {
              backgroundColor: config.backgroundColor,
              transform: [
                { scale: iconScale },
                { rotate: type === 'loading' ? rotateInterpolate : '0deg' }
              ]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name={config.icon as any} 
            size={40} 
            color={config.iconColor} 
          />
        </Animated.View>

        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {config.title}
        </Text>
        
        <Text style={[styles.subtitle, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
          {config.subtitle}
        </Text>

        {/* Menu Buttons */}
        {type === 'menu' ? (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => onAction?.('add-to-library')}
              activeOpacity={0.8}
            >
              <Text style={styles.menuButtonText}>Kütüphaneye Ekle</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: '#EF4444' }]}
              onPress={() => onAction?.('delete')}
              activeOpacity={0.8}
            >
              <Text style={styles.menuButtonText}>Kitabı Kaldır</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuButton, styles.cancelMenuButton]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuButtonText, { color: '#6B7280' }]}>İptal</Text>
            </TouchableOpacity>
          </View>
        ) : type === 'book-menu' ? (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => onAction?.('edit')}
              activeOpacity={0.8}
            >
              <Text style={styles.menuButtonText}>Kitap Detayı</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: '#EF4444' }]}
              onPress={() => onAction?.('delete')}
              activeOpacity={0.8}
            >
              <Text style={styles.menuButtonText}>Kütüphaneden Kaldır</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuButton, styles.cancelMenuButton]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuButtonText, { color: '#6B7280' }]}>İptal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Standard Action Buttons */
          actionType ? (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: config.buttonColor }]}
                onPress={() => onAction?.(actionType)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Evet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.singleButton, { backgroundColor: config.buttonColor }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.singleButtonText}>{config.buttonText}</Text>
            </TouchableOpacity>
          )
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    elevation: 21,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  menuContainer: {
    width: '100%',
    gap: 12,
  },
  menuButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelMenuButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(115, 115, 115, 0.2)',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  singleButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProgressModal; 