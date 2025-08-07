import { NextRequest, NextResponse } from 'next/server';
import { createSale } from '../../../../lib/sales';
import { ClientAccountManager } from '../../../../lib/client-accounts';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con permisos elevados (service role) - solo si está disponible
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Crear venta usando SQL directo (fallback si no hay service role key)
async function createSaleDirectly(
  cart: any[], 
  total: number, 
  userId: string,
  stripePaymentIntentId?: string,
  metadata?: any
) {
  try {
    // Usar el cliente normal para insertar directamente
    const { supabase } = await import('../../../../lib/supabaseClient');
    
    const items = cart.map(item => ({
      id: item.id || `temp_${Date.now()}`,
      name: item.name || 'Producto',
      price: item.price || 0,
      original_price: item.original_price || item.price || 0,
      quantity: item.quantity || 1,
      total: ((item.price || 0) * (item.quantity || 1))
    }));
    
    const saleData = {
      user_id: userId,
      products: items,
      items: items,
      total: total,
      subtotal: total,
      payment_method: stripePaymentIntentId ? 'stripe' : 'cash',
      payment_status: 'completed',
      status: 'completed',
      stripe_payment_intent_id: stripePaymentIntentId || null,
      metadata: metadata || null,
      created_at: new Date().toISOString()
    };
    
    console.log('💾 Insertando venta directamente:', saleData);
    
    // Usar RPC para insertar con privilegios elevados
    const { data, error } = await supabase.rpc('create_sale_with_auth', {
      sale_data: saleData
    });
    
    if (error) {
      console.error('❌ Error con RPC, intentando inserción directa:', error);
      
      // Fallback: inserción directa
      const { data: directData, error: directError } = await supabase
        .from('sales')
        .insert([saleData])
        .select();
      
      if (directError) {
        throw new Error(`Error de inserción: ${directError.message}`);
      }
      
      return { data: directData, error: null };
    }
    
    return { data, error: null };
    
  } catch (err) {
    console.error('❌ Error en createSaleDirectly:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Error desconocido')
    };
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Función createSale adaptada para usar supabaseAdmin
async function createSaleAdmin(
  cart: any[], 
  total: number, 
  userId: string,
  stripePaymentIntentId?: string,
  metadata?: any
) {
  try {
    console.log('🚀 INICIANDO CREACIÓN DE VENTA (ADMIN)');
    console.log('- Cart recibido:', cart);
    console.log('- Total recibido:', total);
    console.log('- UserID recibido:', userId);
    console.log('- StripeID recibido:', stripePaymentIntentId);
    
    // Validar datos de entrada
    if (!cart || cart.length === 0) {
      throw new Error('El carrito está vacío');
    }
    
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    if (total <= 0) {
      throw new Error('El total debe ser mayor a 0');
    }

    // Preparar los productos en el formato que espera la base de datos
    const items = cart.map(item => ({
      id: item.id || `temp_${Date.now()}`,
      name: item.name || 'Producto',
      price: item.price || 0,
      original_price: item.original_price || item.price || 0,
      quantity: item.quantity || 1,
      total: ((item.price || 0) * (item.quantity || 1))
    }));
    
    console.log('📊 DEBUG createSaleAdmin - Datos procesados:', {
      userId,
      itemsCount: items.length,
      total,
      firstItem: items[0]
    });
    
    // Preparar el objeto de inserción
    const saleData = {
      user_id: userId,
      products: items,
      items: items,
      total: total,
      subtotal: total,
      payment_method: stripePaymentIntentId ? 'stripe' : 'cash',
      payment_status: 'completed',
      status: 'completed',
      stripe_payment_intent_id: stripePaymentIntentId || null,
      metadata: metadata || null
    };
    
    console.log('💾 Insertando venta:', saleData);
    
    // Usar supabaseAdmin si está disponible, sino usar el cliente normal
    const client = supabaseAdmin || (await import('../../../../lib/supabaseClient')).supabase;
    
    const { data, error } = await client
      .from('sales')
      .insert([saleData])
      .select();
    
    if (error) {
      console.error('❌ ERROR AL INSERTAR VENTA:', error);
      throw new Error(`Error de base de datos: ${error.message}`);
    }
    
    console.log('✅ VENTA GUARDADA EXITOSAMENTE:', data?.[0]);
    return { data, error: null };
    
  } catch (err) {
    console.error('❌ Error en createSaleAdmin:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Error desconocido al crear venta')
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payment_intent_id, user_id, cart, total, client_email } = body;

    console.log('📝 Payment completion handler:', {
      payment_intent_id,
      user_id,
      client_email,
      total,
      cart_length: cart?.length
    });

    // Validar datos requeridos
    if (!payment_intent_id || !user_id || !cart || !total) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar el estado del payment intent en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago no ha sido completado exitosamente' },
        { status: 400 }
      );
    }

    // Guardar la venta en la base de datos
    console.log('📝 Guardando venta con datos:', {
      cart: cart.length,
      total,
      user_id,
      payment_intent_id
    });
    
    const saleResult = await createSaleDirectly(
      cart,
      total,
      user_id,
      payment_intent_id,
      {
        stripe_payment_intent: paymentIntent,
        client_email: client_email,
        authenticated_user: user_id,
        platform_fee: total * 0.03 // 3% fijo
      }
    );

    console.log('🔍 Resultado de createSaleDirectly:', saleResult);

    if (!saleResult || saleResult.error) {
      console.error('❌ Error al guardar venta:', saleResult?.error);
      return NextResponse.json(
        { error: saleResult?.error?.message || 'Error al guardar la venta' },
        { status: 500 }
      );
    }

    console.log('✅ Venta guardada exitosamente para payment intent:', payment_intent_id);
    console.log('👤 Cliente:', client_email);

    return NextResponse.json({
      success: true,
      payment_intent_id,
      client_email,
      user_id
    });

  } catch (error: any) {
    console.error('Error in payment completion handler:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
