import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    console.log('🔍 DEBUG: Consultando ventas para user_id:', userId);

    // Consultar todas las ventas
    const { data: allSales, error: allError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error consultando todas las ventas:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    console.log('📊 Total de ventas en la base:', allSales?.length || 0);

    // Si se especifica userId, filtrar por usuario
    let userSales = allSales;
    if (userId) {
      userSales = allSales?.filter(sale => sale.user_id === userId) || [];
      console.log('👤 Ventas del usuario', userId, ':', userSales.length);
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        total_sales: allSales?.length || 0,
        user_sales: userSales?.length || 0,
        requested_user_id: userId,
        sample_user_ids: allSales?.slice(0, 5).map(s => s.user_id) || [],
      },
      all_sales: allSales?.map(sale => ({
        id: sale.id,
        user_id: sale.user_id,
        total: sale.total,
        created_at: sale.created_at,
        stripe_payment_intent_id: sale.stripe_payment_intent_id,
        has_metadata: !!sale.metadata,
        products_count: sale.products?.length || 0,
        items_count: sale.items?.length || 0,
      })) || [],
      user_sales: userSales?.map(sale => ({
        id: sale.id,
        user_id: sale.user_id,
        total: sale.total,
        created_at: sale.created_at,
        stripe_payment_intent_id: sale.stripe_payment_intent_id,
        products: sale.products,
        items: sale.items,
        metadata: sale.metadata,
      })) || [],
    });

  } catch (error: any) {
    console.error('❌ Error en debug-sales:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
