-- ===============================================
-- SCRIPT DE LIMPIEZA SELECTIVA DE BASE DE DATOS
-- ===============================================
-- Este script limpia SOLO los datos operativos del sistema:
-- - Productos, Ventas, Categorías, Customers
-- - Sesiones de pago y comisiones de ventas
-- 
-- MANTIENE intactos:
-- - Usuarios registrados (profiles)
-- - Configuraciones de usuario (user_settings)  
-- - Cuentas conectadas de Stripe (connected_accounts)

-- ⚠️ ADVERTENCIA: Este script eliminará productos, ventas y categorías
-- pero mantendrá usuarios y configuraciones de Stripe

-- Deshabilitar RLS temporalmente para la limpieza
SET session_replication_role = 'replica';

-- Limpiar SOLO datos operativos en orden para evitar conflictos de claves foráneas
-- (Basado en las tablas que realmente existen en la base de datos)

TRUNCATE TABLE commission_sales CASCADE;        -- Historial de comisiones
TRUNCATE TABLE sales CASCADE;                   -- ⚠️ Eliminar todas las ventas
TRUNCATE TABLE products CASCADE;                -- ⚠️ Eliminar todos los productos
TRUNCATE TABLE categories CASCADE;              -- ⚠️ Eliminar todas las categorías
TRUNCATE TABLE customers CASCADE;               -- ⚠️ Eliminar todos los clientes
TRUNCATE TABLE client_accounts CASCADE;         -- ⚠️ Eliminar cuentas de clientes

-- Limpiar tablas adicionales que existen
DO $$
BEGIN
    -- Limpiar movimientos de inventario si existen
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        EXECUTE 'TRUNCATE TABLE inventory_movements CASCADE';
    END IF;
    
    -- Limpiar métodos de pago personalizados si existen
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        EXECUTE 'TRUNCATE TABLE payment_methods CASCADE';
    END IF;
    
    -- Limpiar reportes si existen
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports') THEN
        EXECUTE 'TRUNCATE TABLE reports CASCADE';
    END IF;
END $$;

-- ✅ NO se tocan estas tablas (mantienen usuarios y configuraciones):
-- - profiles (perfiles de usuario)
-- - user_settings (configuraciones de usuario)
-- - connected_accounts (cuentas de Stripe conectadas)
-- - stripe_configs (configuraciones de Stripe)
-- - stripe_webhooks (webhooks de Stripe)

-- Restablecer RLS
SET session_replication_role = 'origin';

-- Confirmación
SELECT 'Limpieza selectiva completada exitosamente.' as resultado,
       'Se eliminaron: productos, ventas, categorías, customers, comisiones' as datos_eliminados,
       'Se mantuvieron: usuarios, configuraciones, cuentas de Stripe' as datos_conservados;
