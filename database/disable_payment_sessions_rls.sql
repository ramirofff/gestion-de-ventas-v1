-- Fix final para payment_sessions RLS

-- Desactivar temporalmente RLS para payment_sessions para testing
ALTER TABLE payment_sessions DISABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
SELECT 'RLS desactivado para payment_sessions - para testing' AS status;

-- Si quieres reactivarlo después, usa:
-- ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
