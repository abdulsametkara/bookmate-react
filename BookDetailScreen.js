import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBookDetail } from './BookDetailContext';

// Memoize the buttons to prevent unnecessary re-renders
const StatusButton = memo(({ title, icon, isActive, onPress }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.statusButton, 
        isActive && styles.statusButtonActive
      ]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={isActive ? "#fff" : "#333"} 
      />
      <Text style={isActive ? styles.statusTextActive : styles.statusText}> {title}</Text>
    </TouchableOpacity>
  );
});

// Pure button component that doesn't rely on themed components
const PureButton = ({ onPress, style, textStyle, icon, label, activeOpacity }) => (
  <TouchableOpacity 
    style={style}
    onPress={onPress}
    activeOpacity={activeOpacity || 0.7}
  >
    {icon && icon}
    <Text style={textStyle}>{label}</Text>
  </TouchableOpacity>
);

// Main component
const BookDetailScreen = ({ navigation }) => {
  // Use context instead of local state
  const { 
    readingStatus, 
    readingProgress, 
    handleStatusChange, 
    handleReadPress 
  } = useBookDetail();

  const handleBackPress = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Kitap Detayları</Text>
      </View>

      {/* Kitap Kartı */}
      <View style={styles.bookCard}>
        <Image
          source={{ uri: 'https://img.kitapyurdu.com/v1/getImage/fn:11262260/wh:true/wi:220' }} 
          style={styles.bookImage}
        />
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>Şeker Portakalı</Text>
          <Text style={styles.bookAuthor}>José Mauro de Vasconcelos</Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.bookMeta}> 182 sayfa</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.bookMeta}> 1968</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="book-outline" size={16} color="#666" />
            <Text style={styles.bookMeta}> roman</Text>
          </View>

          <PureButton 
            style={styles.readListButton}
            textStyle={styles.readListButtonText}
            icon={<Ionicons name="bookmark-outline" size={16} color="#fff" style={{marginRight: 4}} />}
            label="Okuma Listem"
          />
        </View>
      </View>

      {/* Okuma Durumu */}
      <View style={styles.readingStatusContainer}>
        <Text style={styles.sectionTitle}>Okuma Durumu</Text>
        <View style={styles.statusButtons}>
          <StatusButton 
            title="OKUMA LİSTEMDE"
            icon="bookmark"
            isActive={readingStatus === 'reading-list'}
            onPress={() => handleStatusChange('reading-list')}
          />
          <StatusButton 
            title="OKUYOR"
            icon="book"
            isActive={readingStatus === 'reading'}
            onPress={() => handleStatusChange('reading')}
          />
          <StatusButton 
            title="TAMAMLANDI"
            icon="checkmark-circle"
            isActive={readingStatus === 'completed'}
            onPress={() => handleStatusChange('completed')}
          />
        </View>
      </View>

      {/* Reading Progress (only show when status is 'reading' or 'completed') */}
      {(readingStatus === 'reading' || readingStatus === 'completed') && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Okuma İlerlemesi: {Math.floor(readingProgress)}%
          </Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${Math.floor(readingProgress)}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Notlar */}
      <View style={styles.notesContainer}>
        <Text style={styles.sectionTitle}>Notlar</Text>
        <Text style={styles.noNotesText}>Henüz not eklenmemiş</Text>
      </View>

      {/* Okumaya Başla Butonu - Replace themed button with pure component */}
      <PureButton 
        style={styles.startButton}
        textStyle={styles.startButtonText}
        icon={<Ionicons name="time-outline" size={20} color="#fff" style={{marginRight: 4}} />}
        label={readingStatus === 'reading' ? "OKUMAYA DEVAM ET" : "OKUMAYA BAŞLA"}
        onPress={handleReadPress}
        activeOpacity={0.8}
      />
    </ScrollView>
  );
};

export default memo(BookDetailScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
    padding: 4, // Increase touch target
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bookCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  bookImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookAuthor: {
    color: '#555',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  bookMeta: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  readListButton: {
    backgroundColor: '#FFA726',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  readListButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  readingStatusContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#FFA726',
    borderColor: '#FFA726',
  },
  statusText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  notesContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noNotesText: {
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 28,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 