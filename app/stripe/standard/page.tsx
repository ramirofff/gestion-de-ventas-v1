'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { StripeConfigManager } from '../../../lib/stripe-config';

export default function StripeStandardSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Verificar configuración existente
    const checkConfig = async () => {
      const existingConfig = await StripeConfigManager.getConfig();
      if (existingConfig) {
        setConfig(existingConfig);
      }
    };
    checkConfig();
  }, []);

  const createStripeStandardAccount = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/stripe/standard/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: 'AR',
          business_type: 'individual'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear cuenta');
      }

      // Guardar la configuración básica
      await StripeConfigManager.saveConfig({
        account_id: data.account_id,
        charges_enabled: false, // Se habilitará después del onboarding
        payouts_enabled: false,
        details_submitted: false,
        business_type: 'individual',
        country: 'AR'
      });

      setSuccess('✅ Cuenta creada. Redirigiendo al proceso de configuración...');
      
      // Redirigir al onboarding de Stripe
      setTimeout(() => {
        window.location.href = data.onboarding_url;
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al crear cuenta de Stripe');
    } finally {
      setLoading(false);
    }
  };

  const checkAccountStatus = async () => {
    if (!config?.account_id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/stripe/express/account?account_id=${config.account_id}`);
      const data = await response.json();

      if (data.success) {
        await StripeConfigManager.saveConfig({
          account_id: config.account_id,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
          details_submitted: data.details_submitted,
          business_type: data.business_type,
          country: data.country
        });
        
        setConfig({
          ...config,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
          details_submitted: data.details_submitted
        });
      }
    } catch (err: any) {
      setError('Error al verificar estado de la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const isAccountReady = config && config.charges_enabled && config.details_submitted;

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
          🇦🇷 Configuración Stripe para Argentina
        </h1>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#d97706', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
            ℹ️ Información importante
          </h3>
          <p style={{ color: '#92400e', margin: 0, fontSize: '0.9rem' }}>
            Stripe Express no está disponible en Argentina. Usaremos <strong>Stripe Standard</strong> 
            que es completamente funcional para recibir pagos internacionales en Argentina.
          </p>
        </div>

        {/* Estado actual */}
        {config && (
          <div style={{
            backgroundColor: isAccountReady ? '#d1fae5' : '#fef2f2',
            border: `1px solid ${isAccountReady ? '#10b981' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ 
              color: isAccountReady ? '#065f46' : '#991b1b', 
              fontWeight: 'bold', 
              margin: '0 0 0.5rem 0' 
            }}>
              {isAccountReady ? '✅ Cuenta configurada' : '⚠️ Configuración pendiente'}
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li style={{ color: config.details_submitted ? '#065f46' : '#991b1b' }}>
                {config.details_submitted ? '✅' : '❌'} Información de negocio enviada
              </li>
              <li style={{ color: config.charges_enabled ? '#065f46' : '#991b1b' }}>
                {config.charges_enabled ? '✅' : '❌'} Pagos habilitados
              </li>
              <li style={{ color: config.payouts_enabled ? '#065f46' : '#991b1b' }}>
                {config.payouts_enabled ? '✅' : '❌'} Transferencias habilitadas
              </li>
            </ul>
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              fontSize: '0.8rem',
              color: '#6b7280'
            }}>
              Cuenta ID: {config.account_id}
            </p>
          </div>
        )}

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
            {success}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {!config ? (
            <button
              onClick={createStripeStandardAccount}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                flex: 1
              }}
            >
              {loading ? '⏳ Creando cuenta...' : '🚀 Crear cuenta de Stripe'}
            </button>
          ) : !isAccountReady ? (
            <>
              <button
                onClick={() => window.location.href = '/api/stripe/express/create'}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                🔧 Completar configuración
              </button>
              <button
                onClick={checkAccountStatus}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#9ca3af' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳' : '🔄'} Verificar estado
              </button>
            </>
          ) : (
            <div style={{
              backgroundColor: '#d1fae5',
              border: '1px solid #34d399',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center' as const,
              width: '100%'
            }}>
              <h3 style={{ color: '#065f46', margin: '0 0 0.5rem 0' }}>
                🎉 ¡Configuración completa!
              </h3>
              <p style={{ color: '#059669', margin: 0 }}>
                Tu cuenta de Stripe está lista para recibir pagos.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                🏠 Volver al sistema
              </button>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#4b5563'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
            ℹ️ Sobre Stripe Standard en Argentina
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>✅ Acepta tarjetas internacionales</li>
            <li>✅ Procesa pagos en USD</li>
            <li>✅ Compatible con QR codes</li>
            <li>✅ Dashboard completo de Stripe</li>
            <li>✅ Transferencias a cuentas argentinas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
