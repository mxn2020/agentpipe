import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be inside ToastProvider')
    return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 5000)
        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

    const icon = toast.type === 'error' ? <AlertCircle size={18} />
        : toast.type === 'success' ? <CheckCircle2 size={18} />
            : <Info size={18} />

    return (
        <div className={`toast toast--${toast.type}`} role="alert">
            <span className="toast__icon">{icon}</span>
            <span className="toast__message">{toast.message}</span>
            <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
                <X size={14} />
            </button>
        </div>
    )
}
