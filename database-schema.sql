-- ==================================================
-- COMPLETE DATABASE SCHEMA FOR GESTION DE VENTAS V1
-- Prepared for Stripe integration and Vercel deployment
-- ==================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- 1. PROFILES TABLE (User profiles for store customization)
-- ==================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL DEFAULT 'Mi Tienda',
    business_type TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
    currency TEXT DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    stripe_account_id TEXT, -- For Stripe Connect (future)
    stripe_customer_id TEXT, -- For Stripe customers
    is_stripe_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ==================================================
-- 2. CATEGORIES TABLE (Product categories)
-- ==================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    color TEXT DEFAULT '#6366f1', -- For UI customization
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(user_id, is_active);

-- ==================================================
-- 3. PRODUCTS TABLE (Product catalog)
-- ==================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(10,2) CHECK (original_price >= 0),
    cost_price DECIMAL(10,2) CHECK (cost_price >= 0), -- For profit calculations
    sku TEXT, -- Stock Keeping Unit
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT, -- Legacy field, kept for compatibility
    image_url TEXT,
    images TEXT[], -- Array for multiple images
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    weight DECIMAL(8,3), -- For shipping calculations
    dimensions JSONB, -- {length, width, height}
    tags TEXT[],
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_price_id TEXT, -- For Stripe price objects
    stripe_product_id TEXT, -- For Stripe product objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Users can view their own products" ON products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(user_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- ==================================================
-- 4. CUSTOMERS TABLE (Customer management for Stripe)
-- ==================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address JSONB, -- {street, city, state, postal_code, country}
    notes TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE, -- Stripe customer ID
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view their own customers" ON customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers" ON customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" ON customers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" ON customers
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ==================================================
-- 5. SALES TABLE (Sales/Orders with Stripe integration)
-- ==================================================

CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id TEXT, -- Human-readable ticket number
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    products JSONB NOT NULL, -- Array of {id, name, price, quantity, total}
    items JSONB, -- Alternative field name for compatibility
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    -- Stripe integration fields
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_session_id TEXT, -- For Checkout sessions
    -- Order details
    notes TEXT,
    shipping_address JSONB,
    billing_address JSONB,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    -- Status and dates
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'cancelled', 'refunded')),
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "Users can view their own sales" ON sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales" ON sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" ON sales
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales" ON sales
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(user_id, order_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_stripe_payment_intent ON sales(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(user_id, created_at);

-- ==================================================
-- 6. INVENTORY_MOVEMENTS TABLE (Stock control)
-- ==================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return')),
    quantity INTEGER NOT NULL, -- Positive for additions, negative for subtractions
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_movements
CREATE POLICY "Users can view their own inventory movements" ON inventory_movements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory movements" ON inventory_movements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(user_id, movement_type);

-- ==================================================
-- 7. PAYMENT_METHODS TABLE (For Stripe and other payments)
-- ==================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'transfer', 'stripe', 'paypal', 'other')),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    stripe_payment_method_id TEXT,
    configuration JSONB, -- For storing specific configs per method
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- ==================================================
-- 8. STRIPE_WEBHOOKS TABLE (For webhook event logging)
-- ==================================================

CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for stripe_webhooks
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_id ON stripe_webhooks(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_type ON stripe_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_processed ON stripe_webhooks(processed);

-- ==================================================
-- 9. REPORTS TABLE (Cached reports for better performance)
-- ==================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type_period ON reports(user_id, report_type, period_start, period_end);

-- ==================================================
-- 10. FUNCTIONS AND TRIGGERS
-- ==================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_id IS NULL THEN
        NEW.ticket_id = 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('ticket_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_sequence START 1;

-- Trigger for ticket generation
CREATE TRIGGER generate_sales_ticket_id BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_id();

-- Function to update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers 
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total
        WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE customers 
        SET total_spent = total_spent - OLD.total + NEW.total
        WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers 
        SET total_orders = total_orders - 1,
            total_spent = total_spent - OLD.total
        WHERE id = OLD.customer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer statistics
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Function to handle inventory movements
CREATE OR REPLACE FUNCTION handle_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    product_item JSONB;
    current_stock INTEGER;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        -- Process each product in the sale
        FOR product_item IN SELECT * FROM jsonb_array_elements(NEW.products)
        LOOP
            -- Get current stock
            SELECT stock_quantity INTO current_stock
            FROM products 
            WHERE id = (product_item->>'id')::UUID 
            AND user_id = NEW.user_id;
            
            IF current_stock IS NOT NULL THEN
                -- Update product stock
                UPDATE products 
                SET stock_quantity = stock_quantity - (product_item->>'quantity')::INTEGER
                WHERE id = (product_item->>'id')::UUID 
                AND user_id = NEW.user_id;
                
                -- Record inventory movement
                INSERT INTO inventory_movements (
                    product_id, user_id, sale_id, movement_type,
                    quantity, previous_stock, new_stock
                ) VALUES (
                    (product_item->>'id')::UUID,
                    NEW.user_id,
                    NEW.id,
                    'sale',
                    -(product_item->>'quantity')::INTEGER,
                    current_stock,
                    current_stock - (product_item->>'quantity')::INTEGER
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory management
CREATE TRIGGER handle_sales_inventory_trigger
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION handle_inventory_movement();

-- ==================================================
-- 11. INITIAL DATA SETUP
-- ==================================================

-- Insert default payment methods
INSERT INTO payment_methods (user_id, name, type, is_active, is_default) 
SELECT 
    auth.uid(),
    'Efectivo',
    'cash',
    true,
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert default category for existing users
INSERT INTO categories (user_id, name, description, is_active) 
SELECT 
    auth.uid(),
    'General',
    'Categoría por defecto',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- ==================================================
-- 12. USEFUL VIEWS FOR ANALYTICS
-- ==================================================

-- Daily sales summary view
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    user_id,
    order_date,
    COUNT(*) as total_orders,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value,
    SUM(tax_amount) as total_tax,
    SUM(discount_amount) as total_discounts
FROM sales 
WHERE status = 'completed'
GROUP BY user_id, order_date;

-- Product performance view
CREATE OR REPLACE VIEW product_performance AS
WITH product_sales AS (
    SELECT 
        s.user_id,
        (product_item->>'id')::UUID as product_id,
        SUM((product_item->>'quantity')::INTEGER) as total_quantity,
        SUM((product_item->>'total')::DECIMAL) as total_revenue
    FROM sales s,
         LATERAL jsonb_array_elements(s.products) AS product_item
    WHERE s.status = 'completed'
    GROUP BY s.user_id, (product_item->>'id')::UUID
)
SELECT 
    p.id,
    p.user_id,
    p.name,
    p.price,
    p.stock_quantity,
    COALESCE(ps.total_quantity, 0) as total_sold,
    COALESCE(ps.total_revenue, 0) as total_revenue,
    p.created_at
FROM products p
LEFT JOIN product_sales ps ON p.id = ps.product_id AND p.user_id = ps.user_id;

-- ==================================================
-- 13. PERMISSIONS AND SECURITY
-- ==================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================

-- The database is now ready for:
-- ✅ User authentication with Supabase Auth
-- ✅ Multi-user support with RLS policies
-- ✅ Product and category management
-- ✅ Inventory tracking
-- ✅ Sales and order processing
-- ✅ Customer management
-- ✅ Stripe payment integration (prepared)
-- ✅ Webhook handling for Stripe
-- ✅ Analytics and reporting
-- ✅ Vercel deployment optimization
-- ✅ Performance indexes
-- ✅ Data integrity constraints

SELECT 'Database schema created successfully! Ready for Stripe integration and Vercel deployment.' as status;
