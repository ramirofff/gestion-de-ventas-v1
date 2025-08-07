'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    setMounted(true);
    const configured = localStorage.getItem('stripe-configured') === 'true';
    setStripeConfigured(configured);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'white', 
        color: 'black',
        minHeight: '100vh' 
      }}>
        <h1>Cargando...</h1>
      </div>
    );
  }

  const handleStripeConfiguration = () => {
    window.location.href = '/stripe/express';
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      color: 'black',
      minHeight: '100vh' 
    }}>
      <h1 style={{ color: 'black', marginBottom: '20px' }}>
        🏪 Sistema de Gestión de Ventas
      </h1>

      {!stripeConfigured && (
        <div style={{
          background: 'linear-gradient(to right, #eff6ff, #faf5ff)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: 'black'
        }}>
          <h3 style={{ color: 'black', margin: '0 0 8px 0' }}>
            🚀 ¡Configura tu sistema de pagos!
          </h3>
          <p style={{ color: 'black', margin: '0 0 12px 0' }}>
            Para comenzar a recibir pagos, necesitas configurar Stripe Express.
          </p>
          <button
            onClick={handleStripeConfiguration}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ⚡ Agregar Sistema de Pagos
          </button>
        </div>
      )}

      <p style={{ color: 'black' }}>
        Contenido principal de la aplicación aquí...
      </p>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        border: '1px solid #ccc',
        color: 'black' 
      }}>
        <h3>Debug Info:</h3>
        <p>Mounted: {mounted ? 'Yes' : 'No'}</p>
        <p>Stripe Configured: {stripeConfigured ? 'Yes' : 'No'}</p>
        <p>Window Location: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</p>
      </div>
    </div>
  );
}
