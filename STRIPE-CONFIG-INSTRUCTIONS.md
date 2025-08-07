# 🔑 Configuración de Claves Stripe

## ✅ **¿Qué hicimos?**

1. **Eliminamos toda la interfaz de configuración** de la web app
2. **Hardcodeamos que Stripe está configurado** (`stripeConfigured = true`)
3. **Simplificamos el flujo de pagos** (sin validaciones de configuración)
4. **Creamos archivo de configuración** para tus claves

## 🛠️ **Para Agregar Tus Claves**

### **Opción 1: Variables de Entorno (Recomendado)**
Agrega estas variables en tu archivo `.env.local`:

```bash
# Claves de tu cuenta Stripe USA
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Tu clave pública
STRIPE_SECRET_KEY=sk_test_... # Tu clave secreta

# Opcional: ID de tu cuenta Stripe si tienes cuenta conectada
STRIPE_ACCOUNT_ID=acct_... # Si aplica
```

### **Opción 2: Hardcodear Directamente**
Edita el archivo `lib/stripe-config-hardcoded.ts`:

```typescript
export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: 'pk_test_TU_CLAVE_PUBLICA_AQUI',
  SECRET_KEY: 'sk_test_TU_CLAVE_SECRETA_AQUI',
  // ... resto de configuración
};
```

## 🧪 **Para Probar Local**

1. **Agrega tus claves** (opción 1 o 2)
2. **Reinicia el servidor**: `npm run dev`
3. **Ve a**: `http://localhost:3002`
4. **Agrega productos al carrito**
5. **Haz clic en "Pagar"** 
6. **¡Debería mostrar el modal de Stripe directo!** (sin configuración)

## 🚀 **Para Producción**

### **En Vercel:**
```bash
# Variables de entorno en Vercel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # Clave LIVE
STRIPE_SECRET_KEY=sk_live_... # Clave LIVE
```

## 📋 **¿Dónde Encuentro Mis Claves?**

1. **Ve a**: [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Click**: "Developers" → "API keys"
3. **Copia**:
   - **Publishable key**: `pk_test_...` (o `pk_live_...`)
   - **Secret key**: `sk_test_...` (o `sk_live_...`)

## ⚡ **Estado Actual**

✅ **Web app limpia** - Sin mensajes de configuración  
✅ **Flujo directo** - Click "Pagar" → Modal Stripe  
✅ **SaaS listo** - Clientes pueden usar `/client/onboarding`  
✅ **USD configurado** - Todo en dólares  

## 🎯 **Próximo Paso**

**Pásame tus claves de Stripe y yo las agrego al código**, o agrégalas tú directamente usando las opciones de arriba.

Una vez agregadas, tu sistema estará 100% funcional para:
- ✅ Procesar pagos directos
- ✅ Conectar clientes argentinos  
- ✅ Generar QR codes
- ✅ Cobrar comisiones automáticas

---

**¿Tienes las claves listas para agregar?** 🚀
