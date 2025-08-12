'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export default function StripeConnectDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'account-created' | 'payment-demo'>('form');
  const [accountData, setAccountData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  
  // Datos del formulario de cuenta (email se elimina porque se usa automáticamente)
  const [accountForm, setAccountForm] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    country: 'AR',
  });

  // Datos del formulario de pago (customerEmail se elimina porque se usa automáticamente)
  const [paymentForm, setPaymentForm] = useState({
  amount: '',
  productName: '',
  commissionRate: '',
  });

  const router = useRouter();

  useEffect(() => {
    // Verificar si hay usuario logueado y obtener su token
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Obtener el token de sesión
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          // Pre-llenar el formulario con datos del usuario
          setAccountForm(prev => ({
            ...prev,
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
          }));
        }
      }
    };
    getUser();
  }, []);

  const getAuthHeaders = () => {
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // 📝 Crear cuenta conectada
  const createConnectedAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe-connect/create-account', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountForm),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.existingAccount) {
          // Cuenta ya existe
          setAccountData({
            ...data,
            accountId: data.existingAccount.stripeAccountId,
            businessName: data.existingAccount.businessName,
            email: data.email,
          });
          setStep('account-created');
        } else {
          throw new Error(data.error || 'Error creando cuenta');
        }
      } else {
        setAccountData(data);
        setStep('account-created');
        // Abrir el link de onboarding automáticamente
        if (data.onboardingUrl) {
          window.open(data.onboardingUrl, '_blank');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 💳 Crear pago con comisión
  const createPaymentWithCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe-connect/create-payment', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          connectedAccountId: accountData.accountId,
          amount: parseFloat(paymentForm.amount),
          productName: paymentForm.productName,
          commissionRate: parseFloat(paymentForm.commissionRate),
          // customerEmail se usa automáticamente del usuario logueado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando pago');
      }

      // Abrir Stripe Checkout
      window.open(data.sessionUrl, '_blank');
      setStep('payment-demo');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Reiniciar demo
  const resetDemo = () => {
    setStep('form');
    setAccountData(null);
    setError('');
  };

  // 🔒 Si no hay usuario, mostrar mensaje de login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-red-600">
              🔒 Acceso Restringido
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Necesitas estar logueado para usar Stripe Connect
            </p>
          </div>
          <div>
            <button
              onClick={() => router.push('/auth')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎯 Stripe Connect Demo
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">
              👤 Usuario: {user.email}
            </p>
            <p className="text-blue-600 text-sm mt-1">
              📧 Se usará automáticamente tu email para todas las transacciones
            </p>
          </div>
          <div className="flex justify-center space-x-4 mb-6">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              step === 'form' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1. Crear Cuenta
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              step === 'account-created' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2. Onboarding
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              step === 'payment-demo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3. Pago Demo
            </span>
          </div>
        </div>

        {/* Mostrar errores */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            ❌ {error}
          </div>
        )}

        {/* Paso 1: Formulario de cuenta conectada */}
        {step === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📝 Paso 1: Crear Cuenta Conectada
            </h2>
            
            <form onSubmit={createConnectedAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={accountForm.firstName}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={accountForm.lastName}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  id="businessName"
                  value={accountForm.businessName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Mi Tienda Argentina"
                  required
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  País
                </label>
                <select
                  id="country"
                  value={accountForm.country}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="CL">🇨🇱 Chile</option>
                  <option value="CO">🇨🇴 Colombia</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ℹ️ <strong>Email automático:</strong> Se usará tu email de login ({user.email}) para identificarte en todas las transacciones y evitar cambios de identidad.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳ Creando cuenta...' : '🚀 Crear Cuenta Conectada'}
              </button>
            </form>
          </div>
        )}

        {/* Paso 2: Cuenta creada - Onboarding */}
        {step === 'account-created' && accountData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-green-600 mb-6">
              ✅ Paso 2: Cuenta Creada Exitosamente
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="space-y-3">
                <p><strong>ID de Cuenta:</strong> {accountData.accountId}</p>
                <p><strong>Email:</strong> {accountData.email || user.email}</p>
                <p><strong>Negocio:</strong> {accountData.businessName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium mb-2">
                  📋 Completar Onboarding de Stripe
                </p>
                <p className="text-blue-600 text-sm mb-4">
                  Para poder recibir pagos, necesitas completar el proceso de verificación de Stripe (KYC).
                </p>
                <button
                  onClick={() => accountData.onboardingUrl && window.open(accountData.onboardingUrl, '_blank')}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  disabled={!accountData.onboardingUrl}
                >
                  🔗 Abrir Onboarding de Stripe
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Importante:</strong> Una vez completado el onboarding en Stripe, podrás continuar con la demo de pagos.
                </p>
              </div>

              <button
                onClick={() => setStep('payment-demo')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700"
              >
                ▶️ Continuar con Demo de Pago
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Demo de pago con comisión */}
        {step === 'payment-demo' && accountData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-purple-600 mb-6">
              💳 Paso 3: Demo de Pago con Comisión
            </h2>
            
            <form onSubmit={createPaymentWithCommission} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Monto (USD)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700 mb-2">
                    Comisión (%)
                  </label>
                  <input
                    type="number"
                    id="commissionRate"
                    value={paymentForm.commissionRate}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, commissionRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0.01"
                    max="0.30"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="productName"
                  value={paymentForm.productName}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Cálculo de comisión */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3">💰 Desglose del Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Monto Total:</span>
                    <p className="font-bold text-lg">${parseFloat(paymentForm.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Tu Comisión ({(parseFloat(paymentForm.commissionRate) * 100).toFixed(1)}%):</span>
                    <p className="font-bold text-lg text-green-600">
                      ${(parseFloat(paymentForm.amount) * parseFloat(paymentForm.commissionRate)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente Recibe:</span>
                    <p className="font-bold text-lg text-blue-600">
                      ${(parseFloat(paymentForm.amount) * (1 - parseFloat(paymentForm.commissionRate))).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  📧 <strong>Cliente identificado automáticamente:</strong> {user.email}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳ Creando sesión...' : '💳 Crear Pago con Comisión'}
              </button>
            </form>
          </div>
        )}

        {/* Botones de navegación */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            ← Volver al Inicio
          </button>
          
          {step !== 'form' && (
            <button
              onClick={resetDemo}
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
            >
              🔄 Reiniciar Demo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
