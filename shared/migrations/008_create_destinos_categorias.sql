-- Catálogos formales de Destino y Categoría (compartidos entre PEN y USD).
-- Categoría queda anidada bajo Destino, igual que ya filtra el selector en cascada del cotizador.

CREATE TABLE destinos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_destinos_nombre (nombre),
    CONSTRAINT fk_destinos_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destino_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categorias_destino_nombre (destino_id, nombre),
    CONSTRAINT fk_categorias_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_categorias_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill de destinos a partir de los valores de texto libre que ya existían en tours_pen/tours_usd.
INSERT INTO destinos (nombre)
SELECT DISTINCT x.destino FROM (
    SELECT destino FROM tours_pen WHERE destino IS NOT NULL AND destino <> ''
    UNION
    SELECT destino FROM tours_usd WHERE destino IS NOT NULL AND destino <> ''
) x;

-- Backfill de categorías a partir de los pares (destino, categoria) que ya existían.
INSERT INTO categorias (destino_id, nombre)
SELECT DISTINCT d.id, x.categoria FROM (
    SELECT destino, categoria FROM tours_pen WHERE destino IS NOT NULL AND destino <> '' AND categoria IS NOT NULL AND categoria <> ''
    UNION
    SELECT destino, categoria FROM tours_usd WHERE destino IS NOT NULL AND destino <> '' AND categoria IS NOT NULL AND categoria <> ''
) x
JOIN destinos d ON d.nombre = x.destino;

-- Nuevas columnas de relación en tours_pen/tours_usd (se mantienen destino/categoria de texto
-- por ahora, hasta confirmar el backfill; se eliminan en la migración 009).
ALTER TABLE tours_pen
    ADD COLUMN destino_id INT NULL,
    ADD COLUMN categoria_id INT NULL,
    ADD CONSTRAINT fk_tours_pen_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_tours_pen_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT;

ALTER TABLE tours_usd
    ADD COLUMN destino_id INT NULL,
    ADD COLUMN categoria_id INT NULL,
    ADD CONSTRAINT fk_tours_usd_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_tours_usd_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT;

-- Poblar destino_id/categoria_id en los tours a partir del texto viejo.
UPDATE tours_pen t JOIN destinos d ON d.nombre = t.destino SET t.destino_id = d.id;
UPDATE tours_pen t JOIN categorias c ON c.destino_id = t.destino_id AND c.nombre = t.categoria SET t.categoria_id = c.id;
UPDATE tours_usd t JOIN destinos d ON d.nombre = t.destino SET t.destino_id = d.id;
UPDATE tours_usd t JOIN categorias c ON c.destino_id = t.destino_id AND c.nombre = t.categoria SET t.categoria_id = c.id;
