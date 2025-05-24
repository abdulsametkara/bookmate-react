import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppSelector } from '../store';
import UserManager from '../utils/userManager';
import { LightTheme, DarkTheme } from '../theme/theme';

type Theme = typeof LightTheme;
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const currentUserId = useAppSelector((state) => state.books.currentUserId);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isDark, setIsDark] = useState(false);

  // Load user theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      if (currentUserId) {
        try {
          const user = await UserManager.getUserById(currentUserId);
          if (user?.preferences?.theme) {
            const userTheme = user.preferences.theme as ThemeMode;
            setThemeModeState(userTheme);
            
            // For now, system theme defaults to light
            if (userTheme === 'system') {
              setIsDark(false);
            } else {
              setIsDark(userTheme === 'dark');
            }
          }
        } catch (error) {
          console.error('Error loading theme preference:', error);
        }
      }
    };

    loadThemePreference();
  }, [currentUserId]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    
    // Save to user preferences
    if (currentUserId) {
      try {
        const user = await UserManager.getUserById(currentUserId);
        if (user) {
          const updatedUser = {
            ...user,
            preferences: {
              ...user.preferences,
              theme: mode,
            },
            updatedAt: new Date().toISOString(),
          };
          await UserManager.updateUser(updatedUser);
        }
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }

    // Update dark mode state
    if (mode === 'system') {
      // For now, system defaults to light
      setIsDark(false);
    } else {
      setIsDark(mode === 'dark');
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const theme = isDark ? DarkTheme : LightTheme;

  const value: ThemeContextType = {
    theme,
    themeMode,
    isDark,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 