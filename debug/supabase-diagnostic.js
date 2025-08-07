// Script de diagnóstico para Supabase
// Ejecuta esto en la consola del navegador para diagnosticar problemas

console.log('🔍 DIAGNÓSTICO SUPABASE - INICIANDO...');

// Test 1: Verificar configuración
console.log('📋 1. Verificando configuración...');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'NO CONFIGURADO');

// Test 2: Conexión básica
console.log('🔗 2. Probando conexión básica...');
try {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  console.log('✅ Cliente Supabase creado exitosamente');
  
  // Test 3: Query de prueba
  console.log('📊 3. Probando query básica...');
  const { data: tables, error: tablesError } = await supabase
    .from('products')
    .select('count')
    .limit(1);
    
  if (tablesError) {
    console.error('❌ Error en query de prueba:', tablesError);
    console.error('❌ Detalles:', {
      message: tablesError.message,
      code: tablesError.code,
      details: tablesError.details,
      hint: tablesError.hint
    });
  } else {
    console.log('✅ Query de prueba exitosa:', tables);
  }
  
  // Test 4: Productos completos
  console.log('🛍️ 4. Cargando productos...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*');
    
  if (productsError) {
    console.error('❌ Error cargando productos:', productsError);
  } else {
    console.log('✅ Productos cargados:', products?.length || 0);
    console.log('📦 Primeros 3 productos:', products?.slice(0, 3));
  }
  
  // Test 5: Verificar RLS
  console.log('🔒 5. Verificando políticas RLS...');
  const { data: user } = await supabase.auth.getUser();
  console.log('👤 Usuario actual:', user.user ? `${user.user.email} (${user.user.id})` : 'No autenticado');
  
} catch (error) {
  console.error('❌ Error general en diagnóstico:', error);
}

console.log('✅ DIAGNÓSTICO COMPLETADO');
