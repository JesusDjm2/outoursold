-- El Hero pasa de ser una sola imagen global del sistema a una por agencia (igual que ya
-- pasa con logo/colores/términos): cada agencia sube la suya desde "Mi Empresa". NULL por
-- defecto: mientras una agencia no suba la suya, se sigue usando shared/fondo-sistema-
-- outours.jpg como fondo por defecto (ver resolverHeroImagenUrl() en agencia-helpers.php),
-- así nadie se queda sin imagen de un día para otro.

ALTER TABLE agencias
    ADD COLUMN hero_imagen VARCHAR(255) NULL AFTER logo;
