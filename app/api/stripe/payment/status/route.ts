import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../../lib/stripe-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verificando estado del pago para session:', sessionId);

    // Obtener información de la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    console.log('📊 Estado de la sesión:', {
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      session_id: sessionId
    });

    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email || null,
      payment_intent: session.payment_intent,
    });

  } catch (error: unknown) {
    console.error('❌ Error checking payment status:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, user_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verificando pago completo para session:', session_id, 'user:', user_id);

    // Obtener información completa de la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent', 'customer']
    });

    console.log('📊 Detalles completos de la sesión:', {
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      amount_subtotal: session.amount_subtotal,
      line_items: session.line_items?.data?.length || 0
    });

    // Verificar que el pago fue exitoso
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        message: 'El pago no ha sido completado',
        payment_status: session.payment_status
      });
    }

    // Obtener los line items con detalles completos
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, {
      expand: ['data.price.product']
    });

    return NextResponse.json({
      success: true,
      message: 'Pago verificado exitosamente',
      session_details: {
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        amount_subtotal: session.amount_subtotal,
        currency: session.currency,
        customer_email: session.customer_details?.email || null,
        payment_intent_id: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id || null,
        line_items: lineItems.data.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: {
            id: item.price?.id,
            unit_amount: item.price?.unit_amount,
            currency: item.price?.currency,
            product: item.price?.product
          }
        }))
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error verificando pago:', error);
    return NextResponse.json(
      { 
        success: false,
        error: (error as Error).message || 'Error al verificar el pago' 
      },
      { status: 500 }
    );
  }
}
