'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ConfettiSuccess } from './ConfettiSuccess';

interface PaymentNotification {
  id: string;
  type: 'qr_payment' | 'direct_payment';
  sessionId: string;
  total: number;
  customerEmail?: string;
  timestamp: Date;
}

interface PaymentNotificationProps {
  onDismiss?: (id: string) => void;
}

export function PaymentNotifications({ onDismiss }: PaymentNotificationProps) {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const { getThemeClass } = useTheme();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'STRIPE_PAYMENT_SUCCESS' && event.data.source === 'qr_payment') {
        const notification: PaymentNotification = {
          id: `payment_${Date.now()}`,
          type: 'qr_payment',
          sessionId: event.data.sessionId,
          total: event.data.ticketData?.total || 0,
          customerEmail: event.data.ticketData?.customer_email,
          timestamp: new Date()
        };

        setNotifications(prev => [...prev, notification]);
        setShowConfetti(true);
        
        // Hide confetti after 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          dismissNotification(notification.id);
        }, 10000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (onDismiss) {
      onDismiss(id);
    }
  };

  return (
    <>
      {showConfetti && <ConfettiSuccess />}
      
      {showConfetti && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-6xl animate-bounce">🎉</div>
          </div>
        </div>
      )}
      
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm rounded-lg shadow-lg border p-4 transform transition-all duration-500 ease-in-out ${getThemeClass({
              dark: 'bg-green-900/20 border-green-700 text-green-300',
              light: 'bg-green-50 border-green-200 text-green-700'
            })}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="text-2xl">
                  {notification.type === 'qr_payment' ? '📱' : '💳'}
                </div>
              </div>
              
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium">
                  🎉 ¡Nuevo Pago Recibido!
                </p>
                <p className="mt-1 text-sm">
                  <strong>${notification.total.toFixed(2)} USD</strong>
                </p>
                {notification.customerEmail && (
                  <p className="mt-1 text-xs opacity-75">
                    De: {notification.customerEmail}
                  </p>
                )}
                <p className="mt-1 text-xs opacity-75">
                  {notification.type === 'qr_payment' 
                    ? '📱 Pagado con código QR' 
                    : '💳 Pago directo'
                  }
                </p>
                <p className="mt-1 text-xs opacity-60">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className={`inline-flex text-sm font-medium transition-colors ${getThemeClass({
                    dark: 'text-green-300 hover:text-green-100',
                    light: 'text-green-600 hover:text-green-800'
                  })}`}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
