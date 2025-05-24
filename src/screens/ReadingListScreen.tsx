import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ReadingListScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Sample data
  const readingList = [
    { id: '1', title: 'Suç ve Ceza', author: 'Fyodor Dostoyevski', progress: 75 },
    { id: '2', title: 'Sefiller', author: 'Victor Hugo', progress: 30 },
    { id: '3', title: '1984', author: 'George Orwell', progress: 50 },
    { id: '4', title: 'Yüzüklerin Efendisi', author: 'J.R.R. Tolkien', progress: 15 },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.bookItem}>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
        <Text style={styles.progressText}>{item.progress}%</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>abc</Text>
      <FlatList
        data={readingList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  bookItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookInfo: {
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressText: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ReadingListScreen; 