import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService, UsernameCheckResponse } from '../services/authService';

interface UsernameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onValidationChange: (isValid: boolean) => void;
  style?: any;
  placeholder?: string;
}

const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChangeText,
  onValidationChange,
  style,
  placeholder = "Kullanıcı adınız"
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [validation, setValidation] = useState<UsernameCheckResponse | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Username format validation
  const validateFormat = (username: string): { valid: boolean; message: string } => {
    if (!username) {
      return { valid: false, message: '' };
    }
    
    if (username.length < 3) {
      return { valid: false, message: 'En az 3 karakter olmalıdır' };
    }
    
    if (username.length > 20) {
      return { valid: false, message: 'En fazla 20 karakter olabilir' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, message: 'Sadece harf, rakam ve _ kullanılabilir' };
    }
    
    return { valid: true, message: '' };
  };

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!value) {
        setValidation(null);
        setShowValidation(false);
        onValidationChange(false);
        return;
      }

      const formatCheck = validateFormat(value);
      if (!formatCheck.valid) {
        setValidation({
          available: false,
          message: formatCheck.message
        });
        setShowValidation(true);
        onValidationChange(false);
        return;
      }

      setIsChecking(true);
      setShowValidation(false);

      try {
        console.log('🔍 Checking username:', value);
        const result = await AuthService.checkUsername(value);
        console.log('✅ Username check result:', result);
        setValidation(result);
        setShowValidation(true);
        onValidationChange(result.available);
      } catch (error) {
        console.error('❌ Username check error:', error);
        setValidation({
          available: false,
          message: 'Kontrol edilemedi'
        });
        setShowValidation(true);
        onValidationChange(false);
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkUsername, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [value, onValidationChange]);

  const handleTextChange = (text: string) => {
    // Sadece küçük harf, rakam ve _ kabul et
    const cleanText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChangeText(cleanText);
  };

  const getValidationColor = () => {
    if (!showValidation || !validation) return '#9CA3AF';
    return validation.available ? '#10B981' : '#EF4444';
  };

  const getValidationIcon = () => {
    if (isChecking) return null;
    if (!showValidation || !validation) return null;
    return validation.available ? 'check-circle' : 'close-circle';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer, { borderColor: getValidationColor() }]}>
        <Text style={styles.atSymbol}>@</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <View style={styles.validationIcon}>
          {isChecking ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : getValidationIcon() ? (
            <MaterialCommunityIcons
              name={getValidationIcon() as any}
              size={20}
              color={getValidationColor()}
            />
          ) : null}
        </View>
      </View>
      
      {showValidation && validation && (
        <Text style={[styles.validationText, { color: getValidationColor() }]}>
          {validation.message}
        </Text>
      )}
      
      <Text style={styles.helpText}>
        3-20 karakter, sadece harf, rakam ve _ kullanılabilir
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderColor: '#E5E7EB',
  },
  atSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  validationIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationText: {
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default UsernameInput; 