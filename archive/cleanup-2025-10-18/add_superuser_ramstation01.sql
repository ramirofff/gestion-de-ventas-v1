-- ARCHIVADO: Este archivo fue movido aquí por limpieza 2025-10-18
-- Agregar superusuario ramstation01@gmail.com (ejecutar en SQL editor de Supabase)
insert into superusers (id, email)
select id, email from auth.users where email = 'ramstation01@gmail.com'
on conflict (id) do nothing;
