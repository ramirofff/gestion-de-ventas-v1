-- ARCHIVADO: Este archivo fue movido aquí por limpieza 2025-10-18
-- Consulta para ver el commission_rate actual de todos los usuarios conectados
SELECT user_id, email, commission_rate
FROM connected_accounts
ORDER BY commission_rate DESC, user_id;
