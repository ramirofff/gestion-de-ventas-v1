'use client';

import { useState, useEffect } from 'react';
import { QRDisplay } from './QRDisplay';
import { ClientAccount } from '../lib/client-accounts';
import { supabase } from '../lib/supabaseClient';
import UserSettingsManager from '../lib/userSettings';
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
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme, getThemeClass } = useTheme();

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
      // Verificar origen por seguridad
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'STRIPE_PAYMENT_SUCCESS') {
        console.log('🎉 Mensaje de éxito recibido de ventana de pago:', event.data);
        setPaymentStatus('completed');
        setIsPolling(false);
        
        if (onSuccess && event.data.sessionId) {
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
      
      // Usar endpoint de verificación del servidor
      const verifyResponse = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: currentUser?.id
        })
      });
      
      const verifyData = await verifyResponse.json();
      console.log('📊 Respuesta de verificación del servidor:', verifyData);
      
      if (verifyResponse.ok && verifyData.success && verifyData.payment_verified) {
        // Pago confirmado por Stripe, notificar éxito
        setPaymentStatus('completed');
        setIsPolling(false);
        if (onSuccess) {
          setTimeout(() => onSuccess(sessionId), 1500);
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
      }, 3000); // Cada 3 segundos
    }

    return () => {
      if (interval) {
        console.log('🧹 Limpiando interval de polling');
        clearInterval(interval);
      }
    };
  }, [isPolling, sessionId, currentUser]);

  // Limpiar polling cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (isPolling) {
        console.log('🧹 Componente desmontado, deteniendo polling');
        setIsPolling(false);
      }
    };
  }, [isPolling]);

  const createPaymentLink = async () => {
    if (!currentUser) {
      setError('Debes iniciar sesión para realizar pagos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Los datos del carrito se guardarán automáticamente en el backend cuando se cree la sesión
      const paymentData = {
        amount: amount,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        currency: 'usd',
        description: `Venta - ${items.length} producto(s)`,
        items: items,
        customer_email: currentUser.email, // 🎯 Email del usuario autenticado
        user_id: currentUser.id, // 🎯 ID del usuario autenticado
      };
      
      console.log('📤 Enviando datos de pago:', {
        ...paymentData,
        items: `${items.length} items`,
        user_email: currentUser.email
      });

      const response = await fetch('/api/stripe/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear enlace de pago');
      }

      console.log('✅ Enlace de pago creado exitosamente');
      setPaymentUrl(data.payment_url);
      setSessionId(data.session_id); // Guardar session ID para verificar estado

    } catch (err: unknown) {
      console.error('❌ Error creating payment link:', err);
      setError((err as Error).message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (paymentUrl) {
      // Abrir Stripe Checkout en una nueva pestaña
      window.open(paymentUrl, '_blank');
      
      // Iniciar polling para verificar el pago
      if (sessionId && !isPolling) {
        console.log('🚀 Iniciando polling después de abrir Stripe...');
        setIsPolling(true);
      }
    } else {
      createPaymentLink();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${getThemeClass({dark: 'bg-black/50', light: 'bg-black/50'})}`}>
      <div className={`rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto ${getThemeClass({
        dark: 'bg-zinc-900 text-white',
        light: 'bg-white text-gray-900'
      })}`}>
        {/* Header */}
        <div className={`flex justify-between items-start p-6 border-b ${getThemeClass({dark: 'border-zinc-700', light: 'border-gray-200'})}`}>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-3 ${getThemeClass({dark: 'text-white', light: 'text-gray-900'})}`}>
              💳 Pagar con Stripe
            </h2>
            {currentUser?.email && (
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
              📋 Resumen de compra:
            </h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`text-sm ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                    {item.quantity}x {item.name}
                  </span>
                  <span className={`font-bold ${getThemeClass({dark: 'text-white', light: 'text-gray-900'})}`}>
                    ${(item.price * item.quantity).toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
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

          {/* Enlaces de pago o botón para crear */}
          {paymentUrl ? (
            <div className={`rounded-xl p-4 mb-4 border ${getThemeClass({
              dark: 'bg-green-900/20 border-green-700',
              light: 'bg-green-50 border-green-200'
            })}`}>
              <h3 className={`text-lg font-semibold mb-2 ${getThemeClass({dark: 'text-green-300', light: 'text-green-700'})}`}>
                ✅ Enlace de pago generado
              </h3>
              <p className={`text-sm mb-4 ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}`}>
                Elige cómo quieres proceder con el pago:
              </p>

              {/* Botones para alternar entre Link y QR */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setShowQR(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !showQR 
                      ? 'bg-blue-600 text-white' 
                      : getThemeClass({
                          dark: 'bg-zinc-700 text-gray-300 hover:bg-zinc-600',
                          light: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        })
                  }`}
                >
                  🔗 Link de Pago
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    showQR 
                      ? 'bg-blue-600 text-white' 
                      : getThemeClass({
                          dark: 'bg-zinc-700 text-gray-300 hover:bg-zinc-600',
                          light: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        })
                  }`}
                >
                  📱 Código QR
                </button>
              </div>

              {/* Mostrar QR o Link según selección */}
              {showQR ? (
                <div className="text-center">
                  <div className={`inline-block p-4 rounded-xl ${getThemeClass({dark: 'bg-white', light: 'bg-white'})}`}>
                    <QRDisplay 
                      value={paymentUrl}
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
                  
                  {paymentStatus === 'completed' && (
                    <div className="text-green-500 text-sm font-bold mt-4">
                      ✅ ¡Pago completado exitosamente!
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handlePaymentClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  🚀 Ir a Stripe Checkout
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handlePaymentClick}
              disabled={loading || !currentUser}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-colors mb-4 ${
                (loading || !currentUser) 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading 
                ? '⏳ Generando enlace...' 
                : !currentUser
                  ? '🔒 Inicia sesión para pagar'
                  : '💳 Generar enlace de pago'
              }
            </button>
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
