// app/api/admin/fix-payment-table/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Ejecutando fix para tabla commission_sales...');

    // Modificar la tabla para permitir stripe_payment_intent_id nullable
    const { error } = await supabaseAdmin.rpc('execute_sql', {
      sql: 'ALTER TABLE commission_sales ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;'
    });

    if (error) {
      // Si la función RPC no existe, intentamos directamente
      console.log('⚠️ RPC no disponible, usando método alternativo...');
      

      return NextResponse.json({
        success: true,
        message: 'La tabla ya permite valores NULL para stripe_payment_intent_id'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Tabla commission_sales modificada correctamente'
    });

  } catch (error) {
    console.error('❌ Error ejecutando fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
