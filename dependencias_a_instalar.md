# ===============================================
# DEPENDENCIAS PARA SISTEMA DE GESTIÓN DE VENTAS V1
# ===============================================

## 🔧 DEPENDENCIAS DEL SISTEMA

### Versiones requeridas:
- Node.js: v18+ o v20+
- npm: v9+ o v10+

### 📋 COPIAR Y PEGAR EN LA TERMINAL:

```bash
# Instalar todas las dependencias principales
npm install next@15.4.2 react@19 react-dom@19 typescript@5 @types/node @types/react @types/react-dom

# Dependencias de Supabase
npm install @supabase/supabase-js@2

# Dependencias de Stripe
npm install stripe @stripe/stripe-js

# Dependencias de UI/Styling
npm install tailwindcss postcss autoprefixer @tailwindcss/typography lucide-react

# Dependencias de utilidades
npm install uuid @types/uuid js-cookie @types/js-cookie

# Dependencias de desarrollo
npm install -D eslint eslint-config-next @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Herramientas de QR
npm install qrcode @types/qrcode

# Configurar Tailwind CSS
npx tailwindcss init -p
```

## 🚀 COMANDO COMPLETO (UNA SOLA LÍNEA):

```bash
npm install next@15.4.2 react@19 react-dom@19 typescript@5 @types/node @types/react @types/react-dom @supabase/supabase-js@2 stripe @stripe/stripe-js tailwindcss postcss autoprefixer @tailwindcss/typography lucide-react uuid @types/uuid js-cookie @types/js-cookie qrcode @types/qrcode && npm install -D eslint eslint-config-next @typescript-eslint/eslint-plugin @typescript-eslint/parser && npx tailwindcss init -p
```

## 📂 ESTRUCTURA PACKAGE.JSON ESPERADA:

```json
{
  "name": "gestion-de-ventas-v1",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@stripe/stripe-js": "^4.8.0",
    "@supabase/supabase-js": "^2.39.3",
    "@tailwindcss/typography": "^0.5.10",
    "@types/uuid": "^10.0.0",
    "js-cookie": "^3.0.5",
    "lucide-react": "^0.460.0",
    "next": "15.4.2",
    "qrcode": "^1.5.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "stripe": "^17.4.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/js-cookie": "^3.0.6",
    "@types/node": "^20.10.5",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "15.4.2",
    "postcss": "^8.4.32"
  }
}
```

## ⚙️ CONFIGURACIONES ADICIONALES REQUERIDAS:

### 1. Archivo .env.local:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_stripe_publishable_key_aqui
STRIPE_SECRET_KEY=sk_test_tu_stripe_secret_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui

# Stripe Express
STRIPE_EXPRESS_CLIENT_ID=ca_tu_express_client_id_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Configuración Tailwind CSS (tailwind.config.js):
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

### 3. Configuración TypeScript (tsconfig.json):
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 🔗 SERVICIOS EXTERNOS REQUERIDOS:

1. **Supabase**: Crear proyecto en https://supabase.com
2. **Stripe**: Crear cuenta en https://stripe.com
3. **Vercel** (opcional): Para despliegue en https://vercel.com

## ⚡ VERIFICACIÓN DE INSTALACIÓN:

```bash
# Verificar versiones
node --version  # Debe ser v18+
npm --version   # Debe ser v9+

# Verificar instalación
npm list --depth=0

# Ejecutar en desarrollo
npm run dev
```

## 📋 COMANDOS DE DESARROLLO ÚTILES:

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en producción
npm run start

# Linter
npm run lint
```
