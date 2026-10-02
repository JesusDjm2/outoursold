-- Posición vertical del recorte de la imagen del Hero (0 = se ve la parte de arriba de la
-- imagen, 100 = se ve la parte de abajo), elegida al subirla con el ajuste de "arrastrar
-- para reposicionar" en hero-edit.js. 50 = centrado, igual que el comportamiento de antes
-- (background-position: center), así que no hace falta backfill para las agencias existentes.
ALTER TABLE agencias ADD COLUMN hero_pos_y TINYINT UNSIGNED NOT NULL DEFAULT 50 AFTER hero_imagen;
