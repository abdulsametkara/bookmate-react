import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useToast } from '../hooks/useToast';
import AnimatedToast from './AnimatedToast';

interface ToastProviderProps {
  children: React.ReactNode;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toasts } = useToast();

  return (
    <View style={styles.container}>
      {children}
      {toasts.map((toast) => (
        <AnimatedToast
          key={toast.id}
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onPress={toast.onPress}
          onDismiss={toast.onDismiss}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ToastProvider; 