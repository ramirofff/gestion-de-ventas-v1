// Este endpoint recibe un payment_intent_id y actualiza la comisión y el status a 'completed' en commission_sales
// Solo debe llamarse cuando el pago fue confirmado exitosamente
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {

  const { payment_intent_id, session_id, amount_total, customer_email } = await request.json();
    if (!payment_intent_id && !session_id) {
      return NextResponse.json({ error: 'Falta payment_intent_id o session_id' }, { status: 400 });
    }

    // Buscar la comisión pending existente (por session_id, payment_intent_id, o heurística)
    let commission = null;
    let error = null;
    let res = null;
    if (session_id) {
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('stripe_session_id', session_id)
        .ilike('status', 'pending');
      commission = res.data && res.data[0];
      error = res.error;
    }
    if ((!commission || error) && payment_intent_id) {
      // Buscar si ya existe un registro completed para este payment_intent_id
      const completedRes = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .ilike('status', 'completed');
      if (completedRes.data && completedRes.data.length > 0) {
        // Ya existe, no hacer nada
        return NextResponse.json({ success: true, message: 'Comisión ya completada', commission_id: completedRes.data[0].id });
      }
      // Buscar el registro pending más reciente sin payment_intent_id
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .is('stripe_payment_intent_id', null)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      commission = res.data && res.data[0];
      error = res.error;
    }
    if ((!commission || error) && payment_intent_id) {
      // Heurística: buscar por amount_total, email y status pending
      res = await supabaseAdmin
        .from('commission_sales')
        .select('*')
        .eq('amount_total', amount_total)
        .eq('customer_email', customer_email)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      commission = res.data && res.data[0];
      error = res.error;
    }
    if (error || !commission) {
      console.warn('No se encontró comisión pending para este pago. No se crea duplicado.');
      return NextResponse.json({ error: 'No se encontró comisión pending para este pago' }, { status: 404 });
    }

    // Solo actualizar status y payment_intent_id, nunca recalcular comisión/net_amount
    const { error: updateError } = await supabaseAdmin
      .from('commission_sales')
      .update({
        status: 'completed',
        stripe_payment_intent_id: payment_intent_id || commission.stripe_payment_intent_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', commission.id);

    if (updateError) {
      return NextResponse.json({ error: 'Error actualizando comisión' }, { status: 500 });
    }

    return NextResponse.json({ success: true, commission_id: commission.id });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: err instanceof Error ? err.message : err }, { status: 500 });
  }
}
