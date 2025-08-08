"use client";
import { useState } from 'react';
import { createSale } from '../../lib/sales';

export default function TestSalePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCreateSale = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 TEST: Iniciando prueba de createSale...');
      
      const testCart = [
        {
          id: 'test-product-1',
          name: 'Test Product',
          price: 10,
          original_price: 10,
          quantity: 1,
          user_id: '964dcf29-ec1e-4b9d-bf74-5de614862ad4',
          image_url: '',
          category: 'test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stock_quantity: 100,
          inactive: false
        }
      ];
      
      const result = await createSale(
        testCart,
        10,
        '964dcf29-ec1e-4b9d-bf74-5de614862ad4',
        undefined,
        'test-payment-intent-' + Date.now(),
        { test: true }
      );
      
      console.log('🧪 TEST: Resultado:', result);
      setResult(result);
      
    } catch (error) {
      console.error('🧪 TEST: Error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test CreateSale Function</h1>
      
      <button
        onClick={testCreateSale}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test CreateSale'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
