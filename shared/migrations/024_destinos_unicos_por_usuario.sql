-- destinos.nombre tenía un índice único GLOBAL (uq_destinos_nombre), heredado de cuando el
-- catálogo era compartido entre todas las agencias. Ahora que destinos es propio de cada
-- usuario (ver 023), esa unicidad debe ser por usuario, no global — si no, ninguna agencia
-- puede crear "Lima" porque el admin (o cualquier otra agencia) ya la tiene.
-- Mantiene el mismo NOMBRE de índice (uq_destinos_nombre) para que el mensaje de error
-- amigable en shared/error-helpers.php lo siga reconociendo sin cambios.

ALTER TABLE destinos DROP INDEX uq_destinos_nombre;
ALTER TABLE destinos ADD UNIQUE KEY uq_destinos_nombre (nombre, creado_por);
