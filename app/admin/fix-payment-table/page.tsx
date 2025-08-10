// app/admin/fix-payment-table/page.tsx
'use client';

import { useState } from 'react';

export default function FixPaymentTablePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFix = async () => {
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/admin/fix-payment-table', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ Éxito: ${data.message}`);
      } else {
        setResult(`❌ Error: ${data.error}\n\n${data.message || ''}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔧 Arreglar Tabla commission_sales
        </h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            <strong>⚠️ Problema:</strong> La columna stripe_payment_intent_id no permite valores NULL, 
            pero para sesiones de Stripe Checkout el payment_intent se crea después.
          </p>
          <p className="text-yellow-800 mt-2">
            <strong>🔧 Solución:</strong> Modificar la tabla para permitir valores NULL temporalmente.
          </p>
        </div>

        <button
          onClick={handleFix}
          disabled={loading}
          className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
            loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? '⏳ Ejecutando fix...' : '🔧 Ejecutar Fix de Base de Datos'}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Resultado:</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Si el fix automático falla:</h3>
          <p className="text-blue-800 text-sm mb-2">
            Ve a tu panel de Supabase → SQL Editor y ejecuta manualmente:
          </p>
          <code className="block bg-blue-100 p-2 rounded text-sm text-blue-900">
            ALTER TABLE commission_sales ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;
          </code>
        </div>

        <div className="mt-4">
          <a
            href="/"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
