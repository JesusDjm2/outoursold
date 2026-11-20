-- 044: Porcentaje de reserva propio de cada paquete predefinido. Se guarda al crear o
-- actualizar el paquete desde el Cotizador y, al aplicarlo, pasa a "Reserva (%)" de la
-- cotización. NULL en los paquetes de antes: al aplicarlos se deja el porcentaje que ya tenía
-- la cotización.
ALTER TABLE paquetes_tours_usd
    ADD COLUMN porcentaje_reserva DECIMAL(5,2) NULL DEFAULT NULL AFTER itinerario;

ALTER TABLE paquetes_tours_pen
    ADD COLUMN porcentaje_reserva DECIMAL(5,2) NULL DEFAULT NULL AFTER itinerario;
