"use client";
import { useState } from 'react';

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const testPaymentFlow = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Iniciando test de flujo de pago...');
      
      // Simular session_id de Stripe
      const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🔍 Testing con session_id:', mockSessionId);
      
      // Llamar al endpoint de test
      const response = await fetch('/api/test-payment-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: mockSessionId
        })
      });
      
      const testData = await response.json();
      console.log('📊 Datos de test recibidos:', testData);
      
      // Simular llamada al endpoint real de status
      const statusResponse = await fetch('/api/stripe/payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: mockSessionId
        })
      });
      
      const statusData = await statusResponse.json();
      console.log('📊 Respuesta del endpoint real:', statusData);
      
      setResult({
        mockData: testData,
        realEndpointResponse: statusData,
        sessionId: mockSessionId
      });
      
    } catch (error) {
      console.error('❌ Error en test:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testSuccessPage = () => {
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Abrir la página de éxito en nueva pestaña
    window.open(`/payment/success?session_id=${mockSessionId}`, '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🧪 Test de Flujo de Pago</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tests Disponibles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testPaymentFlow}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '🔄 Probando...' : '🧪 Test API Endpoints'}
            </button>
            
            <button
              onClick={testSuccessPage}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🎯 Test Página de Éxito
            </button>
          </div>
        </div>
        
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {result.error ? '❌ Resultado del Test' : '✅ Resultado del Test'}
            </h2>
            
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 Instrucciones de Test</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-2">
            <li><strong>Test API Endpoints:</strong> Verifica que los endpoints funcionen correctamente con datos simulados</li>
            <li><strong>Test Página de Éxito:</strong> Abre la página de éxito en nueva pestaña para ver el diseño</li>
            <li><strong>Test Completo:</strong> Ve a la página principal, agrega productos, y haz un pago real con Stripe</li>
          </ol>
        </div>
        
        <div className="mt-6">
          <a 
            href="/" 
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ← Volver al POS
          </a>
        </div>
      </div>
    </div>
  );
}
