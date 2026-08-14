-- Lleva el módulo de Itinerarios de archivos JSON (itinerario/itineraryModules.json,
-- itinerario/defaultConfig.json) a MySQL, particionado por idioma (es/en/pt) en vez de
-- moneda, siguiendo el mismo patrón que tours_pen/tours_usd. El catálogo de Destinos y
-- Categorías se mantiene compartido (las mismas tablas que ya usan Tours/Hoteles).

-- ===== itinerarios_{es,en,pt}: módulos PDF =====
CREATE TABLE itinerarios_es (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    destino_id INT NULL,
    categoria_id INT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerarios_es_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_es_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_es_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerarios_en (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    destino_id INT NULL,
    categoria_id INT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerarios_en_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_en_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_en_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerarios_pt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    destino_id INT NULL,
    categoria_id INT NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itinerarios_pt_destino FOREIGN KEY (destino_id) REFERENCES destinos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_pt_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    CONSTRAINT fk_itinerarios_pt_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== itinerario_config_{es,en,pt}: páginas fijas (presentación/cierre), fila única =====
CREATE TABLE itinerario_config_es (
    id TINYINT PRIMARY KEY DEFAULT 1,
    start_files LONGTEXT NOT NULL CHECK (json_valid(start_files)),
    end_files LONGTEXT NOT NULL CHECK (json_valid(end_files)),
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO itinerario_config_es (start_files, end_files) VALUES ('[]', '[]');

CREATE TABLE itinerario_config_en (
    id TINYINT PRIMARY KEY DEFAULT 1,
    start_files LONGTEXT NOT NULL CHECK (json_valid(start_files)),
    end_files LONGTEXT NOT NULL CHECK (json_valid(end_files)),
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO itinerario_config_en (start_files, end_files) VALUES ('[]', '[]');

CREATE TABLE itinerario_config_pt (
    id TINYINT PRIMARY KEY DEFAULT 1,
    start_files LONGTEXT NOT NULL CHECK (json_valid(start_files)),
    end_files LONGTEXT NOT NULL CHECK (json_valid(end_files)),
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO itinerario_config_pt (start_files, end_files) VALUES ('[]', '[]');

-- ===== paquetes_itinerarios_{es,en,pt}: combos reutilizables de módulos (por filename) =====
CREATE TABLE paquetes_itinerarios_es (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    modulos LONGTEXT NOT NULL CHECK (json_valid(modulos)),
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paquetes_itinerarios_en (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    modulos LONGTEXT NOT NULL CHECK (json_valid(modulos)),
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paquetes_itinerarios_pt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    modulos LONGTEXT NOT NULL CHECK (json_valid(modulos)),
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
