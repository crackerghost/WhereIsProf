import { useContext } from 'react';
import { ToastContext } from '../context/ToastContextBase';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  return (
    ctx || {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  );
};
