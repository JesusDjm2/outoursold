-- Orden propio de los destinos, que el usuario define arrastrando los chips de destino en el
-- panel de itinerarios del Cotizador (ordenar-destinos en shared/api.php). Con todos en 0 se
-- sigue ordenando por nombre, así que no hace falta backfill.
ALTER TABLE destinos
    ADD COLUMN orden INT NOT NULL DEFAULT 0 AFTER grupo_id;
