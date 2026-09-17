-- Alemania se dividía sin departamentos en 027_paises_departamentos.sql (quedó fuera de
-- los 14 países cubiertos ahí). Se agregan sus 16 estados federados (Bundesländer).

SET @al = (SELECT id FROM paises WHERE nombre='Alemania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@al,'Baden-Wurtemberg'),(@al,'Baviera'),(@al,'Berlín'),(@al,'Brandeburgo'),(@al,'Bremen'),
(@al,'Hamburgo'),(@al,'Hesse'),(@al,'Mecklemburgo-Pomerania Occidental'),(@al,'Baja Sajonia'),
(@al,'Renania del Norte-Westfalia'),(@al,'Renania-Palatinado'),(@al,'Sarre'),(@al,'Sajonia'),
(@al,'Sajonia-Anhalt'),(@al,'Schleswig-Holstein'),(@al,'Turingia');
