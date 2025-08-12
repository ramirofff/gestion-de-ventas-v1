import { supabase } from './supabaseClient';
import { createSalesTableIfNotExists } from './createSalesTable';

export async function verifyDatabase() {
  const results = {
    tablesExist: false,
    userAuthenticated: false,
    rlsPolicies: false,
    canInsertSales: false,
    errors: [] as string[]
  };

  try {
    // 1. Verificar autenticación del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      results.errors.push(`Autenticación: ${authError?.message || 'Usuario no encontrado'}`);
    } else {
      results.userAuthenticated = true;
      console.log('✅ Usuario autenticado:', user.id);
    }

    // 2. Verificar si la tabla sales existe (método simplificado)
    console.log('🔍 Verificando existencia de tabla sales...');
    const { data: salesCheck, error: salesCheckError } = await supabase
      .from('sales')
      .select('count', { count: 'exact', head: true });

    if (salesCheckError) {
      if (salesCheckError.message.includes('relation "public.sales" does not exist')) {
        results.errors.push('La tabla sales no existe');
        results.tablesExist = false;
        
        // Intentar crear la tabla automáticamente
        console.log('🔧 Intentando crear tabla sales automáticamente...');
        const createResult = await createSalesTableIfNotExists();
        if (createResult.success) {
          console.log('✅ Tabla sales creada exitosamente');
          results.tablesExist = true;
          // Eliminar el error anterior ya que se solucionó
          results.errors = results.errors.filter(e => !e.includes('tabla sales no existe'));
        } else {
          console.error('❌ No se pudo crear tabla sales automáticamente');
          results.errors.push(`No se pudo crear tabla sales: ${createResult.message}`);
        }
      } else {
        results.errors.push(`Error al verificar tabla sales: ${salesCheckError.message}`);
        console.error('Error al verificar tabla sales:', salesCheckError);
      }
    } else {
      results.tablesExist = true;
      console.log('✅ Tabla sales existe y es accesible');
    }

    // 3. Verificar acceso de lectura a sales
    console.log('🔍 Verificando acceso de lectura a sales...');
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id')
      .limit(1);

    if (salesError) {
      results.errors.push(`Acceso lectura sales: ${salesError.message}`);
      console.error('❌ Error acceso lectura:', salesError);
    } else {
      console.log('✅ Acceso de lectura a sales confirmado');
    }

    // 3.5 Verificar políticas RLS específicamente
    console.log('🔍 Verificando políticas RLS...');
    if (user) {
      const { data: rlsTest, error: rlsError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
      
      if (rlsError) {
        results.errors.push(`RLS policies: ${rlsError.message}`);
        console.error('❌ Error en políticas RLS:', rlsError);
      } else {
        results.rlsPolicies = true;
        console.log('✅ Políticas RLS funcionando correctamente');
      }
    }

    // 4. Intentar una inserción de prueba (que luego eliminaremos)
    if (user && results.tablesExist) {
      // Generar un UUID válido para la prueba
      const testUuid = crypto.randomUUID();
      const testItems = [{ 
        id: testUuid, 
        name: 'test producto', 
        price: 1, 
        quantity: 1, 
        total: 1 
      }];
      const testSale = {
        user_id: user.id,
        products: testItems, // Campo principal JSONB
  // ...existing code...
        total: 1,
        subtotal: 1, // Campo requerido en tu esquema
        payment_method: 'cash',
        payment_status: 'completed',
        status: 'completed'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('sales')
        .insert([testSale])
        .select();

      if (insertError) {
        let msg = 'Error desconocido';
        if (insertError.message) {
          msg = insertError.message;
        } else if (typeof insertError === 'string') {
          msg = insertError;
        } else if (typeof insertError === 'object' && Object.keys(insertError).length > 0) {
          msg = JSON.stringify(insertError);
        }
        results.errors.push(`Inserción test: ${msg}`);
        console.error('Error en inserción de prueba:', insertError);
      } else {
        results.canInsertSales = true;
        console.log('✅ Inserción de prueba exitosa');
        
        // Eliminar la venta de prueba
        if (insertData && insertData[0]) {
          await supabase.from('sales').delete().eq('id', insertData[0].id);
          console.log('✅ Venta de prueba eliminada');
        }
      }
    }

  } catch (error) {
    results.errors.push(`Error inesperado: ${error}`);
    console.error('Error en verifyDatabase:', error);
  }

  return results;
}
