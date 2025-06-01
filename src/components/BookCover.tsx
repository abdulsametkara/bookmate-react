import React, { useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

interface BookCoverProps {
  coverURL?: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const BookCover: React.FC<BookCoverProps> = ({
  coverURL,
  title = '',
  size = 'medium',
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 60, height: 90 };
      case 'large':
        return { width: 120, height: 180 };
      default:
        return { width: 80, height: 120 };
    }
  };

  const sizeStyle = getSizeStyle();

  // Fallback placeholder
  const renderPlaceholder = () => (
    <View style={[styles.placeholder, sizeStyle, style]}>
      <MaterialCommunityIcons
        name="book"
        size={size === 'small' ? 24 : size === 'large' ? 48 : 32}
        color={Colors.textTertiary}
      />
      {title && (
        <Text
          style={[
            styles.placeholderText,
            { fontSize: size === 'small' ? 8 : size === 'large' ? 12 : 10 }
          ]}
          numberOfLines={3}
        >
          {title}
        </Text>
      )}
    </View>
  );

  // Eğer URL yoksa veya hata varsa placeholder göster
  if (!coverURL || imageError) {
    return renderPlaceholder();
  }

  return (
    <View style={[sizeStyle, style]}>
      <Image
        source={{ 
          uri: coverURL,
          // Cache policy for better performance
          cache: 'force-cache',
        }}
        style={[styles.image, sizeStyle]}
        onError={() => {
          console.log('Image load error for:', coverURL);
          setImageError(true);
          setImageLoading(false);
        }}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
        resizeMode="cover"
        // Fallback için default source ekleyebiliriz
        defaultSource={require('../../assets/book-placeholder.png')}
      />
      
      {/* Loading indicator */}
      {imageLoading && !imageError && (
        <View style={[styles.loadingOverlay, sizeStyle]}>
          <MaterialCommunityIcons
            name="loading"
            size={size === 'small' ? 16 : size === 'large' ? 32 : 24}
            color={Colors.primary}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  placeholder: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
});

export default BookCover; 