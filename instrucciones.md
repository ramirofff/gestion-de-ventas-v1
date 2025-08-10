# 🚀 INSTRUCCIONES PARA INICIAR EL PROYECTO EN OTRA MÁQUINA

## 📋 REQUISITOS PREVIOS

### 🛠️ Software necesario:
- **Node.js** v18 o superior: https://nodejs.org/
- **npm** v9 o superior (viene con Node.js)
- **Git** (opcional): https://git-scm.com/

### ☁️ Servicios externos:
- **Cuenta Supabase**: https://supabase.com (gratuita)
- **Cuenta Stripe**: https://stripe.com (gratuita para desarrollo)
- **Cuenta Vercel**: https://vercel.com (opcional, para despliegue)

---

## 📥 PASO 1: CONFIGURAR EL PROYECTO

### 1.1 Clonar/Descargar el proyecto
```bash
# Si usas Git:
git clone [URL_DEL_REPOSITORIO]
cd gestion-de-ventas-v1

# O descargar ZIP y extraer en una carpeta
```

### 1.2 Instalar dependencias
```bash
# Navegar al directorio del proyecto
cd gestion-de-ventas-v1

# Instalar todas las dependencias (ver archivo dependencias_a_instalar.md)
npm install next@15.4.2 react@19 react-dom@19 typescript@5 @types/node @types/react @types/react-dom @supabase/supabase-js@2 stripe @stripe/stripe-js tailwindcss postcss autoprefixer @tailwindcss/typography lucide-react uuid @types/uuid js-cookie @types/js-cookie qrcode @types/qrcode && npm install -D eslint eslint-config-next @typescript-eslint/eslint-plugin @typescript-eslint/parser && npx tailwindcss init -p
```

---

## 🗄️ PASO 2: CONFIGURAR BASE DE DATOS (SUPABASE)

### 2.1 Crear proyecto Supabase
1. Ve a https://supabase.com
2. Crear cuenta/iniciar sesión
3. Clic en "New project"
4. Elegir organización y nombre del proyecto
5. Elegir región (preferiblemente más cercana)
6. Crear contraseña para la base de datos
7. Esperar a que se complete la configuración (2-3 minutos)

### 2.2 Configurar base de datos
1. En tu proyecto Supabase, ir a **SQL Editor**
2. Abrir el archivo `ejecutar_sql.sql` de este proyecto
3. **Copiar todo el contenido** del archivo
4. **Pegar en el SQL Editor** de Supabase
5. **Ejecutar** (botón "RUN" o Ctrl+Enter)
6. Verificar que se ejecutó sin errores

### 2.3 Obtener credenciales
En tu proyecto Supabase, ir a **Settings > API**:
- **Project URL**: `https://xxx.supabase.co`
- **Anon Public Key**: `eyJ0eXAiOiJKV1Q...`
- **Service Role Key**: `eyJ0eXAiOiJKV1Q...` (⚠️ **NO COMPARTIR**)

---

## 💳 PASO 3: CONFIGURAR STRIPE

### 3.1 Crear cuenta Stripe
1. Ve a https://stripe.com
2. Crear cuenta/iniciar sesión
3. **Activar modo de prueba** (toggle en la esquina superior)

### 3.2 Obtener claves API
En el Dashboard de Stripe, ir a **Developers > API Keys**:
- **Publishable key**: `pk_test_...`
- **Secret key**: `sk_test_...` (⚠️ **NO COMPARTIR**)

### 3.3 Configurar Webhooks (opcional)
1. Ir a **Developers > Webhooks**
2. Clic en "Add endpoint"
3. URL: `http://localhost:3000/api/webhooks/stripe`
4. Seleccionar eventos: `checkout.session.completed`, `payment_intent.succeeded`

---

## 🔧 PASO 4: CONFIGURAR VARIABLES DE ENTORNO

### 4.1 Crear archivo .env.local
En la raíz del proyecto, crear archivo `.env.local` con el siguiente contenido:

```env
# Supabase (reemplazar con tus valores)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key_aqui
STRIPE_SECRET_KEY=sk_test_tu_secret_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui

# Stripe Express (opcional)
STRIPE_EXPRESS_CLIENT_ID=ca_tu_express_client_id_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Para producción en Vercel (ejemplo):
# NEXT_PUBLIC_APP_URL=https://gestion-de-ventas-v1.vercel.app
```

