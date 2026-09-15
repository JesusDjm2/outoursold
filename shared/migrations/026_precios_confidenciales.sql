-- Agrega 2 precios internos a Actividades (tours) y Hoteles: Precio Confidencial (pconf)
-- y Precio Costo Total (pctotal). Se cargan y editan igual que P.Reg/P.Promo en Gestión de
-- Datos, pero NUNCA se muestran en la tabla de trabajo del Cotizador salvo que el usuario
-- los revele a propósito con un botón — y al editarlos ahí, el cambio queda solo en esa
-- cotización puntual (se guarda con ella), nunca reescribe este catálogo maestro.

ALTER TABLE tours_pen
    ADD COLUMN pconf DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ppromo,
    ADD COLUMN pctotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER pconf;

ALTER TABLE tours_usd
    ADD COLUMN pconf DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ppromo,
    ADD COLUMN pctotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER pconf;

ALTER TABLE hoteles_pen
    ADD COLUMN pconf DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ppromo,
    ADD COLUMN pctotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER pconf;

ALTER TABLE hoteles_usd
    ADD COLUMN pconf DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ppromo,
    ADD COLUMN pctotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER pconf;
