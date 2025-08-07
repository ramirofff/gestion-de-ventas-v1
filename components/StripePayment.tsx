'use client';

import { useState, useEffect } from 'react';
import { QRDisplay } from './QRDisplay';
import { ClientAccount } from '../lib/client-accounts';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface StripePaymentProps {
  amount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
  onClose?: () => void;
  selectedClient?: ClientAccount | null;
}

export function StripePayment({ amount, items, onClose, selectedClient }: StripePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Obtener usuario autenticado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
  }, []);

  // Función para verificar el estado del pago
  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/payment/status?session_id=${sessionId}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.payment_status === 'paid') {
          setPaymentStatus('completed');
          setIsPolling(false);
          
          // 🆕 GUARDAR LA VENTA CUANDO SE COMPLETA EL PAGO
          console.log('💰 Pago completado, guardando venta...');
          
          try {
            const saveResponse = await fetch('/api/stripe/complete-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                payment_intent_id: data.payment_intent?.id,
                user_id: currentUser?.id || 'anonymous',
                cart: items,
                total: amount,
                client_email: currentUser?.email || null,
              }),
            });

            if (saveResponse.ok) {
              console.log('✅ Venta guardada exitosamente');
            } else {
              console.error('❌ Error al guardar la venta');
            }
          } catch (saveError) {
            console.error('Error guardando la venta:', saveError);
          }
          
          // Simular éxito del pago y cerrar modal
          setTimeout(() => {
            if (onClose) onClose();
            // Trigger success state in parent component
            window.location.href = '/?payment=success';
          }, 1500);
        } else if (data.status === 'expired') {
          setPaymentStatus('failed');
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
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
      console.log('💳 Iniciando pago para usuario:', currentUser?.email);
      
      // Guardar datos del carrito en localStorage para recuperarlos después del pago
      localStorage.setItem('pre_payment_cart', JSON.stringify(items));
      localStorage.setItem('pre_payment_total', amount.toString());

      const response = await fetch('/api/stripe/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'usd',
          description: `Venta - ${items.length} producto(s)`,
          items: items,
          customer_email: currentUser?.email || undefined, // 🎯 Email del usuario autenticado
          user_id: currentUser?.id || undefined, // 🎯 ID del usuario autenticado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear enlace de pago');
      }

      setPaymentUrl(data.payment_url);
      setSessionId(data.session_id); // Guardar session ID para verificar estado

    } catch (err: unknown) {
      console.error('Error creating payment link:', err);
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
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
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              marginBottom: '16px'
            }}
          >
            {loading ? '⏳ Generando enlace...' : '💳 Generar enlace de pago'}
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
