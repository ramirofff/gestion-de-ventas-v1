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


  } catch (error) {
    results.errors.push(`Error inesperado: ${error}`);
    console.error('Error en verifyDatabase:', error);
  }

  return results;
}
