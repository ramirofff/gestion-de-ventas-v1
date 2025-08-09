-- =========================================
-- GESTIÓN DE VENTAS V1 - COMPLETE DATABASE SCHEMA
-- Professional POS System Database Setup
-- =========================================

-- Enable Row Level Security
-- This should be enabled by default in Supabase

-- =========================================
-- 1. PROFILES TABLE
-- User profiles linked to auth.users
-- =========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =========================================
-- 2. CATEGORIES TABLE
-- Product categories for organization
-- =========================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" ON public.categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
  FOR DELETE TO authenticated USING (true);

-- =========================================
-- 3. PRODUCTS TABLE
-- Main products inventory
-- =========================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  sku TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- RLS Policies for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE TO authenticated USING (true);

-- =========================================
-- 4. CLIENTS TABLE
-- Customer information
-- =========================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- RLS Policies for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- =========================================
-- 5. SALES TABLE
-- Main sales transactions
-- =========================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_client ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_intent ON public.sales(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- RLS Policies for sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales" ON public.sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" ON public.sales
  FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- 6. SALE_ITEMS TABLE
-- Individual items within each sale
-- =========================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- RLS Policies for sale_items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale_items of their own sales" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sale_items for their own sales" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.user_id = auth.uid()
    )
  );

-- =========================================
-- 7. USER_SETTINGS TABLE
-- User preferences and settings
-- =========================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT DEFAULT 'Mi Negocio',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  tax_rate DECIMAL(5,4) DEFAULT 0.0000 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  currency TEXT DEFAULT 'USD',
  receipt_footer TEXT,
  auto_print_receipt BOOLEAN DEFAULT false,
  low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- 8. STRIPE_PAYMENT_SESSIONS TABLE
-- Temporary storage for Stripe payment sessions
-- =========================================
CREATE TABLE IF NOT EXISTS public.stripe_payment_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  cart_items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  payment_intent_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for stripe_payment_sessions
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_session_id ON public.stripe_payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_user ON public.stripe_payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_status ON public.stripe_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_expires ON public.stripe_payment_sessions(expires_at);

-- RLS Policies for stripe_payment_sessions
ALTER TABLE public.stripe_payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment sessions" ON public.stripe_payment_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment sessions" ON public.stripe_payment_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment sessions" ON public.stripe_payment_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- 9. TRIGGERS FOR UPDATED_AT
-- Automatically update the updated_at field
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_stripe_payment_sessions_updated_at BEFORE UPDATE ON public.stripe_payment_sessions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =========================================
-- 10. FUNCTIONS FOR BUSINESS LOGIC
-- Helper functions for common operations
-- =========================================

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- When a sale item is created, reduce product stock
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products 
        SET stock = stock - NEW.quantity,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = NEW.product_id;
        
        -- Check if stock goes negative
        IF (SELECT stock FROM public.products WHERE id = NEW.product_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product ID: %', NEW.product_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- When a sale item is deleted, restore product stock
    IF TG_OP = 'DELETE' THEN
        UPDATE public.products 
        SET stock = stock + OLD.quantity,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = OLD.product_id;
        
        RETURN OLD;
    END IF;
    
    -- When a sale item is updated, adjust stock accordingly
    IF TG_OP = 'UPDATE' THEN
        -- First restore old quantity
        UPDATE public.products 
        SET stock = stock + OLD.quantity,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = OLD.product_id;
        
        -- Then subtract new quantity
        UPDATE public.products 
        SET stock = stock - NEW.quantity,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = NEW.product_id;
        
        -- Check if stock goes negative
        IF (SELECT stock FROM public.products WHERE id = NEW.product_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product ID: %', NEW.product_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply stock update trigger
CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- =========================================
-- 11. INITIAL DATA
-- Default categories and sample data
-- =========================================

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
  ('Bebidas', 'Bebidas y líquidos'),
  ('Comida', 'Alimentos y comestibles'),
  ('Snacks', 'Aperitivos y golosinas'),
  ('Productos de Limpieza', 'Artículos de limpieza y hogar'),
  ('Tecnología', 'Dispositivos y accesorios tecnológicos'),
  ('Ropa', 'Vestimenta y accesorios'),
  ('Salud', 'Productos de salud y cuidado personal'),
  ('Hogar', 'Artículos para el hogar'),
  ('Deportes', 'Equipamiento deportivo'),
  ('Libros', 'Literatura y material de lectura')
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- 12. VIEWS FOR REPORTING
-- Useful views for analytics and reports
-- =========================================

-- Sales summary view
CREATE OR REPLACE VIEW public.sales_summary AS
SELECT 
    s.id,
    s.user_id,
    s.client_id,
    c.name as client_name,
    s.total,
    s.payment_method,
    s.status,
    s.created_at,
    COUNT(si.id) as items_count,
    SUM(si.quantity) as total_quantity
FROM public.sales s
LEFT JOIN public.clients c ON s.client_id = c.id
LEFT JOIN public.sale_items si ON s.id = si.sale_id
GROUP BY s.id, c.name;

-- Product sales analytics view
CREATE OR REPLACE VIEW public.product_sales_analytics AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock,
    cat.name as category_name,
    COALESCE(SUM(si.quantity), 0) as total_sold,
    COALESCE(SUM(si.total_price), 0) as total_revenue,
    COALESCE(AVG(si.unit_price), p.price) as avg_selling_price
FROM public.products p
LEFT JOIN public.categories cat ON p.category_id = cat.id
LEFT JOIN public.sale_items si ON p.id = si.product_id
LEFT JOIN public.sales s ON si.sale_id = s.id AND s.status = 'completed'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.price, p.stock, cat.name;

-- Daily sales report view
CREATE OR REPLACE VIEW public.daily_sales_report AS
SELECT 
    DATE(s.created_at) as sale_date,
    COUNT(s.id) as total_sales,
    SUM(s.total) as total_revenue,
    AVG(s.total) as avg_sale_amount,
    COUNT(DISTINCT s.client_id) as unique_customers
FROM public.sales s
WHERE s.status = 'completed'
GROUP BY DATE(s.created_at)
ORDER BY sale_date DESC;

-- =========================================
-- 13. CLEANUP EXPIRED SESSIONS
-- Function to clean up expired Stripe sessions
-- =========================================

CREATE OR REPLACE FUNCTION cleanup_expired_stripe_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.stripe_payment_sessions
    WHERE expires_at < NOW() AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- SETUP COMPLETE
-- =========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables created: profiles, categories, products, clients, sales, sale_items, user_settings, stripe_payment_sessions';
    RAISE NOTICE '🔐 RLS policies applied to all tables';
    RAISE NOTICE '📈 Views created for reporting and analytics';
    RAISE NOTICE '⚡ Triggers set up for stock management and timestamps';
    RAISE NOTICE '🚀 Ready for production use!';
END $$;
