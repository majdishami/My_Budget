import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "createdAt">) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<Toast>) => void;
};

export type ToasterToast = Omit<Toast, "id"> & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const ToastContext = createContext<ToastContextType | null>(null);

export interface ToastContextProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastContextProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, "id" | "createdAt">) => {
      setToasts((prevToasts) => [
        ...prevToasts,
        {
          ...toast,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        },
      ]);
    },
    [setToasts]
  );

  const removeToast = useCallback(
    (id: string) => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    },
    [setToasts]
  );

  const updateToast = useCallback(
    (id: string, toast: Partial<Toast>) => {
      setToasts((prevToasts) =>
        prevToasts.map((t) => (t.id === id ? { ...t, ...toast } : t))
      );
    },
    [setToasts]
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    updateToast,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return {
    ...context,
    toast: (props: Omit<ToasterToast, "id">) => {
      context.addToast(props);
    },
  };
};

export type { Toast };