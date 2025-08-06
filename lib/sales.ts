
import { supabase } from './supabaseClient';
import { CartItem } from '../hooks/useCart';

export async function createSale(cart: CartItem[], total: number, userId?: string) {
  try {
    console.log('🚀 INICIANDO CREACIÓN DE VENTA');
    console.log('- Cart recibido:', cart);
    console.log('- Total recibido:', total);
    console.log('- UserID recibido:', userId);
    
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
    
    // Preparar el objeto de inserción según la estructura real de tu tabla
    const saleData = {
      user_id: userId,
      products: items, // JSONB array con los productos (campo original)
      items: items,    // JSONB array con los productos (campo adicional que tienes)
      total: total,
      subtotal: total, // Agregamos subtotal que es requerido en tu esquema
      payment_method: 'cash',
      payment_status: 'completed',
      status: 'completed'
    };
    
    console.log('Datos a insertar en sales:', saleData);
    console.log('Datos serializados:', JSON.stringify(saleData, null, 2));
    
    // Test: Verificar acceso directo a la tabla sales
    console.log('Verificando acceso directo a la tabla sales...');
    const { data: testData, error: testError } = await supabase
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
    const { data: userCheck, error: userError } = await supabase.auth.getUser();
    if (userError || !userCheck.user) {
      throw new Error('Usuario no autenticado para inserción');
    }
    console.log('✅ Usuario confirmado para inserción:', userCheck.user.id);

    const { data, error } = await supabase.from('sales').insert([saleData]).select();
    
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
    return { data, error: null };
    
  } catch (err) {
    console.error('Error en createSale:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Error desconocido al crear venta')
    };
  }
}
