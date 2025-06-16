import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      'bookmate_auth_token',
      'user',
      'bookmate_current_session'
    ]);
    console.log('🗑️ Auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

export const handleAuthError = async (error: any) => {
  // Check if error is related to authentication
  if (error.message?.includes('Geçersiz token') || 
      error.message?.includes('Invalid token') ||
      error.status === 401) {
    
    console.log('🔑 Token expired, clearing auth data...');
    await clearAuthData();
    
    // You could also dispatch a logout action here if using Redux
    // dispatch(logout());
    
    return true; // Indicates auth error was handled
  }
  
  return false; // Not an auth error
}; 