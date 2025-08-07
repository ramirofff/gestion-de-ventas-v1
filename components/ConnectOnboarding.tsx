'use client';

import React, { useState } from 'react';

interface ConnectOnboardingProps {
  currentUser: any;
}

const ConnectOnboarding: React.FC<ConnectOnboardingProps> = ({ currentUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');

  const handleCreateAccount = async () => {
    if (!businessName.trim()) {
      alert('Por favor ingresa el nombre de tu negocio');
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          email: currentUser.email,
          business_name: businessName,
          country: 'AR',
          business_type: 'individual'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOnboardingUrl(data.onboarding_url);
        console.log('✅ Cuenta Connect creada:', data.account_id);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creando cuenta');
    }
    
    setIsCreating(false);
  };

  if (onboardingUrl) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            🎉 ¡Cuenta Creada!
          </h2>
          <p className="text-gray-600 mb-6">
            Ahora completa tu configuración en Stripe para empezar a recibir pagos directamente.
          </p>
          <a
            href={onboardingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configurar mi Cuenta Stripe 🔗
          </a>
          <div className="mt-4 text-sm text-gray-500">
            <p>📋 <strong>Que necesitarás:</strong></p>
            <ul className="text-left mt-2 space-y-1">
              <li>• DNI o documento de identidad</li>
              <li>• Datos bancarios (CBU/Alias)</li>
              <li>• Información del negocio</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        💼 Configura tu Cuenta de Cobros
      </h2>
      
      <div className="mb-6">
        <p className="text-gray-600 text-sm mb-4">
          Para recibir pagos directamente necesitas una cuenta Stripe Connect. 
          <strong> Solo toma 2-3 minutos configurarla.</strong>
        </p>
        
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium text-green-800 mb-2">✅ Ventajas:</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Recibes el dinero automáticamente</li>
            <li>• Solo se descuenta {3}% de comisión</li>
            <li>• Transferencias directas a tu cuenta</li>
            <li>• Historial completo de pagos</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de tu Negocio/Emprendimiento
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ej: Mi Tienda, Servicios Juan, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleCreateAccount}
          disabled={isCreating || !businessName.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? (
            <>
              <span className="animate-spin">⏳</span> Creando cuenta...
            </>
          ) : (
            '🚀 Crear mi Cuenta de Cobros'
          )}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Seguro y protegido por Stripe</p>
      </div>
    </div>
  );
};

export default ConnectOnboarding;
