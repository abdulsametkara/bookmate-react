import 'react-native';

declare module 'react-native' {
  namespace Animated {
    // Add proper type definitions for Animated.View
    export interface AnimatedProps {
      style?: any;
      children?: React.ReactNode;
      [key: string]: any;
    }
    
    export class View extends React.Component<AnimatedProps> {}
  }
} 