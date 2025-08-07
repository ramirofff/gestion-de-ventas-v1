import { NextRequest, NextResponse } from 'next/server';
import { createSale } from '../../../lib/sales';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST: Iniciando test de creación de venta');
    
    // Datos de prueba
    const testCart = [
      {
        id: 'test-product-1',
        user_id: '964dcf29-ec1e-4b9d-bf74-5de614862ad4',
        name: 'Producto Test',
        price: 10.00,
        original_price: 10.00,
        quantity: 1,
        category: 'Test Category',
        image_url: '',
        created_at: new Date().toISOString()
      }
    ];
    
    const testUserId = '964dcf29-ec1e-4b9d-bf74-5de614862ad4'; // ID del usuario real
    const testTotal = 10.00;
    
    console.log('🧪 Datos de prueba:', {
      cart: testCart,
      userId: testUserId,
      total: testTotal
    });
    
    const result = await createSale(
      testCart,
      testTotal,
      testUserId,
      undefined, // clientId
      'test_payment_intent_' + Date.now(), // Stripe payment intent test
      {
        test: true,
        timestamp: new Date().toISOString()
      }
    );
    
    console.log('🧪 Resultado del test:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Test de creación de venta completado',
      result: result
    });
    
  } catch (error: any) {
    console.error('🧪 Error en test de venta:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error desconocido',
        details: error
      },
      { status: 500 }
    );
  }
}
