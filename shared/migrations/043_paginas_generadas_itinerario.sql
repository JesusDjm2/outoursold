ALTER TABLE itinerarios_es ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;
ALTER TABLE itinerarios_en ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;
ALTER TABLE itinerarios_pt ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;

ALTER TABLE itinerario_config_agencia ADD COLUMN paginas LONGTEXT NULL DEFAULT NULL;
