import { supabase } from './supabaseClient';

export async function createSalesTableIfNotExists() {
  try {
    console.log('🔧 Verificando y creando tabla sales si es necesario...');
    
    // Primero verificar si el usuario está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }
    
    // Crear la tabla sales con estructura básica
    const { error: createError } = await supabase.rpc('create_sales_table_basic');
    
    if (createError) {
      console.log('La función RPC no existe, intentando crear tabla directamente...');
      
      // Intentar crear tabla con SQL directo (esto puede no funcionar en Supabase sin permisos)
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.sales (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          products JSONB NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
          payment_method TEXT DEFAULT 'cash',
          payment_status TEXT DEFAULT 'completed',
          status TEXT DEFAULT 'completed',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can insert their own sales" ON public.sales
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can view their own sales" ON public.sales
        FOR SELECT USING (auth.uid() = user_id);
      `;
      
      console.log('⚠️ Estructura de tabla requerida:');
      console.log(createTableSQL);
      
      return {
        success: false,
        message: 'Tabla sales no existe y no se puede crear automáticamente. Es necesario ejecutar el esquema manualmente en Supabase.',
        sql: createTableSQL
      };
    }
    
    console.log('✅ Tabla sales verificada/creada exitosamente');
    return { success: true, message: 'Tabla sales lista' };
    
  } catch (error) {
    console.error('Error al crear tabla sales:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`,
      error
    };
  }
}
