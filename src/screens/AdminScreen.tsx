import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Clipboard
} from 'react-native';
import { AdminDebug } from '../utils/adminDebug';
import { UserManager } from '../utils/userManager';

interface UserData {
  id: string;
  email?: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
  passwordHash?: string;
  preferences: any;
}

const AdminScreen = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await AdminDebug.getAllUsersData();
      if (usersData) {
        setUsers(usersData);
        setTotalUsers(usersData.length);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Hata', 'Kullanıcı verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Kopyalandı', 'Metin panoya kopyalandı');
  };

  const exportAllData = async () => {
    try {
      const data = await AdminDebug.getAllUsersData();
      const jsonString = JSON.stringify(data, null, 2);
      copyToClipboard(jsonString);
      Alert.alert('Başarılı', 'Tüm kullanıcı verileri panoya kopyalandı');
    } catch (error) {
      Alert.alert('Hata', 'Veri dışa aktarılamadı');
    }
  };

  const showRawData = async () => {
    try {
      await AdminDebug.getRawStorageData();
      Alert.alert('Konsola Yazdırıldı', 'Ham veriler konsola yazdırıldı');
    } catch (error) {
      Alert.alert('Hata', 'Ham veriler alınamadı');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Toplam Kullanıcı: {totalUsers}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={exportAllData}>
          <Text style={styles.buttonText}>Verileri Dışa Aktar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={showRawData}>
          <Text style={styles.buttonText}>Ham Veri (Konsol)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUsers} />
        }
      >
        {users.map((user, index) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <Text style={styles.userIndex}>#{index + 1}</Text>
              <Text style={styles.userId}>{user.id}</Text>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.label}>Email:</Text>
              <TouchableOpacity onPress={() => copyToClipboard(user.email || '')}>
                <Text style={styles.value}>{user.email || 'Belirtilmemiş'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.label}>Ad:</Text>
              <Text style={styles.value}>{user.displayName || 'Belirtilmemiş'}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.label}>Kayıt Tarihi:</Text>
              <Text style={styles.value}>{formatDate(user.createdAt)}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.label}>Son Giriş:</Text>
              <Text style={styles.value}>{formatDate(user.lastLoginAt)}</Text>
            </View>

            {user.passwordHash && (
              <View style={styles.userInfo}>
                <Text style={styles.label}>Şifre Hash:</Text>
                <TouchableOpacity onPress={() => copyToClipboard(user.passwordHash || '')}>
                  <Text style={styles.hashValue} numberOfLines={1}>
                    {user.passwordHash}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.userInfo}>
              <Text style={styles.label}>Tercihler:</Text>
              <Text style={styles.value}>
                Tema: {user.preferences?.theme || 'Belirtilmemiş'}
                {'\n'}Bildirimler: {user.preferences?.notifications ? 'Açık' : 'Kapalı'}
                {'\n'}Okuma Hedefi: {user.preferences?.readingGoal || 0} dk
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userIndex: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  userId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  userInfo: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  hashValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 4,
  },
});

export default AdminScreen; 