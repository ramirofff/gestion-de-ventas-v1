import { NextRequest, NextResponse } from 'next/server';
import { createSale } from '../../../../lib/sales';
import { ClientAccountManager } from '../../../../lib/client-accounts';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payment_intent_id, user_id, cart, total, client_email } = body;

    console.log('📝 Payment completion handler:', {
      payment_intent_id,
      user_id,
      client_email,
      total,
      cart_length: cart?.length
    });

    // Validar datos requeridos
    if (!payment_intent_id || !user_id || !cart || !total) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar el estado del payment intent en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago no ha sido completado exitosamente' },
        { status: 400 }
      );
    }

    // Guardar la venta en la base de datos
    const saleCreated = await createSale(
      cart,
      total,
      user_id,
      undefined, // client_id ya no necesario
      payment_intent_id,
      {
        stripe_payment_intent: paymentIntent,
        client_email: client_email,
        authenticated_user: user_id,
        platform_fee: total * 0.03 // 3% fijo
      }
    );

    if (!saleCreated) {
      return NextResponse.json(
        { error: 'Error al guardar la venta' },
        { status: 500 }
      );
    }

    console.log('✅ Venta guardada exitosamente para payment intent:', payment_intent_id);
    console.log('👤 Cliente:', client_email);

    return NextResponse.json({
      success: true,
      payment_intent_id,
      client_email,
      user_id
    });

  } catch (error: any) {
    console.error('Error in payment completion handler:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
