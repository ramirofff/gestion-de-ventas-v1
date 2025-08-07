import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      user_id, 
      email, 
      business_name, 
      country = 'AR',
      business_type = 'individual' 
    } = body;

    console.log('🏢 Creando cuenta Stripe Connect para:', email);

    // 1. Crear Express Account en Stripe
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      metadata: {
        user_id: user_id,
        business_name: business_name,
        created_from: 'saas_platform'
      },
      business_profile: {
        name: business_name,
        support_email: email,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    console.log('✅ Cuenta Stripe Connect creada:', account.id);

    // 2. Crear link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.nextUrl.origin}/stripe/connect/refresh`,
      return_url: `${req.nextUrl.origin}/stripe/connect/return`,
      type: 'account_onboarding',
    });

    // 3. Guardar en base de datos
    const { error: dbError } = await supabase
      .from('client_accounts')
      .insert([{
        user_id: user_id,
        stripe_account_id: account.id,
        email: email,
        business_name: business_name,
        country: country,
        platform_fee_percent: 3.0, // 3% de comisión
        onboarding_completed: false,
      }]);

    if (dbError) {
      console.error('Error guardando en DB:', dbError);
    }

    return NextResponse.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
    });

  } catch (error: any) {
    console.error('Error creando cuenta Connect:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
