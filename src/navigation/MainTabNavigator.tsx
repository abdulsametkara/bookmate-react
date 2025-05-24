import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { Colors } from '../theme/theme';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { View, Text, Platform } from 'react-native';

// Import actual screen components
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ReadingTimerScreen from '../screens/ReadingTimerScreen';
import WishlistScreen from '../screens/WishlistScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF', // iOS mavi rengi
        tabBarInactiveTintColor: '#8E8E93', // iOS gri rengi
        headerShown: true,
        tabBarStyle: {
          height: 88,
          paddingTop: 10,
          paddingBottom: 30,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 10,
            },
          }),
          borderTopWidth: 0.5,
          borderTopColor: '#E5E5EA',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          headerShown: false, // Kendi header tasarımımız olduğu için gizliyoruz
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: 'Kütüphane',
          headerShown: false, // Kendi başlık tasarımımız olduğu için gizliyoruz
          tabBarIcon: ({ color, size }) => (
            <Icon name="bookshelf" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="ReadingTimer"
        component={ReadingTimerScreen}
        options={{
          title: 'Zamanlayıcı',
          tabBarIcon: ({ color, size }) => (
            <Icon name="timer-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          title: 'İstek Listesi',
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart-outline" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator; 