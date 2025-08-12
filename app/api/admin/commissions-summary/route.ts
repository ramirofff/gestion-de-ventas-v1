// API para obtener el resumen de comisiones por usuario
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Traer comisiones agrupadas por usuario
    const { data, error } = await supabaseAdmin
      .from('commission_sales')
      .select('connected_account_id, commission_amount, status, created_at, connected_accounts!inner(user_id, business_name)')
      .eq('status', 'completed');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por usuario
    const resumen: Record<string, { user_id: string, business_name: string, total: number, ventas: number }> = {};
    for (const row of data) {
      // connected_accounts es un array por la relación many-to-one
      const connected = Array.isArray(row.connected_accounts) ? row.connected_accounts[0] : row.connected_accounts;
      const userId = connected?.user_id;
      const businessName = connected?.business_name;
      if (!userId) continue;
      if (!resumen[userId]) {
        resumen[userId] = { user_id: userId, business_name: businessName, total: 0, ventas: 0 };
      }
      resumen[userId].total += Number(row.commission_amount);
      resumen[userId].ventas += 1;
    }

  return NextResponse.json(Object.values(resumen));
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: err instanceof Error ? err.message : err }, { status: 500 });
  }
}
