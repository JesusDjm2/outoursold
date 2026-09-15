-- Los "paquetes" (tours/módulos guardados para aplicar rápido en el cotizador y el
-- generador de itinerarios) nunca tuvieron creado_por — quedaron afuera cuando el resto
-- del catálogo lo ganó en la migración 005/012. Se agrega ahora porque van a pasar a ser
-- privados por usuario igual que destinos/categorías/tours/hoteles/módulos (ver 023).

ALTER TABLE paquetes_tours_pen ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE paquetes_tours_usd ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE paquetes_itinerarios_es ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE paquetes_itinerarios_en ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE paquetes_itinerarios_pt ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
