-- 041: Papelera de cotizaciones, columnas con índice y bitácora de cambios.
--
-- 1) Papelera: eliminar una cotización ya no la borra; queda con eliminado_en y se puede
--    restaurar durante 30 días (después se borra sola). Ver eliminar-cotizacion en api.php.
-- 2) Columnas calculadas (STORED, se mantienen solas, no hay que tocar el código que guarda):
--    - creada_ms: milisegundos de creación, sacados del ID "COT-<ms>" (orden del historial).
--    - estado: 'borrador' o 'terminada' (las de antes, sin estado, cuentan como terminadas).
--    Con índices, el historial ordena y filtra sin leer el JSON de cada cotización.
-- 3) auditoria: quién cambió qué y cuándo (lo ve el admin en Usuarios › Cambios).
--
-- Correr ANTES de subir los archivos de esta versión.

ALTER TABLE cotizaciones_usd
    ADD COLUMN eliminado_en DATETIME NULL DEFAULT NULL,
    ADD COLUMN eliminado_por INT NULL DEFAULT NULL,
    ADD COLUMN creada_ms BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN id LIKE 'COT-%' THEN CAST(SUBSTRING(id, 5) AS UNSIGNED) ELSE NULL END) STORED,
    ADD COLUMN estado VARCHAR(12) GENERATED ALWAYS AS
        (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data, '$.estado')) = 'borrador' THEN 'borrador' ELSE 'terminada' END) STORED,
    ADD INDEX idx_cot_usd_eliminado (eliminado_en),
    ADD INDEX idx_cot_usd_dueno_creada (creado_por, creada_ms);

ALTER TABLE cotizaciones_pen
    ADD COLUMN eliminado_en DATETIME NULL DEFAULT NULL,
    ADD COLUMN eliminado_por INT NULL DEFAULT NULL,
    ADD COLUMN creada_ms BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN id LIKE 'COT-%' THEN CAST(SUBSTRING(id, 5) AS UNSIGNED) ELSE NULL END) STORED,
    ADD COLUMN estado VARCHAR(12) GENERATED ALWAYS AS
        (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data, '$.estado')) = 'borrador' THEN 'borrador' ELSE 'terminada' END) STORED,
    ADD INDEX idx_cot_pen_eliminado (eliminado_en),
    ADD INDEX idx_cot_pen_dueno_creada (creado_por, creada_ms);

CREATE TABLE IF NOT EXISTS auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    agencia_id INT NULL,
    accion VARCHAR(60) NOT NULL,      -- ej. guardar-cotizacion, eliminar-tour, editar (usuarios)
    modulo VARCHAR(30) NOT NULL,      -- cotizador-usd, cotizador-pen, itinerarios, usuarios, agencias, mi-empresa
    entidad_id VARCHAR(60) NULL,      -- id del registro tocado, si lo hay
    detalle VARCHAR(300) NULL,        -- nombre legible (pasajero, tour, usuario...)
    ip VARCHAR(45) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auditoria_fecha (creado_en),
    INDEX idx_auditoria_agencia (agencia_id, creado_en),
    INDEX idx_auditoria_usuario (usuario_id, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
