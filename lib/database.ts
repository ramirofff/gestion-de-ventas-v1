import { supabase } from './supabaseClient';

// Función helper para obtener el usuario autenticado de forma segura
async function getAuthenticatedUser() {
  try {
    // Primero verificar la sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Error de sesión: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error('No hay sesión activa');
    }
    
    // Luego obtener el usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error(`Error de autenticación: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    
    return user;
  } catch (error) {
    console.warn('Error en getAuthenticatedUser:', error);
    throw error;
  }
}

// Función para crear las tablas necesarias en Supabase
export async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');
    
    // Verificar si el usuario está autenticado usando el helper seguro
    const user = await getAuthenticatedUser();
    console.log('Usuario autenticado:', user.email);
    
    // Verificar si existen las tablas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('No se pudieron obtener las tablas existentes:', tablesError);
    } else {
      console.log('Tablas existentes:', tables?.map(t => t.table_name));
    }
    
    // Intentar crear categoría de prueba para verificar que la tabla existe
    const testCategory = {
      name: 'Categoría de Prueba - ' + Date.now(),
      user_id: user.id
    };
    
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .insert([testCategory])
      .select();
    
    if (testError) {
      console.error('Error al crear categoría de prueba:', testError);
      console.log('Posible problema con la tabla categories');
      
      // Intentar crear la tabla si no existe
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS categories (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Crear índice para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
        
        -- Habilitar RLS (Row Level Security)
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        
        -- Crear política para que los usuarios solo vean sus propias categorías
        CREATE POLICY IF NOT EXISTS "Users can view their own categories" ON categories
          FOR SELECT USING (auth.uid() = user_id);
        
        -- Crear política para que los usuarios solo puedan insertar sus propias categorías
        CREATE POLICY IF NOT EXISTS "Users can insert their own categories" ON categories
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        -- Crear política para que los usuarios solo puedan actualizar sus propias categorías
        CREATE POLICY IF NOT EXISTS "Users can update their own categories" ON categories
          FOR UPDATE USING (auth.uid() = user_id);
        
        -- Crear política para que los usuarios solo puedan eliminar sus propias categorías
        CREATE POLICY IF NOT EXISTS "Users can delete their own categories" ON categories
          FOR DELETE USING (auth.uid() = user_id);
      `;
      
      console.log('Intentando crear tabla categories...');
      return false;
    } else {
      console.log('Categoría de prueba creada exitosamente:', testData);
      
      // Eliminar la categoría de prueba
      if (testData && testData[0]) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', testData[0].id);
        console.log('Categoría de prueba eliminada');
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
    return false;
  }
}

// Función para obtener categorías con manejo de errores mejorado
export async function getCategoriesForUser() {
  try {
    // Verificar autenticación usando el helper seguro
    const user = await getAuthenticatedUser();
    
    // Obtener categorías del usuario
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error al obtener categorías: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getCategoriesForUser:', error);
    throw error;
  }
}

// Función para crear una categoría
export async function createCategory(name: string) {
  try {
    // Verificar autenticación usando el helper seguro
    const user = await getAuthenticatedUser();
    
    // Crear categoría
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, user_id: user.id }])
      .select();
    
    if (error) {
      throw new Error(`Error al crear categoría: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error en createCategory:', error);
    throw error;
  }
}
