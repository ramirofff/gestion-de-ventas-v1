import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 text-white ${
      type === 'success' ? 'bg-green-600' : 
      type === 'warning' ? 'bg-yellow-600' : 
      'bg-red-600'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
       type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : 
       <XCircle className="w-6 h-6" />}
      <span className="font-medium">{message}</span>
    </div>
  );
}
