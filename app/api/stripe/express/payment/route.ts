import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../../lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_id, amount, currency = 'usd', application_fee_amount } = body;

    if (!account_id || !amount) {
      return NextResponse.json(
        { error: 'Account ID and amount are required' },
        { status: 400 }
      );
    }

    // Crear Payment Intent para la cuenta Express
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency: currency,
      application_fee_amount: application_fee_amount ? Math.round(application_fee_amount * 100) : undefined,
      transfer_data: {
        destination: account_id,
      },
      metadata: {
        express_account_id: account_id,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
