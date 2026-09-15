-- Historial de itinerarios generados: hasta ahora, cada PDF armado en el generador se
-- descargaba directo al navegador (saveAs) y no quedaba ningún rastro en el servidor.
-- Esta tabla guarda un registro por cada generación (pasajero, título, quién y cuándo)
-- junto con una copia del PDF resultante en uploads/$idioma/generados/, para poder
-- consultarlas y volver a descargarlas después sin tener que rearmarlas.

CREATE TABLE itinerario_generados_es (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pasajero VARCHAR(200) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    generado_por INT NULL,
    generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerario_generados_es_generado_por FOREIGN KEY (generado_por) REFERENCES usuarios(id),
    INDEX idx_itinerario_generados_es_fecha (generado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerario_generados_en (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pasajero VARCHAR(200) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    generado_por INT NULL,
    generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerario_generados_en_generado_por FOREIGN KEY (generado_por) REFERENCES usuarios(id),
    INDEX idx_itinerario_generados_en_fecha (generado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerario_generados_pt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pasajero VARCHAR(200) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    generado_por INT NULL,
    generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerario_generados_pt_generado_por FOREIGN KEY (generado_por) REFERENCES usuarios(id),
    INDEX idx_itinerario_generados_pt_fecha (generado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
