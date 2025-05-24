// Tema renkleri için tiplemeler
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  disabled: string;
  divider: string;
  error: string;
  backdrop: string;
  placeholder: string;
  
  // Kitap kategorileri için renkler
  fiction: string;
  nonFiction: string;
  scienceFiction: string;
  mystery: string;
  romance: string;
  biography: string;
  
  // Diğer olası renkler için genel tanım
  [key: string]: string;
} 