### ⚠️ IMPORTANTE:
- **NUNCA** compartir las claves secretas (service_role_key, secret_key)
- **NUNCA** subir el archivo `.env.local` a GitHub
- Reemplazar todos los valores con tus credenciales reales

---

## 🚀 PASO 5: INICIAR EL PROYECTO

### 5.1 Ejecutar en modo desarrollo
```bash
# En la terminal, dentro del directorio del proyecto:
npm run dev

# El servidor iniciará en:
# http://localhost:3000 (o puerto disponible)
```

### 5.2 Verificar funcionamiento
1. Abrir navegador en `http://localhost:3000`
2. Debería aparecer la página de autenticación
3. Crear cuenta nueva con email y contraseña
4. Si aparece el dashboard, ¡todo funciona correctamente!

---

## 🧪 PASO 6: PROBAR FUNCIONALIDADES

### 6.1 Crear productos
1. Ir a la sección de productos
2. Agregar algunos productos de prueba
3. Asignar precios y categorías

### 6.2 Probar pagos (modo test)
1. Agregar productos al carrito
2. Probar pago con Link: usar tarjeta de prueba `4242 4242 4242 4242`
3. Probar pago con QR: escanear código y pagar
4. Verificar que las ventas se guarden correctamente

### 6.3 Tarjetas de prueba Stripe:
- **Éxito**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Cualquier fecha futura y CVC válido**

---

## 🌐 PASO 7: DESPLIEGUE A PRODUCCIÓN (OPCIONAL)

### 7.1 Desplegar en Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod

# Seguir las instrucciones en pantalla
```

### 7.2 Configurar variables de entorno en producción
En Vercel Dashboard > Settings > Environment Variables, agregar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` (URL de producción: https://gestion-de-ventas-v1.vercel.app)

---

## 🗑️ LIMPIEZA DE DATOS (OPCIONAL)

### Limpieza selectiva (recomendado)
Si quieres limpiar solo productos, ventas y categorías manteniendo usuarios y configuraciones de Stripe:

1. En Supabase SQL Editor, ejecutar el contenido de `limpiar_base_datos.sql`
2. Esto eliminará: productos, ventas, categorías, clientes, sesiones de pago
3. Mantendrá: usuarios registrados, configuraciones, cuentas de Stripe conectadas

### Limpieza completa (solo casos extremos)
Si quieres empezar completamente desde cero:

1. En Supabase SQL Editor, ejecutar el contenido de `limpiar_base_datos_completa.sql`
2. ⚠️ **ADVERTENCIA**: Esto eliminará TODOS los datos excepto la tabla de autenticación
3. Los usuarios tendrán que volver a conectar sus cuentas de Stripe

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### ❌ Error: "Module not found"
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error de conexión Supabase
- Verificar que las URLs y claves en `.env.local` sean correctas
- Verificar que el archivo SQL se ejecutó completamente en Supabase

### ❌ Error de Stripe
- Verificar modo de prueba activado
- Verificar claves API correctas
- Usar tarjetas de prueba válidas

### ❌ Puerto ocupado
```bash
# Cambiar puerto
npm run dev -- -p 3001

# O encontrar y cerrar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

### ❌ Errores de TypeScript
```bash
# Verificar configuración
npx tsc --noEmit

# Reiniciar servidor
Ctrl+C
npm run dev
```

---

## 📞 SOPORTE

### 📚 Documentación útil:
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Stripe**: https://stripe.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### 🐛 Si encuentras errores:
1. Revisar la consola del navegador (F12)
2. Revisar la terminal donde corre el servidor
3. Verificar configuración de `.env.local`
4. Verificar que todas las dependencias estén instaladas

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] Node.js v18+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Proyecto Supabase creado
- [ ] Base de datos configurada (`ejecutar_sql.sql`)
- [ ] Credenciales Supabase obtenidas
- [ ] Cuenta Stripe creada (modo prueba)
- [ ] Claves Stripe obtenidas
- [ ] Archivo `.env.local` configurado
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Página abre en navegador
- [ ] Autenticación funciona
- [ ] Productos se pueden crear
- [ ] Pagos de prueba funcionan
- [ ] Ventas se guardan correctamente

¡Si todos los puntos están marcados, el sistema está listo para usar! 🎉
