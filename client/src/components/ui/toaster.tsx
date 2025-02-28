
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";
import React, { useEffect, useState } from "react";

export function Toaster() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-0 right-0 z-[100] flex flex-col items-end gap-2 p-4 max-h-screen overflow-hidden">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          action={toast.action}
          variant={toast.variant}
          className="animate-slide-in-right"
          onMouseDown={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
