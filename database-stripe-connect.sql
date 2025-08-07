-- Actualizar la tabla client_accounts para Stripe Connect
CREATE TABLE IF NOT EXISTS client_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  country TEXT DEFAULT 'AR',
  platform_fee_percent DECIMAL(5,2) DEFAULT 3.00,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  account_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actualizar tabla sales para incluir info de Connect
ALTER TABLE sales ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_receives_amount DECIMAL(10,2);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_stripe_id ON client_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_sales_stripe_account ON sales(stripe_account_id);

-- Enable RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

-- Policy para que cada usuario solo vea su cuenta
CREATE POLICY "Users can only view their own account" ON client_accounts
FOR ALL USING (auth.uid() = user_id);

-- Function para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_accounts_updated_at 
BEFORE UPDATE ON client_accounts 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
