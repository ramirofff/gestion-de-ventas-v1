// app/api/stripe-connect/manual-save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 API: Guardando cuenta conectada manual...');

    const body = await request.json();
    console.log('📦 Datos recibidos:', body);
    
    const { 
      userId,
      userEmail,
      stripeAccountId,
      businessName,
      customerEmail,
      country,
      commissionRate
    } = body;

    // Validar datos requeridos
    if (!userId || !stripeAccountId || !businessName) {
      console.log('❌ Validación fallida:', {
        userId: !!userId,
        stripeAccountId: !!stripeAccountId,
        businessName: !!businessName
      });
      return NextResponse.json(
        { error: 'Datos requeridos faltantes (userId, stripeAccountId, businessName)' },
        { status: 400 }
      );
    }

    console.log('📋 Datos validados para guardar:', {
      userId,
      stripeAccountId,
      businessName,
      email: customerEmail || userEmail,
      country: country || 'AR'
    });

    // Verificar si ya existe una cuenta para este usuario
    console.log('🔍 Verificando cuenta existente para usuario:', userId);
    const { data: existingUserAccounts, error: userCheckError } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId);

    if (existingUserAccounts && existingUserAccounts.length > 0) {
      console.log('⚠️ El usuario ya tiene', existingUserAccounts.length, 'cuenta(s) conectada(s)');
      return NextResponse.json(
        { 
          error: `Ya tienes ${existingUserAccounts.length} cuenta(s) Stripe registrada(s)`,
          existingAccountIds: existingUserAccounts.map(acc => acc.stripe_account_id)
        },
        { status: 409 }
      );
    }

    // Verificar si ya existe una cuenta con este Stripe Account ID
    console.log('🔍 Verificando si el Account ID ya está registrado:', stripeAccountId);
    const { data: existingStripeAccount, error: stripeCheckError } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (existingStripeAccount) {
      console.log('⚠️ Este Account ID ya está registrado por usuario:', existingStripeAccount.user_id);
      return NextResponse.json(
        { error: 'Esta cuenta de Stripe ya está registrada en el sistema' },
        { status: 409 }
      );
    }

    // Guardar nueva cuenta conectada
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .insert([{
        user_id: userId,
        stripe_account_id: stripeAccountId,
        email: customerEmail || userEmail || 'sin-email@ejemplo.com',
        business_name: businessName,
        country: country || 'AR',
        commission_rate: commissionRate || 0.05,
        status: 'active', // Manual = activa inmediatamente
        details_submitted: true,
        charges_enabled: country !== 'AR', // Argentina no procesa pagos directamente
        payouts_enabled: true,
        onboarding_completed: true, // Manual = completado automáticamente
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return NextResponse.json(
        { error: 'Error guardando en base de datos: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ Cuenta guardada exitosamente:', data.id);

    return NextResponse.json({
      success: true,
      message: 'Cuenta conectada guardada exitosamente',
      accountId: data.id,
      stripeAccountId: data.stripe_account_id,
      businessName: data.business_name,
      email: data.email,
      country: data.country,
      commissionRate: data.commission_rate,
    });

  } catch (error) {
    console.error('❌ Error guardando cuenta manual:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
