import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      items, 
      client_account_id, // ID de la cuenta conectada del cliente argentino
      platform_fee_percent = 3, // Tu comisión
      success_url,
      cancel_url 
    } = body;

    // Calcular total y comisión
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    );
    
    const platform_fee = Math.round(subtotal * (platform_fee_percent / 100));
    const client_amount = subtotal - platform_fee;

    // Crear sesión de checkout con transferencia automática
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `Vendido por: ${client_account_id}`,
          },
          unit_amount: Math.round(item.price * 100), // Centavos
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: success_url || `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${request.nextUrl.origin}/payment/cancel`,
      
      // Configuración de transferencia automática
      payment_intent_data: {
        application_fee_amount: platform_fee, // Tu comisión en centavos
        transfer_data: {
          destination: client_account_id, // Cuenta del cliente argentino
        },
      },
      
      // Metadata para tracking
      metadata: {
        client_account_id: client_account_id,
        platform_fee_percent: platform_fee_percent.toString(),
        client_amount: client_amount.toString(),
        platform_fee: platform_fee.toString(),
      },

      // Configuración para Argentina
      locale: 'es',
      billing_address_collection: 'required',
      shipping_address_collection: undefined, // Sin envío para POS
    });

    return NextResponse.json({
      success: true,
      session_id: session.id,
      payment_url: session.url,
      breakdown: {
        subtotal: subtotal / 100, // Convertir a dólares
        platform_fee: platform_fee / 100,
        client_receives: client_amount / 100,
        platform_fee_percent,
      }
    });

  } catch (error: any) {
    console.error('Error creating marketplace payment:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear pago marketplace'
      },
      { status: 400 }
    );
  }
}
