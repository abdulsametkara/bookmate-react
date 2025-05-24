import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BookDetailScreen from './BookDetailScreen';
import { BookDetailProvider } from './BookDetailContext';

const Stack = createNativeStackNavigator();

// Custom navigator to avoid withTheme HOCs
const AppNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen 
      name="BookDetailScreen" 
      component={BookDetailScreen} 
    />
    {/* Add more screens here */}
  </Stack.Navigator>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <BookDetailProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </BookDetailProvider>
    </SafeAreaProvider>
  );
} 