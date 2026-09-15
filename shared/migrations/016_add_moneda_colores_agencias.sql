-- Permite que el PDF de cotización use moneda y acento de color propios por agencia,
-- en vez del símbolo global fijo por instancia (usd/index.php, pen/index.php) y los
-- colores fijos en shared/pdf-styles.css. Ambos quedan NULL por defecto: si una agencia
-- no los configura, el PDF sigue viéndose exactamente igual que hoy (fallback al símbolo
-- de la instancia y a los colores originales #ff0000/#0566cf).

ALTER TABLE agencias
    ADD COLUMN moneda VARCHAR(5) NULL AFTER whatsapp,
    ADD COLUMN color_principal VARCHAR(7) NULL AFTER moneda,
    ADD COLUMN color_secundario VARCHAR(7) NULL AFTER color_principal;
