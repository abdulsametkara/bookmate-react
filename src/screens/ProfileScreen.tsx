import React from 'react';
import { 
  StyleSheet, 
  View,
  SafeAreaView,
  StatusBar,
  ScrollView
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
    <View style={styles.containerFull}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" translucent={false} />
      
      {/* Blue Header */}
      <SafeAreaView style={styles.blueHeaderContainer}>
        <View style={styles.blueHeader}>
          <Text style={styles.blueHeaderTitle}>Profil</Text>
        </View>
      </SafeAreaView>
      
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Component */}
        <UserProfile 
          onNavigateToSettings={handleNavigateToSettings}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containerFull: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Modern arka plan
  },
  blueHeaderContainer: {
    backgroundColor: '#007AFF',
  },
  blueHeader: {
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  blueHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ProfileScreen; 