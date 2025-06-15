import React, { createContext, useContext, ReactNode } from 'react';
import { useToast } from '../hooks/useToast';
import CustomToast from '../components/CustomToast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toast, showToast, hideToast, success, error, warning, info } = useToast();

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {toast && (
        <CustomToast
          message={toast.message}
          type={toast.type}
          visible={true}
          onHide={hideToast}
          duration={toast.duration}
        />
      )}
    </ToastContext.Provider>
  );
}; 