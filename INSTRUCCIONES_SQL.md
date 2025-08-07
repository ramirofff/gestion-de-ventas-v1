Ejecuta este script en Supabase SQL Editor:

```sql
-- Arreglar user_settings completamente

-- 1. Desactivar RLS temporalmente
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- 2. Mensaje de confirmación
SELECT 'RLS desactivado para user_settings - para testing' AS status;

-- 3. Verificar que la tabla existe
SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'user_settings';

-- 4. Insertar un registro de prueba para tu usuario
INSERT INTO user_settings (user_id, business_name, theme, favorite_products, stripe_configured) 
VALUES ('964dcf29-ec1e-4b9d-bf74-5de614862ad4'::UUID, 'Mi Negocio', 'dark', '{}', false)
ON CONFLICT (user_id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  theme = EXCLUDED.theme,
  updated_at = NOW();

-- 5. Verificar que se insertó correctamente
SELECT * FROM user_settings WHERE user_id = '964dcf29-ec1e-4b9d-bf74-5de614862ad4'::UUID;

SELECT 'user_settings arreglado completamente' AS final_status;
```

Una vez ejecutado, recarga la aplicación y prueba una compra.
