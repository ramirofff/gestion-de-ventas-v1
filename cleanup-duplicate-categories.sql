-- Script para limpiar categorías duplicadas "General"
-- Ejecutar en Supabase SQL Editor

-- Primero, ver cuántas categorías "General" hay por usuario
SELECT user_id, name, COUNT(*) as count
FROM categories 
WHERE name = 'General'
GROUP BY user_id, name
HAVING COUNT(*) > 1;

-- Eliminar duplicados manteniendo solo la más antigua por usuario
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) as rn
  FROM categories 
  WHERE name = 'General'
)
DELETE FROM categories 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verificar que solo queda una categoría "General" por usuario
SELECT user_id, name, COUNT(*) as count
FROM categories 
WHERE name = 'General'
GROUP BY user_id, name;
