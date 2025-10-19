-- ARCHIVADO: Este archivo fue movido aquí por limpieza 2025-10-18
-- Ver relación entre user_id, id (connected_account_id) y commission_rate
SELECT id AS connected_account_id, user_id, email, commission_rate
FROM connected_accounts
ORDER BY user_id;
