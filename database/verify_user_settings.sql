-- Verificar y recrear tabla user_settings

-- 1. Verificar si la tabla existe
SELECT 
    table_name, 
    table_schema 
FROM information_schema.tables 
WHERE table_name = 'user_settings';

-- 2. Si la tabla no existe, crearla
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT DEFAULT 'Mi Negocio',
    theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'dark',
    favorite_products TEXT[] DEFAULT '{}',
    stripe_configured BOOLEAN DEFAULT FALSE,
    stripe_account_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Verificar permisos y RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Limpiar y recrear políticas
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

-- 5. Crear políticas simples
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Crear un registro de prueba para el usuario actual
INSERT INTO user_settings (user_id, business_name, theme) 
VALUES (auth.uid(), 'Mi Negocio', 'dark')
ON CONFLICT (user_id) DO NOTHING;

-- 7. Verificar que todo funcione
SELECT 'Tabla user_settings verificada y configurada' AS status;
