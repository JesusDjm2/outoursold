-- 042: Actividades vinculadas a un itinerario (módulo): un itinerario puede tener varias
-- actividades (tours), y cada actividad va con un solo itinerario de cada idioma (1 a N).
--
-- Una tabla por idioma (como itinerarios_es/en/pt). Cada fila vincula una actividad de UNA
-- moneda: tour_usd_id (tours_usd) o tour_pen_id (tours_pen), nunca las dos. El UNIQUE de
-- cada columna es lo que hace que una actividad no pueda estar en dos itinerarios del mismo
-- idioma. `orden` es el orden en que se agregan a la cotización dentro del día. Si se borra
-- el itinerario o la actividad, el vínculo se borra solo.
--
-- En el Cotizador, al agregar el itinerario se agregan sus actividades en el mismo día. Ese
-- vínculo se puede cambiar dentro de la cotización (se guarda en el JSON de la cotización,
-- no aquí); estas son solo las de por defecto.
--
-- Correr ANTES de subir los archivos de esta versión.

CREATE TABLE itinerario_tours_es (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerario_id INT NOT NULL,
    tour_usd_id INT NULL DEFAULT NULL,
    tour_pen_id INT NULL DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_itinerario_tours_es_usd (tour_usd_id),
    UNIQUE KEY uq_itinerario_tours_es_pen (tour_pen_id),
    KEY idx_itinerario_tours_es_itin (itinerario_id, orden),
    CONSTRAINT chk_itinerario_tours_es_moneda CHECK ((tour_usd_id IS NULL) <> (tour_pen_id IS NULL)),
    CONSTRAINT fk_itinerario_tours_es_itin FOREIGN KEY (itinerario_id) REFERENCES itinerarios_es(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_es_usd FOREIGN KEY (tour_usd_id) REFERENCES tours_usd(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_es_pen FOREIGN KEY (tour_pen_id) REFERENCES tours_pen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerario_tours_en (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerario_id INT NOT NULL,
    tour_usd_id INT NULL DEFAULT NULL,
    tour_pen_id INT NULL DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_itinerario_tours_en_usd (tour_usd_id),
    UNIQUE KEY uq_itinerario_tours_en_pen (tour_pen_id),
    KEY idx_itinerario_tours_en_itin (itinerario_id, orden),
    CONSTRAINT chk_itinerario_tours_en_moneda CHECK ((tour_usd_id IS NULL) <> (tour_pen_id IS NULL)),
    CONSTRAINT fk_itinerario_tours_en_itin FOREIGN KEY (itinerario_id) REFERENCES itinerarios_en(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_en_usd FOREIGN KEY (tour_usd_id) REFERENCES tours_usd(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_en_pen FOREIGN KEY (tour_pen_id) REFERENCES tours_pen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerario_tours_pt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerario_id INT NOT NULL,
    tour_usd_id INT NULL DEFAULT NULL,
    tour_pen_id INT NULL DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_itinerario_tours_pt_usd (tour_usd_id),
    UNIQUE KEY uq_itinerario_tours_pt_pen (tour_pen_id),
    KEY idx_itinerario_tours_pt_itin (itinerario_id, orden),
    CONSTRAINT chk_itinerario_tours_pt_moneda CHECK ((tour_usd_id IS NULL) <> (tour_pen_id IS NULL)),
    CONSTRAINT fk_itinerario_tours_pt_itin FOREIGN KEY (itinerario_id) REFERENCES itinerarios_pt(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_pt_usd FOREIGN KEY (tour_usd_id) REFERENCES tours_usd(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerario_tours_pt_pen FOREIGN KEY (tour_pen_id) REFERENCES tours_pen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
