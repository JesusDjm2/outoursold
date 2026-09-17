-- Catálogo global de Países (con código telefónico) y Departamentos/Estados de nivel 1
-- por país, para el formulario de Datos Pax del Cotizador: el select de País ya existía
-- como una lista fija en el frontend (sin código telefónico ni relación con Dpto/Est.);
-- ahora vive en base de datos para poder relacionar ambos campos y autocompletarlos.
-- No llevan creado_por: son datos de referencia geográfica, iguales para todos los
-- usuarios (a diferencia de Destinos/Categorías, que sí son catálogo propio de cada uno).

CREATE TABLE paises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo_telefono VARCHAR(6) NOT NULL,
    UNIQUE KEY uq_paises_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pais_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    UNIQUE KEY uq_departamentos_pais_nombre (pais_id, nombre),
    CONSTRAINT fk_departamentos_pais FOREIGN KEY (pais_id) REFERENCES paises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Países (mismos 194 nombres que ya usaba el buscador del frontend) =====
INSERT INTO paises (nombre, codigo_telefono) VALUES
('Afganistán','+93'),('Albania','+355'),('Alemania','+49'),('Andorra','+376'),('Angola','+244'),
('Antigua y Barbuda','+1268'),('Arabia Saudita','+966'),('Argelia','+213'),('Argentina','+54'),
('Armenia','+374'),('Australia','+61'),('Austria','+43'),('Azerbaiyán','+994'),('Bahamas','+1242'),
('Baréin','+973'),('Bangladés','+880'),('Barbados','+1246'),('Bélgica','+32'),('Belice','+501'),
('Benín','+229'),('Bielorrusia','+375'),('Birmania (Myanmar)','+95'),('Bolivia','+591'),
('Bosnia y Herzegovina','+387'),('Botsuana','+267'),('Brasil','+55'),('Brunéi','+673'),
('Bulgaria','+359'),('Burkina Faso','+226'),('Burundi','+257'),('Bután','+975'),('Cabo Verde','+238'),
('Camboya','+855'),('Camerún','+237'),('Canadá','+1'),('Catar','+974'),('Chad','+235'),('Chile','+56'),
('China','+86'),('Chipre','+357'),('Ciudad del Vaticano','+379'),('Colombia','+57'),('Comoras','+269'),
('Corea del Norte','+850'),('Corea del Sur','+82'),('Costa de Marfil','+225'),('Costa Rica','+506'),
('Croacia','+385'),('Cuba','+53'),('Dinamarca','+45'),('Dominica','+1767'),('Ecuador','+593'),
('Egipto','+20'),('El Salvador','+503'),('Emiratos Árabes Unidos','+971'),('Eritrea','+291'),
('Eslovaquia','+421'),('Eslovenia','+386'),('España','+34'),('Estados Unidos','+1'),('Estonia','+372'),
('Etiopía','+251'),('Filipinas','+63'),('Finlandia','+358'),('Fiyi','+679'),('Francia','+33'),
('Gabón','+241'),('Gambia','+220'),('Georgia','+995'),('Ghana','+233'),('Granada','+1473'),
('Grecia','+30'),('Guatemala','+502'),('Guyana','+592'),('Guinea','+224'),('Guinea-Bisáu','+245'),
('Guinea Ecuatorial','+240'),('Haití','+509'),('Honduras','+504'),('Hungría','+36'),('India','+91'),
('Indonesia','+62'),('Irak','+964'),('Irán','+98'),('Irlanda','+353'),('Islandia','+354'),
('Islas Marshall','+692'),('Islas Salomón','+677'),('Israel','+972'),('Italia','+39'),('Jamaica','+1876'),
('Japón','+81'),('Jordania','+962'),('Kazajistán','+7'),('Kenia','+254'),('Kirguistán','+996'),
('Kiribati','+686'),('Kuwait','+965'),('Laos','+856'),('Lesoto','+266'),('Letonia','+371'),
('Líbano','+961'),('Liberia','+231'),('Libia','+218'),('Liechtenstein','+423'),('Lituania','+370'),
('Luxemburgo','+352'),('Macedonia del Norte','+389'),('Madagascar','+261'),('Malasia','+60'),
('Malaui','+265'),('Maldivas','+960'),('Malí','+223'),('Malta','+356'),('Marruecos','+212'),
('Mauricio','+230'),('Mauritania','+222'),('México','+52'),('Micronesia','+691'),('Moldavia','+373'),
('Mónaco','+377'),('Mongolia','+976'),('Montenegro','+382'),('Mozambique','+258'),('Namibia','+264'),
('Nauru','+674'),('Nepal','+977'),('Nicaragua','+505'),('Níger','+227'),('Nigeria','+234'),
('Noruega','+47'),('Nueva Zelanda','+64'),('Omán','+968'),('Países Bajos','+31'),('Pakistán','+92'),
('Palaos','+680'),('Panamá','+507'),('Papúa Nueva Guinea','+675'),('Paraguay','+595'),('Perú','+51'),
('Polonia','+48'),('Portugal','+351'),('Reino Unido','+44'),('República Centroafricana','+236'),
('República Checa','+420'),('República del Congo','+242'),('República Democrática del Congo','+243'),
('República Dominicana','+1809'),('Ruanda','+250'),('Rumania','+40'),('Rusia','+7'),('Samoa','+685'),
('San Cristóbal y Nieves','+1869'),('San Marino','+378'),('San Vicente y las Granadinas','+1784'),
('Santa Lucía','+1758'),('Santo Tomé y Príncipe','+239'),('Senegal','+221'),('Serbia','+381'),
('Seychelles','+248'),('Sierra Leona','+232'),('Singapur','+65'),('Siria','+963'),('Somalia','+252'),
('Sri Lanka','+94'),('Suazilandia (Esuatini)','+268'),('Sudáfrica','+27'),('Sudán','+249'),
('Sudán del Sur','+211'),('Suecia','+46'),('Suiza','+41'),('Surinam','+597'),('Tailandia','+66'),
('Tanzania','+255'),('Tayikistán','+992'),('Timor Oriental','+670'),('Togo','+228'),('Tonga','+676'),
('Trinidad y Tobago','+1868'),('Túnez','+216'),('Turkmenistán','+993'),('Turquía','+90'),
('Tuvalu','+688'),('Ucrania','+380'),('Uganda','+256'),('Uruguay','+598'),('Uzbekistán','+998'),
('Vanuatu','+678'),('Venezuela','+58'),('Vietnam','+84'),('Yemen','+967'),('Yibuti','+253'),
('Zambia','+260'),('Zimbabue','+263');

