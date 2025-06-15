import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import OpenAIService from '../services/openaiService';

interface AIStatusIndicatorProps {
  style?: any;
  onPress?: () => void;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ style, onPress }) => {
  const [status, setStatus] = useState<{
    status: 'connected' | 'error' | 'demo' | 'checking';
    message: string;
  }>({ status: 'checking', message: 'AI durumu kontrol ediliyor...' });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const result = await OpenAIService.checkAPIStatus();
      setStatus(result);
    } catch (error) {
      setStatus({
        status: 'error',
        message: 'AI durumu kontrol edilemedi'
      });
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return '#10B981'; // Yeşil
      case 'demo':
        return '#F59E0B'; // Sarı
      case 'error':
        return '#EF4444'; // Kırmızı
      case 'checking':
        return '#6B7280'; // Gri
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return 'check-circle';
      case 'demo':
        return 'information';
      case 'error':
        return 'alert-circle';
      case 'checking':
        return 'loading';
      default:
        return 'help-circle';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress || checkStatus}
      activeOpacity={0.7}
    >
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        <MaterialCommunityIcons
          name={getStatusIcon()}
          size={16}
          color="white"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.statusText}>
          {status.status === 'connected' && 'AI Aktif'}
          {status.status === 'demo' && 'Demo Modu'}
          {status.status === 'error' && 'AI Hatası'}
          {status.status === 'checking' && 'Kontrol Ediliyor'}
        </Text>
        <Text style={styles.messageText} numberOfLines={1}>
          {status.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default AIStatusIndicator; 