import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe-server';

// Endpoint específico para la página HTML estática de payment-success
// No requiere autenticación, solo obtiene datos públicos del pago
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    
    console.log('🔍 STATIC: Obteniendo detalles para página estática, session:', session_id);

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar el estado del pago en Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'line_items']
    });

    console.log('📊 STATIC: Estado del pago:', {
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total
    });

    // Si el pago no está completado, devolver estado
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Pago aún no completado',
        payment_status: session.payment_status
      });
    }

    // Obtener URL del ticket oficial de Stripe si existe
    let stripeReceiptUrl = null;
    if (session.payment_intent && typeof session.payment_intent === 'object') {
      const paymentIntent = session.payment_intent;
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          stripeReceiptUrl = charge.receipt_url;
    console.log('🧾 STATIC: URL del ticket oficial de Stripe:', stripeReceiptUrl);
        } catch (error) {
          console.log('⚠️ No se pudo obtener el ticket oficial de Stripe');
        }
      }
    }

    // ============ PROCESAR VENTA AUTOMÁTICAMENTE PARA QR ============
    // Intentar procesar la venta automáticamente cuando se accede desde celular
    try {
      console.log('💾 STATIC: Intentando procesar venta automáticamente...');
      
      // Obtener userId desde metadata de la sesión
      const userId = session.metadata?.userId;
      
      if (userId && session.payment_intent) {
        console.log('💾 STATIC: Procesando venta para userId:', userId);
        
        // Llamar al endpoint de procesamiento simple
        const processResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3009'}/api/stripe/process-payment-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session_id,
            userId: userId
          })
        });

        if (processResponse.ok) {
          const result = await processResponse.json();
          console.log('✅ STATIC: Venta procesada automáticamente:', result);
        } else {
          console.error('❌ STATIC: Error procesando venta automáticamente:', processResponse.status);
        }
      } else {
        console.log('⚠️ STATIC: No se puede procesar venta - datos faltantes:', {
          hasUserId: !!userId,
          hasPaymentIntent: !!session.payment_intent
        });
      }
    } catch (error) {
      console.error('❌ STATIC: Error en procesamiento automático de venta:', error);
    }
    // ============ FIN PROCESAMIENTO AUTOMÁTICO ============

    // Intentar obtener datos del carrito desde metadata
    let cartData = [];
    try {
      cartData = JSON.parse(session.metadata?.cart_data || '[]');
    } catch (error) {
      console.log('⚠️ No se pudieron parsear los metadatos del carrito, usando line_items');
    }

    // Si no hay datos en metadata, usar line_items
    if (cartData.length === 0 && session.line_items?.data) {
      cartData = session.line_items.data.map(item => ({
        name: item.description || 'Producto',
        price: (item.price?.unit_amount || 0) / 100,
        quantity: item.quantity || 1,
        original_price: (item.price?.unit_amount || 0) / 100
      }));
    }

    const total = session.amount_total ? session.amount_total / 100 : 0;

    console.log('🛒 STATIC: Datos del carrito preparados:', {
      items_count: cartData.length,
      total: total
    });

    return NextResponse.json({
      success: true,
      message: 'Detalles obtenidos exitosamente',
      cart_data: cartData,
      total: total,
      customer_email: session.customer_details?.email,
      transaction_id: session_id.slice(-8),
      payment_status: session.payment_status,
      currency: session.currency || 'usd',
      stripe_receipt_url: stripeReceiptUrl // URL del ticket oficial de Stripe
    });

  } catch (error: any) {
    console.error('❌ STATIC: Error obteniendo detalles:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