-- ===== Departamentos/Estados de nivel 1 =====
-- Cobertura completa para Perú (país de la agencia) y los mercados más relevantes de
-- América y España. El resto de países queda solo con su código telefónico — el select
-- de Dpto/Est. simplemente aparece vacío para esos casos (no es un dato obligatorio).

SET @pe = (SELECT id FROM paises WHERE nombre='Perú');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pe,'Amazonas'),(@pe,'Áncash'),(@pe,'Apurímac'),(@pe,'Arequipa'),(@pe,'Ayacucho'),(@pe,'Cajamarca'),
(@pe,'Callao'),(@pe,'Cusco'),(@pe,'Huancavelica'),(@pe,'Huánuco'),(@pe,'Ica'),(@pe,'Junín'),
(@pe,'La Libertad'),(@pe,'Lambayeque'),(@pe,'Lima'),(@pe,'Loreto'),(@pe,'Madre de Dios'),
(@pe,'Moquegua'),(@pe,'Pasco'),(@pe,'Piura'),(@pe,'Puno'),(@pe,'San Martín'),(@pe,'Tacna'),
(@pe,'Tumbes'),(@pe,'Ucayali');

SET @ar = (SELECT id FROM paises WHERE nombre='Argentina');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ar,'Buenos Aires'),(@ar,'Ciudad Autónoma de Buenos Aires'),(@ar,'Catamarca'),(@ar,'Chaco'),
(@ar,'Chubut'),(@ar,'Córdoba'),(@ar,'Corrientes'),(@ar,'Entre Ríos'),(@ar,'Formosa'),(@ar,'Jujuy'),
(@ar,'La Pampa'),(@ar,'La Rioja'),(@ar,'Mendoza'),(@ar,'Misiones'),(@ar,'Neuquén'),(@ar,'Río Negro'),
(@ar,'Salta'),(@ar,'San Juan'),(@ar,'San Luis'),(@ar,'Santa Cruz'),(@ar,'Santa Fe'),
(@ar,'Santiago del Estero'),(@ar,'Tierra del Fuego'),(@ar,'Tucumán');

SET @bo = (SELECT id FROM paises WHERE nombre='Bolivia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bo,'Beni'),(@bo,'Chuquisaca'),(@bo,'Cochabamba'),(@bo,'La Paz'),(@bo,'Oruro'),(@bo,'Pando'),
(@bo,'Potosí'),(@bo,'Santa Cruz'),(@bo,'Tarija');

SET @br = (SELECT id FROM paises WHERE nombre='Brasil');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@br,'Acre'),(@br,'Alagoas'),(@br,'Amapá'),(@br,'Amazonas'),(@br,'Bahía'),(@br,'Ceará'),
(@br,'Distrito Federal'),(@br,'Espírito Santo'),(@br,'Goiás'),(@br,'Maranhão'),(@br,'Mato Grosso'),
(@br,'Mato Grosso do Sul'),(@br,'Minas Gerais'),(@br,'Pará'),(@br,'Paraíba'),(@br,'Paraná'),
(@br,'Pernambuco'),(@br,'Piauí'),(@br,'Río de Janeiro'),(@br,'Río Grande do Norte'),
(@br,'Río Grande do Sul'),(@br,'Rondônia'),(@br,'Roraima'),(@br,'Santa Catarina'),(@br,'São Paulo'),
(@br,'Sergipe'),(@br,'Tocantins');

