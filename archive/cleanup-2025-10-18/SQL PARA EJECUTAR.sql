-- MOVED TO archive/cleanup-2025-10-18/SQL PARA EJECUTAR.sql
-- Script completo para crear todas las tablas y políticas necesarias en Supabase para el proyecto de gestión de ventas

-- Tabla de usuarios conectados (Stripe Connected Accounts)
create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null unique,
  commission_rate numeric(5,2) not null default 5.00, -- Comisión por usuario (en %)
  created_at timestamp with time zone default now()
);

-- Tabla de productos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  category_id uuid references categories(id),
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Tabla de categorías
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);

-- Tabla de ventas
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  connected_account_id uuid references connected_accounts(id),
  amount numeric(10,2) not null, -- Monto final cobrado (con descuento aplicado)
  original_amount numeric(10,2), -- Monto original sin descuento
  discount numeric(10,2) default 0,
  currency text not null default 'usd',
  status text not null default 'paid',
  stripe_payment_intent_id text,
  created_at timestamp with time zone default now()
);

-- Tabla de historial de comisiones por venta
create table if not exists commission_sales (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  connected_account_id uuid not null references connected_accounts(id),
  commission_rate numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  created_at timestamp with time zone default now()
);

-- Tabla de resumen diario de ventas
create table if not exists daily_sales_summary (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references connected_accounts(id),
  date date not null,
  total_sales numeric(10,2) not null default 0,
  total_commission numeric(10,2) not null default 0,
  primary key (connected_account_id, date)
);

-- Tabla de configuración de usuario
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notifications_enabled boolean default true,
  preferred_currency text default 'usd',
  created_at timestamp with time zone default now()
);

-- Políticas de Row Level Security (RLS)
-- Habilitar RLS en todas las tablas
alter table connected_accounts enable row level security;
alter table products enable row level security;
alter table categories enable row level security;
alter table sales enable row level security;
alter table commission_sales enable row level security;
alter table daily_sales_summary enable row level security;
alter table user_settings enable row level security;

-- Ejemplo de política: los usuarios solo pueden ver sus propias cuentas conectadas
create policy if not exists "Users can view their own connected accounts" on connected_accounts
  for select using (auth.uid() = user_id);

-- Ejemplo de política: los usuarios solo pueden ver sus propias ventas
create policy if not exists "Users can view their own sales" on sales
  for select using (auth.uid() = seller_id or auth.uid() = buyer_id);

-- Agrega más políticas según tus necesidades de seguridad

-- Fin del script
