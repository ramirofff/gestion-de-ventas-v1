import { NextRequest, NextResponse } from 'next/server';
import { createSale } from '../../../lib/sales';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 API: Iniciando procesamiento de venta post-pago');
    
    const body = await request.json();
    console.log('🎯 API: Body recibido:', body);
    
    const { 
      stripeItems, 
      totalFromStripe, 
      userId, 
      clientId, 
      paymentIntentId, 
      metadata 
    } = body;
    
    // Validaciones
    if (!userId) {
      console.error('❌ API: Usuario no autenticado');
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      }, { status: 401 });
    }
    
    if (!stripeItems || stripeItems.length === 0) {
      console.error('❌ API: Items de Stripe vacíos');
      return NextResponse.json({ 
        success: false, 
        error: 'Items de Stripe vacíos' 
      }, { status: 400 });
    }
    
    if (!totalFromStripe || totalFromStripe <= 0) {
      console.error('❌ API: Total inválido');
      return NextResponse.json({ 
        success: false, 
        error: 'Total inválido' 
      }, { status: 400 });
    }
    
    console.log('🚀 API: Llamando a createSale con datos validados');
    
    const saleResult = await createSale(
      stripeItems,
      totalFromStripe,
      userId,
      clientId,
      paymentIntentId,
      metadata,
      true // Usar cliente admin para bypasear RLS
    );
    
    console.log('✅ API: Resultado de createSale:', saleResult);
    
    if (saleResult.error) {
      console.error('❌ API: Error en createSale:', saleResult.error);
      return NextResponse.json({
        success: false,
        error: saleResult.error,
        message: saleResult.message
      }, { status: 500 });
    }
    
    console.log('🎉 API: Venta creada exitosamente');
    
    return NextResponse.json({
      success: true,
      data: saleResult.data,
      message: 'Venta creada exitosamente'
    });
    
  } catch (error) {
    console.error('💥 API: Error no controlado:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
