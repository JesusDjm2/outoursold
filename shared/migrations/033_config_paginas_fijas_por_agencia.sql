-- Páginas de Presentación / Cierre del itinerario (Gestión de Datos > Itinerarios > Páginas
-- Fijas): pasan de ser UNA configuración global por idioma (itinerario_config_es/en/pt,
-- fila id = 1) a una por agencia y por idioma. El admin usa la de la agencia principal
-- (resolverAgenciaPropiaId en shared/agencia-helpers.php).
--
-- La configuración global actual se copia solo a la agencia principal (sus páginas son las
-- del admin); el resto de agencias arranca sin páginas de Presentación / Cierre y arma la
-- suya. Las tablas itinerario_config_es/en/pt se dejan como estaban (ya no se escriben
-- mientras exista esta tabla; sirven de respaldo).

CREATE TABLE itinerario_config_agencia (
    agencia_id INT NOT NULL,
    idioma CHAR(2) NOT NULL,
    start_files LONGTEXT NOT NULL,
    end_files LONGTEXT NOT NULL,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (agencia_id, idioma),
    CONSTRAINT fk_itinerario_config_agencia FOREIGN KEY (agencia_id) REFERENCES agencias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO itinerario_config_agencia (agencia_id, idioma, start_files, end_files)
SELECT a.id, 'es', c.start_files, c.end_files FROM agencias a JOIN itinerario_config_es c ON c.id = 1 WHERE a.es_principal = 1;

INSERT INTO itinerario_config_agencia (agencia_id, idioma, start_files, end_files)
SELECT a.id, 'en', c.start_files, c.end_files FROM agencias a JOIN itinerario_config_en c ON c.id = 1 WHERE a.es_principal = 1;

INSERT INTO itinerario_config_agencia (agencia_id, idioma, start_files, end_files)
SELECT a.id, 'pt', c.start_files, c.end_files FROM agencias a JOIN itinerario_config_pt c ON c.id = 1 WHERE a.es_principal = 1;
