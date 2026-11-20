-- 045: N° PAX propio de cada paquete predefinido. Se guarda al crear o actualizar el
-- paquete desde el Cotizador y, al aplicarlo, pasa a N° PAX de la cotización (las actividades
-- con esa misma Cant. lo siguen; las que se cambiaron a mano quedan con la suya). NULL en los
-- paquetes de antes: al aplicarlos se deja el N° PAX que ya tenía la cotización.
ALTER TABLE paquetes_tours_usd
    ADD COLUMN n_pax INT NULL DEFAULT NULL AFTER porcentaje_reserva;

ALTER TABLE paquetes_tours_pen
    ADD COLUMN n_pax INT NULL DEFAULT NULL AFTER porcentaje_reserva;
