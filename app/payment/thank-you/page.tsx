"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TicketPreview } from '../../../components/TicketPreview';

interface TicketData {
  ticket_id: string;
  total: number;
  subtotal: number;
  discount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    original_price?: number;
  }>;
  customer_email?: string;
  created_at: string;
}

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('No se encontró información del pago');
      setLoading(false);
      return;
    }

    const processPayment = async () => {
      try {
        console.log('🔍 Procesando pago completado para comprador:', sessionId);
        
        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            session_id: sessionId 
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          if (data.payment_status && data.payment_status !== 'paid') {
            // Pago aún no completado, redirigir
            setTimeout(() => processPayment(), 2000);
            return;
          }
          throw new Error(data.error || 'Error al verificar el pago');
        }

        // Construir datos del ticket
        const items = data.cart_data.map((item: any) => ({
          name: item.name || 'Producto',
          price: item.price || 0,
          quantity: item.quantity || 1,
          original_price: item.original_price || item.price || 0
        }));

        // Calcular subtotal y descuento
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.original_price * item.quantity), 0);
        const discountAmount = subtotal - data.total;

        const ticket: TicketData = {
          ticket_id: sessionId,
          total: data.total,
          subtotal: subtotal,
          discount: discountAmount > 0 ? discountAmount : 0,
          items: items,
          customer_email: data.customer_email,
          created_at: new Date().toISOString()
        };

        setTicketData(ticket);
        
        // Notificar al vendedor que hay una venta completada
        try {
          await fetch('/api/notifications/payment-completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              ticket_data: ticket,
              notification_type: 'qr_payment_completed'
            })
          });

          // También notificar si hay una ventana padre (vendedor)
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'STRIPE_PAYMENT_SUCCESS',
                sessionId: sessionId,
                ticketData: ticket,
                source: 'qr_payment'
              }, '*');
              console.log('📤 Notificación enviada al vendedor');
            }
          } catch (messageError) {
            console.warn('⚠️ No se pudo notificar al vendedor:', messageError);
          }
        } catch (notificationError) {
          console.warn('⚠️ No se pudo enviar notificación al vendedor:', notificationError);
        }
        
      } catch (err) {
        console.error('❌ Error procesando pago:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Procesando tu pago...
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Por favor espera mientras confirmamos tu transacción
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error en el Pago
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.close()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Mensaje de agradecimiento */}
        <div className="text-center mb-8">
          <div className="text-green-500 text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ¡Gracias por tu compra!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Tu pago se ha procesado exitosamente
          </p>
          <div className="inline-block bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mt-4">
            ✅ Pago confirmado
          </div>
        </div>

        {/* Ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white p-4 text-center">
            <h2 className="text-xl font-bold">📄 Comprobante de Compra</h2>
            <p className="text-blue-200 text-sm mt-1">
              ID: {ticketData.ticket_id.slice(-8)}
            </p>
          </div>
          
          <div className="p-6">
            {/* Mostrar detalles de la compra */}
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📄 Detalles de la Compra
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fecha: {new Date(ticketData.created_at).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Productos:</h4>
                {ticketData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-2">
                {ticketData.discount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                      <span>Subtotal:</span>
                      <span>${ticketData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <span>Descuento aplicado:</span>
                      <span>-${ticketData.discount.toFixed(2)}</span>
                    </div>
                    <hr className="border-gray-200 dark:border-gray-600" />
                  </>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>${ticketData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                🖨️ Imprimir Comprobante
              </button>
              <button
                onClick={() => {
                  // Notificar a la ventana padre antes de cerrar
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage({
                        type: 'STRIPE_PAYMENT_COMPLETE_CLOSE',
                        action: 'reload_products',
                        sessionId: ticketData.ticket_id
                      }, '*');
                    }
                  } catch (e) {
                    console.warn('No se pudo notificar cierre a ventana padre');
                  }
                  window.close();
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                ✓ Cerrar
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 Guarda este comprobante para tus registros
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
