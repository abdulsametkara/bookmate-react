// react-native-paper modül tanımlaması
declare module 'react-native-paper' {
  import { Theme as PaperTheme } from 'react-native-paper/lib/typescript/types';
  
  export const DefaultTheme: PaperTheme;
  export const Provider: any;
  export const Text: any;
  export const Button: any;
  export const TextInput: any;
  export const Surface: any;
  export const ProgressBar: any;
  export const FAB: any;
  export const Dialog: any;
  export const Portal: any;
  export const HelperText: any;
  export const Chip: any;
  export const Divider: any;
  export const List: any;
  export const Avatar: any;
  export const Card: any;
  export const Title: any;
  export const Paragraph: any;
  export const Badge: any;
  export const IconButton: any;
  export const ActivityIndicator: any;
}

// react-native-vector-icons modül tanımlaması
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  export default class Icon extends Component<any, any> {
    static getImageSource: any;
  }
}

// @react-navigation/native modül tanımlaması
declare module '@react-navigation/native' {
  export const useRoute: () => any;
  export const useNavigation: () => any;
}

// Diğer tip tanımlamaları
interface DateTimeFormatOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  [key: string]: any;
} 