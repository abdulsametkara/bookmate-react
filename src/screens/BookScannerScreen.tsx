import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { Button, ActivityIndicator, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Not: Gerçek uygulamada bu ekran, expo-barcode-scanner veya başka bir
// barkod tarama kütüphanesi kullanacaktır. Bu örnek basitleştirilmiştir.

const BookScannerScreen = () => {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookData, setBookData] = useState(null);
  
  // Tarama işlemini başlat
  const startScanning = () => {
    setScanning(true);
    
    // Gerçek uygulamada burada kamera açılacak ve barkod taranacak
    // Bu örnekte 2 saniye sonra otomatik bir ISBN bulunduğunu simüle ediyoruz
    setTimeout(() => {
      const sampleISBN = '9789753638029'; // Örnek ISBN
      setScannedData(sampleISBN);
      setScanning(false);
      searchBook(sampleISBN);
    }, 2000);
  };
  
  // Taranan ISBN ile kitap bilgilerini ara
  const searchBook = async (isbn) => {
    setLoading(true);
    
    try {
      // Gerçek uygulamada burada bir kitap API'si kullanılacak
      // Örneğin: Google Books API, Open Library API, vb.
      
      // Bu örnekte gerçek bir API çağrısını simüle ediyoruz
      setTimeout(() => {
        // Örnek kitap verisi
        const sampleBookData = {
          title: 'İçimizdeki Şeytan',
          author: 'Sabahattin Ali',
          coverURL: 'https://i.dr.com.tr/cache/600x600-0/originals/0000000064552-1.jpg',
          publisher: 'YKY',
          publishYear: 1940,
          pageCount: 250,
          isbn: isbn,
        };
        
        setBookData(sampleBookData);
        setLoading(false);
      }, 1500);
    } catch (error) {
      setLoading(false);
      Alert.alert('Hata', 'Kitap bilgileri alınamadı. Lütfen tekrar deneyin.');
    }
  };
  
  // Bulunan kitabı EditBook ekranına gönder
  const useBookData = () => {
    navigation.navigate('EditBook', { 
      prefilledData: bookData 
    });
  };
  
  // Taramayı sıfırla
  const resetScanner = () => {
    setScannedData(null);
    setBookData(null);
  };

  return (
    <View style={styles.container}>
      {!scannedData ? (
        // Tarama ekranı
        <View style={styles.scannerContainer}>
          <Surface style={styles.cameraPreview}>
            {scanning ? (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.scanningText}>Barkod taranıyor...</Text>
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Icon name="barcode-scan" size={64} color={Colors.primaryLight} />
                <Text style={styles.placeholderText}>
                  Kitabın ISBN barkodunu taramak için başlat butonuna basın
                </Text>
              </View>
            )}
          </Surface>
          
          <Button
            mode="contained"
            onPress={startScanning}
            disabled={scanning}
            style={styles.scanButton}
            icon="barcode-scan"
          >
            {scanning ? 'Taranıyor...' : 'Taramayı Başlat'}
          </Button>
          
          <Text style={styles.instructionText}>
            Tarama işlemi için kitabın arka kapağındaki barkodu kameraya gösterin.
          </Text>
        </View>
      ) : (
        // Sonuç ekranı
        <View style={styles.resultContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Kitap bilgileri aranıyor...</Text>
            </View>
          ) : (
            <>
              <Surface style={styles.resultCard}>
                <View style={styles.isbnContainer}>
                  <Text style={styles.isbnLabel}>ISBN:</Text>
                  <Text style={styles.isbnValue}>{scannedData}</Text>
                </View>
                
                {bookData && (
                  <View style={styles.bookInfo}>
                    <Text style={styles.foundText}>Kitap bulundu!</Text>
                    <Text style={styles.bookTitle}>{bookData.title}</Text>
                    <Text style={styles.bookAuthor}>{bookData.author}</Text>
                    
                    <View style={styles.bookMeta}>
                      {bookData.publishYear && (
                        <Text style={styles.metaText}>
                          Yayın Yılı: {bookData.publishYear}
                        </Text>
                      )}
                      {bookData.publisher && (
                        <Text style={styles.metaText}>
                          Yayınevi: {bookData.publisher}
                        </Text>
                      )}
                      {bookData.pageCount && (
                        <Text style={styles.metaText}>
                          Sayfa Sayısı: {bookData.pageCount}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </Surface>
              
              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={resetScanner}
                  style={styles.resetButton}
                  icon="refresh"
                >
                  Yeniden Tara
                </Button>
                
                {bookData && (
                  <Button
                    mode="contained"
                    onPress={useBookData}
                    style={styles.useButton}
                    icon="check"
                  >
                    Bu Kitabı Kullan
                  </Button>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  cameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  scanButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  instructionText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  resultCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
  },
  isbnContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  isbnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  isbnValue: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  bookInfo: {
    marginTop: 8,
  },
  foundText: {
    fontSize: 16,
    color: Colors.success,
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bookMeta: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
    marginTop: 8,
  },
  metaText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resetButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
    borderColor: Colors.textSecondary,
  },
  useButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
  },
});

export default BookScannerScreen; 