SET @cl = (SELECT id FROM paises WHERE nombre='Chile');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cl,'Arica y Parinacota'),(@cl,'Tarapacá'),(@cl,'Antofagasta'),(@cl,'Atacama'),(@cl,'Coquimbo'),
(@cl,'Valparaíso'),(@cl,'Metropolitana de Santiago'),(@cl,"O'Higgins"),(@cl,'Maule'),(@cl,'Ñuble'),
(@cl,'Biobío'),(@cl,'La Araucanía'),(@cl,'Los Ríos'),(@cl,'Los Lagos'),(@cl,'Aysén'),(@cl,'Magallanes');

SET @co = (SELECT id FROM paises WHERE nombre='Colombia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@co,'Amazonas'),(@co,'Antioquia'),(@co,'Arauca'),(@co,'Atlántico'),(@co,'Bolívar'),(@co,'Boyacá'),
(@co,'Caldas'),(@co,'Caquetá'),(@co,'Casanare'),(@co,'Cauca'),(@co,'Cesar'),(@co,'Chocó'),
(@co,'Córdoba'),(@co,'Cundinamarca'),(@co,'Guainía'),(@co,'Guaviare'),(@co,'Huila'),(@co,'La Guajira'),
(@co,'Magdalena'),(@co,'Meta'),(@co,'Nariño'),(@co,'Norte de Santander'),(@co,'Putumayo'),
(@co,'Quindío'),(@co,'Risaralda'),(@co,'San Andrés y Providencia'),(@co,'Santander'),(@co,'Sucre'),
(@co,'Tolima'),(@co,'Valle del Cauca'),(@co,'Vaupés'),(@co,'Vichada');

SET @ec = (SELECT id FROM paises WHERE nombre='Ecuador');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ec,'Azuay'),(@ec,'Bolívar'),(@ec,'Cañar'),(@ec,'Carchi'),(@ec,'Chimborazo'),(@ec,'Cotopaxi'),
(@ec,'El Oro'),(@ec,'Esmeraldas'),(@ec,'Galápagos'),(@ec,'Guayas'),(@ec,'Imbabura'),(@ec,'Loja'),
(@ec,'Los Ríos'),(@ec,'Manabí'),(@ec,'Morona Santiago'),(@ec,'Napo'),(@ec,'Orellana'),(@ec,'Pastaza'),
(@ec,'Pichincha'),(@ec,'Santa Elena'),(@ec,'Santo Domingo de los Tsáchilas'),(@ec,'Sucumbíos'),
(@ec,'Tungurahua'),(@ec,'Zamora Chinchipe');

SET @py = (SELECT id FROM paises WHERE nombre='Paraguay');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@py,'Alto Paraguay'),(@py,'Alto Paraná'),(@py,'Amambay'),(@py,'Asunción'),(@py,'Boquerón'),
(@py,'Caaguazú'),(@py,'Caazapá'),(@py,'Canindeyú'),(@py,'Central'),(@py,'Concepción'),
(@py,'Cordillera'),(@py,'Guairá'),(@py,'Itapúa'),(@py,'Misiones'),(@py,'Ñeembucú'),(@py,'Paraguarí'),
(@py,'Presidente Hayes'),(@py,'San Pedro');

SET @uy = (SELECT id FROM paises WHERE nombre='Uruguay');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@uy,'Artigas'),(@uy,'Canelones'),(@uy,'Cerro Largo'),(@uy,'Colonia'),(@uy,'Durazno'),(@uy,'Flores'),
(@uy,'Florida'),(@uy,'Lavalleja'),(@uy,'Maldonado'),(@uy,'Montevideo'),(@uy,'Paysandú'),
(@uy,'Río Negro'),(@uy,'Rivera'),(@uy,'Rocha'),(@uy,'Salto'),(@uy,'San José'),(@uy,'Soriano'),
(@uy,'Tacuarembó'),(@uy,'Treinta y Tres');

