import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
  return NextResponse.json({ url });
}
