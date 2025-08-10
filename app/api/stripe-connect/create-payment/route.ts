// app/api/stripe-connect/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentWithCommission } from '../../../../lib/stripeConnect';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('💳 API: Creando pago con comisión...');
    
    const body = await request.json();
    const { 
      userId,
      userEmail,
      connectedAccountId, 
      amount, 
      productName, 
      customerEmail,
      commissionRate = 0.05,
      currency = 'usd',
      isQRPayment = false, // Nuevo parámetro para QR
      cartData = [] // Agregar datos del carrito
    } = body;

    // Validar que se haya enviado la información del usuario
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Información de usuario requerida' },
        { status: 400 }
      );
    }

    console.log('👤 Usuario:', userEmail);

    // Validar datos
    if (!connectedAccountId || !amount || !productName) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: connectedAccountId, amount, productName' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que la cuenta conectada existe y pertenece al usuario
    console.log('🔍 Buscando cuenta para:', { userId, connectedAccountId });
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('stripe_account_id', connectedAccountId)
      .eq('user_id', userId)
      .single();

    console.log('📊 Resultado búsqueda cuenta:', { 
      found: !!accountData, 
      error: accountError?.message,
      accountId: accountData?.stripe_account_id,
      businessName: accountData?.business_name
    });

    if (accountError || !accountData) {
      console.log('❌ Error detallado:', accountError);
      return NextResponse.json(
        { error: 'Cuenta conectada no encontrada o no autorizada' },
        { status: 403 }
      );
    }

    console.log('🏢 Cuenta conectada encontrada:', accountData.business_name);
    console.log('👤 Usuario autenticado:', userEmail);

    // Crear sesión de pago con comisión (usar el email del usuario si no se proporciona customerEmail)
    const session = await createPaymentWithCommission({
      connectedAccountId,
      amount: parseFloat(amount),
      commissionRate: parseFloat(commissionRate),
      currency,
      productName,
      customerEmail: customerEmail || userEmail, // Usar automáticamente el email del usuario
      isQRPayment: isQRPayment, // Pasar el parámetro QR
      cartData: cartData, // Pasar los datos del carrito
    });

    console.log('✅ Sesión de pago creada:', session.id);
    console.log('📝 Payment Intent ID:', session.payment_intent);

    // Guardar venta en base de datos
    const commissionAmount = Math.round(amount * commissionRate);
    const netAmount = amount - commissionAmount;

    // Para sesiones de Checkout, el payment_intent puede ser null inicialmente
    // Usaremos el session_id como referencia principal
    const { error: insertError } = await supabaseAdmin
      .from('commission_sales')
      .insert([{
        connected_account_id: accountData.id,
        stripe_payment_intent_id: session.payment_intent as string || null, // Permitir null temporalmente
        stripe_session_id: session.id,
        customer_email: customerEmail || userEmail, // Usar email del usuario
        product_name: productName,
        amount_total: amount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        currency: currency.toUpperCase(),
        status: 'pending',
      }]);

    if (insertError) {
      console.error('❌ Error guardando venta:', insertError);
    } else {
      console.log('💾 Venta guardada en BD');
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      payment_url: session.url, // Cambiado de checkoutUrl a payment_url
      commission: {
        total: amount,
        commission: commissionAmount,
        clientReceives: netAmount,
        rate: commissionRate * 100,
      },
    });

  } catch (error) {
    console.error('❌ Error en create-payment:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
