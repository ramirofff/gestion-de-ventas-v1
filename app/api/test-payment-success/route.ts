import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Se requiere session_id' },
        { status: 400 }
      );
    }

    // Simular datos de una sesión de Stripe exitosa
    const mockStripeSession = {
      success: true,
      message: 'Pago verificado exitosamente',
      session_details: {
        status: 'complete',
        payment_status: 'paid',
        amount_total: 1000, // $10.00 en centavos
        amount_subtotal: 1200, // $12.00 en centavos (con descuento de $2)
        currency: 'usd',
        customer_email: 'test@example.com',
        payment_intent_id: `pi_test_${Date.now()}`,
        line_items: [
          {
            id: 'li_test_1',
            description: 'Hamburguesa Clásica',
            quantity: 2,
            price: {
              id: 'price_test_1',
              unit_amount: 500, // $5.00 en centavos
              currency: 'usd',
              product: 'prod_test_hamburguesa'
            }
          },
          {
            id: 'li_test_2', 
            description: 'Papas Fritas',
            quantity: 1,
            price: {
              id: 'price_test_2',
              unit_amount: 200, // $2.00 en centavos
              currency: 'usd',
              product: 'prod_test_papas'
            }
          }
        ]
      }
    };

    console.log('🧪 TEST: Enviando datos simulados de pago exitoso');
    
    return NextResponse.json(mockStripeSession);

  } catch (error: any) {
    console.error('❌ Error en test de pago:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error en simulación de pago'
      },
      { status: 500 }
    );
  }
}
