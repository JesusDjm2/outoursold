-- Permite que el PDF de cotización use datos de empresa dinámicos en vez de la plantilla
-- fija en shared/pdf-template.html: cada agencia gana un 2do teléfono y Términos y
-- Condiciones en 3 idiomas, y una de ellas queda marcada como "empresa principal" (los
-- datos que se usan cuando quien crea la cotización no tiene agencia asignada, típicamente
-- el admin).

ALTER TABLE agencias
    ADD COLUMN telefono2 VARCHAR(50) NULL AFTER telefono,
    ADD COLUMN es_principal TINYINT(1) NOT NULL DEFAULT 0 AFTER logo,
    ADD COLUMN terminos_es MEDIUMTEXT NULL AFTER es_principal,
    ADD COLUMN terminos_en MEDIUMTEXT NULL AFTER terminos_es,
    ADD COLUMN terminos_pt MEDIUMTEXT NULL AFTER terminos_en;

-- Backfill: crea la fila "empresa principal" con los valores que hasta ahora estaban fijos
-- en shared/pdf-template.html, para que ningún PDF cambie visualmente hasta que el admin
-- edite estos datos desde Usuarios > Agencias. Idempotente: no hace nada si ya existe una
-- fila principal.
INSERT INTO agencias (nombre, ruc, direccion, telefono, telefono2, whatsapp, es_principal)
SELECT 'OUTOORS AGENCIA DE VIAJES', '20609305755', 'Jose Carlos Mariategui F-2, Cusco, Perú',
       '(084)', '(+51) 970-824-536', '(+51) 935-095-895', 1
WHERE NOT EXISTS (SELECT 1 FROM agencias WHERE es_principal = 1);
