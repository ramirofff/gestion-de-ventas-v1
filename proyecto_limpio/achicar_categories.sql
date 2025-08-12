-- Eliminar columnas no utilizadas en la tabla categories
alter table categories
  drop column if exists description,
  drop column if exists image_url,
  drop column if exists color;
