# 🎯 Sistema de Comisiones Stripe Connect - Manual Completo

## 📋 Resumen del Sistema

Tu aplicación ahora incluye un **sistema completo de comisiones** usando Stripe Connect que te permite cobrar comisiones automáticas en cada venta. Este sistema funciona tanto con cuentas reales de Stripe como con un sistema virtual para países con restricciones (como Argentina).

## 🏗️ Arquitectura del Sistema

### 1. **Doble Modalidad**
- **Cuentas Reales**: Para países soportados por Stripe Connect (USA, Europa, etc.)
- **Cuentas Virtuales**: Para Argentina y otros países restringidos

### 2. **Tablas de Base de Datos**
- `connected_accounts`: Almacena información de cuentas conectadas
- `commission_sales`: Registra cada venta y su comisión correspondiente

## 📥 Pasos de Configuración

### 1. **Ejecutar SQL Schema**
```sql
-- Copia y pega el contenido de stripe_connect_schema.sql
-- en el SQL Editor de Supabase y ejecuta
```

### 2. **Variables de Entorno**
Asegúrate de tener en tu `.env.local`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SUPABASE_URL=https://....supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. **URLs Disponibles**
- `/` - Página principal (incluye enlaces a Stripe Connect)
- `/stripe-connect-demo` - Demo automático de Stripe Connect
- `/stripe-connect-manual` - Gestión manual de cuentas
- `/commissions` - Panel de comisiones para ver ganancias

## 🚀 Flujo de Trabajo

### **Para Clientes (Automated)**
1. Cliente accede a `/stripe-connect-demo`
2. Completa formulario con datos de negocio
3. Sistema crea cuenta Stripe automáticamente
4. Para países soportados: redirige a onboarding de Stripe
5. Para Argentina: crea cuenta virtual inmediatamente

### **Para Clientes (Manual)**
1. Tú creas cuenta en Dashboard de Stripe manualmente
2. Cliente accede a `/stripe-connect-manual`
3. Ingresa el Account ID que le proporcionas
4. Sistema valida y registra la cuenta

### **Procesamiento de Comisiones**
1. Cliente realiza venta usando Stripe
2. Sistema automáticamente:
   - Detecta que hay cuenta conectada
   - Calcula comisión (por defecto 5%)
   - Registra transacción en `commission_sales`
   - Para cuentas reales: crea transfer automático
   - Para cuentas virtuales: marca para transfer manual

## 💰 Sistema de Comisiones

### **Configuración por Defecto**
- **Tasa de comisión**: 5% (configurable por cuenta)
- **Moneda**: USD
- **Método de pago**: Automático para países soportados, manual para Argentina

### **Ejemplo de Transacción**
```
Venta total: $100.00
Tu comisión (5%): $5.00
Cliente recibe: $95.00
```

## 🛠️ APIs Disponibles

### **1. Verificar Estado** - `POST /api/stripe-connect/status`
```json
{
  "success": true,
  "connected": true,
  "account": {
    "businessName": "Mi Negocio",
    "country": "AR"
  },
  "stats": {
    "totalCommission": "25.50",
    "totalSales": 12
  }
}
```

### **2. Crear Cuenta** - `POST /api/stripe-connect/create-account`
```json
{
  "email": "cliente@email.com",
  "businessName": "Negocio Cliente",
  "country": "AR",
  "commissionRate": 0.05
}
```

### **3. Procesar Comisión** - `POST /api/stripe-connect/process-commission`
```json
{
  "userId": "user-id",
  "stripePaymentIntentId": "pi_xxx",
  "saleAmount": 100.00,
  "saleItems": [...],
  "customerEmail": "cliente@email.com"
}
```

### **4. Registro Manual** - `POST /api/stripe-connect/manual-save`
```json
{
  "stripeAccountId": "acct_xxx",
  "businessName": "Negocio",
  "email": "email@domain.com",
  "commissionRate": 0.05
}
```

## 📊 Panel de Comisiones

El panel en `/commissions` muestra:
- **Total de comisiones** ganadas
- **Historial detallado** de cada transacción
- **Estado de transfers** (automático vs manual)
- **Estadísticas** por período

### **Estados de Comisión**
- ✅ **Completada**: Comisión procesada exitosamente
- ⏳ **Pendiente**: En proceso
- 💸 **Auto Transfer**: Transfer automático creado
- 🔧 **Transfer Manual**: Requiere transfer manual (Argentina)

## 🔧 Gestión Manual (Argentina)

### **Para Clientes Argentinos**
1. **Crear cuenta manualmente** en Stripe Dashboard
2. Obtener Account ID (`acct_xxxx`)
3. **Registrar en sistema** usando `/stripe-connect-manual`
4. **Ventas funcionan normalmente** con comisiones
5. **Transfers manuales** realizados periódicamente

### **Proceso de Transfer Manual**
```bash
# En Stripe Dashboard o CLI
stripe transfers create \
  --amount 9500 \
  --currency usd \
  --destination acct_xxxx
```

## 🔍 Diagnóstico y Logs

### **Logs de Console**
El sistema genera logs detallados:
```
🔍 API: Verificando estado de Stripe Connect...
👤 Verificando para usuario: [user-id]
✅ Cuenta conectada encontrada: [business-name]
💰 Procesando comisión para venta completada...
💸 Creando transfer automático a cuenta real...
```

### **Solución de Problemas**
- **"No se encontró cuenta conectada"**: Ejecutar SQL schema
- **"Error de autenticación"**: Verificar variables de entorno
- **"Transfer failed"**: Revisar estado de cuenta en Stripe

## 📈 Casos de Uso

### **Caso 1: Cliente USA/Europa**
1. Cliente usa demo automático
2. Completa onboarding de Stripe
3. Vende → comisión automática → transfer automático

### **Caso 2: Cliente Argentina**
1. Tú creas cuenta manualmente
2. Cliente registra Account ID
3. Vende → comisión calculada → transfer manual periódico

### **Caso 3: Multi-Cliente**
- Múltiples clientes conectados
- Cada venta identifica el cliente automáticamente
- Comisiones separadas por cliente
- Dashboard unificado para todas las comisiones

## 🎉 Beneficios del Sistema

- ✅ **Automático**: Comisiones calculadas en cada venta
- ✅ **Flexible**: Soporta múltiples países y modalidades  
- ✅ **Transparente**: Cliente y tú ven todas las transacciones
- ✅ **Escalable**: Maneja múltiples clientes simultáneamente
- ✅ **Auditoria**: Historial completo de comisiones
- ✅ **Professional**: Interfaz pulida para clientes

## 📞 Siguientes Pasos

1. **Ejecutar SQL schema** en Supabase
2. **Probar flujo completo** con cuenta de prueba
3. **Documentar proceso** para tus clientes
4. **Configurar transfers manuales** periódicos para Argentina
5. **Personalizar tasas** de comisión según cliente
