import React from 'react';
import { 
  StyleSheet, 
  View,
  SafeAreaView
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import UserProfile from '../components/UserProfile';
import { Colors, FontSizes, Spacing } from '../theme/theme';

const ProfileScreen = () => {
  const navigation = useNavigation();

  const handleNavigateToSettings = () => {
    navigation.navigate('EditProfile');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Component */}
      <UserProfile 
        onNavigateToSettings={handleNavigateToSettings}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Modern arka plan
  },
});

export default ProfileScreen; 