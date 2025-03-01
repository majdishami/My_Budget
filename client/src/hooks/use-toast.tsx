<<<<<<< HEAD
import { useState, useEffect } from 'react';

export type ToastType = 'default' | 'success' | 'warning' | 'error' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  duration?: number;
  position?: ToastPosition;
  onDismiss?: () => void;
}

interface ToastAction {
  type: 'ADD_TOAST' | 'REMOVE_TOAST' | 'UPDATE_TOAST';
  toast: Toast;
}

interface ToastState {
  toasts: Toast[];
}

// Generate unique ID for toasts
const generateUniqueId = () => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default toast settings
const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
const DEFAULT_TOAST_POSITION: ToastPosition = 'top-right';

const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  // Add a new toast
  const toast = (props: Omit<Toast, 'id'>) => {
    const id = generateUniqueId();
    const toast: Toast = {
      id,
      type: 'default',
      duration: DEFAULT_TOAST_DURATION,
      position: DEFAULT_TOAST_POSITION,
      ...props,
    };

    setState((prevState) => ({
      toasts: [...prevState.toasts, toast],
    }));

    return id;
  };

  // Remove a toast by ID
  const dismiss = (id: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((toast) => toast.id !== id),
    }));
  };

  // Convenience methods for different toast types
  const success = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'success' });
  const warning = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'warning' });
  const error = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'error' });
  const info = (props: Omit<Toast, 'id' | 'type'>) => toast({ ...props, type: 'info' });

  // Auto-dismiss toasts based on their duration
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    state.toasts.forEach((toast) => {
      if (toast.duration && toast.duration > 0) {
        const timeout = setTimeout(() => {
          dismiss(toast.id);
          // Call onDismiss if provided
          if (toast.onDismiss) {
            toast.onDismiss();
          }
        }, toast.duration);

        timeouts.push(timeout);
      }
    });

    // Clean up timeouts
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [state.toasts]);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    success,
    warning,
    error,
    info,
  };
};

export { useToast };
=======
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 3 // Limit number of toasts
const TOAST_REMOVE_DELAY = 5000 // 5 seconds

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Clear existing timeout
      if (toastId && toastTimeouts.has(toastId)) {
        clearTimeout(toastTimeouts.get(toastId))
        toastTimeouts.delete(toastId)
      }

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
>>>>>>> a01ac073900f62162a97a032d9aa4f896c838032
