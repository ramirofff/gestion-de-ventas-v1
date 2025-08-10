-- ===============================================
-- SCRIPT DE LIMPIEZA COMPLETA DE BASE DE DATOS
-- ===============================================
-- Este script limpia TODAS las tablas del sistema
-- incluyendo usuarios, configuraciones y cuentas de Stripe
-- ⚠️ USAR SOLO EN CASOS EXTREMOS ⚠️

-- ⚠️ ADVERTENCIA CRÍTICA: 
-- Este script eliminará TODOS los datos incluyendo usuarios registrados
-- y configuraciones de Stripe. Solo úsalo si quieres empezar completamente desde cero

-- Deshabilitar RLS temporalmente para la limpieza
SET session_replication_role = 'replica';

-- Limpiar TODAS las tablas en orden para evitar conflictos de claves foráneas
TRUNCATE TABLE commission_sales CASCADE;        -- Historial de comisiones
TRUNCATE TABLE connected_accounts CASCADE;      -- ⚠️ Cuentas de Stripe conectadas
TRUNCATE TABLE payment_sessions CASCADE;        -- Sesiones de pago temporales
TRUNCATE TABLE sales CASCADE;                   -- ⚠️ Todas las ventas
TRUNCATE TABLE clients CASCADE;                 -- ⚠️ Todos los clientes
TRUNCATE TABLE products CASCADE;                -- ⚠️ Todos los productos
TRUNCATE TABLE categories CASCADE;              -- ⚠️ Todas las categorías
TRUNCATE TABLE user_settings CASCADE;           -- ⚠️ Configuraciones de usuario
TRUNCATE TABLE user_profiles CASCADE;           -- ⚠️ Perfiles de usuario

-- NOTA: La tabla auth.users es manejada por Supabase Auth
-- y no se puede/debe limpiar desde aquí

-- Restablecer RLS
SET session_replication_role = 'origin';

-- Confirmación
SELECT 'LIMPIEZA COMPLETA ejecutada exitosamente.' as resultado,
       'TODOS los datos han sido eliminados excepto auth.users' as advertencia,
       'Los usuarios tendrán que reconectarse a Stripe y reconfigurar todo' as consecuencias;
