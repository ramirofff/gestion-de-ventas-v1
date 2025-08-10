import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripeConnect';
import { createSale } from '../../../../lib/sales';

export async function POST(request: NextRequest) {
  console.log('🎯 API Simple: Procesamiento de pago simplificado iniciado');

  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID requerido' }, { status: 400 });
    }

    console.log('🔍 Obteniendo detalles de la sesión:', sessionId);

    // Obtener sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.price.product']
    });

    console.log('📦 Sesión de Stripe obtenida:', {
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'El pago no está confirmado',
        status: session.payment_status 
      }, { status: 400 });
    }

    // Procesar items de la sesión
    const stripeItems = session.line_items?.data.map((lineItem: any) => {
      const priceInDollars = lineItem.price.unit_amount / 100;
      return {
        id: lineItem.price.product || `stripe_${Date.now()}_${Math.random()}`,
        name: lineItem.description || lineItem.price.product_data?.name || 'Producto',
        price: priceInDollars,
        original_price: priceInDollars,
        quantity: lineItem.quantity,
        category: '',
        user_id: userId,
        image_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stock_quantity: 999999,
        inactive: false
      };
    }) || [];

    const totalFromStripe = (session.amount_total || 0) / 100;
    const subtotalFromStripe = (session.amount_subtotal || 0) / 100;

    console.log('💾 Creando venta simplificada:', { 
      items: stripeItems.length, 
      total: totalFromStripe,
      userId 
    });

    // Crear venta en la base de datos
    const saleResult = await createSale(
      stripeItems,
      totalFromStripe,
      userId,
      undefined, // clientId
      session.payment_intent as string,
      {
        stripe_session_id: sessionId,
        customer_email: session.customer_email,
        platform: 'stripe_checkout_simple'
      }
    );

    if (saleResult.error) {
      console.error('❌ Error creando venta:', saleResult.error);
      return NextResponse.json({ 
        error: 'Error creando la venta: ' + saleResult.error 
      }, { status: 500 });
    }

    console.log('✅ Venta creada exitosamente');

    return NextResponse.json({
      success: true,
      saleData: {
        id: Date.now().toString(),
        ticket_id: sessionId,
        created_at: new Date().toISOString(),
        products: stripeItems,
        items: stripeItems,
        total: totalFromStripe,
        subtotal: subtotalFromStripe,
        discount: subtotalFromStripe - totalFromStripe,
        payment_method: 'stripe',
        payment_status: 'completed',
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        user_id: userId
      }
    });

  } catch (error) {
    console.error('❌ Error en proceso simple:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
