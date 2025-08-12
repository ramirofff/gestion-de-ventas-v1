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
    // Aquí puedes agregar lógica para verificar la existencia de la tabla o migraciones,
    // pero NO se pueden ejecutar sentencias SQL directamente en TypeScript.
    // Si necesitas crear índices, RLS o políticas, hazlo desde scripts SQL o desde Supabase Studio.
    return true;
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
