-- Los grupos padre de los destinos de Itinerarios pasan a llamarse "Con hotel" / "Sin hotel"
-- (antes "Con pernocte" / "Sin pernocte"). Solo cambia el nombre que se muestra: las claves
-- (con_pernocte / sin_pernocte) y los ids siguen igual, así que no se toca ningún destino.
UPDATE grupos_destino SET nombre = 'Con hotel' WHERE clave = 'con_pernocte';
UPDATE grupos_destino SET nombre = 'Sin hotel' WHERE clave = 'sin_pernocte';
