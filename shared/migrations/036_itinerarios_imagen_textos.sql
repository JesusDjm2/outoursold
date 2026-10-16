
ALTER TABLE itinerarios_es
    ADD COLUMN imagen VARCHAR(255) NULL DEFAULT NULL AFTER filename,
    ADD COLUMN lugares_visitar TEXT NULL DEFAULT NULL AFTER imagen,
    ADD COLUMN incluye TEXT NULL DEFAULT NULL AFTER lugares_visitar,
    ADD COLUMN no_incluye TEXT NULL DEFAULT NULL AFTER incluye;

ALTER TABLE itinerarios_en
    ADD COLUMN imagen VARCHAR(255) NULL DEFAULT NULL AFTER filename,
    ADD COLUMN lugares_visitar TEXT NULL DEFAULT NULL AFTER imagen,
    ADD COLUMN incluye TEXT NULL DEFAULT NULL AFTER lugares_visitar,
    ADD COLUMN no_incluye TEXT NULL DEFAULT NULL AFTER incluye;

ALTER TABLE itinerarios_pt
    ADD COLUMN imagen VARCHAR(255) NULL DEFAULT NULL AFTER filename,
    ADD COLUMN lugares_visitar TEXT NULL DEFAULT NULL AFTER imagen,
    ADD COLUMN incluye TEXT NULL DEFAULT NULL AFTER lugares_visitar,
    ADD COLUMN no_incluye TEXT NULL DEFAULT NULL AFTER incluye;
