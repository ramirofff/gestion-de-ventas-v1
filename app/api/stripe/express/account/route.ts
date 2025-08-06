import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../../lib/stripe-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account_id = searchParams.get('account_id');

    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Obtener información de la cuenta
    const account = await stripe.accounts.retrieve(account_id);

    return NextResponse.json({
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      business_profile: account.business_profile,
      capabilities: account.capabilities,
    });

  } catch (error: any) {
    console.error('Error retrieving Stripe Express account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve Express account' },
      { status: 500 }
    );
  }
}
