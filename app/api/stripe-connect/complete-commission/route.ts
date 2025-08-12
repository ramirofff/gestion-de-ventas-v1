// Este endpoint recibe un payment_intent_id y actualiza la comisión y el status a 'completed' en commission_sales
// Solo debe llamarse cuando el pago fue confirmado exitosamente
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { payment_intent_id } = await request.json();
    if (!payment_intent_id) {
      return NextResponse.json({ error: 'Falta payment_intent_id' }, { status: 400 });
    }

    // Buscar la comisión pendiente
    const { data: commission, error } = await supabaseAdmin
      .from('commission_sales')
      .select('*')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .eq('status', 'pending')
      .single();

    if (error || !commission) {
      return NextResponse.json({ error: 'No se encontró comisión pendiente para este payment_intent_id' }, { status: 404 });
    }

    // Obtener el rate correcto de la cuenta conectada
    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('commission_rate')
      .eq('id', commission.connected_account_id)
      .single();

    const commissionRate = account?.commission_rate || 0.05;
    const commissionAmount = Math.round(Number(commission.amount_total) * commissionRate * 100) / 100;
    const netAmount = Number(commission.amount_total) - commissionAmount;

    // Actualizar la comisión y el status
    const { error: updateError } = await supabaseAdmin
      .from('commission_sales')
      .update({
        commission_amount: commissionAmount,
        net_amount: netAmount,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', commission.id);

    if (updateError) {
      return NextResponse.json({ error: 'Error actualizando comisión' }, { status: 500 });
    }

    return NextResponse.json({ success: true, commission_id: commission.id, commissionAmount, netAmount });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: err instanceof Error ? err.message : err }, { status: 500 });
  }
}
