-- Los destinos de Con pernocte, de Sin pernocte y los sin grupo (los de Actividades /
-- Hoteles) son catálogos separados: puede haber un "Cusco" en cada uno. El UNIQUE pasa de
-- (nombre, creado_por) a (nombre, creado_por, grupo_id). Como MySQL no considera
-- duplicados dos NULL, la unicidad entre destinos sin grupo la sigue cuidando la API
-- (guardar-destino en shared/api.php).
ALTER TABLE destinos
    DROP INDEX uq_destinos_nombre,
    ADD UNIQUE KEY uq_destinos_nombre (nombre, creado_por, grupo_id);
