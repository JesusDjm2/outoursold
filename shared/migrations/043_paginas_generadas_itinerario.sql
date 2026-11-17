-- 043: Páginas del PDF del itinerario generadas por el sistema (con la marca de la agencia)
-- como alternativa a los PDF subidos.
--
-- 1) itinerarios_es/en/pt.descripcion: texto del día (párrafos). Es el cuerpo de la página
--    del día cuando se genera; vacío, la página se arma con lugares a visitar e incluye.
-- 2) itinerario_config_agencia.paginas: JSON con el modo de cada sección, por agencia e idioma
--    (la misma fila que las Páginas fijas). NULL = como siempre (todo con PDF subido):
--      presentacion: 'pdf' | 'generada' | 'generada_pdf' (portada generada + PDF subidos)
--      dias:         'pdf' | 'generada'
--      cierre:       'pdf' | 'generada' | 'pdf_generada' (PDF subidos + contacto generado)
--      terminos:     true | false (términos de Mi Empresa, antes del cierre)
--    En el Cotizador se puede cambiar para un itinerario (se guarda con la cotización).
--
-- Correr ANTES de subir los archivos de esta versión.

ALTER TABLE itinerarios_es ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;
ALTER TABLE itinerarios_en ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;
ALTER TABLE itinerarios_pt ADD COLUMN descripcion TEXT NULL DEFAULT NULL AFTER lugares_visitar;

ALTER TABLE itinerario_config_agencia ADD COLUMN paginas LONGTEXT NULL DEFAULT NULL;
