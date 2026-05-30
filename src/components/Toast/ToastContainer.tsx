'use client';

import { useToast } from '@/hooks/useToast';

const ICONS: Record<string, string> = {
  success: '✅',
  error: '⚠️',
  warning: '⚡',
  info: 'ℹ️',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toastContainer">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div className="toastBody">
            <span className="toastIcon">{ICONS[toast.type] || 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
          <button
            className="toastClose"
            onClick={() => dismissToast(toast.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
