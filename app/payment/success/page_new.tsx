'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎯 PaymentSuccess: Página cargada con sessionId:', sessionId);
    
    if (!sessionId) {
      console.error('❌ PaymentSuccess: No se encontró session_id');
      setError('No se encontró información de la sesión de pago');
      setLoading(false);
      return;
    }

    // Proceso simple: verificar pago y redirigir
    processPaymentAndRedirect();
  }, [sessionId, router]);

  const processPaymentAndRedirect = async () => {
    try {
      console.log('🔍 PaymentSuccess: Verificando pago y redirigiendo...');
      
      // Crear timeout para evitar carga indefinida
      const timeoutId = setTimeout(() => {
        console.log('⏰ PaymentSuccess: Timeout - redirigiendo de todas formas...');
        redirectToHome();
      }, 5000); // 5 segundos máximo
      
      // Usar el cliente de Supabase
      const { supabase } = await import('../../../lib/supabaseClient');
      
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        console.warn('⚠️ PaymentSuccess: No hay usuario autenticado, redirigiendo...');
        clearTimeout(timeoutId);
        redirectToHome();
        return;
      }

      // Verificar pago con timeout
      try {
        const verifyResponse = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId!,
            user_id: session.user.id
          })
        });
        
        clearTimeout(timeoutId);
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('✅ PaymentSuccess: Pago verificado, redirigiendo con éxito...');
          
          // Redirigir con flag de pago exitoso
          router.replace('/?payment=success');
          return;
        } else {
          console.warn('⚠️ PaymentSuccess: Verificación falló, redirigiendo de todas formas...');
        }
      } catch (fetchError) {
        console.error('❌ PaymentSuccess: Error en verificación:', fetchError);
        clearTimeout(timeoutId);
      }
      
      // Si llegamos aquí, redirigir de todas formas
      redirectToHome();
      
    } catch (error) {
      console.error('❌ PaymentSuccess: Error general:', error);
      redirectToHome();
    }
  };
  
  const redirectToHome = () => {
    console.log('🏠 PaymentSuccess: Redirigiendo a la página principal...');
    router.replace('/?payment=success');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error de Pago</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-4 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Procesando Pago</h3>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Verificando tu pago...' : 'Pago completado exitosamente'}
          </p>
          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
