// app/api/debug/stripe-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Listando todas las cuentas conectadas...');

    // Obtener todas las cuentas conectadas
    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo cuentas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📊 Total de cuentas encontradas: ${accounts?.length || 0}`);

    return NextResponse.json({
      success: true,
      totalAccounts: accounts?.length || 0,
      accounts: accounts?.map(account => ({
        id: account.id,
        user_id: account.user_id,
        stripe_account_id: account.stripe_account_id,
        business_name: account.business_name,
        email: account.email,
        status: account.status,
        created_at: account.created_at
      })) || []
    });

  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
