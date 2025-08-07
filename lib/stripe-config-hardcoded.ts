// Configuración hardcodeada de Stripe para la plataforma principal
// INSTRUCCIONES:
// 1. Reemplaza las claves de ejemplo con tus claves reales de Stripe
// 2. Usa las claves de TEST durante desarrollo
// 3. Usa las claves de LIVE en producción

export const STRIPE_CONFIG = {
  // Reemplaza con tus claves de Stripe USA
  PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TU_CLAVE_AQUI',
  SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_TU_CLAVE_AQUI',
  
  // ID de tu cuenta conectada principal (si tienes una)
  ACCOUNT_ID: process.env.STRIPE_ACCOUNT_ID || null,
  
  // Configuración de tu plataforma
  PLATFORM_NAME: 'Tu SaaS Payments',
  PLATFORM_URL: 'https://tu-dominio.com',
  SUPPORT_EMAIL: 'soporte@tu-dominio.com',
  
  // Configuración de comisiones
  DEFAULT_PLATFORM_FEE_PERCENT: 3, // Tu comisión por defecto
  
  // Configuración de moneda
  DEFAULT_CURRENCY: 'usd',
  
  // Configuración de país de la plataforma
  PLATFORM_COUNTRY: 'US',
  
  // Estado de configuración
  IS_CONFIGURED: true, // Siempre true ya que está hardcodeado
};

// Función para verificar que las claves están configuradas
export const validateStripeConfig = () => {
  const errors = [];
  
  if (!STRIPE_CONFIG.PUBLISHABLE_KEY || STRIPE_CONFIG.PUBLISHABLE_KEY.includes('TU_CLAVE_AQUI')) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada');
  }
  
  if (!STRIPE_CONFIG.SECRET_KEY || STRIPE_CONFIG.SECRET_KEY.includes('TU_CLAVE_AQUI')) {
    errors.push('STRIPE_SECRET_KEY no está configurada');
  }
  
  if (errors.length > 0) {
    console.warn('⚠️  Configuración de Stripe incompleta:', errors);
    return false;
  }
  
  console.log('✅ Configuración de Stripe validada correctamente');
  return true;
};
