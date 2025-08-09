import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { payment_intent_id } = await request.json();
    
    if (!payment_intent_id) {
      return NextResponse.json(
        { error: 'payment_intent_id es requerido' },
        { status: 400 }
      );
    }

    console.log('🧾 Obteniendo recibo para payment_intent:', payment_intent_id);

    // Obtener el payment intent de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Payment intent no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el charge asociado al payment intent
    let receiptUrl = null;
    
    if (paymentIntent.latest_charge) {
      const chargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;
        
      const charge = await stripe.charges.retrieve(chargeId);
      receiptUrl = charge.receipt_url;
    }

    console.log('✅ Recibo URL obtenida:', receiptUrl);

    return NextResponse.json({
      receipt_url: receiptUrl,
      payment_intent_id: payment_intent_id,
      amount: paymentIntent.amount / 100, // Convertir de centavos
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('❌ Error obteniendo recibo de Stripe:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
