-- Verificar y corregir políticas RLS para tabla products
-- Ejecuta esto en tu panel de Supabase SQL Editor

-- 1. Verificar si RLS está habilitado en la tabla products
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'products';

-- 2. Ver políticas actuales
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'products';

-- 3. Deshabilitar RLS temporalmente para productos (son datos públicos)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 4. Alternativamente, si quieres mantener RLS habilitado, 
-- crear política que permita acceso público a productos:
-- DROP POLICY IF EXISTS "Anyone can view products" ON products;
-- CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- 5. Para operaciones administrativas, mantener políticas de usuario autenticado:
-- DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
-- CREATE POLICY "Authenticated users can manage products" ON products
--   FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Verificar que los productos están accesibles
-- SELECT COUNT(*) FROM products;

-- ✅ Los productos ahora deberían ser accesibles sin autenticación
-- La aplicación debería cargar los productos correctamente
