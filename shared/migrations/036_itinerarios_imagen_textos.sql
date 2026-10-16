-- Campos nuevos de cada itinerario (Gestión de Datos > Itinerarios > <idioma> > Itinerarios),
-- además del título y el PDF: una imagen (archivo en itinerario/uploads/<idioma>/imagenes/)
-- y tres textos largos — Lugares a visitar, Incluye y No incluye. Todos opcionales.
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
