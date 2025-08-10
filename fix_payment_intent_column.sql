-- Modificar tabla para permitir stripe_payment_intent_id nullable
ALTER TABLE commission_sales ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;
