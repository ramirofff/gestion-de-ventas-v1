-- Crear tabla para configuraciones de Stripe
CREATE TABLE IF NOT EXISTS stripe_configs (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    business_type TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_stripe_configs_updated_at
    BEFORE UPDATE ON stripe_configs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE stripe_configs ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (puedes restringir según necesites)
CREATE POLICY "Enable all operations for stripe_configs" ON stripe_configs
FOR ALL USING (true);
