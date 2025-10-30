import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

// Protegido por un token simple: define ADMIN_API_TOKEN en Vercel (Production)
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const headerToken = request.headers.get('x-admin-token') || request.headers.get('X-Admin-Token');
    if (!ADMIN_API_TOKEN || headerToken !== ADMIN_API_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Buscar usuario en auth.users por email
    const { data: users, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }
    const user = users && users.length > 0 ? users[0] : null;
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado en auth.users' }, { status: 404 });
    }

    // Insertar en public.superusers si no existe
    const { error: insertError } = await supabaseAdmin
      .from('superusers')
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: user.id, email: user.email });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error inesperado' }, { status: 500 });
  }
}


