'use client';

import { useState } from 'react';
import StripeExpressManager from '../../../components/StripeExpressManager';

export default function StripeExpressPage() {
  const [accountReady, setAccountReady] = useState(false);
  const [accountId, setAccountId] = useState<string>('');

  const handleAccountReady = (id: string) => {
    setAccountId(id);
    setAccountReady(true);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '2rem',
      color: '#111827'
    }}>
      <div style={{ 
        maxWidth: '64rem', 
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: '#ffffff',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Volver al inicio
          </button>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            🇺🇸 Configuración de Stripe Express USA
          </h1>
          <p style={{ color: '#6b7280' }}>
            Configura tu cuenta de Stripe Express en Estados Unidos para recibir pagos internacionales.
          </p>
          
          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            <h3 style={{ color: '#1e40af', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
              💡 Información importante
            </h3>
            <ul style={{ color: '#1e3a8a', margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
              <li>Tu cuenta será creada en Estados Unidos 🇺🇸</li>
              <li>Podrás recibir pagos de todo el mundo 🌍</li>
              <li>Los pagos se procesarán en USD 💵</li>
              <li>Compatible con QR codes y links de pago 📱</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <StripeExpressManager onAccountReady={handleAccountReady} />
        </div>

        {accountReady && (
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '0.5rem', 
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#166534', 
              marginBottom: '0.5rem' 
            }}>
              🎉 ¡Cuenta configurada exitosamente!
            </h3>
            <p style={{ color: '#15803d', marginBottom: '1rem' }}>
              Tu cuenta Stripe Express está lista para recibir pagos.
            </p>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#16a34a' }}>
                <strong>ID de Cuenta:</strong> 
                <code style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '0.25rem',
                  marginLeft: '0.5rem'
                }}>
                  {accountId}
                </code>
              </p>
              <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '0.5rem' }}>
                Ahora puedes integrar pagos en tu aplicación usando este ID de cuenta.
              </p>
            </div>
          </div>
        )}

        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#111827'
          }}>
            📋 Pasos para usar tu cuenta de prueba:
          </h3>
          <ol style={{ 
            paddingLeft: '1.5rem', 
            color: '#374151',
            lineHeight: '1.6'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Obtén tus claves de API:</strong> Ve a tu dashboard de Stripe → Developers → API keys
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Copia las claves de prueba:</strong> Publishable key (pk_test_...) y Secret key (sk_test_...)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>✅ Claves ya configuradas:</strong> Tus claves ya están en el archivo .env.local
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Crea una cuenta Express:</strong> Usa el formulario de arriba con un email válido
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Completa el onboarding:</strong> Sigue el proceso de verificación de Stripe
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Prueba pagos:</strong> Usa la tarjeta 4242 4242 4242 4242 para pruebas
            </li>
          </ol>
        </div>

        <div style={{ 
          backgroundColor: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '0.5rem', 
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#1e40af', 
            marginBottom: '1rem'
          }}>
            🔗 Enlaces útiles:
          </h3>
          <ul style={{ color: '#374151', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <a 
                href="https://dashboard.stripe.com/test/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                📊 Dashboard de Stripe (Modo Prueba)
              </a>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <a 
                href="https://docs.stripe.com/connect/express-accounts" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                📚 Documentación de Stripe Express
              </a>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <a 
                href="https://docs.stripe.com/testing#cards" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                🃏 Tarjetas de prueba de Stripe
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
