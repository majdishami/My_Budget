import React from "react";
import { Toast, useToasts } from "./toast";

export function Toaster() {
  const toasts = useToasts();

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col items-end gap-2 p-4 max-h-screen overflow-hidden">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => {
            // Remove toast is handled in toast.tsx
          }}
        />
      ))}
    </div>
  );
}