-- Destinos, categorías, tours, hoteles, módulos de itinerario, páginas fijas y paquetes
-- pasan a ser propios de cada usuario (igual que ya son cotizaciones e itinerarios
-- generados): el filtro por creado_por lo agrega el código (shared/api.php e
-- itinerario/api.php), esta migración solo deja el dato consistente antes de activarlo.
--
-- Todo lo que hoy no tiene dueño (creado_por NULL, catálogo heredado de antes de que
-- existiera este control) queda asignado al admin — el admin sigue viendo todo el
-- catálogo igual que antes; cada agencia arranca con su propio catálogo vacío a partir de
-- este momento, igual que arranca sin cotizaciones ni itinerarios al crearse.

UPDATE destinos SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE categorias SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE categorias_hoteles SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE tours_pen SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE tours_usd SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE hoteles_pen SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE hoteles_usd SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paquetes_tours_pen SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paquetes_tours_usd SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE itinerarios_es SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE itinerarios_en SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE itinerarios_pt SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paginas_fijas_es SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paginas_fijas_en SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paginas_fijas_pt SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paquetes_itinerarios_es SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paquetes_itinerarios_en SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
UPDATE paquetes_itinerarios_pt SET creado_por = (SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1) WHERE creado_por IS NULL;
