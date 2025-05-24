import React from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  View,
  Platform,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/theme';

interface CustomButtonProps {
  mode?: 'contained' | 'outlined' | 'text';
  onPress?: () => void;
  style?: any;
  labelStyle?: any;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  color?: string;
  children?: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
  mode = 'text',
  onPress,
  style,
  labelStyle,
  disabled = false,
  loading = false,
  icon,
  color,
  children
}) => {
  // Default colors
  const primaryColor = color || Colors.primary || '#007AFF';
  const textColor = mode === 'contained' ? '#FFFFFF' : primaryColor;
  
  // Button style based on mode
  let buttonStyle: any = styles.button;
  if (mode === 'contained') {
    buttonStyle = {...styles.button, ...styles.containedButton, backgroundColor: primaryColor};
  } else if (mode === 'outlined') {
    buttonStyle = {...styles.button, ...styles.outlinedButton, borderColor: primaryColor};
  }
  
  // Handle press event
  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        buttonStyle, 
        disabled ? styles.disabledButton : {},
        style
      ]} 
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} style={styles.icon} />
      ) : icon ? (
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={18} color={textColor} style={styles.icon} />
        </View>
      ) : null}
      
      <Text style={[
        styles.label, 
        { color: textColor },
        disabled ? styles.disabledLabel : {},
        labelStyle
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    minWidth: 64,
  },
  containedButton: {
    backgroundColor: Colors.primary || '#007AFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary || '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledLabel: {
    color: '#9E9E9E',
  },
  iconContainer: {
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
});

export default CustomButton; 