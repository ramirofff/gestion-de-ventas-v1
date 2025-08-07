import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  try {
    console.log('🔄 API Products: Obteniendo productos...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error obteniendo productos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Productos obtenidos:', data?.length || 0);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('❌ Error inesperado en API products:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('➕ Creando producto:', body);
    
    const { data, error } = await supabase
      .from('products')
      .insert([body])
      .select();
      
    if (error) {
      console.error('❌ Error creando producto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Producto creado:', data);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('❌ Error inesperado creando producto:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    console.log('📝 Actualizando producto:', id, fields);
    
    const { data, error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('❌ Error actualizando producto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Producto actualizado:', data);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('❌ Error inesperado actualizando producto:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }
    
    console.log('🗑️ Eliminando producto:', id);
    
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('❌ Error eliminando producto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Producto eliminado:', data);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('❌ Error inesperado eliminando producto:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
