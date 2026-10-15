-- Grupo padre de los Destinos: "Con pernocte" / "Sin pernocte". Se gestiona desde
-- Gestión de Datos > Itinerarios > Destinos y Categorías, pero el dato es del destino, que
-- sigue siendo la tabla compartida por Actividades, Hoteles e Itinerarios.
--
-- Catálogo fijo de 2 filas (no es propio de cada usuario, igual que Países). Los destinos
-- existentes quedan con grupo_id NULL ("Sin asignar") hasta que cada usuario los asigne a
-- uno de los dos grupos. Si algún día se borra un grupo, sus destinos vuelven a NULL.

CREATE TABLE grupos_destino (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(30) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_grupos_destino_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO grupos_destino (id, clave, nombre, orden) VALUES
    (1, 'con_pernocte', 'Con pernocte', 1),
    (2, 'sin_pernocte', 'Sin pernocte', 2);

ALTER TABLE destinos
    ADD COLUMN grupo_id INT NULL DEFAULT NULL AFTER nombre,
    ADD KEY idx_destinos_grupo (grupo_id),
    ADD CONSTRAINT fk_destinos_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_destino(id) ON DELETE SET NULL;
