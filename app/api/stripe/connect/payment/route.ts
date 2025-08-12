import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCommissionRateByUserId } from '../../../../../lib/stripeConnect';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      amount,
      currency = 'usd',
      product_name,
      user_id,
      user_email,
      stripe_account_id
    } = body;

    console.log('💳 Creando pago con Connect para:', user_email);


  // 1. Obtener comisión dinámica desde connected_accounts
  const commissionRate = await getCommissionRateByUserId(user_id);
  const feeAmount = Math.round(amount * commissionRate); // En centavos
  const clientReceives = amount - feeAmount;

  console.log(`💰 Pago: $${amount/100} | Comisión: $${feeAmount/100} (${(commissionRate*100).toFixed(2)}%) | Cliente recibe: $${clientReceives/100}`);

    // 2. Crear Stripe Customer o usar existente
    const customers = await stripe.customers.list({ 
      email: user_email,
      limit: 1 
    });
    
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user_email,
        metadata: { user_id }
      });
    }

    // 3. Crear Checkout Session con Connect
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      customer_update: {
        name: 'never',
        address: 'never'
      },
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: product_name || 'Producto/Servicio',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.nextUrl.origin}/?cancelled=true`,
      payment_intent_data: {
        application_fee_amount: feeAmount,
        on_behalf_of: stripe_account_id,
        transfer_data: {
          destination: stripe_account_id,
        },
        metadata: {
          user_id: user_id,
          product_name: product_name || 'Producto/Servicio',
          commission_rate: commissionRate.toString(),
          client_receives_cents: clientReceives.toString()
        }
      },
      metadata: {
        user_id: user_id,
        stripe_account_id: stripe_account_id,
  commission_amount: feeAmount.toString(),
      }
    });

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      payment_details: {
        total_amount: amount / 100,
  commission: feeAmount / 100,
  client_receives: clientReceives / 100,
  commission_rate: commissionRate
      }
    });

  } catch (error: any) {
    console.error('Error creando pago Connect:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando pago' },
      { status: 500 }
    );
  }
}
