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
      
      // Crear una entrada temporal para verificar si funciona
      const { error: testError } = await supabaseAdmin
        .from('commission_sales')
        .insert([{
          connected_account_id: '00000000-0000-0000-0000-000000000000',
          stripe_payment_intent_id: null,
          stripe_session_id: 'test_session_fix',
          customer_email: 'test@test.com',
          product_name: 'Test Fix',
          amount_total: 1,
          commission_amount: 0,
          net_amount: 1,
          currency: 'USD',
          status: 'pending'
        }]);

      if (testError) {
        console.error('❌ Error en test insert:', testError);
        return NextResponse.json({
          success: false,
          error: testError.message,
          message: 'Necesitas ejecutar manualmente en Supabase SQL Editor: ALTER TABLE commission_sales ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;'
        });
      }

      // Eliminar el registro de prueba
      await supabaseAdmin
        .from('commission_sales')
        .delete()
        .eq('stripe_session_id', 'test_session_fix');

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
