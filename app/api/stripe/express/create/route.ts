import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../../lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, business_name, country = 'US' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Crear cuenta Express
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      country: country,
      business_profile: {
        name: business_name || undefined,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Crear link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${request.nextUrl.origin}/stripe/express/refresh?account_id=${account.id}`,
      return_url: `${request.nextUrl.origin}/stripe/express/return?account_id=${account.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      account_id: account.id,
      onboarding_url: accountLink.url,
      account: account
    });

  } catch (error: unknown) {
    console.error('Error creating Stripe Express account:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create Express account' },
      { status: 500 }
    );
  }
}
