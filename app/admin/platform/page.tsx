'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [connectedClients, setConnectedClients] = useState<any[]>([]);

  useEffect(() => {
    // Verificar si tu plataforma está configurada
    const checkPlatformStatus = () => {
      const stripeConfigured = localStorage.getItem('stripe_configured');
      setPlatformConfigured(stripeConfigured === 'true');
    };
    checkPlatformStatus();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#1f2937'
        }}>
          🏢 Panel de Administración SaaS
        </h1>

        {/* Estado de la plataforma */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#374151' }}>
            📊 Estado de tu Plataforma
          </h2>
          
          {platformConfigured ? (
            <div style={{
              backgroundColor: '#d1fae5',
              border: '1px solid #34d399',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h3 style={{ color: '#065f46', margin: '0 0 0.5rem 0' }}>
                ✅ Plataforma Configurada
              </h3>
              <p style={{ color: '#047857', margin: '0 0 1rem 0' }}>
                Tu cuenta Stripe USA está lista. Ahora puedes conectar clientes argentinos.
              </p>
              <a
                href="/client/onboarding"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                🔗 Conectar Nuevo Cliente
              </a>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h3 style={{ color: '#d97706', margin: '0 0 0.5rem 0' }}>
                ⚠️ Configura tu Plataforma Primero
              </h3>
              <p style={{ color: '#92400e', margin: '0 0 1rem 0' }}>
                Debes configurar TU cuenta Stripe USA como plataforma principal antes de conectar clientes.
              </p>
              <a
                href="/stripe/express"
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                🚀 Configurar Mi Plataforma
              </a>
            </div>
          )}
        </div>

        {/* Flujo explicativo */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#374151' }}>
            🎯 Cómo Funciona tu SaaS
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                1️⃣ TU Configuración (una sola vez)
              </h3>
              <p style={{ color: '#4b5563', margin: 0, fontSize: '0.9rem' }}>
                Configuras TU cuenta Stripe USA como plataforma principal. Esto te permite crear sub-cuentas para clientes.
              </p>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '8px',
              borderLeft: '4px solid #10b981'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                2️⃣ Conectar Clientes (múltiples veces)
              </h3>
              <p style={{ color: '#4b5563', margin: 0, fontSize: '0.9rem' }}>
                Cada cliente argentino se conecta a TU plataforma. Solo necesitan email + nombre de negocio. No configuran Stripe ellos mismos.
              </p>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '8px',
              borderLeft: '4px solid #f59e0b'
            }}>
              <h3 style={{ color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                3️⃣ Pagos Automáticos
              </h3>
              <p style={{ color: '#4b5563', margin: 0, fontSize: '0.9rem' }}>
                Los clientes finales pagan → Tu cuenta → Cliente argentino (97% USD) + Tú (3% USD). Todo automático.
              </p>
            </div>
          </div>
        </div>

        {/* Navegación rápida */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginTop: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#374151' }}>
            🚀 Enlaces Rápidos
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <a
              href="/"
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center' as const,
                fontWeight: 'bold'
              }}
            >
              🏠 Sistema Principal
            </a>
            
            <a
              href="/client/onboarding"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center' as const,
                fontWeight: 'bold'
              }}
            >
              🔗 Conectar Cliente
            </a>
            
            <a
              href="/stripe/express"
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center' as const,
                fontWeight: 'bold'
              }}
            >
              ⚙️ Config Plataforma
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
