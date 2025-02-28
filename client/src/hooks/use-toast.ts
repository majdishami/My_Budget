import React from 'react';

// Define interfaces
interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// Create a simple toast function
const toast = (props: ToastProps) => {
  console.log('Toast:', props);
  // In a real implementation, this would show a toast notification
};

export function useToast() {
  return { toast };
}

export type { ToastProps };