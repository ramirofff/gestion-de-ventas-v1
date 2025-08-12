import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// Returns all users with connected Stripe accounts for admin panel
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('user_id, business_name, email, stripe_account_id')
    .order('business_name', { ascending: true });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }
  return NextResponse.json(data || []);
}
