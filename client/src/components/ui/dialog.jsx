
import React from 'react';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {children}
      </div>
    </div>
  );
}

export function DialogTrigger({ children, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center">
      {children}
    </button>
  );
}

export function DialogContent({ children }) {
  return <div className="mt-4">{children}</div>;
}

export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-medium">{children}</h2>;
}

export function DialogDescription({ children }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

export function DialogFooter({ children }) {
  return <div className="mt-6 flex justify-end space-x-2">{children}</div>;
}

export function DialogClose({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}
