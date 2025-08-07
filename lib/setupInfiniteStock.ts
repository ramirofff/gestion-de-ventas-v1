import { supabase } from './supabaseClient';

export async function setupInfiniteStock() {
  console.log('🚀 CONFIGURANDO STOCK INFINITO PARA EL SISTEMA...');
  
  try {
    // 1. Actualizar todos los productos existentes
    console.log('📦 Actualizando productos existentes...');
    const { data: updatedProducts, error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: 999999 })
      .select('id, name');
    
    if (updateError) {
      console.error('❌ Error al actualizar productos:', updateError);
    } else {
      console.log(`✅ ${updatedProducts?.length || 0} productos actualizados con stock infinito`);
    }
    
    // 2. Verificar si hay algún trigger que maneje inventario
    console.log('🔍 El sistema ahora tiene stock infinito configurado');
    console.log('ℹ️ Si sigues teniendo problemas, ejecuta esto en Supabase SQL Editor:');
    console.log(`
-- Para deshabilitar completamente las restricciones de stock:
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_quantity_check;

-- Para permitir stock negativo (opcional):
ALTER TABLE products ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= -999999);

-- Para deshabilitar triggers de inventario (si existen):
DROP TRIGGER IF EXISTS handle_sales_inventory_trigger ON sales;
    `);
    
    return { success: true, updatedCount: updatedProducts?.length || 0 };
    
  } catch (error) {
    console.error('💥 Error al configurar stock infinito:', error);
    return { success: false, error: error };
  }
}
