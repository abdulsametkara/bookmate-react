import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

const sampleBooks = [
  { id: '1', title: 'Gizli Bahçe', author: 'Elif Yılmaz' },
  { id: '2', title: 'Sessiz Hasta', author: 'Ayşe Demir' },
  { id: '3', title: 'Muhteşem Gatsby', author: 'Mehmet Öztürk' },
  { id: '4', title: 'Bülbülü Öldürmek', author: 'Zeynep Aksoy' },
  { id: '5', title: '1984', author: 'Ahmet Kaya' },
  { id: '6', title: 'Gurur ve Önyargı', author: 'Fatma Beyaz' },
  { id: '7', title: 'Çavdar Tarlasında Çocuklar', author: 'Emre Karaağaç' },
  { id: '8', title: 'Hobbit', author: 'Seda Gümüş' },
  { id: '9', title: 'Yüzüklerin Efendisi', author: 'Deniz Kılıç' },
  { id: '10', title: 'Da Vinci Şifresi', author: 'Ceren Taş' },
  { id: '11', title: 'Simyacı', author: 'Can Arslan' },
];

const BookSelectionScreen = () => {
  const navigation = useNavigation();

  const handleBookSelect = (book: any) => {
    // Navigate back with selected book
    navigation.goBack();
  };

  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => handleBookSelect(item)}
    >
      <View style={styles.bookCover}>
        <Image
          source={{ uri: `https://picsum.photos/60/80?random=${item.id}` }}
          style={styles.bookImage}
        />
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Kitap Seç</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={sampleBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.booksList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 24,
  },
  booksList: {
    padding: Spacing.lg,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bookCover: {
    width: 40,
    height: 56,
    backgroundColor: Colors.bookCover,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});

export default BookSelectionScreen; 