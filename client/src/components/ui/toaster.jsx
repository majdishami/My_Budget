
import React from 'react';
import { useToast } from '../../hooks/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 w-full max-w-sm p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md border border-gray-200 bg-white p-4 shadow-md ${
            toast.type === 'error' ? 'border-red-200 bg-red-50' : 
            toast.type === 'success' ? 'border-green-200 bg-green-50' : ''
          }`}
        >
          {toast.title && <h4 className="font-medium">{toast.title}</h4>}
          {toast.description && <p className="text-sm text-gray-500">{toast.description}</p>}
          <button 
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-900"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
