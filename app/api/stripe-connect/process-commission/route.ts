// app/api/stripe-connect/process-commission/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    console.log('💳 API: Procesando comisión para venta completada...');

    const body = await request.json();
    const { 
      userId,
      stripePaymentIntentId,
      saleAmount,
      saleItems,
      customerEmail,
      stripeSessionId
    } = body;

    // Permitir que stripePaymentIntentId sea null si stripeSessionId está presente (caso QR)
    if (!userId || !saleAmount || (!stripePaymentIntentId && !body.stripeSessionId)) {
      return NextResponse.json(
        { error: 'Datos requeridos faltantes' },
        { status: 400 }
      );
    }

    console.log('📊 Procesando comisión:', {
      userId,
      stripePaymentIntentId,
      saleAmount,
      customerEmail
    });

    // 1. Obtener cuenta conectada del usuario
    const { data: connectedAccount, error: accountError } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (accountError || !connectedAccount) {
      console.log('ℹ️ No hay cuenta conectada para este usuario, procesando sin comisión');
      return NextResponse.json({
        processed: false,
        message: 'No hay cuenta conectada configurada'
      });
    }

    console.log('✅ Cuenta conectada encontrada:', connectedAccount.business_name);

    // 2. Calcular comisiones
    const commissionRate = connectedAccount.commission_rate;
    const commissionAmount = Math.round(saleAmount * commissionRate * 100) / 100; // Redondear a 2 decimales
    const netAmount = saleAmount - commissionAmount;

    console.log('💰 Cálculo de comisiones:', {
      totalAmount: saleAmount,
      commissionRate: `${(commissionRate * 100)}%`,
      commissionAmount,
      netAmount
    });

    // Buscar registro pending existente por payment_intent_id o session_id (QR)
    let commission = null;
    let error = null;
    let res = null;
    if (stripePaymentIntentId) {
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('stripe_payment_intent_id', stripePaymentIntentId)
        .ilike('status', 'pending');
      commission = res.data && res.data[0];
      error = res.error;
      console.log('[COMMISSION] Buscando por payment_intent_id:', stripePaymentIntentId, 'Resultado:', commission?.id, 'Error:', error);
    }
    // Buscar por session_id (QR) aunque stripePaymentIntentId sea null
    if ((!commission || error) && stripeSessionId) {
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('stripe_session_id', stripeSessionId)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      commission = res.data && res.data[0];
      error = res.error;
      console.log('[COMMISSION] Buscando por session_id:', stripeSessionId, 'Resultado:', commission?.id, 'Error:', error);
    }
    // Si aún no se encontró, buscar por monto/email
    if ((!commission || error) && customerEmail && saleAmount) {
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('amount_total', saleAmount)
        .eq('customer_email', customerEmail)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      commission = res.data && res.data[0];
      error = res.error;
      console.log('[COMMISSION] Buscando por monto/email:', saleAmount, customerEmail, 'Resultado:', commission?.id, 'Error:', error);
    }
    if (error || !commission) {
      console.warn('No se encontró comisión pending para este pago. No se crea duplicado.');
      return NextResponse.json({
        processed: false,
        message: 'No se encontró comisión pending para este pago',
        isDuplicate: false
      }, { status: 404 });
    }
    // Actualizar status a completed y setear updated_at
    // También actualizar stripe_account_id si está null
    const updateFields: any = {
      status: 'completed',
      updated_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId || commission.stripe_payment_intent_id
    };
    if (!commission.stripe_account_id && connectedAccount.stripe_account_id) {
      updateFields.stripe_account_id = connectedAccount.stripe_account_id;
    }
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('commission_sales')
      .update(updateFields)
      .eq('id', commission.id)
      .select();
    console.log('[COMMISSION] Intentando actualizar registro:', commission.id, 'Campos:', updateFields, 'Resultado:', updateResult, 'Error:', updateError);
    if (updateError) {
      console.error('❌ Error actualizando comisión:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando registro de comisión' },
        { status: 500 }
      );
    }
    if (!updateResult || updateResult.length === 0) {
      console.error('❌ No se actualizó ningún registro de comisión.');
      return NextResponse.json(
        { error: 'No se actualizó ningún registro de comisión' },
        { status: 500 }
      );
    }
    // Transfer automático solo si corresponde
    if (connectedAccount.country !== 'AR' && connectedAccount.charges_enabled) {
      try {
        console.log('💸 Creando transfer automático a cuenta real...');
        const transfer = await stripe.transfers.create({
          amount: Math.round((commission.net_amount || 0) * 100),
          currency: 'usd',
          destination: connectedAccount.stripe_account_id,
          metadata: {
            commission_sale_id: commission.id,
            original_payment_intent: stripePaymentIntentId,
          }
        });
        // Actualizar registro con transfer ID
        await supabaseAdmin
          .from('commission_sales')
          .update({ transfer_id: transfer.id })
          .eq('id', commission.id);
        console.log('✅ Transfer automático creado:', transfer.id);
      } catch (transferError) {
        console.error('⚠️ Error creando transfer (continuando):', transferError);
      }
    }
    return NextResponse.json({
      processed: true,
      message: 'Comisión completada exitosamente',
      commission: {
        id: commission.id,
        amount: commission.commission_amount,
        rate: commissionRate,
        businessName: connectedAccount.business_name,
        country: connectedAccount.country,
        isManualTransfer: connectedAccount.country === 'AR'
      }
    });

  } catch (error) {
    console.error('❌ Error procesando comisión:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
