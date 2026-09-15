-- La moneda del PDF ya la define la instancia del cotizador (pen/index.php vs
-- usd/index.php), no la agencia — el campo moneda por agencia (016) resultó redundante
-- y confuso (dos lugares definiendo lo mismo). Se elimina; colores por agencia se mantienen.

ALTER TABLE agencias
    DROP COLUMN moneda;
