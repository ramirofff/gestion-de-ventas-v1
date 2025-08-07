import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      client_email, 
      business_name, 
      country = 'AR', 
      bank_account_info,
      platform_fee_percent = 3 // Tu comisión del 3%
    } = body;

    // Crear cuenta Express para cliente argentino
    // La cuenta se maneja desde tu plataforma USA pero recibe USD
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Se crea en USA para acceso completo a Stripe
      email: client_email,
      business_profile: {
        name: business_name || 'Negocio Argentina',
        support_email: client_email,
        url: 'https://tu-saas.com',
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Configuración para manejar USD
      settings: {
        payouts: {
          schedule: {
            interval: 'daily', // Transferencias diarias en USD
          },
        },
      },
      // Indicar que acepta USD principalmente
      default_currency: 'usd',
    });

    // Crear link de onboarding específico para clientes argentinos
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${request.nextUrl.origin}/client/stripe/refresh?account_id=${account.id}`,
      return_url: `${request.nextUrl.origin}/client/stripe/success?account_id=${account.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
      platform_fee_percent,
      currency: 'USD',
      message: 'Cliente conectado a tu plataforma USA - Recibirá pagos en USD'
    });

  } catch (error: any) {
    console.error('Error creating client account:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al conectar cliente a la plataforma'
      },
      { status: 400 }
    );
  }
}
