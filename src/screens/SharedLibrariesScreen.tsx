import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSharedLibraries, SharedLibrary, deleteSharedLibrary } from '../services/sharedReadingApi';
import { useToastContext } from '../providers/ToastProvider';

const { width } = Dimensions.get('window');



const SharedLibrariesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { success, error: showError, info } = useToastContext();
  
  const [libraries, setLibraries] = useState<SharedLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const animatedValue = useState(new Animated.Value(0))[0];



  const loadLibraries = useCallback(async () => {
    try {
      // 10 saniyelik timeout ekle
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const result = await Promise.race([
        getSharedLibraries().catch(err => {
          console.error('❌ Libraries error:', err);
          throw err;
        }),
        timeoutPromise
      ]);

      const response = result as SharedLibrary[];
      
      setLibraries(response);
    } catch (error: any) {
      console.error('❌ SharedLibrariesScreen: Error loading libraries:', error);
      
      setLibraries([]);
      
      if (error.message === 'Request timeout') {
        showError('Bağlantı zaman aşımına uğradı. Backend server çalışmıyor olabilir.');
      } else if (error.message?.includes('Network request failed')) {
        showError('İnternet bağlantınızı kontrol edin veya backend server çalışmıyor.');
      } else {
        showError('Sunucu hatası. Backend API çalışmıyor olabilir.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadLibraries();
    
    // Entrance animation
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Screen focus listener - refresh when returning from detail
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 SharedLibrariesScreen focused, refreshing libraries...');
      loadLibraries();
    });

    return unsubscribe;
  }, [loadLibraries, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLibraries();
  }, [loadLibraries]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const handleDeleteLibrary = (library: SharedLibrary) => {
    // Sadece kütüphane sahibi silebilir
    if (!library.isOwner) {
      Alert.alert('Yetkisiz İşlem', 'Sadece kütüphane sahibi kütüphaneyi silebilir.');
      return;
    }

    Alert.alert(
      'Kütüphaneyi Sil',
      `"${library.name}" kütüphanesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm kitaplar ile üyeler kaldırılacaktır.`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic update - hemen listeden kaldır
              setLibraries(prev => prev.filter(lib => lib.id !== library.id));
              info(`"${library.name}" kütüphanesi siliniyor...`);
              
              await deleteSharedLibrary(parseInt(library.id));
              success(`"${library.name}" kütüphanesi başarıyla silindi! 🗑️`);
              
            } catch (error: any) {
              // Error durumunda geri ekle
              showError(error.message || 'Kütüphane silinirken hata oluştu');
              loadLibraries(); // Refresh to restore the library
            }
          },
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
        <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingContent, { opacity: animatedValue }]}>
              <MaterialCommunityIcons name="library" size={64} color="#3B82F6" />
              <ActivityIndicator size="large" color="#3B82F6" style={styles.loadingIndicator} />
              <Text style={styles.loadingText}>Kütüphaneler Yükleniyor...</Text>
              <Text style={styles.loadingSubtext}>Özel koleksiyonlarınız hazırlanıyor</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" translucent />
      <LinearGradient colors={['#1F2937', '#374151', '#4B5563']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Özel Kütüphaneler</Text>
            <Text style={styles.headerSubtitle}>Seçtiğiniz arkadaşlarınızla özel kitap koleksiyonları oluşturun</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateSharedLibrary' as never)}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: 1 }]}>
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                <MaterialCommunityIcons name="library" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{libraries.length}</Text>
              <Text style={styles.statLabel}>Kütüphane</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                <MaterialCommunityIcons name="book" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>
                {libraries.reduce((total, lib) => total + (lib.bookCount || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Toplam Kitap</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>
                {libraries.reduce((total, lib) => total + (lib.memberCount || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Toplam Üye</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor="#fff"
                colors={['#3B82F6']}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {libraries.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="library" 
                  size={80} 
                  color="rgba(255, 255, 255, 0.3)" 
                />
                <Text style={styles.emptyStateTitle}>
                  Henüz özel kütüphaneniz yok
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  Seçtiğiniz arkadaşlarınızla özel kitap koleksiyonları oluşturun ve sadece sizin grubunuzla paylaşın
                </Text>
                <TouchableOpacity
                  style={styles.createFirstButton}
                  onPress={() => navigation.navigate('CreateSharedLibrary' as never)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name="plus-circle" 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.createFirstText}>
                    İlk Özel Kütüphanenizi Oluşturun
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.librariesList}>
                {libraries.map((library) => (
                  <TouchableOpacity
                    key={library.id}
                    style={styles.libraryCard}
                    onPress={() => navigation.navigate('SharedLibraryDetail' as never, { libraryId: library.id } as never)}
                    onLongPress={() => {
                      console.log('🔍 Long press debug:', { library: library.name, isOwner: library.isOwner });
                      handleDeleteLibrary(library);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.libraryHeader}>
                      <View style={styles.libraryIcon}>
                        <MaterialCommunityIcons name="library" size={32} color="#8B5CF6" />
                      </View>
                      <View style={styles.libraryInfo}>
                        <Text style={styles.libraryName}>{library.name}</Text>
                        {library.description && (
                          <Text style={styles.libraryDescription} numberOfLines={2}>
                            {library.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.libraryAction}>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255, 255, 255, 0.6)" />
                      </View>
                    </View>
                    
                    <View style={styles.libraryStats}>
                      <View style={styles.statItem}>
                        <View style={[styles.statItemIcon, { backgroundColor: '#10B981' }]}>
                          <MaterialCommunityIcons name="book" size={14} color="#fff" />
                        </View>
                        <Text style={styles.statText}>{library.bookCount || 0} kitap</Text>
                      </View>
                      <View style={styles.statItem}>
                        <View style={[styles.statItemIcon, { backgroundColor: '#3B82F6' }]}>
                          <MaterialCommunityIcons name="account-group" size={14} color="#fff" />
                        </View>
                        <Text style={styles.statText}>{library.memberCount || 0} üye</Text>
                      </View>
                    </View>
                    
                    <View style={styles.libraryFooter}>
                      <View style={styles.creatorInfo}>
                        <MaterialCommunityIcons name="account-circle" size={16} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.creatorText}>
                          {library.creatorName} tarafından oluşturuldu
                        </Text>
                      </View>
                      <View style={styles.dateInfo}>
                        <MaterialCommunityIcons name="calendar" size={14} color="rgba(255, 255, 255, 0.5)" />
                        <Text style={styles.createdDate}>
                          {formatDate(library.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>


      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  createFirstText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  librariesList: {
    gap: 16,
  },
  libraryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  libraryIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  libraryDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  libraryAction: {
    padding: 4,
  },
  libraryStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  libraryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  creatorText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createdDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default SharedLibrariesScreen; 