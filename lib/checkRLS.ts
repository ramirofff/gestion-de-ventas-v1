import { supabase } from './supabaseClient';

export async function checkRLSPolicies() {
  console.log('🔍 VERIFICANDO POLÍTICAS RLS PARA TABLA SALES...');
  
  try {
    // 1. Verificar usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No hay usuario autenticado');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.id);
    
    // 2. Verificar acceso SELECT
    console.log('📖 Verificando acceso SELECT...');
    const { data: selectData, error: selectError } = await supabase
      .from('sales')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error en SELECT:', selectError.message);
    } else {
      console.log('✅ SELECT exitoso, registros encontrados:', selectData?.length);
    }
    
    // 3. Verificar acceso INSERT con datos mínimos
    console.log('📝 Verificando acceso INSERT...');
    const testSale = {
      user_id: user.id,
      products: [{ id: crypto.randomUUID(), name: 'test', price: 1, quantity: 1, total: 1 }],
      items: [{ id: crypto.randomUUID(), name: 'test', price: 1, quantity: 1, total: 1 }],
      total: 1,
      subtotal: 1
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('sales')
      .insert([testSale])
      .select();
    
    if (insertError) {
      console.error('❌ Error en INSERT:', insertError);
      console.error('- Código:', insertError.code);
      console.error('- Mensaje:', insertError.message);
      console.error('- Detalles:', insertError.details);
      console.error('- Hint:', insertError.hint);
      
      // Verificar si es un problema de RLS
      if (insertError.message.includes('RLS') || insertError.message.includes('policy')) {
        console.error('🚫 PROBLEMA DE RLS DETECTADO');
        console.error('Necesitas configurar las políticas RLS en Supabase Dashboard');
      }
    } else {
      console.log('✅ INSERT exitoso:', insertData);
      
      // Limpiar el registro de prueba
      if (insertData && insertData[0]) {
        await supabase.from('sales').delete().eq('id', insertData[0].id);
        console.log('🗑️ Registro de prueba eliminado');
      }
    }
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}
