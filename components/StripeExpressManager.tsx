'use client';

import React, { useState } from 'react';

interface StripeExpressAccount {
  account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_profile?: {
    name?: string;
  };
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
}

interface StripeExpressManagerProps {
  onAccountReady?: (accountId: string) => void;
}

export default function StripeExpressManager({ onAccountReady }: StripeExpressManagerProps) {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<StripeExpressAccount | null>(null);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    business_name: '',
    country: 'US'
  });

  const createExpressAccount = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/stripe/express/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear cuenta Express');
      }

      // Redirigir al onboarding de Stripe
      if (data.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        
        // Guardar el account_id para verificar después
        localStorage.setItem('stripe_express_account_id', data.account_id);
        
        // Mostrar mensaje de espera
        setError('Por favor completa el proceso de onboarding en la nueva ventana. Luego haz clic en "Verificar Estado".');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAccountStatus = async () => {
    const accountId = localStorage.getItem('stripe_express_account_id');
    
    if (!accountId) {
      setError('No se encontró ID de cuenta. Por favor crea una nueva cuenta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stripe/express/account?account_id=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar cuenta');
      }

      setAccount(data);

      if (data.charges_enabled && data.payouts_enabled) {
        onAccountReady?.(accountId);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAccount = () => {
    localStorage.removeItem('stripe_express_account_id');
    setAccount(null);
    setError('');
  };

  if (account) {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        padding: '1.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
      }}>
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          marginBottom: '1rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#111827'
        }}>
          {account.charges_enabled && account.payouts_enabled ? (
            <span style={{ color: '#10b981' }}>✓</span>
          ) : (
            <span style={{ color: '#f59e0b' }}>⚠</span>
          )}
          Estado de Cuenta Stripe Express
        </h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem', 
            fontSize: '0.875rem' 
          }}>
            <div>
              <label style={{ fontWeight: '500', color: '#111827' }}>ID de Cuenta:</label>
              <p style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.75rem', 
                color: '#6b7280',
                marginTop: '0.25rem' 
              }}>
                {account.account_id}
              </p>
            </div>
            <div>
              <label style={{ fontWeight: '500', color: '#111827' }}>Nombre del Negocio:</label>
              <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                {account.business_profile?.name || 'No especificado'}
              </p>
            </div>
            <div>
              <label style={{ fontWeight: '500', color: '#111827' }}>Pagos Habilitados:</label>
              <p style={{ 
                color: account.charges_enabled ? '#059669' : '#dc2626',
                marginTop: '0.25rem' 
              }}>
                {account.charges_enabled ? 'Sí' : 'No'}
              </p>
            </div>
            <div>
              <label style={{ fontWeight: '500', color: '#111827' }}>Transferencias Habilitadas:</label>
              <p style={{ 
                color: account.payouts_enabled ? '#059669' : '#dc2626',
                marginTop: '0.25rem' 
              }}>
                {account.payouts_enabled ? 'Sí' : 'No'}
              </p>
            </div>
          </div>

          {account.charges_enabled && account.payouts_enabled ? (
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginTop: '1rem'
            }}>
              <p style={{ color: '#166534', fontSize: '0.875rem' }}>
                ✓ ¡Cuenta configurada correctamente! Ya puedes recibir pagos.
              </p>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#fffbeb', 
              border: '1px solid #fed7aa', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginTop: '1rem'
            }}>
              <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
                ⚠ La cuenta necesita completar el proceso de verificación en Stripe.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
              onClick={checkAccountStatus} 
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: loading ? '#f3f4f6' : '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                color: '#374151'
              }}
            >
              {loading ? 'Verificando...' : 'Actualizar Estado'}
            </button>
            <button 
              onClick={resetAccount}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Nueva Cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem', 
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
    }}>
      <h3 style={{ 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        color: '#111827'
      }}>
        Configurar Stripe Express
      </h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#111827'
          }}>
            Email del Negocio *
          </label>
          <input
            id="email"
            type="email"
            placeholder="tu-email@ejemplo.com"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              outline: 'none',
              color: '#111827'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="business_name" style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#111827'
          }}>
            Nombre del Negocio
          </label>
          <input
            id="business_name"
            placeholder="Mi Tienda"
            value={formData.business_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, business_name: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              outline: 'none',
              color: '#111827'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="country" style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#111827'
          }}>
            País
          </label>
          <select
            id="country"
            value={formData.country}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, country: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              outline: 'none',
              color: '#111827'
            }}
          >
            <option value="US">Estados Unidos</option>
            <option value="MX">México</option>
            <option value="CA">Canadá</option>
            <option value="GB">Reino Unido</option>
            <option value="ES">España</option>
            <option value="FR">Francia</option>
            <option value="DE">Alemania</option>
          </select>
        </div>

        {error && (
          <div style={{ 
            border: '1px solid',
            borderRadius: '0.375rem', 
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: error.includes('completa el proceso') ? '#eff6ff' : '#fef2f2',
            borderColor: error.includes('completa el proceso') ? '#bfdbfe' : '#fecaca',
            color: error.includes('completa el proceso') ? '#1e40af' : '#991b1b'
          }}>
            <p style={{ fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            onClick={createExpressAccount} 
            disabled={loading || !formData.email}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              backgroundColor: (loading || !formData.email) ? '#9ca3af' : '#2563eb',
              color: '#ffffff',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: (loading || !formData.email) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading && <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>}
            🔗 Crear Cuenta Express
          </button>
          
          <button 
            onClick={checkAccountStatus}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            Verificar Estado
          </button>
        </div>

        <div style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280', 
          backgroundColor: '#f9fafb', 
          padding: '0.75rem', 
          borderRadius: '0.375rem' 
        }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🧪 Modo de prueba activo:</p>
          <ul style={{ 
            listStyle: 'disc', 
            listStylePosition: 'inside', 
            fontSize: '0.75rem',
            lineHeight: '1.4' 
          }}>
            <li>Usa tarjetas de prueba de Stripe</li>
            <li>No se procesarán pagos reales</li>
            <li>Tarjeta de prueba: 4242 4242 4242 4242</li>
            <li>CVV: cualquier 3 dígitos</li>
            <li>Fecha: cualquier fecha futura</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
