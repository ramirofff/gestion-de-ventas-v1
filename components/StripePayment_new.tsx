import { useState, useEffect, useCallback } from 'react';
import { QRDisplay } from './QRDisplay';
import { ClientAccount } from '../lib/client-accounts';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';

interface StripePaymentProps {
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
  onClose?: () => void;
  onSuccess?: (sessionId: string) => void;
  selectedClient?: ClientAccount | null;
}

export function StripePayment({ amount, originalAmount, discountAmount, items, onClose, onSuccess, selectedClient }: StripePaymentProps) {
  // Cerrar modal al hacer clic fuera
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };
  const subtotal = Array.isArray(items) ? items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) : 0;
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(true);
  // Cerrar modal con ESC o clic fuera
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [paymentMode, setPaymentMode] = useState<'selection' | 'processing'>('processing');
  const [isProcessed, setIsProcessed] = useState(false); // Control para evitar múltiples procesamientos
  const { theme, getThemeClass } = useTheme();

  // Función para iniciar el polling de pagos (memoizada)
  const startPaymentPolling = useCallback((sessionId: string) => {
    if (isPolling) {
      console.log('⚠️ Polling ya está activo');
      return;
    }
    console.log('🔄 Iniciando polling para sesión:', sessionId);
    setIsPolling(true);
  }, [isPolling]);

  // Función para crear el enlace de pago (memoizada para evitar dependencias circulares)
  const createPaymentLink = useCallback(async () => {
    if (!currentUser) {
      setError('Debes iniciar sesión para realizar pagos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 StripePayment: Iniciando creación de enlace...');
      
      const paymentData = {
        amount: amount,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        currency: 'usd',
        description: `Venta - ${items.length} producto(s)`,
        customer_email: selectedClient?.email,
        user_email: currentUser.email
      };

      const statusResponse = await fetch('/api/stripe-connect/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      const statusData = await statusResponse.json();
      
      if (!statusData.connected) {
        throw new Error('No tienes una cuenta Stripe Connect configurada');
      }

      console.log('📤 Procesando pago con Stripe Connect:', statusData.account.id);

      const response = await fetch('/api/stripe-connect/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userEmail: currentUser.email,
          connectedAccountId: statusData.account.id,
          amount: paymentData.amount,
          productName: paymentData.description,
          customerEmail: paymentData.customer_email,
          commissionRate: 0.05,
          currency: paymentData.currency || 'usd',
          isQRPayment: true, // Siempre QR
          cartData: items
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear enlace de pago');
      }

      console.log('✅ Enlace de pago creado exitosamente');
      console.log('📦 Datos recibidos:', data);
      console.log('🔗 Payment URL:', data.payment_url);
      
      setPaymentUrl(data.payment_url);
      setSessionId(data.session_id);

      // Iniciar polling automáticamente para QR
      if (data.session_id && !isPolling) {
        console.log('🚀 Iniciando polling automáticamente después de crear enlace...');
        setIsPolling(true);
        startPaymentPolling(data.session_id);
      }

    } catch (err: unknown) {
      console.error('❌ Error creating payment link:', err);
      setError((err as Error).message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  }, [currentUser, amount, originalAmount, discountAmount, items, selectedClient, isPolling, startPaymentPolling]);

  // Iniciar automáticamente el flujo con QR (sin opción de enlace directo) solo cuando haya usuario
  useEffect(() => {
    if (paymentMode === 'processing' && !paymentUrl && !loading && currentUser && !error) {
      setShowQR(true);
      // Pequeño delay para asegurar que el estado se actualizó
      const timeoutId = setTimeout(() => {
        createPaymentLink();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [paymentMode, paymentUrl, loading, currentUser, error, createPaymentLink]);

  // Limpiar error de autenticación cuando el usuario esté disponible
  useEffect(() => {
    if (currentUser && error === 'Debes iniciar sesión para realizar pagos') {
      setError(null);
    }
  }, [currentUser, error]);

  // Obtener usuario autenticado
  useEffect(() => {
    const getUser = async () => {
      try {
        console.log('🔍 StripePayment: Obteniendo usuario autenticado...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          setCurrentUser(null);
          return;
        }

        if (session?.user) {
          console.log('✅ Usuario autenticado encontrado:', session.user.email, '(ID:', session.user.id, ')');
          setCurrentUser(session.user);
        } else {
          console.warn('⚠️ No hay usuario autenticado');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ Error en getUser:', error);
        setCurrentUser(null);
      }
    };

    getUser();
  }, []);

  // Listener para mensajes de la ventana de pago
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'STRIPE_PAYMENT_SUCCESS') {
        console.log('🎉 Mensaje de éxito recibido de ventana de pago:', event.data);
        setPaymentStatus('completed');
        setIsPolling(false);
        
        if (onSuccess && event.data.sessionId && !isProcessed) {
          setIsProcessed(true);
          onSuccess(event.data.sessionId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess]);

  // Función para verificar el estado del pago
  const checkPaymentStatus = async (sessionId: string) => {
    try {
      console.log('🔍 Verificando pago con endpoint del servidor...');
      
      const verifyResponse = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          session_id: sessionId,
          user_id: currentUser?.id 
        }),
      });

      if (!verifyResponse.ok) {
        console.error('❌ Error en respuesta del servidor:', verifyResponse.status);
        return false;
      }

      const verifyData = await verifyResponse.json();
      
      if (verifyData.success && verifyData.payment_verified) {
        console.log('✅ Pago verificado exitosamente');
        setPaymentStatus('completed');
        setIsPolling(false);
        
        // Si es un pago QR, enviar evento personalizado y actualizar comisión
        if (showQR && !isProcessed) {
          console.log('🎫 Pago QR completado - Enviando evento personalizado...');
          setIsProcessed(true); // Marcar como procesado inmediatamente
          setTimeout(() => {
            const qrEvent = new CustomEvent('qr-payment-completed', {
              detail: {
                type: 'QR_PAYMENT_COMPLETED',
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                source: 'qr_payment_direct'
              }
            });
            window.dispatchEvent(qrEvent);
            console.log('✅ Evento QR personalizado enviado exitosamente');
          }, 500);

          // Llamar al endpoint para actualizar la comisión
          if (currentUser && sessionId && amount) {
            fetch('/api/stripe-connect/process-commission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.id,
                saleAmount: amount,
                customerEmail: currentUser.email,
                stripeSessionId: sessionId
              })
            })
              .then(res => res.json())
              .then(data => {
                console.log('✅ Comisión QR actualizada:', data);
              })
              .catch(err => {
                console.error('❌ Error actualizando comisión QR:', err);
              });
          }
        } else if (showQR && isProcessed) {
          console.log('⚠️ Pago QR ya procesado, evitando evento duplicado');
        } else {
          // Para pagos Link, procesar normalmente
          if (onSuccess && !isProcessed) {
            setIsProcessed(true);
            setTimeout(() => onSuccess(sessionId), 1500);
          }
        }
        return true;
      } else {
        console.log('⏳ Pago aún no completado, continuando polling...');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando pago:', error);
      return false;
    }
  };

  // Polling para verificar el estado del pago cada 3 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPolling && sessionId) {
      console.log('🔄 Iniciando polling para sesión:', sessionId);
      interval = setInterval(async () => {
        const paymentCompleted = await checkPaymentStatus(sessionId);
        if (paymentCompleted) {
          console.log('✅ Polling terminado - pago completado');
          setIsPolling(false);
          if (interval) clearInterval(interval);
        }
      }, 3000);
    }

    return () => {
      if (interval) {
        console.log('🧹 Limpiando interval de polling');
        clearInterval(interval);
      }
    };
  }, [isPolling, sessionId, currentUser, onSuccess]);

  // Función para manejar la selección de método de pago
  const handlePaymentMethodSelection = (method: 'qr' | 'link') => {
    setShowQR(true);
    setPaymentMode('processing');
    createPaymentLink();
  };

  const handlePaymentClick = () => {
    if (paymentUrl) {
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!paymentWindow) {
        console.warn('⚠️ No se pudo abrir la ventana de pago - posible bloqueo de popups');
        alert('Por favor permite popups para abrir el pago');
      }
      
      if (sessionId && !isPolling) {
        console.log('🚀 Iniciando polling después de abrir Stripe...');
        setIsPolling(true);
      }
    } else {
      createPaymentLink();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${getThemeClass({dark: 'bg-black/50', light: 'bg-black/50'})}`}
      onClick={handleBackdropClick}
      tabIndex={-1}
    >
      <div className={`rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto ${getThemeClass({
        dark: 'bg-zinc-900 text-white',
        light: 'bg-white text-gray-900'
      })}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex justify-between items-start p-6 border-b ${getThemeClass({dark: 'border-zinc-700', light: 'border-gray-200'})}`}>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-3 ${getThemeClass({dark: 'text-white', light: 'text-gray-900'})}`}>
              💳 Pagar con Stripe
            </h2>
            {currentUser && currentUser.email && (
              <div className={`p-3 rounded-lg border text-sm ${getThemeClass({
                dark: 'bg-blue-900/20 border-blue-700 text-blue-300',
                light: 'bg-blue-50 border-blue-200 text-blue-700'
              })}`}>
                <p className="font-medium">
                  <strong>Cliente:</strong> {currentUser.email}
                </p>
                <p className="text-xs mt-1 opacity-75">
                  Este email se usará automáticamente en Stripe
                </p>
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`text-2xl p-2 rounded-lg transition-colors ml-4 ${getThemeClass({
                dark: 'text-gray-400 hover:text-white hover:bg-zinc-800',
                light: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              })}`}
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Resumen de compra */}
          <div className={`rounded-xl p-4 mb-6 border ${getThemeClass({
            dark: 'bg-zinc-800 border-zinc-700',
            light: 'bg-gray-50 border-gray-200'
          })}`}>
            <h3 className={`text-lg font-semibold mb-3 ${getThemeClass({dark: 'text-white', light: 'text-gray-900'})}`}>
              🛒 Resumen de compra
            </h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className={`flex-1 ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                    {item.name} x{item.quantity}
                  </span>
                  <span className={getThemeClass({dark: 'text-white', light: 'text-gray-900'})}>
                    ${(item.price * item.quantity).toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
              <div className="flex justify-between pt-2 mt-2">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {Number(discountAmount) > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento:</span>
                  <span>- ${Number(discountAmount).toFixed(2)}</span>
                </div>
              )}
            <hr className={`my-3 ${getThemeClass({dark: 'border-zinc-600', light: 'border-gray-300'})}`} />
            <div className="flex justify-between items-center text-xl font-bold">
              <span className={getThemeClass({dark: 'text-white', light: 'text-gray-900'})}>Total:</span>
              <span className="text-green-500">${amount.toLocaleString('en-US')} USD</span>
            </div>
          </div>

          {/* Estado de autenticación */}
          {currentUser === null && (
            <div className={`rounded-lg p-4 mb-4 border ${getThemeClass({
              dark: 'bg-red-900/20 border-red-700 text-red-300',
              light: 'bg-red-50 border-red-200 text-red-700'
            })}`}>
              <strong>⚠️ Atención:</strong> Debes iniciar sesión para realizar pagos.
            </div>
          )}

          {/* Estado del error */}
          {error && (
            <div className={`rounded-lg p-4 mb-4 border ${getThemeClass({
              dark: 'bg-red-900/20 border-red-700 text-red-300',
              light: 'bg-red-50 border-red-200 text-red-700'
            })}`}>
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {/* Mostrar selección de método de pago o enlace generado */}
          {paymentMode === 'selection' ? (
            // MODO SELECCIÓN: Mostrar opciones de pago
            <div className={`rounded-xl p-6 mb-4 border ${getThemeClass({
              dark: 'bg-blue-900/20 border-blue-700',
              light: 'bg-blue-50 border-blue-200'
            })}`}>
              <h3 className={`text-lg font-semibold mb-3 text-center ${getThemeClass({dark: 'text-blue-300', light: 'text-blue-700'})}`}>
                💳 Elige tu método de pago
              </h3>
              <p className={`text-sm mb-6 text-center ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                Selecciona cómo prefieres realizar el pago
              </p>

              {/* Botones de selección */}
              <div className="space-y-3">
                <button
                  onClick={() => handlePaymentMethodSelection('qr')}
                  disabled={loading || !currentUser}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    (loading || !currentUser)
                      ? 'opacity-50 cursor-not-allowed border-gray-300'
                      : getThemeClass({
                          dark: 'border-blue-600 bg-blue-900/10 hover:bg-blue-900/20 text-blue-300 hover:border-blue-500',
                          light: 'border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:border-blue-500'
                        })
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div className="text-left">
                      <div className="font-semibold">Código QR</div>
                      <div className="text-sm opacity-75">Escanea con tu celular</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handlePaymentMethodSelection('link')}
                  disabled={loading || !currentUser}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    (loading || !currentUser)
                      ? 'opacity-50 cursor-not-allowed border-gray-300'
                      : getThemeClass({
                          dark: 'border-green-600 bg-green-900/10 hover:bg-green-900/20 text-green-300 hover:border-green-500',
                          light: 'border-green-600 bg-green-50 hover:bg-green-100 text-green-700 hover:border-green-500'
                        })
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div className="text-left">
                      <div className="font-semibold">Enlace Directo</div>
                      <div className="text-sm opacity-75">Abre Stripe en nueva pestaña</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Botón cancelar en modo selección */}
              <button
                onClick={onClose}
                className={`w-full mt-4 py-2 px-4 rounded-lg border transition-colors ${getThemeClass({
                  dark: 'border-gray-600 text-gray-400 hover:bg-gray-800',
                  light: 'border-gray-300 text-gray-600 hover:bg-gray-50'
                })}`}
              >
                ← Cancelar
              </button>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className={`text-sm ${getThemeClass({dark: 'text-blue-300', light: 'text-blue-600'})}`}>
                    Generando enlace de pago...
                  </span>
                </div>
              )}
            </div>
          ) : (
            // MODO PROCESAMIENTO: Mostrar QR o enlace generado
            paymentUrl && (
              <div className={`rounded-xl p-4 mb-4 border ${getThemeClass({
                dark: 'bg-green-900/20 border-green-700',
                light: 'bg-green-50 border-green-200'
              })}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${getThemeClass({dark: 'text-green-300', light: 'text-green-700'})}`}>
                    ✅ {showQR ? 'Código QR listo' : 'Enlace de pago listo'}
                  </h3>
                  <button
                    onClick={() => {
                      setPaymentMode('selection');
                      setPaymentUrl(null);
                      setSessionId(null);
                      setIsPolling(false);
                      setError(null);
                    }}
                    className={`text-sm px-3 py-1 rounded transition-colors ${getThemeClass({
                      dark: 'bg-zinc-700 text-gray-300 hover:bg-zinc-600',
                      light: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    })}`}
                  >
                    ← Cambiar método
                  </button>
                </div>

                {/* Mostrar QR o Link según selección */}
                {showQR ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`inline-block p-4 rounded-xl ${getThemeClass({dark: 'bg-white', light: 'bg-white'})}`} style={{zIndex: 1}}>
                      <QRDisplay 
                        value={paymentUrl || ''}
                        size={200}
                      />
                    </div>
                    <p className={`mt-3 text-sm ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                      📱 Escanea el código QR para pagar con tarjeta internacional
                    </p>
                    {/* Estado del polling */}
                    {isPolling && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className={`text-sm ${getThemeClass({dark: 'text-blue-300', light: 'text-blue-600'})}`}>
                          Esperando el pago...
                        </span>
                      </div>
                    )}
                    {/* Botón cancelar compra - siempre visible y accesible debajo del QR */}
                    <button
                      onClick={onClose}
                      className={`w-full mt-6 py-3 px-4 rounded-lg border-2 border-dashed transition-colors font-medium ${getThemeClass({
                        dark: 'border-red-600 text-red-400 hover:bg-red-900/20 hover:border-red-500',
                        light: 'border-red-500 text-red-600 hover:bg-red-50 hover:border-red-400'
                      })}`}
                      style={{zIndex: 2, position: 'relative'}}
                    >
                      ❌ Cancelar compra
                    </button>
                    {paymentStatus === 'completed' && (
                      <div className="text-green-500 text-sm font-bold mt-4">
                        ✅ ¡Pago completado exitosamente!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className={`mb-4 text-sm ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                      El enlace se abrió en una nueva pestaña. Si no se abrió automáticamente, haz clic en el botón:
                    </p>
                    <button
                      onClick={handlePaymentClick}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                      🚀 Abrir Stripe Checkout
                    </button>
                    
                    {/* Estado del polling */}
                    {isPolling && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className={`text-sm ${getThemeClass({dark: 'text-blue-300', light: 'text-blue-600'})}`}>
                          Esperando el pago...
                        </span>
                      </div>
                    )}
                    
                    {paymentStatus === 'completed' && (
                      <div className="text-green-500 text-sm font-bold mt-4">
                        ✅ ¡Pago completado exitosamente!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* Información adicional */}
          <div className={`rounded-xl p-4 border ${getThemeClass({
            dark: 'bg-blue-900/20 border-blue-700',
            light: 'bg-blue-50 border-blue-200'
          })}`}>
            <h4 className={`text-sm font-semibold mb-2 ${getThemeClass({dark: 'text-blue-300', light: 'text-blue-700'})}`}>
              🔒 Pago seguro con Stripe
            </h4>
            <ul className={`text-xs space-y-1 ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
              <li>• Procesamiento seguro de tarjetas</li>
              <li>• Compatible con todas las tarjetas principales</li>
              <li>• Comprobante automático por email</li>
              <li>• No se solicitará dirección de facturación</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
