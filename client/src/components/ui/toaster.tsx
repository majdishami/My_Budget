import React from "react";
import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../../components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
import React, { useState, useEffect } from "react";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<any[]>([]);

  // In a real implementation, this would listen for toast events
  // For this simplified version, we're just rendering an empty provider

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, action }) => (
        <Toast key={id} variant={variant}>
          {title}
          {description}
          {action}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
