import * as React from "react"

const TOAST_TIMEOUT = 5000

export type Toast = {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback(
    ({ title, description, action }: Omit<Toast, "id">) => {
      setToasts((currentToasts) => {
        const id = Math.random().toString(36).substring(2)
        return [...currentToasts, { id, title, description, action }]
      })
    },
    []
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    )
  }, [])

  React.useEffect(() => {
    const interval = setInterval(() => {
      setToasts((currentToasts) => currentToasts.slice(1))
    }, TOAST_TIMEOUT)

    return () => clearInterval(interval)
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
  }
}