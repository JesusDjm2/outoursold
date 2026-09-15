-- Agrega la composición (lista de módulos del día a día, en orden) a cada registro del
-- historial de itinerarios generados. Hasta ahora itinerario_generados_$idioma solo
-- guardaba el PDF final ya armado — sin esto no hay forma de "reusar" un itinerario ya
-- generado en el armador (como sí se puede con un Itinerario Predeterminado), porque no
-- queda registro de qué módulos lo componían. Nullable: los registros que ya existan
-- (generados antes de este cambio) simplemente no se podrán reusar, sin romper nada.

ALTER TABLE itinerario_generados_es
    ADD COLUMN modulos LONGTEXT NULL CHECK (modulos IS NULL OR json_valid(modulos)) AFTER filename;

ALTER TABLE itinerario_generados_en
    ADD COLUMN modulos LONGTEXT NULL CHECK (modulos IS NULL OR json_valid(modulos)) AFTER filename;

ALTER TABLE itinerario_generados_pt
    ADD COLUMN modulos LONGTEXT NULL CHECK (modulos IS NULL OR json_valid(modulos)) AFTER filename;
