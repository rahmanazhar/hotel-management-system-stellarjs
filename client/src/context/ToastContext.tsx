import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  removing?: boolean;
}

interface ToastApi {
  success: (message: string, title?: string) => void;
  error:   (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info:    (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error:   <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
  info:    'Info',
};

const DURATION = 4000;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, DURATION);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div className={`toast toast-${toast.type}${toast.removing ? ' toast-removing' : ''}`}>
      <div className="toast-icon">{ICONS[toast.type]}</div>
      <div className="toast-body">
        <div className="toast-title">{toast.title || DEFAULT_TITLES[toast.type]}</div>
        <div className="toast-msg">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={onRemove} aria-label="Dismiss">
        <X size={14} />
      </button>
      <div className="toast-progress" />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, message, type, title }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api: ToastApi = {
    success: (msg, title) => addToast('success', msg, title),
    error:   (msg, title) => addToast('error',   msg, title),
    warning: (msg, title) => addToast('warning', msg, title),
    info:    (msg, title) => addToast('info',    msg, title),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-portal">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
