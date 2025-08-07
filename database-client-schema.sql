-- Script SQL para configurar el sistema con autenticación de usuario

-- Actualizar la tabla sales existente para incluir info del usuario autenticado
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_stripe_payment_intent ON public.sales(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);

-- Comentarios para documentación
COMMENT ON COLUMN public.sales.stripe_payment_intent_id IS 'ID del payment intent de Stripe para rastrear el pago';
COMMENT ON COLUMN public.sales.metadata IS 'Datos adicionales del pago, incluyendo email del cliente autenticado';
COMMENT ON COLUMN public.sales.user_id IS 'ID del usuario autenticado que realizó la venta (de Supabase Auth)';

-- Ejemplo de cómo consultar ventas por cliente:
-- SELECT * FROM sales WHERE user_id = 'uuid-del-usuario-autenticado';
-- SELECT metadata->>'client_email' as email, * FROM sales WHERE metadata->>'client_email' = 'cliente@email.com';
