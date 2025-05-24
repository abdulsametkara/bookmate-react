import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar as PaperProgressBar } from 'react-native-paper';

interface CustomProgressBarProps {
  progress: number;
  color?: string;
  style?: any;
}

const CustomProgressBar: React.FC<CustomProgressBarProps> = ({ progress, color, style }) => {
  // Fix precision issue by rounding to 2 decimal places
  const fixedProgress = Math.min(1, Math.max(0, Math.round(progress * 100) / 100));

  return (
    <View style={[styles.container, style]}>
      <PaperProgressBar progress={fixedProgress} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default CustomProgressBar; 