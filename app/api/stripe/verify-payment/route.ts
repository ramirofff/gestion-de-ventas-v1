import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const { session_id, user_id } = await request.json();
    
    console.log('🔍 SERVER: Verificando pago completado para session:', session_id);
    console.log('🔍 SERVER: User ID recibido:', user_id);

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar el estado del pago en Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent']
    });

    console.log('📊 SERVER: Estado del pago:', {
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total
    });

    // Si el pago no está completado, devolver mensaje de espera
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Pago aún no completado',
        payment_status: session.payment_status
      });
    }

    // Recuperar datos del carrito guardados en los metadatos de la sesión
    const cartData = JSON.parse(session.metadata?.cart_data || '[]');
    const total = session.amount_total ? session.amount_total / 100 : 0; // Stripe maneja centavos

    console.log('🛒 SERVER: Datos del carrito recuperados:', {
      items_count: cartData.length,
      total: total
    });

    if (cartData.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron datos del carrito en la sesión' },
        { status: 400 }
      );
    }

    // ENFOQUE HÍBRIDO: En lugar de insertar aquí, devolver los datos al cliente
    console.log('✅ SERVER: Pago verificado, devolviendo datos al cliente para procesamiento...');

    return NextResponse.json({
      success: true,
      message: 'Pago verificado exitosamente',
      payment_verified: true,
      cart_data: cartData,
      total: total,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent?.id,
      session_id: session_id,
      customer_email: session.customer_details?.email,
      metadata: {
        stripe_session_id: session_id,
        customer_email: session.customer_details?.email,
        platform_fee: total * 0.03,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ SERVER: Error en verify-payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
