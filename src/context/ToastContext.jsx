import { useCallback, useMemo, useState } from 'react';
import { RiCloseLine, RiErrorWarningLine, RiCheckboxCircleLine, RiInformationLine } from 'react-icons/ri';

import { ToastContext } from './ToastContextBase';

const TOAST_TTL = 4200;

const variantStyles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  info: 'border-zinc-700 bg-zinc-900 text-zinc-100',
};

const variantIcon = {
  success: RiCheckboxCircleLine,
  error: RiErrorWarningLine,
  warning: RiErrorWarningLine,
  info: RiInformationLine,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, variant = 'info') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => removeToast(id), TOAST_TTL);
  }, [removeToast]);

  const api = useMemo(() => ({
    success: (message) => pushToast(message, 'success'),
    error: (message) => pushToast(message, 'error'),
    warning: (message) => pushToast(message, 'warning'),
    info: (message) => pushToast(message, 'info'),
  }), [pushToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[200] top-3 right-3 sm:top-5 sm:right-5 w-[min(92vw,360px)] space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = variantIcon[toast.variant] || RiInformationLine;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-3 py-3 shadow-2xl backdrop-blur-md ${variantStyles[toast.variant] || variantStyles.info}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 shrink-0" size={16} />
                <p className="text-xs leading-relaxed font-semibold flex-1">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-current/80 hover:text-current"
                  aria-label="Close notification"
                >
                  <RiCloseLine size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
