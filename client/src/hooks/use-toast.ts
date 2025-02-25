
import { useState } from 'react'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, showToast }
}
