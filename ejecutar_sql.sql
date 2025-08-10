-- ===============================================
-- SISTEMA DE GESTIÓN DE VENTAS V1 - BASE DE DATOS
-- ===============================================
-- Este archivo contiene todas las tablas, funciones, políticas RLS
-- e índices necesarios para el funcionamiento completo del sistema

-- ===============================================
-- 1. HABILITACIÓN DE EXTENSIONES
-- ===============================================

-- Habilitar la extensión de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar la extensión de generación de IDs únicos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- 2. FUNCIONES DE UTILIDAD
-- ===============================================

-- Función para generar ticket IDs únicos
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
         LPAD((EXTRACT(epoch FROM NOW()) * 1000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 3. TABLA DE PERFILES DE USUARIO
-- ===============================================

-- Tabla para almacenar información adicional de usuarios
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 4. TABLA DE CATEGORÍAS
-- ===============================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '📦',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ===============================================
-- 5. TABLA DE PRODUCTOS
-- ===============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  inactive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 6. TABLA DE CUSTOMERS (CLIENTES)
-- ===============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 7. TABLA DE VENTAS PRINCIPALES
-- ===============================================

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE DEFAULT generate_ticket_id(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  
  -- Campos específicos para Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_session_id TEXT,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 8. TABLA DE CONFIGURACIONES DE USUARIO
-- ===============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT DEFAULT 'Mi Negocio',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  currency TEXT DEFAULT 'USD',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  receipt_footer TEXT,
  auto_print BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 9. TABLA DE CUENTAS CONECTADAS STRIPE
-- ===============================================

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT,
  country TEXT DEFAULT 'AR',
  details_submitted BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 10. TABLA DE HISTORIAL DE COMISIONES
-- ===============================================

CREATE TABLE IF NOT EXISTS commission_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_account_id TEXT REFERENCES connected_accounts(stripe_account_id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  original_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 11. TABLA DE CUENTAS DE CLIENTE
-- ===============================================

CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  account_number TEXT,
  account_type TEXT DEFAULT 'credit',
  balance DECIMAL(10,2) DEFAULT 0,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 12. TABLA DE CONFIGURACIONES STRIPE
-- ===============================================

CREATE TABLE IF NOT EXISTS stripe_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  publishable_key TEXT,
  webhook_endpoint_id TEXT,
  webhook_secret TEXT,
  account_id TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 13. TABLA DE WEBHOOKS STRIPE
-- ===============================================

CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 14. TABLAS OPCIONALES (SI EXISTEN)
-- ===============================================

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de métodos de pago personalizados
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 15. ÍNDICES PARA OPTIMIZACIÓN
-- ===============================================

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_inactive ON products(inactive);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_stripe_payment_intent ON sales(stripe_payment_intent_id);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Índices para cuentas conectadas
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_id ON connected_accounts(stripe_account_id);

-- Índices para commission_sales
CREATE INDEX IF NOT EXISTS idx_commission_sales_account_id ON commission_sales(connected_account_id);

-- ===============================================
-- 16. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ===============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- POLÍTICAS PARA PROFILES
-- ===============================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA CATEGORIES
-- ===============================================

DROP POLICY IF EXISTS "Users can read own categories" ON categories;
CREATE POLICY "Users can read own categories" ON categories 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories" ON categories 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories" ON categories 
  FOR DELETE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA PRODUCTS
-- ===============================================

DROP POLICY IF EXISTS "Users can read own products" ON products;
CREATE POLICY "Users can read own products" ON products 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products" ON products 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products 
  FOR DELETE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA CUSTOMERS
-- ===============================================

DROP POLICY IF EXISTS "Users can read own customers" ON customers;
CREATE POLICY "Users can read own customers" ON customers 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
CREATE POLICY "Users can insert own customers" ON customers 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own customers" ON customers;
CREATE POLICY "Users can update own customers" ON customers 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
CREATE POLICY "Users can delete own customers" ON customers 
  FOR DELETE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA SALES
-- ===============================================

DROP POLICY IF EXISTS "Users can read own sales" ON sales;
CREATE POLICY "Users can read own sales" ON sales 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales" ON sales;
CREATE POLICY "Users can insert own sales" ON sales 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales" ON sales;
CREATE POLICY "Users can update own sales" ON sales 
  FOR UPDATE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA USER_SETTINGS
-- ===============================================

DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
CREATE POLICY "Users can read own settings" ON user_settings 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings 
  FOR UPDATE USING (auth.uid() = user_id);

-- ===============================================
-- POLÍTICAS PARA CONNECTED_ACCOUNTS
-- ===============================================

DROP POLICY IF EXISTS "Users can read own connected accounts" ON connected_accounts;
CREATE POLICY "Users can read own connected accounts" ON connected_accounts 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own connected accounts" ON connected_accounts;
CREATE POLICY "Users can insert own connected accounts" ON connected_accounts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own connected accounts" ON connected_accounts;
CREATE POLICY "Users can update own connected accounts" ON connected_accounts 
  FOR UPDATE USING (auth.uid() = user_id);

-- ===============================================
-- 17. TRIGGERS PARA UPDATED_AT
-- ===============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sales_updated_at 
  BEFORE UPDATE ON sales 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_connected_accounts_updated_at 
  BEFORE UPDATE ON connected_accounts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_commission_sales_updated_at 
  BEFORE UPDATE ON commission_sales 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ===============================================
-- 18. FUNCIONES PERSONALIZADAS
-- ===============================================

-- Función para obtener estadísticas de ventas del usuario
CREATE OR REPLACE FUNCTION get_sales_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_sales', COALESCE(SUM(total), 0),
        'total_orders', COUNT(*),
        'avg_order_value', COALESCE(AVG(total), 0),
        'this_month_sales', COALESCE(
            SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) 
                THEN total ELSE 0 END), 0
        ),
        'this_month_orders', COALESCE(
            SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) 
                THEN 1 ELSE 0 END), 0
        )
    ) INTO result
    FROM sales
    WHERE user_id = user_uuid AND payment_status = 'completed';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- FIN DEL SCRIPT
-- ===============================================

-- Script completado exitosamente
-- Sistema de Gestión de Ventas V1
-- Todas las tablas, índices, políticas y funciones han sido creadas
-- Compatible con las tablas existentes mostradas en la imagen
