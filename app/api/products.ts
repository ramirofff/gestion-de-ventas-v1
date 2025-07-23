import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  const { data, error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', id)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
