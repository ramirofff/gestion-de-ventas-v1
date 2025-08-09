-- 🛡️ RESTRICCIONES DE BASE DE DATOS PARA PREVENIR DUPLICADOS
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear función para encontrar duplicados
CREATE OR REPLACE FUNCTION find_duplicate_sales()
RETURNS TABLE(
  stripe_payment_intent_id TEXT,
  count BIGINT,
  ids TEXT[],
  created_dates TIMESTAMPTZ[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.stripe_payment_intent_id::TEXT,
    COUNT(*)::BIGINT as count,
    array_agg(s.id::TEXT ORDER BY s.created_at)::TEXT[] as ids,
    array_agg(s.created_at ORDER BY s.created_at)::TIMESTAMPTZ[] as created_dates
  FROM sales s
  WHERE s.stripe_payment_intent_id IS NOT NULL
  GROUP BY s.stripe_payment_intent_id
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Opcional: Limpiar duplicados existentes ANTES de aplicar restricción única
-- DESCOMENTA Y EJECUTA SOLO SI YA TIENES DUPLICADOS

-- Ver duplicados existentes:
-- SELECT * FROM find_duplicate_sales();

-- Limpiar duplicados (mantener solo el más antiguo por stripe_payment_intent_id):
-- DELETE FROM sales 
-- WHERE id NOT IN (
--   SELECT MIN(id) 
--   FROM sales 
--   WHERE stripe_payment_intent_id IS NOT NULL 
--   GROUP BY stripe_payment_intent_id
-- ) AND stripe_payment_intent_id IS NOT NULL;

-- 3. Agregar restricción única para stripe_payment_intent_id
-- ESTO PREVIENE DUPLICADOS A NIVEL DE BASE DE DATOS
DO $$ 
BEGIN
  -- Verificar si la restricción ya existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_stripe_payment_intent_id' 
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales 
    ADD CONSTRAINT unique_stripe_payment_intent_id 
    UNIQUE (stripe_payment_intent_id);
    
    RAISE NOTICE 'Restricción única agregada exitosamente ✅';
  ELSE
    RAISE NOTICE 'La restricción única ya existe ⚠️';
  END IF;
END $$;

-- 4. Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_stripe_payment_intent_id 
ON sales (stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- 5. Verificar que las restricciones se aplicaron correctamente
SELECT 
  constraint_name, 
  constraint_type, 
  table_name,
  'Aplicada correctamente ✅' as status
FROM information_schema.table_constraints 
WHERE table_name = 'sales' 
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'unique_stripe_payment_intent_id';

-- 6. Función utilitaria para verificar estado de duplicados
CREATE OR REPLACE FUNCTION check_duplicates_status()
RETURNS TABLE(
  total_sales_with_payment_intent BIGINT,
  unique_payment_intents BIGINT,
  duplicate_groups BIGINT,
  status TEXT
) AS $$
DECLARE
  total_count BIGINT;
  unique_count BIGINT;
  duplicate_count BIGINT;
BEGIN
  -- Contar total de ventas con stripe_payment_intent_id
  SELECT COUNT(*) INTO total_count
  FROM sales 
  WHERE stripe_payment_intent_id IS NOT NULL;
  
  -- Contar payment_intent_ids únicos
  SELECT COUNT(DISTINCT stripe_payment_intent_id) INTO unique_count
  FROM sales 
  WHERE stripe_payment_intent_id IS NOT NULL;
  
  -- Contar grupos con duplicados
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT stripe_payment_intent_id
    FROM sales 
    WHERE stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RETURN QUERY SELECT 
    total_count,
    unique_count,
    duplicate_count,
    CASE 
      WHEN duplicate_count = 0 THEN 'Sin duplicados ✅'
      ELSE 'Duplicados detectados ⚠️'
    END;
END;
$$ LANGUAGE plpgsql;

-- 7. Verificar estado actual
SELECT * FROM check_duplicates_status();

-- 8. Mensaje final
SELECT 
  'Restricciones de duplicados configuradas correctamente' as message,
  '🛡️ Los duplicados ahora se previenen a nivel de base de datos' as protection,
  '📊 Usa check_duplicates_status() para verificar el estado' as monitoring;
