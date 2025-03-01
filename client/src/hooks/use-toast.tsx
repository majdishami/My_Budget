import { useState, useEffect } from 'react';

export type ToastType = 'default' | 'success' | 'warning' | 'error' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  duration?: number;
  position?: ToastPosition;
  onDismiss?: () => void;
}

interface ToastAction {
  type: 'ADD_TOAST' | 'REMOVE_TOAST' | 'UPDATE_TOAST';
  toast: Toast;
}

interface ToastState {
  toasts: Toast[];
}

// Generate unique ID for toasts
const generateUniqueId = () => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default toast settings
const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
const DEFAULT_TOAST_POSITION: ToastPosition = 'top-right';

const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  // Add a new toast
  const toast = (props: Omit<Toast, 'id'>) => {
    const id = generateUniqueId();
    const toast: Toast = {
      id,
      type: 'default',
      duration: DEFAULT_TOAST_DURATION,
      position: DEFAULT_TOAST_POSITION,
      ...props,
    };

    setState((prevState) => ({
      toasts: [...prevState.toasts, toast],
    }));

    return id;
  };

  // Remove a toast by ID
  const dismiss = (id: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((toast) => toast.id !== id),
    }));
  };

  // Convenience methods for different toast types
  const success = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'success' });
  const warning = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'warning' });
  const error = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'error' });
  const info = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'info' });

  // Auto-dismiss toasts based on their duration
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    state.toasts.forEach((toast) => {
      if (toast.duration && toast.duration > 0) {
        const timeout = setTimeout(() => {
          dismiss(toast.id);
          // Call onDismiss if provided
          if (toast.onDismiss) {
            toast.onDismiss();
          }
        }, toast.duration);

        timeouts.push(timeout);
      }
    });

    // Clean up timeouts
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [state.toasts]);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    success,
    warning,
    error,
    info,
  };
};

export { useToast };