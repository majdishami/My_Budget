import React from 'react';
import { cn } from '../../lib/utils';

// Types for toast
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  onClose?: () => void;
}

// Toast component
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', title, description, onClose, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white border-gray-200',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-md border p-4 shadow-md',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <div className="flex justify-between items-start">
          <div>
            {title && <h3 className="font-medium">{title}</h3>}
            {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

// Toaster container component
export const Toaster: React.FC<{ toasts: any[] }> = ({ toasts = [] }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.type}
          title={toast.title}
          description={toast.description}
          onClose={() => toast.onDismiss?.(toast.id)}
        />
      ))}
    </div>
  );
};