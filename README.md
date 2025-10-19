# 🏪 Gestión de Ventas V1

**Professional Point of Sale (POS) System** built with Next.js 15, TypeScript, Tailwind CSS, Supabase, and Stripe integration.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.4.2-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan.svg)

## ✨ Features

### 🛒 **Core POS Functionality**
- ✅ Product management with categories and inventory
- ✅ Shopping cart with real-time calculations
- ✅ Professional receipt generation and printing
- ✅ Sales history and analytics
- ✅ Multi-user support with authentication

### 💳 **Payment Processing**
- ✅ Stripe integration for card payments
- ✅ Cash payment support
- ✅ Real-time payment verification
- ✅ Automatic receipt generation

### 🎨 **User Experience**
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark/Light theme support
- ✅ PWA (Progressive Web App) capabilities
- ✅ Real-time updates
- ✅ Professional UI/UX

### 📊 **Business Intelligence**
- ✅ Daily and monthly sales reports
- ✅ Product performance analytics
- ✅ Inventory management
- ✅ Customer data management

## 🚀 Quick Start

### 1. **Clone the Repository**
```bash
git clone https://github.com/ramirofff/gestion-de-ventas-v1.git
cd gestion-de-ventas-v1
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Database Setup**
1. Create a new project in [Supabase](https://supabase.com)
2. Run the SQL script in Supabase SQL Editor:
   ```bash
   # Copy content from database-complete-schema.sql and run in Supabase
   ```

### 4. **Environment Configuration**
Create a `.env.local` file in the root directory:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 5. **Run Development Server**
```bash
npm run dev
```

Open [https://gestion-de-ventas-v1.vercel.app](https://gestion-de-ventas-v1.vercel.app) in your browser.

## Limpieza y preparación del entorno

1. Copia `.env.example` a `.env.local` y completa las variables requeridas.

```bash
cp .env.example .env.local
# editar .env.local con tus valores reales
```

2. Limpiar artefactos locales (no elimina node_modules por defecto):

```bash
npm run clean
```

3. Para limpiar todo (incluye node_modules):

```bash
npm run clean:all
```

Recomendación de producción
- Antes de desplegar a producción, considera quitar temporalmente las opciones `ignoreBuildErrors` e `ignoreDuringBuilds` en `next.config.ts` y ejecutar `npm run type-check` y `npm run build` localmente para detectar y corregir errores que podrían quedar ocultos en el build.

## 📦 Deployment

### **Vercel (Recommended)**
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript  
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **UI Components**: Lucide React Icons

## 🔧 Setup Instructions

1. **Database**: Run `database-complete-schema.sql` in your Supabase project
2. **Environment**: Configure `.env.local` with your API keys
3. **Development**: `npm run dev` to start local server
4. **Production**: Deploy to Vercel or your preferred platform

---

⭐ **Star this repository if you find it helpful!**
