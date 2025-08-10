-- 🏗️ TABLA PARA CLIENTES CONECTADOS (Stripe Connect)
-- Ejecutar este SQL en Supabase SQL Editor

-- Crear tabla para cuentas conectadas
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',
  commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.05, -- 5% = 0.050
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'restricted', 'inactive')),
  details_submitted BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_id ON connected_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON connected_accounts(status);

-- Políticas RLS (con DROP IF EXISTS para evitar errores)
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own connected accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Users can insert own connected accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected accounts" ON connected_accounts;

-- Crear políticas nuevamente
CREATE POLICY "Users can view own connected accounts" ON connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connected accounts" ON connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connected accounts" ON connected_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Crear tabla para ventas con comisión
CREATE TABLE IF NOT EXISTS commission_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT,
  customer_email TEXT,
  product_name TEXT NOT NULL,
  amount_total DECIMAL(10,2) NOT NULL, -- Monto total
  commission_amount DECIMAL(10,2) NOT NULL, -- Tu comisión
  net_amount DECIMAL(10,2) NOT NULL, -- Lo que recibe el cliente
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transfer_id TEXT, -- ID del transfer de Stripe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para commission_sales
CREATE INDEX IF NOT EXISTS idx_commission_sales_account ON commission_sales(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_commission_sales_payment_intent ON commission_sales(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_commission_sales_status ON commission_sales(status);

-- RLS para commission_sales
ALTER TABLE commission_sales ENABLE ROW LEVEL SECURITY;

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Users can view own commission sales" ON commission_sales;

-- Crear política para commission_sales
CREATE POLICY "Users can view own commission sales" ON commission_sales
  FOR SELECT USING (
    connected_account_id IN (
      SELECT id FROM connected_accounts WHERE user_id = auth.uid()
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at (con DROP IF EXISTS para evitar errores)
DROP TRIGGER IF EXISTS update_connected_accounts_updated_at ON connected_accounts;
DROP TRIGGER IF EXISTS update_commission_sales_updated_at ON commission_sales;

CREATE TRIGGER update_connected_accounts_updated_at 
    BEFORE UPDATE ON connected_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_sales_updated_at 
    BEFORE UPDATE ON commission_sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para estadísticas de comisión
DROP VIEW IF EXISTS commission_stats;

CREATE VIEW commission_stats AS
SELECT 
  ca.user_id,
  ca.business_name,
  ca.country,
  COUNT(cs.id) as total_sales,
  COALESCE(SUM(cs.amount_total), 0) as total_revenue,
  COALESCE(SUM(cs.commission_amount), 0) as total_commission,
  COALESCE(SUM(cs.net_amount), 0) as total_client_earnings,
  DATE_TRUNC('month', cs.created_at) as month
FROM connected_accounts ca
LEFT JOIN commission_sales cs ON ca.id = cs.connected_account_id
GROUP BY ca.user_id, ca.business_name, ca.country, DATE_TRUNC('month', cs.created_at)
ORDER BY month DESC;

-- Mensaje de confirmación
SELECT 'Tablas de Stripe Connect creadas exitosamente ✅' as status;
