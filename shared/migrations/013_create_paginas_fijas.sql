-- Separa "Páginas Fijas" (portada, legalidad, cierre, etc.) del catálogo de Módulos.
-- Antes una página fija era, en realidad, un módulo más (itinerarios_$idioma) con
-- destino_id/categoria_id en NULL, agregado a mano a start_files/end_files en
-- itinerario_config_$idioma. Eso mezclaba dos conceptos de negocio distintos: un
-- módulo SÍ se clasifica por destino/categoría (aparece en el armador principal),
-- una página fija NUNCA se clasifica así (siempre va al inicio o cierre del PDF).
-- Esta migración le da su propia tabla, con su propio CRUD, y se lleva del catálogo
-- de módulos las páginas fijas que ya existían ahí (hoy solo hay en inglés).

CREATE TABLE paginas_fijas_es (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paginas_fijas_es_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paginas_fijas_en (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paginas_fijas_en_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paginas_fijas_pt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paginas_fijas_pt_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra las páginas fijas que hoy viven como módulos "sin clasificar" en inglés
-- (las únicas ya usadas en itinerario_config_en.start_files/end_files) a su nueva tabla.
INSERT INTO paginas_fijas_en (titulo, filename, creado_por)
SELECT titulo, filename, creado_por FROM itinerarios_en
WHERE filename IN (
    '1 - Portada_2.pdf', '2 - legalidad_1.pdf',
    'W - Por que elegirnos_1.pdf', 'X- Recomendaciones.pdf',
    'Y- terminos y condiciones.pdf', 'Z - final logo.pdf'
);

DELETE FROM itinerarios_en
WHERE filename IN (
    '1 - Portada_2.pdf', '2 - legalidad_1.pdf',
    'W - Por que elegirnos_1.pdf', 'X- Recomendaciones.pdf',
    'Y- terminos y condiciones.pdf', 'Z - final logo.pdf'
);
