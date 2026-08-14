-- Ejecutar solo después de verificar que destino_id/categoria_id quedaron bien poblados
-- por la migración 008 (comparar contra las columnas de texto que se eliminan aquí).

ALTER TABLE tours_pen DROP COLUMN destino, DROP COLUMN categoria;
ALTER TABLE tours_usd DROP COLUMN destino, DROP COLUMN categoria;
