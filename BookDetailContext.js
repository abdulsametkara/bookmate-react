import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

// Create context
const BookDetailContext = createContext();

// Custom hook for using book detail context
export const useBookDetail = () => {
  const context = useContext(BookDetailContext);
  if (!context) {
    throw new Error('useBookDetail must be used within a BookDetailProvider');
  }
  return context;
};

// Provider component
export const BookDetailProvider = ({ children }) => {
  // State
  const [readingStatus, setReadingStatus] = useState('reading-list');
  const [readingProgress, setReadingProgress] = useState(0);

  // Memoized handlers
  const handleStatusChange = useCallback((status) => {
    setReadingStatus(status);
    
    if (status === 'reading') {
      setReadingProgress(0);
    } else if (status === 'completed') {
      setReadingProgress(100);
    }
  }, []);

  const handleReadingProgress = useCallback((increment = 10) => {
    setReadingProgress(prev => {
      const newProgress = Math.min(100, prev + increment);
      return Math.floor(newProgress);
    });
  }, []);

  const handleReadPress = useCallback(() => {
    if (readingStatus === 'reading') {
      handleReadingProgress();
    } else {
      handleStatusChange('reading');
    }
  }, [readingStatus, handleReadingProgress, handleStatusChange]);

  // Memoize value to prevent unnecessary renders
  const value = useMemo(() => ({
    readingStatus,
    readingProgress,
    handleStatusChange,
    handleReadingProgress,
    handleReadPress,
  }), [
    readingStatus,
    readingProgress,
    handleStatusChange,
    handleReadingProgress,
    handleReadPress
  ]);

  return (
    <BookDetailContext.Provider value={value}>
      {children}
    </BookDetailContext.Provider>
  );
}; 