-- ARCHIVADO: Este archivo fue movido aquí por limpieza 2025-10-18
-- Tabla para superusuarios del sistema
create table if not exists superusers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Trigger para actualizar updated_at
create or replace function update_superusers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_superusers_updated_at on superusers;
create trigger set_superusers_updated_at
before update on superusers
for each row execute procedure update_superusers_updated_at();
