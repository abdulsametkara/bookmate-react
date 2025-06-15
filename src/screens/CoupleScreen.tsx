import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { 
  Text, 
  Button, 
  Surface, 
  Divider, 
  Card, 
  Title, 
  Paragraph, 
  ProgressBar, 
  Badge,
  Avatar
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Geçici çift verisi
const coupleData = {
  partnerId: '2',
  partnerName: 'Ayşe Demir',
  partnerImage: 'https://randomuser.me/api/portraits/women/44.jpg',
  matchDate: '2024-03-15',
  isActive: true,
  books: [
    {
      id: '1',
      title: 'İçimizdeki Şeytan',
      author: 'Sabahattin Ali',
      coverURL: 'https://covers.openlibrary.org/b/isbn/9789753638029-L.jpg',
      userProgress: 65,
      partnerProgress: 73,
      isJointReading: true,
    },
    {
      id: '3',
      title: 'Şeker Portakalı',
      author: 'José Mauro de Vasconcelos',
      coverURL: 'https://covers.openlibrary.org/b/isbn/9786051310003-L.jpg',
      userProgress: 30,
      partnerProgress: 45,
      isJointReading: true,
    },
  ],
  recentActivities: [
    {
      id: '1',
      type: 'PROGRESS',
      bookId: '1',
      bookTitle: 'İçimizdeki Şeytan',
      personId: '2',
      personName: 'Ayşe',
      progress: 73,
      date: '2024-04-25T15:30:00',
    },
    {
      id: '2',
      type: 'NOTE',
      bookId: '1',
      bookTitle: 'İçimizdeki Şeytan',
      personId: '2',
      personName: 'Ayşe',
      note: 'Ömer karakterinin iç çelişkileri çok etkileyici.',
      date: '2024-04-24T20:45:00',
    },
    {
      id: '3',
      type: 'PROGRESS',
      bookId: '3',
      bookTitle: 'Şeker Portakalı',
      personId: '2',
      personName: 'Ayşe',
      progress: 45,
      date: '2024-04-23T19:15:00',
    },
  ],
};

// Eşleşme olmadığı durumda gösterilecek veri
const noPartnerData = {
  invitationCode: 'BOOK7842',
  pendingInvitation: null,
  // veya
  // pendingInvitation: {
  //   id: '3',
  //   name: 'Zeynep Kaya',
  //   image: 'https://randomuser.me/api/portraits/women/22.jpg',
  //   date: '2024-04-24T14:30:00',
  // },
};

const CoupleScreen = () => {
  const navigation = useNavigation();
  const [hasPartner, setHasPartner] = useState(true); // Gerçekte Firebase'den kontrol edilecek
  
  // Davet gönder
  const sendInvitation = () => {
    // Davet gönderme ekranına git
    console.log('Davet gönder');
  };
  
  // Davet koduyla eşleş
  const joinWithCode = () => {
    // Davet kodu girme modalını aç
    console.log('Davet koduyla eşleş');
  };
  
  // Daveti kabul et
  const acceptInvitation = () => {
    // Davet kabul işlemi
    console.log('Daveti kabul et');
    setHasPartner(true);
  };
  
  // Daveti reddet
  const rejectInvitation = () => {
    // Davet reddetme işlemi
    console.log('Daveti reddet');
  };
  
  // Ortak bir kitap seç
  const selectJointBook = () => {
    // Kitap seçme ekranına git
    console.log('Ortak kitap seç');
  };
  
  // Tarihi formatla
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Bugün
      return `Bugün, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffDays === 1) {
      // Dün
      return `Dün, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      // Diğer günler
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
      return date.toLocaleDateString('tr-TR', options);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {hasPartner ? (
        // Partner olan durumda
        <>
          {/* Çift Başlığı */}
          <Surface style={styles.coupleHeader}>
            <View style={styles.partnerContainer}>
              <Image source={{ uri: coupleData.partnerImage }} style={styles.partnerImage} />
              <Badge 
                visible={coupleData.isActive} 
                size={14} 
                style={styles.activeBadge} 
              />
            </View>
            
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{coupleData.partnerName}</Text>
              <Text style={styles.matchDate}>
                <Icon name="heart" size={14} color={Colors.secondary} />{' '}
                {new Date(coupleData.matchDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinden beri eşleşildi
              </Text>
            </View>
            
            <Button 
              icon="message-text-outline" 
              mode="outlined" 
              onPress={() => {}}
              style={styles.messageButton}
            >
              Mesaj
            </Button>
          </Surface>
          
          {/* Birlikte Okunan Kitaplar */}
          <Surface style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Birlikte Okuduğumuz Kitaplar</Text>
              <Button 
                compact 
                mode="text" 
                onPress={selectJointBook}
                style={styles.viewAllButton}
                labelStyle={styles.viewAllButtonText}
                icon="plus"
              >
                Kitap Ekle
              </Button>
            </View>
            
            {coupleData.books.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.jointBooksContainer}
              >
                {coupleData.books.map(book => (
                  <Card 
                    key={book.id} 
                    style={styles.jointBookCard}
                    onPress={() => navigation.navigate('BookDetail', { bookId: book.id })}
                  >
                    <Card.Cover source={{ uri: book.coverURL }} style={styles.jointBookCover} />
                    <Card.Content>
                      <Title style={styles.jointBookTitle} numberOfLines={1}>{book.title}</Title>
                      <Paragraph style={styles.jointBookAuthor} numberOfLines={1}>{book.author}</Paragraph>
                      
                      <View style={styles.progressSection}>
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>Sen</Text>
                          <Text style={styles.progressPercent}>{book.userProgress}%</Text>
                        </View>
                        <ProgressBar 
                          progress={book.userProgress / 100} 
                          color={Colors.primary} 
                          style={styles.progressBar} 
                        />
                        
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>{coupleData.partnerName.split(' ')[0]}</Text>
                          <Text style={styles.progressPercent}>{book.partnerProgress}%</Text>
                        </View>
                        <ProgressBar 
                          progress={book.partnerProgress / 100} 
                          color={Colors.secondary} 
                          style={styles.progressBar} 
                        />
                      </View>
                    </Card.Content>
                  </Card>
                ))}
                
                <TouchableOpacity 
                  style={styles.addBookCard}
                  onPress={selectJointBook}
                >
                  <Icon name="plus" size={40} color={Colors.primary} />
                  <Text style={styles.addBookText}>Yeni Kitap Ekle</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="book-open-variant" size={60} color={Colors.primaryLight} />
                <Text style={styles.emptyStateText}>Henüz birlikte kitap okumaya başlamadınız</Text>
                <Button 
                  mode="contained" 
                  icon="plus" 
                  onPress={selectJointBook}
                  style={styles.emptyStateButton}
                >
                  Kitap Seç
                </Button>
              </View>
            )}
          </Surface>
          
          {/* Son Aktiviteler */}
          <Surface style={styles.section}>
            <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
            
            {coupleData.recentActivities.map((activity, index) => (
              <View key={activity.id}>
                <View style={styles.activityItem}>
                  <View style={styles.activityTimeContainer}>
                    <Text style={styles.activityTime}>{formatDate(activity.date)}</Text>
                  </View>
                  
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityPerson}>{activity.personName}</Text>
                      {activity.type === 'PROGRESS' && (
                        <Text style={styles.activityTitle}>
                          <Text style={styles.activityHighlight}>{activity.progress}%</Text> okudu
                        </Text>
                      )}
                      {activity.type === 'NOTE' && (
                        <Text style={styles.activityTitle}>not ekledi</Text>
                      )}
                      <Text style={styles.activityBook}>{activity.bookTitle}</Text>
                    </View>
                    
                    {activity.type === 'NOTE' && activity.note && (
                      <Surface style={styles.noteContent}>
                        <Text style={styles.noteText}>{activity.note}</Text>
                      </Surface>
                    )}
                  </View>
                </View>
                {index < coupleData.recentActivities.length - 1 && <Divider style={styles.activityDivider} />}
              </View>
            ))}
          </Surface>
        </>
      ) : (
        // Partner olmayan durumda
        <Surface style={styles.noPartnerContainer}>
          <View style={styles.noPartnerHeader}>
            <Icon name="account-heart-outline" size={80} color={Colors.primaryLight} />
            <Text style={styles.noPartnerTitle}>Okuma Partneriniz Yok</Text>
            <Text style={styles.noPartnerDescription}>
              Birlikte kitap okumak ve deneyiminizi paylaşmak için bir partnere davet gönderin 
              veya davet kodunu kullanarak bir partnere katılın.
            </Text>
          </View>
          
          {noPartnerData.pendingInvitation ? (
            // Bekleyen davet varsa
            <View style={styles.pendingInvitation}>
              <Text style={styles.pendingTitle}>Bekleyen Davet</Text>
              
              <View style={styles.invitationCard}>
                <Avatar.Image 
                  size={60} 
                  source={{ uri: noPartnerData.pendingInvitation.image }} 
                  style={styles.invitationImage}
                />
                
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationName}>
                    {noPartnerData.pendingInvitation.name}
                  </Text>
                  <Text style={styles.invitationDate}>
                    {formatDate(noPartnerData.pendingInvitation.date)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.invitationButtons}>
                <Button 
                  mode="outlined" 
                  icon="close" 
                  onPress={rejectInvitation}
                  style={[styles.invitationButton, styles.rejectButton]}
                  textColor={Colors.error}
                >
                  Reddet
                </Button>
                
                <Button 
                  mode="contained" 
                  icon="check" 
                  onPress={acceptInvitation}
                  style={styles.invitationButton}
                >
                  Kabul Et
                </Button>
              </View>
            </View>
          ) : (
            // Bekleyen davet yoksa
            <View style={styles.connectOptions}>
              <View style={styles.invitationCode}>
                <Text style={styles.codeLabel}>Davet Kodunuz</Text>
                <Surface style={styles.codeContainer}>
                  <Text style={styles.code}>{noPartnerData.invitationCode}</Text>
                  <Button 
                    icon="content-copy" 
                    mode="text" 
                    onPress={() => {}} 
                    style={styles.copyButton}
                  >
                    Kopyala
                  </Button>
                </Surface>
                <Text style={styles.codeHelp}>
                  Bu kodu partnerinize gönderin ve onlar da bu kodla size bağlanabilir.
                </Text>
              </View>
              
              <Divider style={styles.optionsDivider} />
              
              <View style={styles.connectButtons}>
                <Button 
                  mode="outlined" 
                  icon="account-plus" 
                  onPress={sendInvitation}
                  style={styles.connectButton}
                >
                  Davet Gönder
                </Button>
                
                <Button 
                  mode="contained" 
                  icon="account-arrow-right" 
                  onPress={joinWithCode}
                  style={styles.connectButton}
                >
                  Kod ile Katıl
                </Button>
              </View>
            </View>
          )}
        </Surface>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Çift durumunda stiller
  coupleHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  partnerContainer: {
    position: 'relative',
    marginRight: 16,
  },
  partnerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  activeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.fiction, // yeşil
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messageButton: {
    borderColor: Colors.primary,
    borderRadius: 8,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  viewAllButton: {
    marginVertical: -8,
  },
  viewAllButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
  jointBooksContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  jointBookCard: {
    width: 200,
    marginRight: 16,
    elevation: 2,
  },
  jointBookCover: {
    height: 150,
  },
  jointBookTitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 0,
  },
  jointBookAuthor: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressSection: {
    marginTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    marginBottom: 8,
  },
  addBookCard: {
    width: 200,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  addBookText: {
    marginTop: 8,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    borderRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  activityTimeContainer: {
    width: 70,
    marginRight: 12,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    marginBottom: 6,
  },
  activityPerson: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  activityTitle: {
    fontSize: 14,
    color: Colors.text,
  },
  activityHighlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  activityBook: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noteContent: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  noteText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
  },
  activityDivider: {
    marginVertical: 8,
  },
  
  // Partner olmayan durumda stiller
  noPartnerContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  noPartnerHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  noPartnerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  noPartnerDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  connectOptions: {
    marginTop: 16,
  },
  invitationCode: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 8,
  },
  code: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyButton: {
    marginLeft: 12,
  },
  codeHelp: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  optionsDivider: {
    marginVertical: 24,
  },
  connectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  pendingInvitation: {
    marginTop: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  invitationImage: {
    marginRight: 16,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  invitationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invitationButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  rejectButton: {
    borderColor: Colors.error,
  },
});

export default CoupleScreen; 