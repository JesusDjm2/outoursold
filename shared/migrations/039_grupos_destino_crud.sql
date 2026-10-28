-- Grupos de destino de Itinerarios con CRUD. "Con hotel" y "Sin hotel" quedan como grupos
-- BASE (es_base = 1): comunes a todas las agencias, solo el admin los renombra y nadie los
-- elimina. Cada agencia puede crear sus propios grupos (creado_por, visibles solo para su
-- agencia), renombrarlos y eliminarlos mientras no tengan destinos.
-- Los grupos nuevos no tienen clave (la clave solo identifica a los dos base).
ALTER TABLE grupos_destino
    MODIFY clave VARCHAR(30) NULL DEFAULT NULL,
    ADD COLUMN es_base TINYINT(1) NOT NULL DEFAULT 0 AFTER orden,
    ADD COLUMN creado_por INT NULL DEFAULT NULL AFTER es_base,
    ADD KEY idx_grupos_destino_creado_por (creado_por);

UPDATE grupos_destino SET es_base = 1 WHERE clave IN ('con_pernocte', 'sin_pernocte');
-- Mismos nombres que la migración 037, por si no se corrió.
UPDATE grupos_destino SET nombre = 'Con hotel' WHERE clave = 'con_pernocte';
UPDATE grupos_destino SET nombre = 'Sin hotel' WHERE clave = 'sin_pernocte';
