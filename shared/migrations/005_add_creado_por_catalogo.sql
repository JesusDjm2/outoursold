ALTER TABLE tours_pen ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE tours_usd ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE hoteles_pen ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE hoteles_usd ADD COLUMN creado_por INT NULL, ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
