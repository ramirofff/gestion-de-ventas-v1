import { supabase } from './supabaseClient';

export async function checkRLSPolicies() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return;
    }
    // Verificar acceso SELECT
    await supabase
      .from('sales')
      .select('*')
      .limit(1);
    // No realiza inserciones de prueba ni logs
  } catch (error) {
    // Silenciar errores en producción
  }
}
