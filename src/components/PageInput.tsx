import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';

interface PageInputProps {
  currentPage: number;
  maxPage: number;
  onPageChange: (page: number) => void;
  style?: any;
}

const PageInput: React.FC<PageInputProps> = ({
  currentPage,
  maxPage,
  onPageChange,
  style,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());
  const [longPressActive, setLongPressActive] = useState(false);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const incrementTimer = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(currentPage.toString());
    }
  }, [currentPage, isEditing]);

  const handleIncrement = () => {
    if (currentPage < maxPage) {
      onPageChange(currentPage + 1);
    }
  };

  const handleDecrement = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const startLongPress = (action: 'increment' | 'decrement') => {
    setLongPressActive(true);
    
    // İlk aksiyon
    if (action === 'increment') {
      handleIncrement();
    } else {
      handleDecrement();
    }

    // Animasyon başlat
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Uzun basma timer'ı
    longPressTimer.current = setTimeout(() => {
      startContinuousAction(action);
    }, 500);
  };

  const startContinuousAction = (action: 'increment' | 'decrement') => {
    const performAction = () => {
      if (action === 'increment' && currentPage < maxPage) {
        onPageChange(currentPage + 1);
      } else if (action === 'decrement' && currentPage > 0) {
        onPageChange(currentPage - 1);
      }
    };

    // İlk hızlı tekrar
    incrementTimer.current = setInterval(performAction, 200);
    
    // 2 saniye sonra daha hızlı yap
    setTimeout(() => {
      if (incrementTimer.current) {
        clearInterval(incrementTimer.current);
        incrementTimer.current = setInterval(performAction, 100);
      }
    }, 2000);
  };

  const stopLongPress = () => {
    setLongPressActive(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (incrementTimer.current) {
      clearInterval(incrementTimer.current);
      incrementTimer.current = null;
    }

    // Animasyonu geri al
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleInputSubmit = () => {
    const newPage = parseInt(inputValue, 10);
    if (!isNaN(newPage) && newPage >= 0 && newPage <= maxPage) {
      onPageChange(newPage);
    } else {
      setInputValue(currentPage.toString());
    }
    setIsEditing(false);
  };

  const handleInputCancel = () => {
    setInputValue(currentPage.toString());
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Mevcut Sayfa</Text>
      
      <View style={styles.inputContainer}>
        {/* Azalt butonu */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.decrementButton,
              currentPage <= 0 && styles.disabledButton,
            ]}
            onPressIn={() => startLongPress('decrement')}
            onPressOut={stopLongPress}
            onPress={handleDecrement}
            disabled={currentPage <= 0}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="minus"
              size={20}
              color={currentPage <= 0 ? Colors.textTertiary : Colors.text}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Sayfa girişi */}
        <TouchableOpacity
          style={styles.pageDisplay}
          onPress={startEditing}
          activeOpacity={0.7}
        >
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={styles.pageInput}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleInputSubmit}
              onBlur={handleInputCancel}
              keyboardType="numeric"
              selectTextOnFocus
              maxLength={maxPage.toString().length}
              selection={{ start: 0, end: inputValue.length }}
            />
          ) : (
            <Text style={styles.pageText}>{currentPage}</Text>
          )}
          <Text style={styles.maxPageText}>/ {maxPage}</Text>
        </TouchableOpacity>

        {/* Artır butonu */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.incrementButton,
              currentPage >= maxPage && styles.disabledButton,
            ]}
            onPressIn={() => startLongPress('increment')}
            onPressOut={stopLongPress}
            onPress={handleIncrement}
            disabled={currentPage >= maxPage}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={currentPage >= maxPage ? Colors.textTertiary : Colors.text}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Yardım metni */}
      <Text style={styles.helpText}>
        Sayıya dokunarak yazabilir, butonları basılı tutarak hızlı değiştirebilirsiniz
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  decrementButton: {
    marginRight: Spacing.md,
  },
  incrementButton: {
    marginLeft: Spacing.md,
  },
  disabledButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  pageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  pageInput: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    minWidth: 40,
    padding: 0,
  },
  maxPageText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  helpText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
});

export default PageInput; 