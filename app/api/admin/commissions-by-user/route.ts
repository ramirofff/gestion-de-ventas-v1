
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// Returns all commission details for a given user_id
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json([], { status: 400 });
  }
  // Buscar el stripe_account_id correspondiente al user_id
  const { data: accounts, error: accError } = await supabaseAdmin
    .from('connected_accounts')
    .select('stripe_account_id')
    .eq('user_id', user_id)
    .maybeSingle();
  if (accError || !accounts || !accounts.stripe_account_id) {
    return NextResponse.json([], { status: 200 });
  }
  const stripe_account_id = accounts.stripe_account_id;
  // Buscar solo comisiones completadas por connected_account_id
  const { data, error } = await supabaseAdmin
    .from('commission_sales')
    .select('id, amount_total, commission_amount, net_amount, product_name, created_at, status, currency')
    .eq('connected_account_id', stripe_account_id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json([], { status: 500 });
  }
  return NextResponse.json(data || []);
}
