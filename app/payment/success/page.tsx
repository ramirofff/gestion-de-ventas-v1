"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('No se encontró ID de sesión');
      setLoading(false);
      return;
    }

    const processPaymentSuccess = async () => {
      try {
        console.log('🔍 Procesando pago exitoso en nueva pestaña:', sessionId);
        
        const response = await fetch('/api/stripe/payment/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            session_id: sessionId 
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Error al verificar el pago');
        }

        const { session_details } = data;
        
        // Construir datos del ticket
        const ticket: TicketData = {
          ticket_id: sessionId,
          total: session_details.amount_total / 100,
          subtotal: session_details.amount_subtotal / 100,
          discount: Math.max(0, (session_details.amount_subtotal - session_details.amount_total) / 100),
          items: session_details.line_items.map((item: any) => ({
            name: item.description || 'Producto',
            price: item.price.unit_amount / 100,
            quantity: item.quantity,
            original_price: item.price.unit_amount / 100
          })),
          customer_email: session_details.customer_email,
          created_at: new Date().toISOString()
        };

        setTicketData(ticket);
        
        // Notificar a la ventana principal (si existe) que el pago fue exitoso
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'STRIPE_PAYMENT_SUCCESS',
              sessionId: sessionId,
              ticketData: ticket
            }, window.location.origin);
            console.log('📤 Mensaje enviado a ventana principal');
          }
        } catch (err) {
          console.warn('⚠️ No se pudo comunicar con ventana principal:', err);
        }
        
      } catch (err) {
        console.error('❌ Error procesando pago:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    // Intentar cerrar la ventana
    if (window.opener) {
      window.close();
    } else {
      // Si no se puede cerrar, redirigir al inicio
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full mx-4">
          <div className="w-12 h-12 text-green-500 mx-auto mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Procesando pago...</h2>
          <p className="text-gray-600">Verificando los detalles de tu compra</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={handleClose}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 print:shadow-none print:max-w-full">
        {/* Header de éxito */}
        <div className="bg-green-500 text-white rounded-t-2xl p-6 text-center print:bg-white print:text-gray-800 print:rounded-none">
          <div className="w-16 h-16 mx-auto mb-4 print:text-green-500 text-6xl">✅</div>
          <h1 className="text-2xl font-bold">¡Pago Exitoso!</h1>
          <p className="text-green-100 print:text-gray-600">Tu compra se procesó correctamente</p>
        </div>

        {/* Ticket */}
        {ticketData && (
          <div className="p-8">
            {/* Info del ticket */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">TICKET DE VENTA</h2>
              <div className="text-lg font-mono text-gray-600">#{ticketData.ticket_id}</div>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(ticketData.created_at).toLocaleString()}
              </div>
              {ticketData.customer_email && (
                <div className="text-sm text-gray-500">
                  {ticketData.customer_email}
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 pb-1 border-b border-gray-200">PRODUCTOS</h3>
              <div className="space-y-2">
                {ticketData.items.map((item, index) => {
                  const itemTotal = item.price * item.quantity;
                  const hasDiscount = item.original_price && item.original_price > item.price;
                  
                  return (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {hasDiscount ? (
                            <>
                              <span className="line-through mr-2">
                                ${item.original_price?.toFixed(2)} x {item.quantity}
                              </span>
                              <span className="text-green-600 font-medium">
                                ${item.price.toFixed(2)} x {item.quantity}
                              </span>
                            </>
                          ) : (
                            `$${item.price.toFixed(2)} x ${item.quantity}`
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-gray-800 ml-4">
                        ${itemTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totales */}
            <div className="border-t-2 border-dashed border-gray-300 pt-4">
              {ticketData.discount > 0 && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-800">${ticketData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 mb-2">
                    <span>Descuento aplicado:</span>
                    <span>-${ticketData.discount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-2xl font-bold border-t pt-2">
                <span className="text-gray-800">TOTAL:</span>
                <span className="text-green-600">${ticketData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-6 space-y-1">
              <div>¡Gracias por tu compra!</div>
              <div>Conserve este ticket como comprobante</div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                Powered by Gestión de Ventas V1
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ✖️ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
