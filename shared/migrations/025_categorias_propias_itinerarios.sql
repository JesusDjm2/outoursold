-- Itinerarios compartía su catálogo de Categorías con Actividades (tours): el
-- categoria_id de itinerarios_es/en/pt apuntaba a la misma tabla `categorias` que usan
-- tours_pen/tours_usd. Pasa a tener su propio catálogo de categorías — igual que Hoteles
-- ya tiene el suyo (`categorias_hoteles`), separado del de Actividades. Destinos sigue
-- siendo la única tabla realmente compartida entre Actividades, Hoteles e Itinerarios.
--
-- Los categoria_id existentes apuntaban al catálogo viejo (el de Actividades) y ya no
-- tienen sentido bajo el nuevo catálogo propio — se limpian a NULL; las agencias/admin
-- vuelven a clasificar sus módulos con las categorías nuevas que vayan creando.

UPDATE itinerarios_es SET categoria_id = NULL WHERE categoria_id IS NOT NULL;
UPDATE itinerarios_en SET categoria_id = NULL WHERE categoria_id IS NOT NULL;
UPDATE itinerarios_pt SET categoria_id = NULL WHERE categoria_id IS NOT NULL;

CREATE TABLE categorias_itinerarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destino_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categorias_itinerarios_destino_nombre (destino_id, nombre),
    CONSTRAINT fk_categorias_itinerarios_destino FOREIGN KEY (destino_id) REFERENCES destinos(id),
    CONSTRAINT fk_categorias_itinerarios_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE itinerarios_es DROP FOREIGN KEY fk_itinerarios_es_categoria;
ALTER TABLE itinerarios_es ADD CONSTRAINT fk_itinerarios_es_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_itinerarios(id);

ALTER TABLE itinerarios_en DROP FOREIGN KEY fk_itinerarios_en_categoria;
ALTER TABLE itinerarios_en ADD CONSTRAINT fk_itinerarios_en_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_itinerarios(id);

ALTER TABLE itinerarios_pt DROP FOREIGN KEY fk_itinerarios_pt_categoria;
ALTER TABLE itinerarios_pt ADD CONSTRAINT fk_itinerarios_pt_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_itinerarios(id);
