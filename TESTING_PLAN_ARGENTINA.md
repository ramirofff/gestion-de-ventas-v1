# 🧪 PLAN DE TESTING - Stripe Connect Argentina

## Fase 1: Preparación (Modo Test)
1. ✅ SQL ejecutado en Supabase
2. ✅ Crear cuenta test en Stripe Dashboard:
   - País: Argentina
   - Tipo: Express
   - Moneda: USD
   - Obtener Account ID test: `acct_test_xxxxx`

## Fase 2: Testing del Flujo
1. Cliente accede a `/stripe-connect-manual`
2. Ingresa datos con Account ID test
3. Ve "✅ Stripe Conectado" en página principal
4. Realiza venta de prueba por $10 USD
5. Verificar:
   - Comisión calculada: $0.50
   - Cliente recibe: $9.50
   - Transfer creado automáticamente

## Fase 3: Verificación de Conversiones
- En Stripe Dashboard → Payments
- Ver conversión USD → ARS automática
- Verificar comisiones de conversión (~1.5%)
- Confirmar que transfers llegan correctamente

## Fase 4: Migración a Producción
- Cambiar a keys reales: `sk_live_...` y `pk_live_...`
- Crear cuentas reales para clientes
- Completar onboarding real de Stripe (documentos, verificación)
- ¡Listo para ventas reales!

## 💰 Costos Esperados (Producción)
- Stripe fee: 2.9% + $0.30 por transacción
- Comisión tuya: 5%
- Conversión USD→ARS: ~1.5% (si cuenta en pesos)
- Transfer fee: Gratis para cuentas argentinas

## Ejemplo Real:
```
Cliente argentino vende $100 USD:
- Stripe fee: $3.20
- Tu comisión: $5.00  
- Conversión: ~$1.50
- Cliente recibe: ~$90.30 USD = ~16,754 ARS
```
