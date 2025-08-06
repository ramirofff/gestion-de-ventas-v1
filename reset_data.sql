
-- Script para borrar todas las tablas excepto users

-- Borrar productos
DELETE FROM products;

-- Borrar categorías 
DELETE FROM categories;

-- Borrar ventas (si existe la tabla)
DELETE FROM sales;

-- Borrar detalles de ventas (si existe la tabla)
DELETE FROM sales_details;

-- Otros posibles borrados específicos
-- DELETE FROM otros_datos;

-- Notificación de finalización
SELECT 'Datos borrados correctamente' as resultado;

