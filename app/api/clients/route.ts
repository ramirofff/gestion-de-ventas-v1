import { NextRequest, NextResponse } from 'next/server';
import { ClientAccountManager } from '../../../lib/client-accounts';

export async function GET(req: NextRequest) {
  try {
    const clients = await ClientAccountManager.getAllActiveClients();
    
    const clientsWithUrls = clients.map(client => ({
      id: client.id,
      business_name: client.business_name,
      email: client.email,
      country: client.country,
      platform_fee_percent: client.platform_fee_percent,
      created_at: client.created_at,
      // Generar URLs posibles
        urls: [
          `${req.nextUrl.origin}/client/${client.id}`,
          `${req.nextUrl.origin}/client/${(client.business_name ?? 'sin-nombre').toLowerCase().replace(/\s+/g, '-')}`,
        ]
    }));

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients: clientsWithUrls
    });
    
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, email, business_name, country = 'AR', platform_fee_percent = 3.0 } = body;

    if (!user_id || !email || !business_name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: user_id, email, business_name' },
        { status: 400 }
      );
    }

    const result = await ClientAccountManager.createClient({
      user_id,
      stripe_account_id: `acct_${user_id}_${Date.now()}`, // Temporal
      email,
      business_name,
      country,
      platform_fee_percent
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const client = result.client!;
    const clientWithUrls = {
      ...client,
      urls: [
        `${req.nextUrl.origin}/client/${client.id}`,
        `${req.nextUrl.origin}/client/${(client.business_name ?? 'sin-nombre').toLowerCase().replace(/\s+/g, '-')}`,
      ]
    };

    return NextResponse.json({
      success: true,
      client: clientWithUrls
    });

  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
