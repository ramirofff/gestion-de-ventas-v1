// 🛠️ UTILITARIO PARA APLICAR RESTRICCIONES DE BASE DE DATOS
import { supabaseAdmin } from './supabaseClient';

export async function applyDatabaseConstraints() {
  console.log('🚀 Aplicando restricciones de base de datos para prevenir duplicados...');
  
  try {
    // 1. Verificar si ya existe la restricción
    console.log('🔍 Verificando restricciones existentes...');
    
    const { data: existingConstraints, error: constraintError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT constraint_name, constraint_type 
          FROM information_schema.table_constraints 
          WHERE table_name = 'sales' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name = 'unique_stripe_payment_intent_id';
        `
      });
      
    if (constraintError) {
      console.warn('⚠️ Error verificando restricciones:', constraintError);
    } else if (existingConstraints && existingConstraints.length > 0) {
      console.log('✅ La restricción única ya existe');
      return { success: true, message: 'Restricciones ya aplicadas' };
    }
    
    // 2. Verificar duplicados existentes antes de aplicar restricción
    console.log('🔍 Verificando duplicados existentes...');
    
    const { data: duplicates, error: duplicateError } = await supabaseAdmin
      .from('sales')
      .select('stripe_payment_intent_id')
      .not('stripe_payment_intent_id', 'is', null);
      
    if (!duplicateError && duplicates) {
      const groups = new Map<string, number>();
      duplicates.forEach(sale => {
        const key = sale.stripe_payment_intent_id!;
        groups.set(key, (groups.get(key) || 0) + 1);
      });
      
      const duplicateCount = Array.from(groups.values()).filter(count => count > 1).length;
      
      if (duplicateCount > 0) {
        console.warn(`⚠️ Se encontraron ${duplicateCount} grupos con duplicados`);
        console.warn('💡 Ejecuta cleanupDuplicateSales() antes de aplicar restricciones');
        return { 
          success: false, 
          message: `${duplicateCount} grupos duplicados deben limpiarse primero`,
          duplicateCount 
        };
      }
    }
    
    // 3. Aplicar restricción única
    
    const constraintSQL = `
      ALTER TABLE sales 
      ADD CONSTRAINT unique_stripe_payment_intent_id 
      UNIQUE (stripe_payment_intent_id);
    `;
    
    const { error: alterError } = await supabaseAdmin
      .rpc('exec_sql', { query: constraintSQL });
      
    if (alterError) {
      return { success: false, message: alterError.message };
    }
    
    // 4. Crear índice para mejor rendimiento
    
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_sales_stripe_payment_intent_id 
      ON sales (stripe_payment_intent_id) 
      WHERE stripe_payment_intent_id IS NOT NULL;
    `;
    
    const { error: indexError } = await supabaseAdmin
      .rpc('exec_sql', { query: indexSQL });
      
  // ...existing code...
    
    return { success: true, message: 'Restricciones aplicadas correctamente' };
    
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}

// Función simplificada que no requiere RPC
export async function simpleConstraintCheck() {
  console.log('🔍 Verificación simple de restricciones...');
  
  try {
    // Test de inserción con duplicado para verificar si la restricción funciona
    const testPaymentIntentId = `test_duplicate_${Date.now()}`;
    
    // Primera inserción
    const { data: firstInsert, error: firstError } = await supabaseAdmin
      .from('sales')
      .insert({
        user_id: 'test-user',
        products: [],
        items: [],
        total: 1,
        subtotal: 1,
        payment_method: 'test',
        payment_status: 'completed',
        status: 'completed',
        stripe_payment_intent_id: testPaymentIntentId
      })
      .select();
      
    if (firstError) {
      console.error('❌ Error en primera inserción de test:', firstError);
      return { hasConstraint: false, error: firstError.message };
    }
    
    // Segunda inserción (debería fallar si la restricción existe)
    const { data: secondInsert, error: secondError } = await supabaseAdmin
      .from('sales')
      .insert({
        user_id: 'test-user-2',
        products: [],
        items: [],
        total: 2,
        subtotal: 2,
        payment_method: 'test',
        payment_status: 'completed',
        status: 'completed',
        stripe_payment_intent_id: testPaymentIntentId
      })
      .select();
    
    // Limpiar datos de test
    if (firstInsert && firstInsert.length > 0) {
      await supabaseAdmin
        .from('sales')
        .delete()
        .eq('stripe_payment_intent_id', testPaymentIntentId);
    }
    
    if (secondError && secondError.code === '23505') {
      console.log('✅ Restricción única funcionando correctamente');
      return { hasConstraint: true, working: true };
    } else if (!secondError) {
      console.warn('⚠️ No hay restricción única - se crearon duplicados');
      return { hasConstraint: false, working: false };
    } else {
      console.warn('⚠️ Error inesperado:', secondError);
      return { hasConstraint: false, error: secondError.message };
    }
    
  } catch (error) {
    console.error('Error en verificación:', error);
    return { hasConstraint: false, error: String(error) };
  }
}
