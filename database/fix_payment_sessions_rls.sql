-- Fix para la política de payment_sessions

-- Eliminar política problemática
DROP POLICY IF EXISTS "Users can insert their own payment sessions" ON payment_sessions;

-- Crear política corregida que maneje mejor la autenticación
CREATE POLICY "Users can insert their own payment sessions" ON payment_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid()::text = user_id::text
    );

-- También corregir la política de UPDATE
DROP POLICY IF EXISTS "Users can update their own payment sessions" ON payment_sessions;

CREATE POLICY "Users can update their own payment sessions" ON payment_sessions
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid()::text = user_id::text
    );

SELECT 'Política de payment_sessions corregida' AS status;
