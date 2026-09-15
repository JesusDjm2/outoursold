-- itinerario/migrate_es_to_en.sql
-- Los 46 módulos, la config de páginas fijas y los paquetes guardados bajo el
-- idioma "es" en realidad son contenido en inglés (mal etiquetado desde la carga
-- inicial). Este script los reasigna a las tablas "_en" y deja "_es" vacío/limpio.
--
-- Ejecutar UNA sola vez contra la base de datos de producción (phpMyAdmin, o
-- `mysql -u usuario -p nombre_bd < migrate_es_to_en.sql`). Ya se ejecutó en la
-- base de datos local de desarrollo.
--
-- IMPORTANTE: esto solo mueve las filas de la base de datos. Los archivos PDF
-- físicos también deben moverse en el servidor, de:
--   itinerario/uploads/es/  ->  itinerario/uploads/en/
-- (mover TODO el contenido de esa carpeta; si hay .htaccess o algo en es/, no
-- moverlo, solo los PDFs). Hazlo por FTP/administrador de archivos antes o
-- después de correr este script, no afecta el orden.

START TRANSACTION;

-- Módulos
INSERT INTO itinerarios_en (id, titulo, filename, destino_id, categoria_id, creado_por, creado_en)
SELECT id, titulo, filename, destino_id, categoria_id, creado_por, creado_en FROM itinerarios_es;
DELETE FROM itinerarios_es;

-- Páginas fijas (inicio/cierre)
UPDATE itinerario_config_en dst
JOIN itinerario_config_es src ON src.id = 1
SET dst.start_files = src.start_files,
    dst.end_files = src.end_files
WHERE dst.id = 1;
UPDATE itinerario_config_es SET start_files = '[]', end_files = '[]' WHERE id = 1;

-- Paquetes de itinerario (si hubiera alguno)
INSERT INTO paquetes_itinerarios_en (id, nombre, modulos, creado_en)
SELECT id, nombre, modulos, creado_en FROM paquetes_itinerarios_es;
DELETE FROM paquetes_itinerarios_es;

COMMIT;