SET @ve = (SELECT id FROM paises WHERE nombre='Venezuela');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ve,'Amazonas'),(@ve,'Anzoátegui'),(@ve,'Apure'),(@ve,'Aragua'),(@ve,'Barinas'),(@ve,'Bolívar'),
(@ve,'Carabobo'),(@ve,'Cojedes'),(@ve,'Delta Amacuro'),(@ve,'Distrito Capital'),(@ve,'Falcón'),
(@ve,'Guárico'),(@ve,'La Guaira'),(@ve,'Lara'),(@ve,'Mérida'),(@ve,'Miranda'),(@ve,'Monagas'),
(@ve,'Nueva Esparta'),(@ve,'Portuguesa'),(@ve,'Sucre'),(@ve,'Táchira'),(@ve,'Trujillo'),
(@ve,'Yaracuy'),(@ve,'Zulia');

SET @mx = (SELECT id FROM paises WHERE nombre='México');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mx,'Aguascalientes'),(@mx,'Baja California'),(@mx,'Baja California Sur'),(@mx,'Campeche'),
(@mx,'Chiapas'),(@mx,'Chihuahua'),(@mx,'Ciudad de México'),(@mx,'Coahuila'),(@mx,'Colima'),
(@mx,'Durango'),(@mx,'Guanajuato'),(@mx,'Guerrero'),(@mx,'Hidalgo'),(@mx,'Jalisco'),(@mx,'México'),
(@mx,'Michoacán'),(@mx,'Morelos'),(@mx,'Nayarit'),(@mx,'Nuevo León'),(@mx,'Oaxaca'),(@mx,'Puebla'),
(@mx,'Querétaro'),(@mx,'Quintana Roo'),(@mx,'San Luis Potosí'),(@mx,'Sinaloa'),(@mx,'Sonora'),
(@mx,'Tabasco'),(@mx,'Tamaulipas'),(@mx,'Tlaxcala'),(@mx,'Veracruz'),(@mx,'Yucatán'),(@mx,'Zacatecas');

SET @us = (SELECT id FROM paises WHERE nombre='Estados Unidos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@us,'Alabama'),(@us,'Alaska'),(@us,'Arizona'),(@us,'Arkansas'),(@us,'California'),
(@us,'Carolina del Norte'),(@us,'Carolina del Sur'),(@us,'Colorado'),(@us,'Connecticut'),
(@us,'Dakota del Norte'),(@us,'Dakota del Sur'),(@us,'Delaware'),(@us,'Distrito de Columbia'),
(@us,'Florida'),(@us,'Georgia'),(@us,'Hawái'),(@us,'Idaho'),(@us,'Illinois'),(@us,'Indiana'),
(@us,'Iowa'),(@us,'Kansas'),(@us,'Kentucky'),(@us,'Luisiana'),(@us,'Maine'),(@us,'Maryland'),
(@us,'Massachusetts'),(@us,'Míchigan'),(@us,'Minnesota'),(@us,'Misisipi'),(@us,'Misuri'),
(@us,'Montana'),(@us,'Nebraska'),(@us,'Nevada'),(@us,'New Hampshire'),(@us,'Nueva Jersey'),
(@us,'Nuevo México'),(@us,'Nueva York'),(@us,'Ohio'),(@us,'Oklahoma'),(@us,'Oregón'),
(@us,'Pensilvania'),(@us,'Rhode Island'),(@us,'Tennessee'),(@us,'Texas'),(@us,'Utah'),
(@us,'Vermont'),(@us,'Virginia'),(@us,'Virginia Occidental'),(@us,'Washington'),(@us,'Wisconsin'),
(@us,'Wyoming');

SET @ca = (SELECT id FROM paises WHERE nombre='Canadá');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ca,'Alberta'),(@ca,'Columbia Británica'),(@ca,'Manitoba'),(@ca,'Nuevo Brunswick'),
(@ca,'Terranova y Labrador'),(@ca,'Nueva Escocia'),(@ca,'Ontario'),
(@ca,'Isla del Príncipe Eduardo'),(@ca,'Quebec'),(@ca,'Saskatchewan'),
(@ca,'Territorios del Noroeste'),(@ca,'Nunavut'),(@ca,'Yukón');

SET @es = (SELECT id FROM paises WHERE nombre='España');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@es,'Andalucía'),(@es,'Aragón'),(@es,'Asturias'),(@es,'Islas Baleares'),(@es,'Canarias'),
(@es,'Cantabria'),(@es,'Castilla-La Mancha'),(@es,'Castilla y León'),(@es,'Cataluña'),
(@es,'Ceuta'),(@es,'Extremadura'),(@es,'Galicia'),(@es,'La Rioja'),(@es,'Madrid'),(@es,'Melilla'),
(@es,'Murcia'),(@es,'Navarra'),(@es,'País Vasco'),(@es,'Comunidad Valenciana');
