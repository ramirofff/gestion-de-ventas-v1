import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhnqryvckbmdqyzexzxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnFyeXZja2JtZHF5emV4enhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTA4MDcsImV4cCI6MjA2ODAyNjgwN30.H9nAZSjauVRr84JJoWARJExVnjCUAM-fY1yEiL4vep4';

// Singleton global para cliente del lado del cliente (evitar múltiples instancias en el navegador)
let supabaseClient: SupabaseClient | null = null;
const getSupabaseClient = (): SupabaseClient => {
  if (typeof window === 'undefined') {
    // En servidor, crear nuevo cliente cada vez (no hay sesión persistente)
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  // En el navegador, usar singleton
  if (!supabaseClient) {
    // Usar storage key única para evitar conflictos
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseClient;
};

export const supabase = getSupabaseClient();

// Cliente para operaciones del servidor (bypassa RLS) - Solo usar en API routes
// Este se crea una vez en el módulo ya que es solo para servidor
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
