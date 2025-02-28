import React from 'react';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export const Toast = ({ title, description, variant = 'default' }: ToastProps) => {
  return (
    <div className={`toast ${variant === 'destructive' ? 'bg-red-500' : 'bg-gray-800'} text-white p-4 rounded shadow-lg`}>
      {title && <h3 className="font-semibold">{title}</h3>}
      {description && <p>{description}</p>}
    </div>
  );
};

// Simple toast function
export const toast = (props: ToastProps) => {
  console.log('Toast:', props);
  // In a real implementation, this would add the toast to a queue
};