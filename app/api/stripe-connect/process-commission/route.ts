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
      customerEmail 
    } = body;

    if (!userId || !stripePaymentIntentId || !saleAmount) {
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

    // 3. Verificar si ya existe una comisión para este payment intent
    const { data: existingCommission } = await supabaseAdmin
      .from('commission_sales')
      .select('id')
      .eq('stripe_payment_intent_id', stripePaymentIntentId)
      .single();

    if (existingCommission) {
      console.log('⚠️ Comisión ya procesada para este payment intent');
      return NextResponse.json({
        processed: true,
        message: 'Comisión ya procesada anteriormente',
        isDuplicate: true
      });
    }

    // 4. Guardar registro de comisión
    const productNames = saleItems?.map((item: any) => item.name).join(', ') || 'Venta';
    
    const { data: commissionSale, error: insertError } = await supabaseAdmin
      .from('commission_sales')
      .insert([{
        connected_account_id: connectedAccount.id,
        stripe_payment_intent_id: stripePaymentIntentId,
        customer_email: customerEmail,
        product_name: productNames,
        amount_total: saleAmount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        currency: 'usd',
        status: 'completed',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error guardando comisión:', insertError);
      return NextResponse.json(
        { error: 'Error guardando registro de comisión' },
        { status: 500 }
      );
    }

    console.log('✅ Comisión guardada exitosamente:', commissionSale.id);

    // 5. Para cuentas reales (no Argentina), crear transfer automático
    if (connectedAccount.country !== 'AR' && connectedAccount.charges_enabled) {
      try {
        console.log('💸 Creando transfer automático a cuenta real...');
        
        const transfer = await stripe.transfers.create({
          amount: Math.round(netAmount * 100), // Convertir a centavos
          currency: 'usd',
          destination: connectedAccount.stripe_account_id,
          metadata: {
            commission_sale_id: commissionSale.id,
            original_payment_intent: stripePaymentIntentId,
          }
        });

        // Actualizar registro con transfer ID
        await supabaseAdmin
          .from('commission_sales')
          .update({ transfer_id: transfer.id })
          .eq('id', commissionSale.id);

        console.log('✅ Transfer automático creado:', transfer.id);
      } catch (transferError) {
        console.error('⚠️ Error creando transfer (continuando):', transferError);
      }
    }

    return NextResponse.json({
      processed: true,
      message: 'Comisión procesada exitosamente',
      commission: {
        id: commissionSale.id,
        amount: commissionAmount,
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
