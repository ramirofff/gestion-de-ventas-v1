// 🧹 UTILITARIO PARA LIMPIAR DUPLICADOS EXISTENTES
import { supabaseAdmin } from './supabaseClient';

interface DuplicateGroup {
  stripe_payment_intent_id: string;
  count: number;
  ids: string[];
}

export async function cleanupDuplicateSales() {
  console.log('🔍 Iniciando limpieza de duplicados...');
  
  try {
    // 1. Encontrar todos los grupos de duplicados
    const { data: duplicates, error: searchError } = await supabaseAdmin
      .rpc('find_duplicate_sales');
      
    if (searchError) {
      console.error('Error buscando duplicados:', searchError);
      
      // Fallback: buscar duplicados manualmente
      const { data: allSales, error: allSalesError } = await supabaseAdmin
        .from('sales')
        .select('id, stripe_payment_intent_id, created_at')
        .not('stripe_payment_intent_id', 'is', null)
        .order('stripe_payment_intent_id', { ascending: true })
        .order('created_at', { ascending: true });
        
      if (allSalesError) {
        throw new Error(`Error obteniendo ventas: ${allSalesError.message}`);
      }
      
      // Procesar manualmente para encontrar duplicados
      const groups = new Map<string, { ids: string[], dates: string[] }>();
      
      allSales?.forEach(sale => {
        const key = sale.stripe_payment_intent_id!;
        if (!groups.has(key)) {
          groups.set(key, { ids: [], dates: [] });
        }
        groups.get(key)!.ids.push(sale.id);
        groups.get(key)!.dates.push(sale.created_at);
      });
      
      // Filtrar solo los que tienen duplicados
      const duplicateGroups: DuplicateGroup[] = [];
      groups.forEach((value, key) => {
        if (value.ids.length > 1) {
          duplicateGroups.push({
            stripe_payment_intent_id: key,
            count: value.ids.length,
            ids: value.ids
          });
        }
      });
      
      console.log(`📊 Encontrados ${duplicateGroups.length} grupos de duplicados`);
      
      if (duplicateGroups.length === 0) {
        console.log('✅ No hay duplicados para limpiar');
        return { cleaned: 0, errors: [] };
      }
      
      // 2. Procesar cada grupo de duplicados
      let totalCleaned = 0;
      const errors: string[] = [];
      
      for (const group of duplicateGroups) {
        console.log(`🔧 Procesando grupo: ${group.stripe_payment_intent_id}`);
        console.log(`   - Total ventas: ${group.count}`);
        console.log(`   - IDs: ${group.ids.join(', ')}`);
        
        // Mantener solo la primera venta (más antigua)
        const idsToDelete = group.ids.slice(1);
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('sales')
            .delete()
            .in('id', idsToDelete);
            
          if (deleteError) {
            const errorMsg = `Error eliminando duplicados ${idsToDelete.join(', ')}: ${deleteError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            console.log(`✅ Eliminados ${idsToDelete.length} duplicados`);
            totalCleaned += idsToDelete.length;
          }
        }
      }
      
      console.log(`🎉 Limpieza completada: ${totalCleaned} ventas duplicadas eliminadas`);
      
      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} errores durante la limpieza:`, errors);
      }
      
      return { cleaned: totalCleaned, errors };
    }
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

// Función para verificar el estado actual de duplicados
export async function checkDuplicatesStatus() {
  console.log('🔍 Verificando estado actual de duplicados...');
  
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('sales')
      .select('stripe_payment_intent_id')
      .not('stripe_payment_intent_id', 'is', null);
      
    if (error) throw error;
    
    const groups = new Map<string, number>();
    stats?.forEach(sale => {
      const key = sale.stripe_payment_intent_id!;
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    
    const duplicateGroups = Array.from(groups.entries())
      .filter(([_, count]) => count > 1);
      
    console.log(`📊 Estado actual:`);
    console.log(`   - Total ventas con stripe_payment_intent_id: ${stats?.length || 0}`);
    console.log(`   - Grupos únicos: ${groups.size}`);
    console.log(`   - Grupos con duplicados: ${duplicateGroups.length}`);
    
    if (duplicateGroups.length > 0) {
      console.log(`⚠️ Duplicados encontrados:`);
      duplicateGroups.forEach(([paymentIntentId, count]) => {
        console.log(`   - ${paymentIntentId}: ${count} ventas`);
      });
    } else {
      console.log(`✅ No hay duplicados`);
    }
    
    return {
      totalSales: stats?.length || 0,
      uniqueGroups: groups.size,
      duplicateGroups: duplicateGroups.length,
      duplicates: duplicateGroups
    };
  } catch (error) {
    console.error('Error verificando duplicados:', error);
    throw error;
  }
}
