-- Ejecuta esto en tu panel de Supabase en SQL Editor

-- 1. Crear tabla user_settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT,
    theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'dark',
    favorite_products TEXT[] DEFAULT '{}',
    stripe_configured BOOLEAN DEFAULT FALSE,
    stripe_account_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Crear tabla payment_sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    cart_data JSONB,
    total_amount DECIMAL(10,2),
    processed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at ON payment_sessions(expires_at);

-- 4. Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS para user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Políticas de RLS para payment_sessions
DROP POLICY IF EXISTS "Users can view their own payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Users can insert their own payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Users can update their own payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Users can delete their own payment sessions" ON payment_sessions;

CREATE POLICY "Users can view their own payment sessions" ON payment_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment sessions" ON payment_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment sessions" ON payment_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment sessions" ON payment_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION clean_expired_payment_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM payment_sessions 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ✅ ¡Migración completada! 
-- Ahora tu aplicación usará Supabase en lugar de localStorage para:
-- - Configuraciones de usuario (nombre del negocio, tema, favoritos)
-- - Sesiones de pago temporales
-- - Configuración de Stripe
