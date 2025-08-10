// app/api/stripe-connect/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API: Verificando estado de Stripe Connect...');

    const body = await request.json();
    const { userId } = body;

    console.log('👤 Verificando para usuario:', userId);

    // Validar que se haya enviado el userId
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Buscar cuenta conectada
    console.log('🔍 Buscando cuenta para userId:', userId);
    const { data: connectedAccounts, error: accountError } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId);

    console.log('📊 Resultado de búsqueda:', { 
      accountsFound: connectedAccounts?.length || 0,
      error: accountError ? accountError.message : 'SIN ERROR'
    });

    if (accountError) {
      // Detectar si es error de tabla inexistente
      if (accountError.message?.includes('relation "connected_accounts" does not exist')) {
        console.log('🚨 TABLA NO EXISTE - Ejecutar SQL en Supabase');
        return NextResponse.json({
          connected: false,
          error: 'database_not_setup',
          message: 'Base de datos no configurada. Ejecutar SQL en Supabase.'
        });
      }
      
      console.log('❌ Error buscando cuentas conectadas:', accountError);
      console.log('🔍 Error completo:', accountError);
      return NextResponse.json({
        connected: false,
        message: 'Error buscando cuenta conectada'
      });
    }

    if (!connectedAccounts || connectedAccounts.length === 0) {
      console.log('❌ No se encontró cuenta conectada para el usuario');
      return NextResponse.json({
        connected: false,
        message: 'No tienes una cuenta Stripe Connect configurada'
      });
    }

    // Tomar la primera cuenta (o la más reciente)
    const connectedAccount = connectedAccounts[0];
    console.log('✅ Cuenta conectada encontrada:', connectedAccount.business_name);

    // Contar ventas con comisión
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('commission_sales')
      .select('id, amount_total, commission_amount, status')
      .eq('connected_account_id', connectedAccount.id);

    const totalSales = salesData?.length || 0;
    const totalRevenue = salesData?.reduce((sum: number, sale: any) => sum + parseFloat(sale.amount_total), 0) || 0;
    const totalCommission = salesData?.reduce((sum: number, sale: any) => sum + parseFloat(sale.commission_amount), 0) || 0;

    return NextResponse.json({
      connected: true,
      account: {
        id: connectedAccount.stripe_account_id,
        businessName: connectedAccount.business_name,
        email: connectedAccount.email,
        country: connectedAccount.country,
        commissionRate: connectedAccount.commission_rate,
        status: connectedAccount.status,
        onboardingCompleted: connectedAccount.onboarding_completed,
        chargesEnabled: connectedAccount.charges_enabled,
        payoutsEnabled: connectedAccount.payouts_enabled,
        createdAt: connectedAccount.created_at,
      },
      stats: {
        totalSales,
        totalRevenue: totalRevenue.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
