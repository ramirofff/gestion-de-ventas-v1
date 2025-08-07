import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, 
      currency = 'usd', 
      description, 
      items = [],
      customer_email,
      success_url,
      cancel_url 
    } = body;

    // Validaciones
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Configurar URLs de retorno
    const defaultSuccessUrl = `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${request.nextUrl.origin}/payment/cancel`;

    // Crear líneas de productos para Stripe
    const lineItems = items.map((item: {
      name: string;
      price: number;
      quantity: number;
      description?: string;
    }) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name || 'Producto',
          description: item.description || '',
        },
        unit_amount: Math.round(item.price * 100), // Stripe usa centavos
      },
      quantity: item.quantity || 1,
    }));

    // Si no hay items específicos, crear uno genérico
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: currency,
          product_data: {
            name: description || 'Venta',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      });
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Tarjetas internacionales (perfecto para Argentina)
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || defaultSuccessUrl,
      cancel_url: cancel_url || defaultCancelUrl,
      customer_email: customer_email || undefined,
      metadata: {
        description: description || '',
        created_at: new Date().toISOString(),
        merchant_country: 'AR', // Identificar comerciantes argentinos
      },
      // Configuración optimizada para Argentina recibiendo pagos internacionales
      billing_address_collection: 'auto', 
      allow_promotion_codes: true, 
      payment_intent_data: {
        receipt_email: customer_email || undefined,
      },
      // Optimizado para turistas/clientes internacionales
      locale: 'es', // Formulario en español
      submit_type: 'pay', // Botón optimizado
      phone_number_collection: { enabled: false }, // No necesario para turistas
    });

    return NextResponse.json({
      payment_url: session.url,
      session_id: session.id,
      amount: amount,
      currency: currency.toUpperCase(),
    });

  } catch (error: unknown) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
