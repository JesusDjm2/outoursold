-- Categorías de Hotel: catálogo independiente del de Tours (categorias), pero anidado
-- bajo el mismo Destino compartido. Migración puramente aditiva: hoteles_pen/hoteles_usd
-- nunca tuvieron destino/categoria en ninguna forma, así que no hay backfill que hacer.

CREATE TABLE categorias_hoteles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destino_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categorias_hoteles_destino_nombre (destino_id, nombre),
    CONSTRAINT fk_categorias_hoteles_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_categorias_hoteles_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE hoteles_pen
    ADD COLUMN destino_id INT NULL,
    ADD COLUMN categoria_id INT NULL,
    ADD CONSTRAINT fk_hoteles_pen_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_hoteles_pen_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_hoteles(id) ON DELETE RESTRICT;

ALTER TABLE hoteles_usd
    ADD COLUMN destino_id INT NULL,
    ADD COLUMN categoria_id INT NULL,
    ADD CONSTRAINT fk_hoteles_usd_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_hoteles_usd_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_hoteles(id) ON DELETE RESTRICT;
