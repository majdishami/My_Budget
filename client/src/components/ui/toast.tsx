import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof ToastVariants> & {
    title?: string;
    description?: string;
    duration?: number;
    onClose?: () => void;
  };

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(ToastVariants({ variant }), className)}
        {...props}
      >
        <div className="grid gap-1">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

// Toast function
const toasts: ToastProps[] = [];
let listeners: ((toasts: ToastProps[]) => void)[] = [];

const createToastId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export function toast(props: ToastProps) {
  const id = props.id || createToastId();
  const toast = { ...props, id };
  toasts.push(toast);

  // Remove toast after duration
  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
      emitChange();
    }
  }, props.duration || 3000);

  emitChange();
  return id;
}

function emitChange() {
  listeners.forEach(listener => {
    listener([...toasts]);
  });
}

export function useToasts() {
  const [toastList, setToasts] = React.useState<ToastProps[]>(toasts);

  React.useEffect(() => {
    function handleToastsChange(newToasts: ToastProps[]) {
      setToasts(newToasts);
    }

    listeners.push(handleToastsChange);

    return () => {
      listeners = listeners.filter(listener => listener !== handleToastsChange);
    };
  }, []);

  return toastList;
}

export { Toast, ToastVariants };