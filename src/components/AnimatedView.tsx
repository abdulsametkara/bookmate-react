import React from 'react';
import { Animated, ViewProps } from 'react-native';

interface AnimatedViewProps extends ViewProps {
  children?: React.ReactNode;
}

/**
 * AnimatedView component that wraps Animated.View with proper TypeScript typing
 */
const AnimatedView: React.FC<AnimatedViewProps> = ({ children, style, ...props }) => {
  return (
    <Animated.View style={style} {...props}>
      {children}
    </Animated.View>
  );
};

export default AnimatedView; 