CREATE TEMPORARY TABLE tmp_destinos_a_separar AS
SELECT d.id AS viejo_id, d.nombre, d.grupo_id, d.creado_por, CAST(NULL AS SIGNED) AS nuevo_id
FROM destinos d
WHERE d.grupo_id IS NOT NULL
  AND (EXISTS (SELECT 1 FROM tours_usd x WHERE x.destino_id = d.id)
    OR EXISTS (SELECT 1 FROM tours_pen x WHERE x.destino_id = d.id)
    OR EXISTS (SELECT 1 FROM hoteles_usd x WHERE x.destino_id = d.id)
    OR EXISTS (SELECT 1 FROM hoteles_pen x WHERE x.destino_id = d.id)
    OR EXISTS (SELECT 1 FROM categorias x WHERE x.destino_id = d.id)
    OR EXISTS (SELECT 1 FROM categorias_hoteles x WHERE x.destino_id = d.id));

-- 1. El original vuelve a Actividades / Hoteles.
UPDATE destinos d JOIN tmp_destinos_a_separar t ON t.viejo_id = d.id SET d.grupo_id = NULL;

-- 2. Destino de Itinerarios en su grupo (solo si no existe ya uno con ese nombre ahí).
INSERT INTO destinos (nombre, grupo_id, creado_por)
SELECT t.nombre, t.grupo_id, t.creado_por FROM tmp_destinos_a_separar t
WHERE NOT EXISTS (SELECT 1 FROM destinos x WHERE x.nombre = t.nombre AND x.creado_por <=> t.creado_por AND x.grupo_id = t.grupo_id);

UPDATE tmp_destinos_a_separar t
JOIN destinos x ON x.nombre = t.nombre AND x.creado_por <=> t.creado_por AND x.grupo_id = t.grupo_id
SET t.nuevo_id = x.id;

-- 3. Categorías de itinerarios al destino nuevo. Si el destino de Itinerarios ya tenía una
--    categoría con el mismo nombre, esa se reutiliza (ver paso 4) y la vieja se borra.
UPDATE IGNORE categorias_itinerarios c JOIN tmp_destinos_a_separar t ON c.destino_id = t.viejo_id
SET c.destino_id = t.nuevo_id;

-- 4. Itinerarios cuya categoría quedó en el destino viejo (por choque de nombre): apuntan a
--    la categoría homónima del destino nuevo.
UPDATE itinerarios_es i
JOIN categorias_itinerarios cv ON cv.id = i.categoria_id
JOIN tmp_destinos_a_separar t ON cv.destino_id = t.viejo_id
JOIN categorias_itinerarios cn ON cn.destino_id = t.nuevo_id AND cn.nombre = cv.nombre
SET i.categoria_id = cn.id;
UPDATE itinerarios_en i
JOIN categorias_itinerarios cv ON cv.id = i.categoria_id
JOIN tmp_destinos_a_separar t ON cv.destino_id = t.viejo_id
JOIN categorias_itinerarios cn ON cn.destino_id = t.nuevo_id AND cn.nombre = cv.nombre
SET i.categoria_id = cn.id;
UPDATE itinerarios_pt i
JOIN categorias_itinerarios cv ON cv.id = i.categoria_id
JOIN tmp_destinos_a_separar t ON cv.destino_id = t.viejo_id
JOIN categorias_itinerarios cn ON cn.destino_id = t.nuevo_id AND cn.nombre = cv.nombre
SET i.categoria_id = cn.id;

-- 5. Itinerarios al destino nuevo.
UPDATE itinerarios_es i JOIN tmp_destinos_a_separar t ON i.destino_id = t.viejo_id SET i.destino_id = t.nuevo_id;
UPDATE itinerarios_en i JOIN tmp_destinos_a_separar t ON i.destino_id = t.viejo_id SET i.destino_id = t.nuevo_id;
UPDATE itinerarios_pt i JOIN tmp_destinos_a_separar t ON i.destino_id = t.viejo_id SET i.destino_id = t.nuevo_id;

-- 6. Categorías de itinerarios duplicadas que quedaron en el destino viejo (ya sin uso).
DELETE c FROM categorias_itinerarios c JOIN tmp_destinos_a_separar t ON c.destino_id = t.viejo_id;

DROP TEMPORARY TABLE tmp_destinos_a_separar;
