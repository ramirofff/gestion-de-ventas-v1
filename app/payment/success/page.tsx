'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Aquí podrías hacer una llamada al API para obtener detalles del pago
      // Por ahora simulamos los datos
      setTimeout(() => {
        setPaymentData({
          sessionId,
          amount: 'Variable',
          currency: 'ARS',
          status: 'paid'
        });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        color: 'black'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2>Verificando pago...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        padding: '40px',
        border: '2px solid #10b981',
        borderRadius: '12px',
        backgroundColor: '#f0fdf4'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ color: '#059669', marginBottom: '16px' }}>
          ¡Pago Exitoso!
        </h1>
        <p style={{ color: '#374151', marginBottom: '24px' }}>
          Tu pago ha sido procesado correctamente.
        </p>
        
        {paymentData && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #d1fae5',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{ color: '#059669', marginBottom: '12px' }}>
              Detalles del Pago:
            </h3>
            <div style={{ color: '#374151' }}>
              <p><strong>ID de Sesión:</strong> {paymentData.sessionId}</p>
              <p><strong>Estado:</strong> Pagado ✅</p>
              <p><strong>Moneda:</strong> USD</p>
              <p><strong>Fecha:</strong> {new Date().toLocaleDateString('en-US')}</p>
            </div>
          </div>
        )}

        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: '#1d4ed8', marginBottom: '8px' }}>
            📧 Comprobante
          </h3>
          <p style={{ color: '#374151', fontSize: '14px' }}>
            Recibirás un comprobante por email con todos los detalles de la transacción.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = '/';
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginRight: '12px'
          }}
        >
          🏠 Volver al Inicio
        </button>
        
        <button
          onClick={() => {
            window.print();
          }}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🖨️ Imprimir
        </button>
      </div>
    </div>
  );
}
