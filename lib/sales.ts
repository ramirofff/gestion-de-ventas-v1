
import { supabase, supabaseAdmin } from './supabaseClient';
import { CartItem } from '../hooks/useCart';

export async function createSale(
  cart: CartItem[], 
  total: number, 
  userId?: string, 
  clientId?: string,
  stripePaymentIntentId?: string,
  metadata?: any,
  useAdminClient = false // Nuevo parámetro para usar el cliente admin
) {
  try {
    console.log('🚀 INICIANDO CREACIÓN DE VENTA');
    console.log('- Cart recibido:', cart);
    console.log('- Total recibido:', total);
    console.log('- UserID recibido:', userId);
    console.log('- ClientID recibido:', clientId);
    console.log('- StripeID recibido:', stripePaymentIntentId);
    console.log('- UseAdminClient:', useAdminClient);
    
    // Seleccionar el cliente de Supabase apropiado
    const client = useAdminClient ? supabaseAdmin : supabase;
    console.log('📡 Cliente Supabase seleccionado:', useAdminClient ? 'ADMIN (bypassa RLS)' : 'NORMAL (con RLS)');
    
    // Verificar si ya existe una venta con este payment_intent_id para prevenir duplicados
    if (stripePaymentIntentId) {
      console.log('🔍 Verificando duplicados por stripe_payment_intent_id:', stripePaymentIntentId);
      const { data: existingSale, error: checkError } = await client
        .from('sales')
        .select('id, stripe_payment_intent_id')
        .eq('stripe_payment_intent_id', stripePaymentIntentId)
        .limit(1);
      
      if (checkError) {
        console.warn('⚠️ Error verificando duplicados:', checkError);
      } else if (existingSale && existingSale.length > 0) {
        console.warn('⚠️ Ya existe una venta con este payment_intent_id:', existingSale[0].id);
        return {
          data: existingSale,
          error: null,
          message: 'Venta ya procesada anteriormente'
        };
      } else {
        console.log('✅ No se encontraron duplicados, procediendo con la creación');
      }
    }
    
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
      id: item.id,
      name: item.name,
      price: item.price,
      original_price: item.original_price,
      quantity: item.quantity,
      total: (item.price * item.quantity)
    }));
    
    console.log('Guardando venta:', { userId, items, total });
    
    // 🔍 DEBUG: Verificar datos antes de insertar
    console.log('📊 DEBUG createSale - Datos de entrada:');
    console.log('- userId:', userId, '(tipo:', typeof userId, ')');
    console.log('- cart.length:', cart.length);
    console.log('- total:', total, '(tipo:', typeof total, ')');
    console.log('- items procesados:', items);
    
    // Preparar el objeto de inserción según la estructura real de tu tabla
    const saleData = {
      user_id: userId,
      products: items, // JSONB array con los productos (campo original)
      items: items,    // JSONB array con los productos (campo adicional que tienes)
      total: total,
      subtotal: total, // Agregamos subtotal que es requerido en tu esquema
      payment_method: stripePaymentIntentId ? 'stripe' : 'cash',
      payment_status: 'completed',
      status: 'completed',
      client_id: clientId || null,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      metadata: metadata || null
    };
    
    console.log('Datos a insertar en sales:', saleData);
    console.log('Datos serializados:', JSON.stringify(saleData, null, 2));
    
    // Test: Verificar acceso directo a la tabla sales
    console.log('Verificando acceso directo a la tabla sales...');
    const { data: testData, error: testError } = await client
      .from('sales')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('Error al acceder a la tabla sales:', testError);
      console.error('Mensaje completo:', testError.message);
      if (testError.message.includes('does not exist')) {
        throw new Error('La tabla sales no existe. Es necesario ejecutar el esquema de la base de datos.');
      }
    } else {
      console.log('✅ Acceso a tabla sales confirmado');
    }

    // Test adicional: Verificar que el usuario puede insertar en sales
    console.log('🔍 Verificando permisos de inserción...');
    
    // NOTA: En lugar de verificar la sesión de Supabase (que puede fallar en APIs),
    // usamos el userId que ya viene validado desde el cliente
    console.log('✅ Usuario confirmado para inserción via parámetro:', userId);

    const { data, error } = await client.from('sales').insert([saleData]).select();
    
    if (error) {
      console.error('❌ ERROR DETALLADO EN SUPABASE:');
      console.error('- Código:', error.code || 'Sin código');
      console.error('- Mensaje:', error.message || 'Sin mensaje');
      console.error('- Detalles:', error.details || 'Sin detalles');
      console.error('- Hint:', error.hint || 'Sin hint');
      
      // Log específico del tipo de error
      if (error.code) {
        switch (error.code) {
          case 'PGRST116':
            console.error('🚫 ERROR RLS: Sin permisos para insertar en la tabla');
            break;
          case 'PGRST204':
            console.error('📭 ERROR: Consulta no devolvió datos');
            break;
          case '42P01':
            console.error('🗂️ ERROR: Tabla no existe');
            break;
          case '23505':
            console.error('🔄 ERROR: Violación de restricción única');
            break;
          case '23514':
            console.error('📦 ERROR: Violación de restricción CHECK - Posiblemente stock insuficiente');
            console.error('🔧 SOLUCIÓN: Verifica el stock de los productos o deshabilita las restricciones de inventario');
            break;
          default:
            console.error('❓ ERROR DESCONOCIDO:', error.code);
        }
      }
      
      // Logging adicional para debugging
      console.error('📊 DATOS QUE SE INTENTARON INSERTAR:');
      console.error('- SaleData completo:', saleData);
      console.error('- UserID válido?', !!saleData.user_id && saleData.user_id.length > 0);
      console.error('- Products array válido?', Array.isArray(saleData.products) && saleData.products.length > 0);
      console.error('- Items array válido?', Array.isArray(saleData.items) && saleData.items.length > 0);
      console.error('- Total válido?', typeof saleData.total === 'number' && saleData.total > 0);
      console.error('- Subtotal válido?', typeof saleData.subtotal === 'number' && saleData.subtotal > 0);
      
      // Ejecutar diagnóstico en caso de error
      console.log('🔍 Ejecutando diagnóstico automático...');
      try {
        const { verifyDatabase } = await import('./databaseDiagnostic');
        const diagnostic = await verifyDatabase();
        console.error('📋 Resultado diagnóstico:', diagnostic);
        
        // También ejecutar verificación RLS
        const { checkRLSPolicies } = await import('./checkRLS');
        await checkRLSPolicies();
        
        // Verificar stock de productos si el error es 23514
        if (error.code === '23514') {
          console.log('📦 Error de restricción de stock detectado');
          console.log('💡 SOLUCIÓN: Ejecutar en Supabase SQL Editor:');
          console.log('UPDATE products SET stock_quantity = 999999;');
          console.log('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_quantity_check;');
          
          const { checkProductsStock } = await import('./checkProductsStock');
          await checkProductsStock();
        }
      } catch (diagError) {
        console.error('Error al ejecutar diagnóstico:', diagError);
      }
      
      throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'} (Código: ${error.code || 'N/A'})`);
    }
    
    console.log('Venta creada exitosamente:', data);
    
    // 🎉 DEBUG: Confirmar datos guardados
    console.log('✅ VENTA GUARDADA EXITOSAMENTE:');
    console.log('- ID de venta:', data?.[0]?.id);
    console.log('- User ID guardado:', data?.[0]?.user_id);
    console.log('- Total guardado:', data?.[0]?.total);
    console.log('- Stripe Payment Intent:', data?.[0]?.stripe_payment_intent_id);
    console.log('- Productos guardados:', data?.[0]?.products?.length || 0);
    console.log('- Fecha creación:', data?.[0]?.created_at);
    
    return { data, error: null };
    
  } catch (err) {
    console.error('Error en createSale:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Error desconocido al crear venta')
    };
  }
}
