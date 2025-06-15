import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, createSharedLibrary, User } from '../services/sharedReadingApi';
import { useToastContext } from '../providers/ToastProvider';

const CreateSharedLibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { success, error: showError, warning } = useToastContext();
  
  const [libraryName, setLibraryName] = useState('');
  const [libraryDescription, setLibraryDescription] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const friendsData = await getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
      showError('Arkadaşlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateLibrary = async () => {
    if (!libraryName.trim()) {
      warning('Kütüphane adı gereklidir.');
      return;
    }

    if (selectedFriends.length === 0) {
      warning('En az bir arkadaş seçmelisiniz.');
      return;
    }

    setCreating(true);
    try {
      const result = await createSharedLibrary({
        name: libraryName.trim(),
        description: libraryDescription.trim() || undefined,
        friendIds: selectedFriends,
      });

      success('🎉 Özel kütüphaneniz oluşturuldu! Seçtiğiniz arkadaşlarınız artık bu kütüphaneye erişebilir.');
      
      // Delay navigation to show toast
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating library:', error);
      showError('Kütüphane oluşturulurken bir hata oluştu.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Özel Kütüphane Oluştur</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Library Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özel Kütüphane Bilgileri</Text>
            
            <Text style={styles.inputLabel}>Kütüphane Adı *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Örn: Bizim Klasik Edebiyat Koleksiyonu"
              value={libraryName}
              onChangeText={setLibraryName}
              maxLength={100}
              placeholderTextColor="rgba(0,0,0,0.5)"
            />

            <Text style={styles.inputLabel}>Açıklama (İsteğe bağlı)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Bu özel kütüphane hakkında kısa açıklama..."
              value={libraryDescription}
              onChangeText={setLibraryDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              placeholderTextColor="rgba(0,0,0,0.5)"
            />
          </View>

          {/* Friend Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kütüphane Üyeleri ({selectedFriends.length} seçili)
            </Text>
            <Text style={styles.sectionDescription}>
              Bu özel kütüphaneye erişimi olacak arkadaşlarınızı seçin. Sadece seçtiğiniz kişiler bu kütüphaneyi görebilir ve kitap ekleyebilir.
            </Text>
            
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.emptyStateText}>Henüz arkadaşınız yok</Text>
                <Text style={styles.emptyStateSubtext}>
                  Ortak kütüphane oluşturmak için önce arkadaş eklemelisiniz
                </Text>
              </View>
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendCard,
                    selectedFriends.includes(friend.id) && styles.friendCardSelected,
                  ]}
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {friend.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    {friend.username && (
                      <Text style={styles.friendUsername}>@{friend.username}</Text>
                    )}
                  </View>
                  <View style={styles.checkboxContainer}>
                    {selectedFriends.includes(friend.id) ? (
                      <Ionicons name="checkmark-circle" size={24} color="#667eea" />
                    ) : (
                      <View style={styles.uncheckedBox} />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Create Button */}
          <View style={styles.createButtonContainer}>
            <TouchableOpacity
              style={[styles.createButton, (!libraryName.trim() || selectedFriends.length === 0) && styles.createButtonDisabled]}
              onPress={handleCreateLibrary}
              disabled={creating || !libraryName.trim() || selectedFriends.length === 0}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!libraryName.trim() || selectedFriends.length === 0) ? ['#ccc', '#999'] : ['#4CAF50', '#45a049']}
                style={styles.createButtonGradient}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="library" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Özel Kütüphane Oluştur</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  
  // Content
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  sectionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Form inputs
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Friends
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendCardSelected: {
    borderColor: '#1F2937',
    backgroundColor: 'rgba(31, 41, 55, 0.1)',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkboxContainer: {
    marginLeft: 10,
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  
  // Create button
  createButtonContainer: {
    paddingTop: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
});

export default CreateSharedLibraryScreen; 