-- Paquetes predefinidos que combinan Actividades + Hoteles + Itinerario (antes solo tours).
-- `tours` (ya existente) sigue guardando las actividades; se suman dos columnas JSON:
--   hoteles:    [{"aloj":"...","nhab":1,"noches":2}, ...]
--   itinerario: {"idioma":"es|en|pt","modulos":["archivo1.pdf", ...]}
-- Ambas NULL en los paquetes existentes (solo tours), que siguen funcionando igual.

ALTER TABLE paquetes_tours_pen
    ADD COLUMN hoteles LONGTEXT NULL AFTER tours,
    ADD COLUMN itinerario LONGTEXT NULL AFTER hoteles;

ALTER TABLE paquetes_tours_usd
    ADD COLUMN hoteles LONGTEXT NULL AFTER tours,
    ADD COLUMN itinerario LONGTEXT NULL AFTER hoteles;
