import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import store from './src/store';
import RecommendationManager from './src/utils/recommendationManager';
import { ToastProvider } from './src/providers/ToastProvider';
import { validateApiKeys } from './src/utils/apiConfig';

export default function App() {
  useEffect(() => {
    // Initialize book covers when app starts
    const initializeApp = async () => {
      try {
        console.log('🚀 App başlatılıyor...');
        
        // API konfigürasyonunu kontrol et
        validateApiKeys();
        
        // Clear all caches for fresh start
        await AsyncStorage.removeItem('book_covers_cache');
        await AsyncStorage.multiRemove(['book_covers_cache']);
        
        // Clear recommendation caches
        RecommendationManager.clearRecommendationsCache();
        console.log('🗑️ Tüm cache\'ler temizlendi');
        
        // Enhanced book covers with OpenLibrary API
        await RecommendationManager.initializeBookCovers();
        
        console.log('✅ App inicializasyonu tamamlandı');
      } catch (error) {
        console.error('🚨 App inicializasyon hatası:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
} 