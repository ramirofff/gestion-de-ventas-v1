'use client';

import { useState } from 'react';

export default function ClientOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientData, setClientData] = useState({
    email: '',
    business_name: '',
    country: 'AR'
  });

  const handleConnectClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/stripe/connect-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_email: clientData.email,
          business_name: clientData.business_name,
          country: clientData.country,
          platform_fee_percent: 3 // Tu comisión del 3%
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar cliente');
      }

      setSuccess('¡Cliente conectado! Redirigiendo al proceso de configuración...');
      
      // Redirigir al onboarding de Stripe
      setTimeout(() => {
        window.location.href = data.onboarding_url;
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al conectar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#1f2937'
        }}>
          🇦🇷 Conectar Cliente Argentino
        </h1>

        <div style={{
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#1e40af', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
            💵 Plataforma SaaS con Pagos en USD
          </h3>
          <ul style={{ color: '#1e3a8a', margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            <li>✅ Tu cliente NO necesita crear cuenta Stripe propia</li>
            <li>💰 <strong>Recibe todos los pagos en USD</strong> (ideal para Argentina)</li>
            <li>✅ Se conecta a tu plataforma USA como sub-cuenta</li>
            <li>✅ Transferencias automáticas en USD menos tu comisión (3%)</li>
            <li>🏦 Puede recibir USD en cuenta bancaria argentina o internacional</li>
          </ul>
        </div>

        <form onSubmit={handleConnectClient}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#374151'
            }}>
              📧 Email del Cliente:
            </label>
            <input
              type="email"
              required
              value={clientData.email}
              onChange={(e) => setClientData({...clientData, email: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="cliente@ejemplo.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#374151'
            }}>
              🏪 Nombre del Negocio:
            </label>
            <input
              type="text"
              required
              value={clientData.business_name}
              onChange={(e) => setClientData({...clientData, business_name: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="Mi Negocio Argentino"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#374151'
            }}>
              🌍 País:
            </label>
            <select
              value={clientData.country}
              onChange={(e) => setClientData({...clientData, country: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="AR">🇦🇷 Argentina</option>
              <option value="UY">🇺🇾 Uruguay</option>
              <option value="CL">🇨🇱 Chile</option>
              <option value="PE">🇵🇪 Perú</option>
            </select>
          </div>

          {/* Mensajes */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              color: '#dc2626'
            }}>
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#d1fae5',
              border: '1px solid #34d399',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              color: '#059669'
            }}>
              ✅ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              marginBottom: '1rem'
            }}
          >
            {loading ? '⏳ Conectando...' : '🔗 Conectar Cliente a Mi Plataforma'}
          </button>
        </form>

        {/* Información de comisiones */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1.5rem'
        }}>
          <h4 style={{ color: '#166534', margin: '0 0 0.5rem 0' }}>
            💰 Estructura de Comisiones (USD)
          </h4>
          <div style={{ fontSize: '0.9rem', color: '#15803d' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Tu comisión:</strong> 3% de cada venta en USD
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Cliente recibe:</strong> 97% del pago en USD
            </p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#16a34a' }}>
              * Ejemplo: Venta de $100 USD → Cliente recibe $97 USD, tú $3 USD
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
              🌟 Los pagos siempre se procesan y transfieren en USD
            </p>
          </div>
        </div>

        {/* Información técnica */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#4b5563'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
            🏗️ Arquitectura de la Plataforma (USD)
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>Tu LLC USA es la cuenta principal de Stripe</li>
            <li>Clientes se conectan como sub-cuentas Express</li>
            <li>💰 <strong>Flujo:</strong> Cliente final paga USD → Tu cuenta → Cliente (97% USD) + Tú (3% USD)</li>
            <li>🏦 Transfers automáticos en USD a cuentas bancarias internacionales</li>
            <li>🌟 Sin conversión de moneda - Todo permanece en USD</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
