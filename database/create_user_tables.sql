-- Tabla para configuraciones de usuario
CREATE TABLE user_settings (
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

-- Tabla para sesiones de pago temporales
CREATE TABLE payment_sessions (
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

-- Índices para mejor performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions(expires_at);

-- RLS (Row Level Security) para user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS para payment_sessions
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment sessions" ON payment_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment sessions" ON payment_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment sessions" ON payment_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment sessions" ON payment_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Función para limpiar sesiones expiradas automáticamente
CREATE OR REPLACE FUNCTION clean_expired_payment_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM payment_sessions 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Crear una extensión de cron job si está disponible (opcional)
-- SELECT cron.schedule('clean-expired-sessions', '0 * * * *', 'SELECT clean_expired_payment_sessions();');
