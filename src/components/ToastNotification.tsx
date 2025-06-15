import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onHide: () => void;
  title?: string;
}

const ToastNotification: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 4000,
  onHide,
  title,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#4CAF50', '#45a049', '#2E7D32'],
          icon: 'checkmark-circle',
          shadowColor: '#4CAF50',
        };
      case 'error':
        return {
          colors: ['#f44336', '#d32f2f', '#c62828'],
          icon: 'close-circle',
          shadowColor: '#f44336',
        };
      case 'warning':
        return {
          colors: ['#FF9800', '#F57C00', '#EF6C00'],
          icon: 'warning',
          shadowColor: '#FF9800',
        };
      case 'info':
        return {
          colors: ['#2196F3', '#1976D2', '#1565C0'],
          icon: 'information-circle',
          shadowColor: '#2196F3',
        };
      default:
        return {
          colors: ['#4CAF50', '#45a049', '#2E7D32'],
          icon: 'checkmark-circle',
          shadowColor: '#4CAF50',
        };
    }
  };

  const config = getToastConfig();

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Auto hide
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <StatusBar backgroundColor="transparent" translucent />
      <Animated.View
        style={[
          styles.toast,
          {
            transform: [{ translateY }, { scale }],
            opacity,
            shadowColor: config.shadowColor,
          },
        ]}
      >
        <LinearGradient colors={config.colors as any} style={styles.gradient}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name={config.icon as any} size={28} color="#fff" />
            </View>
            
            <View style={styles.textContainer}>
              {title && <Text style={styles.title}>{title}</Text>}
              <Text style={styles.message}>{message}</Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {duration > 0 && (
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toast: {
    width: width - 32,
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  gradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default ToastNotification; 