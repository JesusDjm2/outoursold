ALTER TABLE cotizaciones_pen ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE cotizaciones_usd ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
