import { supabase } from './supabaseClient';

export async function checkProductsStock() {
  console.log('🔍 VERIFICANDO Y CORRIGIENDO STOCK DE PRODUCTOS...');
  
  try {
    // 1. Actualizar TODOS los productos para tener stock infinito
    console.log('🔧 Estableciendo stock infinito para todos los productos...');
    const { data: updateResult, error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: 999999 })
      .select('id, name, stock_quantity');
    
    if (updateError) {
      console.error('❌ Error al actualizar stock:', updateError);
    } else {
      console.log(`✅ Stock actualizado para ${updateResult?.length || 0} productos`);
      updateResult?.forEach(product => {
        console.log(`📦 ${product.name}: Stock = ${product.stock_quantity}`);
      });
    }
    
    // 2. Verificar que no haya productos con stock bajo
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity')
      .lt('stock_quantity', 100); // Buscar productos con stock menor a 100
    
    if (productsError) {
      console.error('❌ Error al verificar productos:', productsError);
      return;
    }
    
    if (products && products.length > 0) {
      console.warn('⚠️ Productos que aún tienen stock bajo:');
      products.forEach(product => {
        console.warn(`- ${product.name}: Stock = ${product.stock_quantity}`);
      });
    } else {
      console.log('✅ Todos los productos tienen stock suficiente');
    }
    
  } catch (error) {
    console.error('💥 Error inesperado al corregir stock:', error);
  }
}
