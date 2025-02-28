import { useContext } from 'react';
import { toast as toastFunction } from '../lib/utils';

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

export function useToast() {
  const toast = (props: ToastProps) => {
    toastFunction(props);
  };

  return { toast };
}