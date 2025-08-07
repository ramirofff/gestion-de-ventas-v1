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
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
  onClose?: () => void;
  onSuccess?: () => void;
  selectedClient?: ClientAccount | null;
}

export function StripePayment({ amount, items, onClose, onSuccess, selectedClient }: StripePaymentProps) {
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
        console.log('✅ Pago verificado por el servidor, procesando venta en el cliente...');
        console.log('📋 Datos recibidos del servidor:', verifyData);
        
        try {
          // Importar createSale dinámicamente
          const { createSale } = await import('../lib/sales');
          
          // Preparar datos del carrito desde la respuesta del servidor
          const cartData = verifyData.cart_data;
          const total = verifyData.total;
          const stripePaymentIntentId = verifyData.stripe_payment_intent_id;
          const metadata = verifyData.metadata;
          
          console.log('💾 CLIENTE: Guardando venta con datos verificados...');
          console.log('💾 CLIENTE: cartData:', cartData);
          console.log('💾 CLIENTE: total:', total);
          console.log('💾 CLIENTE: userId:', currentUser?.id);
          console.log('💾 CLIENTE: stripePaymentIntentId:', stripePaymentIntentId);
          
          // Crear la venta usando la función del cliente (con autenticación)
          const saleResult = await createSale(
            cartData,
            total,
            currentUser?.id,
            undefined, // client_id
            stripePaymentIntentId,
            metadata
          );
          
          console.log('💾 CLIENTE: Resultado de createSale:', saleResult);
          
          if (saleResult.data && saleResult.data.length > 0) {
            console.log('✅ CLIENTE: Venta guardada exitosamente:', saleResult.data[0].id);
            setPaymentStatus('completed');
            setIsPolling(false);
            
            // Simular éxito del pago y cerrar modal
            setTimeout(() => {
              console.log('🎉 Pago completado exitosamente, cerrando modal y limpiando carrito');
              
              // Llamar callback de éxito (limpia el carrito)
              if (onSuccess) {
                onSuccess();
              }
              
              // Cerrar modal
              if (onClose) {
                onClose();
              }
              
              // Trigger success state in parent component
              window.location.href = '/?payment=success';
            }, 1500);
            
            return;
          } else {
            console.error('❌ CLIENTE: Error guardando venta:', saleResult.error?.message || saleResult.error);
            // Continuar con el polling para reintentar
          }
        } catch (saleError) {
          console.error('❌ CLIENTE: Error procesando venta:', saleError);
          // Continuar con el polling para reintentar
        }
      }
      
      // Si el pago no está completado aún, continuar con polling
      if (!verifyData.success && verifyData.message?.includes('no completado')) {
        console.log('⏳ Pago aún no completado, continuando polling...');
        return;
      }
      
      // Si hay un error, mostrar en logs pero continuar polling
      if (verifyData.error) {
        console.error('❌ Error en verificación del pago:', verifyData.error);
      }
      
    } catch (error) {
      console.error('❌ Error verificando pago:', error);
    }
  };

  // Effect para iniciar polling cuando se muestra QR
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (showQR && sessionId && paymentStatus === 'pending') {
      setIsPolling(true);
      // Verificar cada 3 segundos
      pollInterval = setInterval(() => {
        checkPaymentStatus(sessionId);
      }, 3000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [showQR, sessionId, paymentStatus]);

  // Limpiar polling cuando se cierra el modal
  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  const createPaymentLink = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('💳 Iniciando pago...');
      console.log('👤 Usuario actual:', currentUser?.email || 'undefined', '(ID:', currentUser?.id || 'undefined', ')');
      
      if (!currentUser) {
        throw new Error('Usuario no autenticado. Por favor, inicia sesión primero.');
      }
      
      // Los datos del carrito se guardarán automáticamente en el backend cuando se cree la sesión
      const paymentData = {
        amount: amount,
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
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: 'black'
          }}>
            💳 Pagar con Stripe
          </h2>
          
          {/* Info del usuario */}
          {currentUser?.email && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <p style={{ margin: 0, color: '#1e40af' }}>
                <strong>Cliente:</strong> {currentUser.email}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Este email se usará automáticamente en Stripe
              </p>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Resumen de compra */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px',
            color: '#374151'
          }}>
            📋 Resumen de compra:
          </h3>
          {items.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              color: '#374151'
            }}>
              <span>
                {item.quantity}x {item.name}
              </span>
              <span style={{ fontWeight: 'bold' }}>
                ${(item.price * item.quantity).toLocaleString('en-US')}
              </span>
            </div>
          ))}
          <hr style={{ 
            border: 'none', 
            borderTop: '1px solid #e2e8f0',
            margin: '12px 0' 
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#059669'
          }}>
            <span>Total:</span>
            <span>${amount.toLocaleString('en-US')} USD</span>
          </div>
        </div>

        {/* Estado de autenticación */}
        {currentUser === null && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#dc2626'
          }}>
            <strong>⚠️ Atención:</strong> Debes iniciar sesión para realizar pagos.
          </div>
        )}

        {/* Estado del error */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#dc2626'
          }}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* Enlaces de pago o botón para crear */}
        {paymentUrl ? (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #d1fae5',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0',
              color: '#059669',
              fontSize: '16px'
            }}>
              ✅ Enlace de pago generado
            </h3>
            <p style={{ 
              margin: '0 0 12px 0',
              color: '#374151',
              fontSize: '14px'
            }}>
              Elige cómo quieres proceder con el pago:
            </p>

            {/* Botones para alternar entre Link y QR */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setShowQR(false)}
                style={{
                  backgroundColor: !showQR ? '#3b82f6' : '#e5e7eb',
                  color: !showQR ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                🔗 Link de Pago
              </button>
              <button
                onClick={() => setShowQR(true)}
                style={{
                  backgroundColor: showQR ? '#3b82f6' : '#e5e7eb',
                  color: showQR ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                📱 Código QR
              </button>
            </div>

            {/* Mostrar QR o Link según selección */}
            {showQR ? (
              <div style={{ textAlign: 'center' }}>
                <QRDisplay 
                  value={paymentUrl}
                  size={200}
                />
                <p style={{ 
                  margin: '12px 0',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  📱 Escanea el código QR para pagar con tarjeta internacional
                </p>
                
                {/* Estado del polling */}
                {isPolling && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#3b82f6',
                    fontSize: '14px',
                    margin: '12px 0'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Esperando el pago...</span>
                  </div>
                )}
                
                {paymentStatus === 'completed' && (
                  <div style={{
                    color: '#059669',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    margin: '12px 0'
                  }}>
                    ✅ ¡Pago completado exitosamente!
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handlePaymentClick}
                style={{
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🚀 Ir a Stripe Checkout
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handlePaymentClick}
            disabled={loading || !currentUser}
            style={{
              backgroundColor: (loading || !currentUser) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: (loading || !currentUser) ? 'not-allowed' : 'pointer',
              width: '100%',
              marginBottom: '16px'
            }}
          >
            {loading 
              ? '⏳ Generando enlace...' 
              : !currentUser
                ? '� Inicia sesión para pagar'
                : '�💳 Generar enlace de pago'
            }
          </button>
        )}

        {/* Información adicional */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <h4 style={{ 
            margin: '0 0 8px 0',
            color: '#1d4ed8',
            fontSize: '14px'
          }}>
            🔒 Pago seguro con Stripe
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '16px',
            lineHeight: '1.4'
          }}>
            <li>Procesamiento seguro de tarjetas</li>
            <li>Compatible con todas las tarjetas principales</li>
            <li>Comprobante automático por email</li>
          </ul>
        </div>
      </div>
      
      {/* Estilos CSS para la animación */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
