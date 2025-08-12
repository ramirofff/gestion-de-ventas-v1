import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country = 'AR', business_type = 'individual' } = body;

    // Crear cuenta estándar en lugar de Express
    const account = await stripe.accounts.create({
      type: 'standard', // Cambiar de 'express' a 'standard'
      country: 'AR', // Forzar Argentina
      business_type: business_type,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Crear enlace de onboarding para Standard
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
  refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gestion-de-ventas-v1.vercel.app'}/stripe/express/refresh`,
  return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gestion-de-ventas-v1.vercel.app'}/stripe/express/return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
      type: 'standard'
    });

  } catch (error: any) {
    console.error('Error creating Standard Connect account:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear cuenta de Stripe',
        code: error.code 
      },
      { status: 400 }
    );
  }
}
// Archivo eliminado: endpoint Standard obsoleto. Usar registro manual.
