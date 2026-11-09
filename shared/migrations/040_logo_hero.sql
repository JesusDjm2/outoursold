-- Logo del encabezado (Hero) de las vistas, independiente del logo de la agencia que va en
-- los PDF (columna logo). Se cambia desde el botón "Logo del encabezado" del Hero
-- (mi-empresa-api.php?path=subir-logo-hero). Mientras esté vacío, el encabezado sigue
-- mostrando el logo de los PDF (ver resolverLogoUrl en agencia-helpers.php).
ALTER TABLE agencias
    ADD COLUMN logo_hero VARCHAR(255) NULL DEFAULT NULL AFTER logo;
