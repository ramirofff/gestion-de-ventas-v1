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

    // Limpiar el payment_intent_id - puede venir como objeto o string
    let paymentIntentId: string;
    
    if (typeof payment_intent_id === 'string') {
      // Si viene como string, puede ser un JSON string o un ID limpio
      try {
        const parsed = JSON.parse(payment_intent_id);
        paymentIntentId = parsed.id || payment_intent_id;
      } catch {
        // No es JSON, usar como está
        paymentIntentId = payment_intent_id;
      }
    } else if (payment_intent_id?.id) {
      // Si viene como objeto, extraer el ID
      paymentIntentId = payment_intent_id.id;
    } else {
      console.error('❌ payment_intent_id inválido:', payment_intent_id);
      return NextResponse.json({ 
        success: false, 
        error: 'payment_intent_id inválido' 
      }, { status: 400 });
    }

    console.log('🔍 Usando payment_intent_id limpio:', paymentIntentId);

    // Obtener el payment intent de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
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
