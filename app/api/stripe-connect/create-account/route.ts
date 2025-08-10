// app/api/stripe-connect/create-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createConnectedAccount, createOnboardingLink, saveClientAccount } from '../../../../lib/stripeConnect';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API: Creando cuenta conectada...');
    
    const body = await request.json();
    const { businessName, firstName, lastName, country = 'AR', currency = 'usd', userId, userEmail } = body;

    console.log('👤 Datos recibidos - User ID:', userId, 'Email:', userEmail);

    // Validar que se hayan enviado los datos del usuario
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Faltan datos de usuario. Por favor, recarga la página e intenta de nuevo.' },
        { status: 400 }
      );
    }

    // Validar datos del formulario
    if (!businessName || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: businessName, firstName, lastName' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una cuenta conectada para este usuario
    const { data: existingAccount, error: existingError } = await supabase
      .from('connected_accounts')
      .select('stripe_account_id, business_name, status')
      .eq('user_id', userId)
      .single();

    if (existingAccount && !existingError) {
      console.log('⚠️ Ya existe cuenta conectada:', existingAccount.stripe_account_id);
      return NextResponse.json(
        { 
          error: 'Ya tienes una cuenta Stripe Connect registrada',
          existingAccount: {
            stripeAccountId: existingAccount.stripe_account_id,
            businessName: existingAccount.business_name,
            status: existingAccount.status
          }
        },
        { status: 409 }
      );
    }

    // 1. Crear cuenta conectada en Stripe
    const connectedAccount = await createConnectedAccount({
      email: userEmail,
      businessName,
      firstName,
      lastName,
      country,
      currency,
    });

    console.log('✅ Cuenta Stripe creada:', connectedAccount.id);

    // 2. Crear link de onboarding
    const onboardingUrl = await createOnboardingLink(connectedAccount.id);
    console.log('🔗 Link de onboarding creado');

    // 3. Guardar en base de datos
    await saveClientAccount({
      userId: userId,
      stripeAccountId: connectedAccount.id,
      email: userEmail,
      businessName,
      country,
      commissionRate: 0.05, // 5% por defecto
    });

    console.log('💾 Guardado en base de datos');

    return NextResponse.json({
      success: true,
      accountId: connectedAccount.id,
      onboardingUrl: onboardingUrl,
      email: userEmail,
      message: 'Cuenta conectada creada exitosamente',
    });

  } catch (error) {
    console.error('❌ Error en create-account:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
