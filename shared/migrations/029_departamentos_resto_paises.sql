-- Departamentos/Estados de nivel 1 para el resto de países del catálogo `paises`
-- (los 194 países ya existen desde 027_paises_departamentos.sql; 027 cargó divisiones
-- para Perú/Sudamérica/México/EE.UU./Canadá/España, y 028_departamentos_alemania.sql
-- agregó Alemania). Este archivo cubre los 179 países restantes, investigados con
-- fuentes web (Wikipedia, statoids, sitios oficiales) en septiembre 2026 — no se
-- generó de memoria pura. Se usa el nivel jerárquico más alto y práctico para un
-- dropdown de cliente (regiones/provincias/estados), no el más granular.
--
-- ===== PAÍSES EXCLUIDOS A PROPÓSITO (no llevan SET/INSERT, quedan solo con su
-- código telefónico ya cargado en 027) =====
--   - Ciudad del Vaticano: microestado sin división administrativa de primer nivel
--     (una sola entidad, gobernada directamente por la Santa Sede).
--   - Mónaco: unidad administrativa única, sin divisiones de primer nivel reales
--     (los "barrios" no son divisiones administrativas formales).
--   - Singapur: ciudad-estado unitaria; los 5 Community Development Councils no son
--     divisiones administrativas geográficas reales (son agrupaciones de distritos
--     electorales que cambian con cada elección), así que no aplican como Dpto/Est.
--
-- ===== NOTAS DE CONFIANZA (revisar con más cuidado) =====
--   - Azerbaiyán: la reforma de 2021 de "regiones económicas" tiene fuentes algo
--     inconsistentes en el conteo exacto (9 a 14 según la fuente); lista de BAJA
--     CONFIANZA, revisar antes de publicar.
--   - Libia: el nivel administrativo real (baladiyat) fluctúa entre 99 y 108
--     distritos desde 2013, demasiado granular; se usaron los 22 "shabiyat"
--     históricos (2007), que ya no son el nivel oficial vigente. CONFIANZA MEDIA.
--   - Seychelles: fuentes varían entre 25, 26 y 27 distritos según el año; se usó
--     una lista de 25 (la más citada). CONFIANZA MEDIA.
--   - Argelia: en noviembre de 2025 se anunciaron 11 wilayas nuevas (pasando de 58
--     a 69), pero no se encontró la lista completa y confiable de las nuevas 11 con
--     sus capitales exactas, así que se usó el esquema de 58 wilayas (vigente desde
--     2019, muy bien documentado). Revisar si se necesita actualizar a 69.
--   - Irak: se usaron las 18 gobernaciones "clásicas" (sin Halabja como 19ª, que
--     algunas fuentes recientes ya cuentan aparte). CONFIANZA MEDIA-ALTA.
--   - Angola: refleja la reforma de agosto/septiembre 2024 (18→21 provincias).
--     CONFIANZA MEDIA (reforma reciente, aún en implementación).
--   - Vietnam: refleja la fusión de julio de 2025 (63→34 provincias/ciudades).
--     CONFIANZA ALTA (nombres verificados), pero es un cambio recientísimo.
--   - Resto de países: CONFIANZA ALTA (datos estables, verificados con búsquedas
--     agrupadas por región/continente).

-- ===== EUROPA =====

SET @al = (SELECT id FROM paises WHERE nombre='Albania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@al,'Berat'),(@al,'Dibra'),(@al,'Durrës'),(@al,'Elbasan'),(@al,'Fier'),(@al,'Gjirokastër'),
(@al,'Korçë'),(@al,'Kukës'),(@al,'Lezhë'),(@al,'Shkodër'),(@al,'Tirana'),(@al,'Vlorë');

SET @ad = (SELECT id FROM paises WHERE nombre='Andorra');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ad,'Andorra la Vella'),(@ad,'Canillo'),(@ad,'Encamp'),(@ad,'Escaldes-Engordany'),
(@ad,'La Massana'),(@ad,'Ordino'),(@ad,"Sant Julià de Lòria");

SET @at = (SELECT id FROM paises WHERE nombre='Austria');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@at,'Burgenland'),(@at,'Carintia'),(@at,'Baja Austria'),(@at,'Alta Austria'),(@at,'Salzburgo'),
(@at,'Estiria'),(@at,'Tirol'),(@at,'Vorarlberg'),(@at,'Viena');

SET @be = (SELECT id FROM paises WHERE nombre='Bélgica');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@be,'Amberes'),(@be,'Brabante Flamenco'),(@be,'Brabante Valón'),(@be,'Bruselas-Capital'),
(@be,'Flandes Occidental'),(@be,'Flandes Oriental'),(@be,'Henao'),(@be,'Lieja'),(@be,'Limburgo'),
(@be,'Luxemburgo'),(@be,'Namur');

SET @by = (SELECT id FROM paises WHERE nombre='Bielorrusia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@by,'Brest'),(@by,'Gómel'),(@by,'Grodno'),(@by,'Minsk (ciudad)'),(@by,'Minsk (óblast)'),
(@by,'Mogiliov'),(@by,'Vítebsk');

SET @ba = (SELECT id FROM paises WHERE nombre='Bosnia y Herzegovina');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ba,'Federación de Bosnia y Herzegovina'),(@ba,'República Srpska'),(@ba,'Distrito de Brčko');

SET @bg = (SELECT id FROM paises WHERE nombre='Bulgaria');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bg,'Blagoevgrad'),(@bg,'Burgas'),(@bg,'Dobrich'),(@bg,'Gabrovo'),(@bg,'Haskovo'),(@bg,'Kardzhali'),
(@bg,'Kyustendil'),(@bg,'Lovech'),(@bg,'Montana'),(@bg,'Pazardzhik'),(@bg,'Pernik'),(@bg,'Pleven'),
(@bg,'Plovdiv'),(@bg,'Razgrad'),(@bg,'Ruse'),(@bg,'Shumen'),(@bg,'Silistra'),(@bg,'Sliven'),
(@bg,'Smolyan'),(@bg,'Sofía (ciudad)'),(@bg,'Sofía (provincia)'),(@bg,'Stara Zagora'),
(@bg,'Targovishte'),(@bg,'Varna'),(@bg,'Veliko Tarnovo'),(@bg,'Vidin'),(@bg,'Vratsa'),(@bg,'Yambol');

SET @cy = (SELECT id FROM paises WHERE nombre='Chipre');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cy,'Nicosia'),(@cy,'Limasol'),(@cy,'Larnaca'),(@cy,'Famagusta'),(@cy,'Pafos'),(@cy,'Kyrenia');

SET @hr = (SELECT id FROM paises WHERE nombre='Croacia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@hr,'Zagreb (ciudad)'),(@hr,'Zagreb (condado)'),(@hr,'Bjelovar-Bilogora'),(@hr,'Brod-Posavina'),
(@hr,'Dubrovnik-Neretva'),(@hr,'Istria'),(@hr,'Karlovac'),(@hr,'Koprivnica-Križevci'),
(@hr,'Krapina-Zagorje'),(@hr,'Lika-Senj'),(@hr,'Međimurje'),(@hr,'Osijek-Baranja'),
(@hr,'Požega-Eslavonia'),(@hr,'Primorje-Gorski Kotar'),(@hr,'Šibenik-Knin'),(@hr,'Sisak-Moslavina'),
(@hr,'Split-Dalmacia'),(@hr,'Varaždin'),(@hr,'Virovitica-Podravina'),(@hr,'Vukovar-Srijem'),
(@hr,'Zadar');

SET @dk = (SELECT id FROM paises WHERE nombre='Dinamarca');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@dk,'Capital (Hovedstaden)'),(@dk,'Zelanda (Sjælland)'),(@dk,'Dinamarca del Sur (Syddanmark)'),
(@dk,'Jutlandia Central (Midtjylland)'),(@dk,'Jutlandia del Norte (Nordjylland)');

SET @sk = (SELECT id FROM paises WHERE nombre='Eslovaquia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sk,'Bratislava'),(@sk,'Trnava'),(@sk,'Trenčín'),(@sk,'Nitra'),(@sk,'Žilina'),
(@sk,'Banská Bystrica'),(@sk,'Prešov'),(@sk,'Košice');

SET @si = (SELECT id FROM paises WHERE nombre='Eslovenia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@si,'Pomurska'),(@si,'Podravska'),(@si,'Koroška'),(@si,'Savinjska'),(@si,'Zasavska'),
(@si,'Posavska'),(@si,'Eslovenia Sudoriental'),(@si,'Litoral-Karst'),(@si,'Eslovenia Central'),
(@si,'Alta Carniola (Gorenjska)'),(@si,'Goriška'),(@si,'Litoral-Notranjska');

SET @ee = (SELECT id FROM paises WHERE nombre='Estonia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ee,'Harju'),(@ee,'Hiiu'),(@ee,'Ida-Viru'),(@ee,'Järva'),(@ee,'Jõgeva'),(@ee,'Lääne'),
(@ee,'Lääne-Viru'),(@ee,'Põlva'),(@ee,'Pärnu'),(@ee,'Rapla'),(@ee,'Saare'),(@ee,'Tartu'),
(@ee,'Valga'),(@ee,'Viljandi'),(@ee,'Võru');

SET @fi = (SELECT id FROM paises WHERE nombre='Finlandia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@fi,'Uusimaa'),(@fi,'Finlandia Propia'),(@fi,'Satakunta'),(@fi,'Häme Central'),(@fi,'Pirkanmaa'),
(@fi,'Päijät-Häme'),(@fi,'Kymenlaakso'),(@fi,'Carelia del Sur'),(@fi,'Savonia del Sur'),
(@fi,'Savonia del Norte'),(@fi,'Carelia del Norte'),(@fi,'Finlandia Central'),
(@fi,'Ostrobotnia del Sur'),(@fi,'Ostrobotnia'),(@fi,'Ostrobotnia Central'),
(@fi,'Ostrobotnia del Norte'),(@fi,'Kainuu'),(@fi,'Laponia'),(@fi,'Åland');

SET @fr = (SELECT id FROM paises WHERE nombre='Francia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@fr,'Auvernia-Ródano-Alpes'),(@fr,'Borgoña-Franco Condado'),(@fr,'Bretaña'),
(@fr,'Centro-Valle de Loira'),(@fr,'Córcega'),(@fr,'Gran Este'),(@fr,'Alta Francia'),
(@fr,'Isla de Francia'),(@fr,'Normandía'),(@fr,'Nueva Aquitania'),(@fr,'Occitania'),
(@fr,'Países del Loira'),(@fr,'Provenza-Alpes-Costa Azul'),(@fr,'Guadalupe'),(@fr,'Martinica'),
(@fr,'Guayana Francesa'),(@fr,'Reunión'),(@fr,'Mayotte');

SET @gr = (SELECT id FROM paises WHERE nombre='Grecia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gr,'Ática'),(@gr,'Grecia Central'),(@gr,'Grecia Occidental'),(@gr,'Creta'),
(@gr,'Macedonia Central'),(@gr,'Macedonia Oriental y Tracia'),(@gr,'Macedonia Occidental'),
(@gr,'Egeo Meridional'),(@gr,'Egeo Septentrional'),(@gr,'Peloponeso'),(@gr,'Epiro'),
(@gr,'Tesalia'),(@gr,'Islas Jónicas');

SET @hu = (SELECT id FROM paises WHERE nombre='Hungría');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@hu,'Budapest'),(@hu,'Bács-Kiskun'),(@hu,'Baranya'),(@hu,'Békés'),(@hu,'Borsod-Abaúj-Zemplén'),
(@hu,'Csongrád-Csanád'),(@hu,'Fejér'),(@hu,'Győr-Moson-Sopron'),(@hu,'Hajdú-Bihar'),(@hu,'Heves'),
(@hu,'Jász-Nagykun-Szolnok'),(@hu,'Komárom-Esztergom'),(@hu,'Nógrád'),(@hu,'Pest'),(@hu,'Somogy'),
(@hu,'Szabolcs-Szatmár-Bereg'),(@hu,'Tolna'),(@hu,'Vas'),(@hu,'Veszprém'),(@hu,'Zala');

SET @ie = (SELECT id FROM paises WHERE nombre='Irlanda');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ie,'Carlow'),(@ie,'Cavan'),(@ie,'Clare'),(@ie,'Cork'),(@ie,'Donegal'),(@ie,'Dublín'),
(@ie,'Galway'),(@ie,'Kerry'),(@ie,'Kildare'),(@ie,'Kilkenny'),(@ie,'Laois'),(@ie,'Leitrim'),
(@ie,'Limerick'),(@ie,'Longford'),(@ie,'Louth'),(@ie,'Mayo'),(@ie,'Meath'),(@ie,'Monaghan'),
(@ie,'Offaly'),(@ie,'Roscommon'),(@ie,'Sligo'),(@ie,'Tipperary'),(@ie,'Waterford'),
(@ie,'Westmeath'),(@ie,'Wexford'),(@ie,'Wicklow');

SET @is = (SELECT id FROM paises WHERE nombre='Islandia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@is,'Capital (Höfuðborgarsvæði)'),(@is,'Suðurnes'),(@is,'Vesturland'),(@is,'Vestfirðir'),
(@is,'Norðurland Vestra'),(@is,'Norðurland Eystra'),(@is,'Austurland'),(@is,'Suðurland');

SET @it = (SELECT id FROM paises WHERE nombre='Italia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@it,'Abruzzo'),(@it,'Basilicata'),(@it,'Calabria'),(@it,'Campania'),(@it,'Emilia-Romaña'),
(@it,'Friuli-Venecia Julia'),(@it,'Lacio'),(@it,'Liguria'),(@it,'Lombardía'),(@it,'Las Marcas'),
(@it,'Molise'),(@it,'Piamonte'),(@it,'Apulia'),(@it,'Cerdeña'),(@it,'Sicilia'),(@it,'Toscana'),
(@it,'Trentino-Alto Adigio'),(@it,'Umbría'),(@it,'Valle de Aosta'),(@it,'Véneto');

SET @lv = (SELECT id FROM paises WHERE nombre='Letonia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lv,'Riga'),(@lv,'Vidzeme'),(@lv,'Kurzeme'),(@lv,'Zemgale'),(@lv,'Latgale');

SET @li = (SELECT id FROM paises WHERE nombre='Liechtenstein');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@li,'Balzers'),(@li,'Eschen'),(@li,'Gamprin'),(@li,'Mauren'),(@li,'Planken'),(@li,'Ruggell'),
(@li,'Schaan'),(@li,'Schellenberg'),(@li,'Triesen'),(@li,'Triesenberg'),(@li,'Vaduz');

SET @lt = (SELECT id FROM paises WHERE nombre='Lituania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lt,'Alytus'),(@lt,'Kaunas'),(@lt,'Klaipėda'),(@lt,'Marijampolė'),(@lt,'Panevėžys'),
(@lt,'Šiauliai'),(@lt,'Tauragė'),(@lt,'Telšiai'),(@lt,'Utena'),(@lt,'Vilna');

SET @lu = (SELECT id FROM paises WHERE nombre='Luxemburgo');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lu,'Luxemburgo'),(@lu,'Diekirch'),(@lu,'Grevenmacher');

SET @mk = (SELECT id FROM paises WHERE nombre='Macedonia del Norte');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mk,'Región Oriental'),(@mk,'Región Nororiental'),(@mk,'Región de Pelagonia'),
(@mk,'Región del Vardar'),(@mk,'Región Suroccidental'),(@mk,'Región Sudoriental'),
(@mk,'Región de Polog'),(@mk,'Región de Skopie');

SET @md = (SELECT id FROM paises WHERE nombre='Moldavia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@md,'Chișinău'),(@md,'Bălți'),(@md,'Găgăuzia'),(@md,'Anenii Noi'),(@md,'Basarabeasca'),
(@md,'Briceni'),(@md,'Cahul'),(@md,'Cantemir'),(@md,'Călărași'),(@md,'Căușeni'),
(@md,'Cimișlia'),(@md,'Criuleni'),(@md,'Dondușeni'),(@md,'Drochia'),(@md,'Dubăsari'),
(@md,'Edineț'),(@md,'Fălești'),(@md,'Florești'),(@md,'Glodeni'),(@md,'Hîncești'),
(@md,'Ialoveni'),(@md,'Leova'),(@md,'Nisporeni'),(@md,'Ocnița'),(@md,'Orhei'),
(@md,'Rezina'),(@md,'Rîșcani'),(@md,'Sîngerei'),(@md,'Soroca'),(@md,'Strășeni'),
(@md,'Șoldănești'),(@md,'Ștefan Vodă'),(@md,'Taraclia'),(@md,'Telenești'),(@md,'Ungheni');

SET @mt = (SELECT id FROM paises WHERE nombre='Malta');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mt,'Gozo'),(@mt,'Región Oriental'),(@mt,'Región Norte'),(@mt,'Región del Puerto'),
(@mt,'Región Sur'),(@mt,'Región Oeste');

SET @me = (SELECT id FROM paises WHERE nombre='Montenegro');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@me,'Región Norte'),(@me,'Región Central'),(@me,'Región del Litoral');

SET @no = (SELECT id FROM paises WHERE nombre='Noruega');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@no,'Agder'),(@no,'Akershus'),(@no,'Buskerud'),(@no,'Finnmark'),(@no,'Innlandet'),
(@no,'Møre og Romsdal'),(@no,'Nordland'),(@no,'Oslo'),(@no,'Østfold'),(@no,'Rogaland'),
(@no,'Telemark'),(@no,'Troms'),(@no,'Trøndelag'),(@no,'Vestfold'),(@no,'Vestland');

SET @nl = (SELECT id FROM paises WHERE nombre='Países Bajos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@nl,'Drenthe'),(@nl,'Flevoland'),(@nl,'Frisia'),(@nl,'Gelderland'),(@nl,'Groninga'),
(@nl,'Limburgo'),(@nl,'Brabante Septentrional'),(@nl,'Holanda Septentrional'),(@nl,'Overijssel'),
(@nl,'Holanda Meridional'),(@nl,'Utrecht'),(@nl,'Zelanda');

SET @pl = (SELECT id FROM paises WHERE nombre='Polonia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pl,'Baja Silesia'),(@pl,'Cuyavia-Pomerania'),(@pl,'Lublin'),(@pl,'Lubusz'),(@pl,'Łódź'),
(@pl,'Pequeña Polonia'),(@pl,'Mazovia'),(@pl,'Opole'),(@pl,'Subcarpacia'),(@pl,'Podlaquia'),
(@pl,'Pomerania'),(@pl,'Silesia'),(@pl,'Santa Cruz'),(@pl,'Varmia-Masuria'),(@pl,'Gran Polonia'),
(@pl,'Pomerania Occidental');

SET @pt = (SELECT id FROM paises WHERE nombre='Portugal');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pt,'Aveiro'),(@pt,'Beja'),(@pt,'Braga'),(@pt,'Bragança'),(@pt,'Castelo Branco'),(@pt,'Coímbra'),
(@pt,'Évora'),(@pt,'Faro'),(@pt,'Guarda'),(@pt,'Leiria'),(@pt,'Lisboa'),(@pt,'Portalegre'),
(@pt,'Porto'),(@pt,'Santarém'),(@pt,'Setúbal'),(@pt,'Viana do Castelo'),(@pt,'Vila Real'),
(@pt,'Viseu'),(@pt,'Azores'),(@pt,'Madeira');

SET @gb = (SELECT id FROM paises WHERE nombre='Reino Unido');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gb,'Inglaterra'),(@gb,'Escocia'),(@gb,'Gales'),(@gb,'Irlanda del Norte');

SET @cz = (SELECT id FROM paises WHERE nombre='República Checa');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cz,'Praga'),(@cz,'Bohemia Central'),(@cz,'Bohemia del Sur'),(@cz,'Pilsen'),(@cz,'Karlovy Vary'),
(@cz,'Ústí nad Labem'),(@cz,'Liberec'),(@cz,'Hradec Králové'),(@cz,'Pardubice'),(@cz,'Vysočina'),
(@cz,'Moravia del Sur'),(@cz,'Olomouc'),(@cz,'Zlín'),(@cz,'Moravia-Silesia');

SET @ro = (SELECT id FROM paises WHERE nombre='Rumania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ro,'Bucarest'),(@ro,'Alba'),(@ro,'Arad'),(@ro,'Argeș'),(@ro,'Bacău'),(@ro,'Bihor'),
(@ro,'Bistrița-Năsăud'),(@ro,'Botoșani'),(@ro,'Brăila'),(@ro,'Brașov'),(@ro,'Buzău'),
(@ro,'Călărași'),(@ro,'Caraș-Severin'),(@ro,'Cluj'),(@ro,'Constanța'),(@ro,'Covasna'),
(@ro,'Dâmbovița'),(@ro,'Dolj'),(@ro,'Galați'),(@ro,'Giurgiu'),(@ro,'Gorj'),(@ro,'Harghita'),
(@ro,'Hunedoara'),(@ro,'Ialomița'),(@ro,'Iași'),(@ro,'Ilfov'),(@ro,'Maramureș'),
(@ro,'Mehedinți'),(@ro,'Mureș'),(@ro,'Neamț'),(@ro,'Olt'),(@ro,'Prahova'),(@ro,'Satu Mare'),
(@ro,'Sălaj'),(@ro,'Sibiu'),(@ro,'Suceava'),(@ro,'Teleorman'),(@ro,'Timiș'),(@ro,'Tulcea'),
(@ro,'Vaslui'),(@ro,'Vâlcea'),(@ro,'Vrancea');

SET @ru = (SELECT id FROM paises WHERE nombre='Rusia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ru,'Distrito Federal Central'),(@ru,'Distrito Federal del Noroeste'),
(@ru,'Distrito Federal Sur'),(@ru,'Distrito Federal del Cáucaso Norte'),
(@ru,'Distrito Federal del Volga'),(@ru,'Distrito Federal de los Urales'),
(@ru,'Distrito Federal de Siberia'),(@ru,'Distrito Federal del Lejano Oriente');

SET @sm = (SELECT id FROM paises WHERE nombre='San Marino');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sm,'Acquaviva'),(@sm,'Borgo Maggiore'),(@sm,'Chiesanuova'),(@sm,'Domagnano'),(@sm,'Faetano'),
(@sm,'Fiorentino'),(@sm,'Montegiardino'),(@sm,'San Marino Città'),(@sm,'Serravalle');

SET @rs = (SELECT id FROM paises WHERE nombre='Serbia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@rs,'Belgrado'),(@rs,'Vojvodina'),(@rs,'Šumadija y Serbia Occidental'),
(@rs,'Serbia Meridional y Oriental');

SET @se = (SELECT id FROM paises WHERE nombre='Suecia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@se,'Blekinge'),(@se,'Dalarna'),(@se,'Gävleborg'),(@se,'Gotland'),(@se,'Halland'),
(@se,'Jämtland'),(@se,'Jönköping'),(@se,'Kalmar'),(@se,'Kronoberg'),(@se,'Norrbotten'),
(@se,'Örebro'),(@se,'Östergötland'),(@se,'Escania (Skåne)'),(@se,'Södermanland'),
(@se,'Estocolmo'),(@se,'Uppsala'),(@se,'Värmland'),(@se,'Västerbotten'),(@se,'Västernorrland'),
(@se,'Västmanland'),(@se,'Västra Götaland');

SET @ch = (SELECT id FROM paises WHERE nombre='Suiza');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ch,'Argovia'),(@ch,'Appenzell Ausserrhoden'),(@ch,'Appenzell Innerrhoden'),
(@ch,'Basilea-Campo'),(@ch,'Basilea-Ciudad'),(@ch,'Berna'),(@ch,'Friburgo'),(@ch,'Ginebra'),
(@ch,'Glaris'),(@ch,'Grisones'),(@ch,'Jura'),(@ch,'Lucerna'),(@ch,'Neuchâtel'),(@ch,'Nidwalden'),
(@ch,'Obwalden'),(@ch,'San Galo'),(@ch,'Esquafusa'),(@ch,'Schwyz'),(@ch,'Soleura'),
(@ch,'Turgovia'),(@ch,'Tesino'),(@ch,'Uri'),(@ch,'Valais'),(@ch,'Vaud'),(@ch,'Zug'),(@ch,'Zúrich');

SET @ua = (SELECT id FROM paises WHERE nombre='Ucrania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ua,'Kiev (ciudad)'),(@ua,'República Autónoma de Crimea'),(@ua,'Sebastopol'),
(@ua,'Cherkasy'),(@ua,'Chernihiv'),(@ua,'Chernivtsi'),(@ua,'Dnipropetrovsk'),(@ua,'Donetsk'),
(@ua,'Ivano-Frankivsk'),(@ua,'Járkov'),(@ua,'Jersón'),(@ua,'Jmelnytsky'),(@ua,'Kiev (óblast)'),
(@ua,'Kirovohrad'),(@ua,'Luhansk'),(@ua,'Lviv'),(@ua,'Mykolaiv'),(@ua,'Odesa'),(@ua,'Poltava'),
(@ua,'Rivne'),(@ua,'Sumy'),(@ua,'Ternópil'),(@ua,'Vinnytsia'),(@ua,'Volyn'),
(@ua,'Zaporiyia'),(@ua,'Zhytomyr'),(@ua,'Zakarpatia');

-- ===== ASIA (incluye Cáucaso, Oriente Medio y Asia Central) =====

SET @af = (SELECT id FROM paises WHERE nombre='Afganistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@af,'Badajshán'),(@af,'Badghis'),(@af,'Baghlan'),(@af,'Balj'),(@af,'Bamiyán'),(@af,'Daykundi'),
(@af,'Farah'),(@af,'Faryab'),(@af,'Ghazni'),(@af,'Ghor'),(@af,'Helmand'),(@af,'Herat'),
(@af,'Jost'),(@af,'Jowzjan'),(@af,'Kabul'),(@af,'Kandahar'),(@af,'Kapisa'),(@af,'Kunar'),
(@af,'Kunduz'),(@af,'Laghman'),(@af,'Logar'),(@af,'Nangarhar'),(@af,'Nimruz'),(@af,'Nurestán'),
(@af,'Paktia'),(@af,'Paktika'),(@af,'Panjshir'),(@af,'Parwan'),(@af,'Samangan'),(@af,'Sar-e Pol'),
(@af,'Tajar'),(@af,'Urozgán'),(@af,'Wardak'),(@af,'Zabul');

SET @sa = (SELECT id FROM paises WHERE nombre='Arabia Saudita');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sa,'Riad'),(@sa,'La Meca'),(@sa,'Medina'),(@sa,'Al-Qasim'),(@sa,'Provincia Oriental'),
(@sa,'Asir'),(@sa,'Tabuk'),(@sa,'Hail'),(@sa,'Fronteras del Norte'),(@sa,'Jizán'),(@sa,'Najrán'),
(@sa,'Al-Baha'),(@sa,'Al-Jawf');

SET @am = (SELECT id FROM paises WHERE nombre='Armenia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@am,'Ereván'),(@am,'Aragatsotn'),(@am,'Ararat'),(@am,'Armavir'),(@am,'Gegharkunik'),
(@am,'Kotayk'),(@am,'Lori'),(@am,'Shirak'),(@am,'Syunik'),(@am,'Tavush'),(@am,'Vayots Dzor');

-- Azerbaiyán: lista de BAJA CONFIANZA (fuentes inconsistentes sobre las 14 regiones
-- económicas de la reforma de 2021); revisar antes de publicar.
SET @az = (SELECT id FROM paises WHERE nombre='Azerbaiyán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@az,'Bakú'),(@az,'Absheron-Jizí'),(@az,'Ganja-Dashkasán'),(@az,'Shaki-Zaqatala'),
(@az,'Lankaran-Astara'),(@az,'Guba-Jachmaz'),(@az,'Aran'),(@az,'Alto Karabaj'),(@az,'Karabaj'),
(@az,'Zangezur Oriental'),(@az,'Shirvan Montañoso'),(@az,'Najicheván'),(@az,'Aghstafa-Shamkir'),
(@az,'Kalbajar-Lachín');

SET @bd = (SELECT id FROM paises WHERE nombre='Bangladés');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bd,'Barisal'),(@bd,'Chattogram'),(@bd,'Dhaka'),(@bd,'Khulna'),(@bd,'Mymensingh'),
(@bd,'Rajshahi'),(@bd,'Rangpur'),(@bd,'Sylhet');

SET @bh = (SELECT id FROM paises WHERE nombre='Baréin');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bh,'Capital'),(@bh,'Muharraq'),(@bh,'Sur'),(@bh,'Norte');

SET @mm = (SELECT id FROM paises WHERE nombre='Birmania (Myanmar)');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mm,'Ayeyarwady'),(@mm,'Bago'),(@mm,'Magway'),(@mm,'Mandalay'),(@mm,'Sagaing'),
(@mm,'Tanintharyi'),(@mm,'Yangón'),(@mm,'Kachin'),(@mm,'Kayah'),(@mm,'Kayin'),(@mm,'Chin'),
(@mm,'Mon'),(@mm,'Rajine'),(@mm,'Shan'),(@mm,'Naipyidó (territorio de la unión)');

SET @bn = (SELECT id FROM paises WHERE nombre='Brunéi');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bn,'Brunéi-Muara'),(@bn,'Belait'),(@bn,'Tutong'),(@bn,'Temburong');

SET @bt = (SELECT id FROM paises WHERE nombre='Bután');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bt,'Bumthang'),(@bt,'Chukha'),(@bt,'Dagana'),(@bt,'Gasa'),(@bt,'Haa'),(@bt,'Lhuntse'),
(@bt,'Mongar'),(@bt,'Paro'),(@bt,'Pemagatshel'),(@bt,'Punakha'),(@bt,'Samdrup Jongkhar'),
(@bt,'Samtse'),(@bt,'Sarpang'),(@bt,'Timbu'),(@bt,'Trashigang'),(@bt,'Trashiyangtse'),
(@bt,'Trongsa'),(@bt,'Tsirang'),(@bt,'Wangdue Phodrang'),(@bt,'Zhemgang');

SET @kh = (SELECT id FROM paises WHERE nombre='Camboya');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kh,'Banteay Meanchey'),(@kh,'Battambang'),(@kh,'Kampong Cham'),(@kh,'Kampong Chhnang'),
(@kh,'Kampong Speu'),(@kh,'Kampong Thom'),(@kh,'Kampot'),(@kh,'Kandal'),(@kh,'Kep'),
(@kh,'Koh Kong'),(@kh,'Kratié'),(@kh,'Mondulkiri'),(@kh,'Oddar Meanchey'),(@kh,'Pailin'),
(@kh,'Preah Vihear'),(@kh,'Prey Veng'),(@kh,'Pursat'),(@kh,'Ratanakiri'),(@kh,'Siem Reap'),
(@kh,'Sihanoukville'),(@kh,'Stung Treng'),(@kh,'Svay Rieng'),(@kh,'Takeo'),(@kh,'Tboung Khmum'),
(@kh,'Nom Pen');

SET @qa = (SELECT id FROM paises WHERE nombre='Catar');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@qa,'Doha'),(@qa,'Al Rayán'),(@qa,'Al Wakrah'),(@qa,'Al Joor'),(@qa,'Al Shamal'),
(@qa,'Umm Salal'),(@qa,'Al Daayen'),(@qa,'Al Shahaniya');

SET @cn = (SELECT id FROM paises WHERE nombre='China');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cn,'Anhui'),(@cn,'Fujian'),(@cn,'Gansu'),(@cn,'Cantón (Guangdong)'),(@cn,'Guizhou'),
(@cn,'Hainan'),(@cn,'Hebei'),(@cn,'Heilongjiang'),(@cn,'Henan'),(@cn,'Hubei'),(@cn,'Hunan'),
(@cn,'Jiangsu'),(@cn,'Jiangxi'),(@cn,'Jilin'),(@cn,'Liaoning'),(@cn,'Qinghai'),(@cn,'Shaanxi'),
(@cn,'Shandong'),(@cn,'Shanxi'),(@cn,'Sichuán'),(@cn,'Yunnan'),(@cn,'Zhejiang'),
(@cn,'Guangxi (región autónoma)'),(@cn,'Mongolia Interior'),(@cn,'Ningxia (región autónoma)'),
(@cn,'Xinjiang'),(@cn,'Tíbet'),(@cn,'Pekín'),(@cn,'Tianjín'),(@cn,'Shanghái'),(@cn,'Chongqing'),
(@cn,'Hong Kong'),(@cn,'Macao');

SET @kp = (SELECT id FROM paises WHERE nombre='Corea del Norte');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kp,'Pionyang'),(@kp,'Chagang'),(@kp,'Hamgyong del Norte'),(@kp,'Hamgyong del Sur'),
(@kp,'Hwanghae del Norte'),(@kp,'Hwanghae del Sur'),(@kp,'Kangwon'),(@kp,'Pyongan del Norte'),
(@kp,'Pyongan del Sur'),(@kp,'Yanggang');

SET @kr = (SELECT id FROM paises WHERE nombre='Corea del Sur');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kr,'Seúl'),(@kr,'Busan'),(@kr,'Daegu'),(@kr,'Incheon'),(@kr,'Gwangju'),(@kr,'Daejeon'),
(@kr,'Ulsan'),(@kr,'Sejong'),(@kr,'Gyeonggi'),(@kr,'Gangwon'),(@kr,'Chungcheong del Norte'),
(@kr,'Chungcheong del Sur'),(@kr,'Jeolla del Norte'),(@kr,'Jeolla del Sur'),
(@kr,'Gyeongsang del Norte'),(@kr,'Gyeongsang del Sur'),(@kr,'Jeju');

SET @ae = (SELECT id FROM paises WHERE nombre='Emiratos Árabes Unidos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ae,'Abu Dabi'),(@ae,'Dubái'),(@ae,'Sharjah'),(@ae,'Ajman'),(@ae,'Umm al-Qaiwain'),
(@ae,'Ras al-Jaima'),(@ae,'Fujairah');

SET @ph = (SELECT id FROM paises WHERE nombre='Filipinas');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ph,'Región de la Cordillera Administrativa'),(@ph,'Región de la Capital Nacional'),
(@ph,'Región I - Ilocos'),(@ph,'Región II - Valle del Cagayán'),(@ph,'Región III - Luzón Central'),
(@ph,'Región IV-A - Calabarzón'),(@ph,'Región IV-B - Mimaropa'),(@ph,'Región V - Bicol'),
(@ph,'Región VI - Visayas Occidental'),(@ph,'Región VII - Visayas Central'),
(@ph,'Región VIII - Visayas Oriental'),(@ph,'Región IX - Península de Zamboanga'),
(@ph,'Región X - Mindanao del Norte'),(@ph,'Región XI - Dávao'),
(@ph,'Región XII - Soccsksargen'),(@ph,'Región XIII - Caraga'),(@ph,'Región de Negros'),
(@ph,'Región Autónoma del Bangsamoro');

SET @ge = (SELECT id FROM paises WHERE nombre='Georgia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ge,'Tiflis'),(@ge,'Guria'),(@ge,'Imericia'),(@ge,'Cajetia'),(@ge,'Kvemo Kartli'),
(@ge,'Mtsjeta-Mtianeti'),(@ge,'Racha-Lechjumi y Kvemo Esvanetia'),
(@ge,'Samegrelo-Zemo Esvanetia'),(@ge,'Samtsje-Yavajeti'),(@ge,'Shida Kartli'),
(@ge,'Abjasia'),(@ge,'Ayaria');

SET @in = (SELECT id FROM paises WHERE nombre='India');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@in,'Andhra Pradesh'),(@in,'Arunachal Pradesh'),(@in,'Assam'),(@in,'Bihar'),
(@in,'Chhattisgarh'),(@in,'Goa'),(@in,'Guyarat'),(@in,'Haryana'),(@in,'Himachal Pradesh'),
(@in,'Jharkhand'),(@in,'Karnataka'),(@in,'Kerala'),(@in,'Madhya Pradesh'),(@in,'Maharashtra'),
(@in,'Manipur'),(@in,'Meghalaya'),(@in,'Mizoram'),(@in,'Nagaland'),(@in,'Odisha'),(@in,'Punjab'),
(@in,'Rayastán'),(@in,'Sikkim'),(@in,'Tamil Nadu'),(@in,'Telangana'),(@in,'Tripura'),
(@in,'Uttar Pradesh'),(@in,'Uttarakhand'),(@in,'Bengala Occidental'),
(@in,'Islas Andamán y Nicobar'),(@in,'Chandigarh'),
(@in,'Dadra y Nagar Haveli y Damán y Diu'),(@in,'Delhi'),(@in,'Jammu y Cachemira'),
(@in,'Ladakh'),(@in,'Lakshadweep'),(@in,'Puducherry');

SET @id = (SELECT id FROM paises WHERE nombre='Indonesia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@id,'Aceh'),(@id,'Bali'),(@id,'Bantén'),(@id,'Bengkulu'),(@id,'Yogyakarta'),(@id,'Yakarta'),
(@id,'Gorontalo'),(@id,'Jambi'),(@id,'Java Occidental'),(@id,'Java Central'),(@id,'Java Oriental'),
(@id,'Kalimantan Central'),(@id,'Kalimantan Oriental'),(@id,'Kalimantan Meridional'),
(@id,'Kalimantan Septentrional'),(@id,'Kalimantan Occidental'),(@id,'Islas Bangka Belitung'),
(@id,'Islas Riau'),(@id,'Lampung'),(@id,'Molucas'),(@id,'Molucas del Norte'),
(@id,'Nusa Tenggara Occidental'),(@id,'Nusa Tenggara Oriental'),(@id,'Papúa'),
(@id,'Papúa Central'),(@id,'Papúa Montañas'),(@id,'Papúa Occidental'),(@id,'Papúa Sudoccidental'),
(@id,'Papúa Meridional'),(@id,'Riau'),(@id,'Célebes Occidental'),(@id,'Célebes Meridional'),
(@id,'Célebes Central'),(@id,'Célebes Sudoriental'),(@id,'Célebes Septentrional'),
(@id,'Sumatra Occidental'),(@id,'Sumatra Meridional'),(@id,'Sumatra Septentrional');

SET @iq = (SELECT id FROM paises WHERE nombre='Irak');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@iq,'Bagdad'),(@iq,'Basora'),(@iq,'Maysan'),(@iq,'Dhi Qar'),(@iq,'Muzanná'),(@iq,'Qadisiyah'),
(@iq,'Babil'),(@iq,'Kerbala'),(@iq,'Nayaf'),(@iq,'Wasit'),(@iq,'Diyala'),(@iq,'Saladino'),
(@iq,'Kirkuk'),(@iq,'Nínive'),(@iq,'Dahuk'),(@iq,'Erbil'),(@iq,'Suleimaniya'),(@iq,'Al Ánbar');

SET @ir = (SELECT id FROM paises WHERE nombre='Irán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ir,'Alborz'),(@ir,'Ardebil'),(@ir,'Azerbaiyán Oriental'),(@ir,'Azerbaiyán Occidental'),
(@ir,'Bushehr'),(@ir,'Chahar Mahal y Bajtiari'),(@ir,'Fars'),(@ir,'Guilán'),(@ir,'Golestán'),
(@ir,'Hamadán'),(@ir,'Ormuz'),(@ir,'Ilam'),(@ir,'Isfahán'),(@ir,'Kermán'),(@ir,'Kermansha'),
(@ir,'Jorasán del Norte'),(@ir,'Jorasán Razaví'),(@ir,'Jorasán del Sur'),(@ir,'Juzestán'),
(@ir,'Kohguiluye y Buyer Ahmad'),(@ir,'Kurdistán'),(@ir,'Lorestán'),(@ir,'Markazi'),
(@ir,'Mazandarán'),(@ir,'Qazvín'),(@ir,'Qom'),(@ir,'Semnán'),(@ir,'Sistán y Baluchistán'),
(@ir,'Teherán'),(@ir,'Yazd'),(@ir,'Zanyán');

SET @il = (SELECT id FROM paises WHERE nombre='Israel');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@il,'Jerusalén'),(@il,'Norte'),(@il,'Haifa'),(@il,'Centro'),(@il,'Tel Aviv'),(@il,'Sur');

SET @jp = (SELECT id FROM paises WHERE nombre='Japón');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@jp,'Hokkaido'),(@jp,'Aomori'),(@jp,'Iwate'),(@jp,'Miyagi'),(@jp,'Akita'),(@jp,'Yamagata'),
(@jp,'Fukushima'),(@jp,'Ibaraki'),(@jp,'Tochigi'),(@jp,'Gunma'),(@jp,'Saitama'),(@jp,'Chiba'),
(@jp,'Tokio'),(@jp,'Kanagawa'),(@jp,'Niigata'),(@jp,'Toyama'),(@jp,'Ishikawa'),(@jp,'Fukui'),
(@jp,'Yamanashi'),(@jp,'Nagano'),(@jp,'Gifu'),(@jp,'Shizuoka'),(@jp,'Aichi'),(@jp,'Mie'),
(@jp,'Shiga'),(@jp,'Kioto'),(@jp,'Osaka'),(@jp,'Hyogo'),(@jp,'Nara'),(@jp,'Wakayama'),
(@jp,'Tottori'),(@jp,'Shimane'),(@jp,'Okayama'),(@jp,'Hiroshima'),(@jp,'Yamaguchi'),
(@jp,'Tokushima'),(@jp,'Kagawa'),(@jp,'Ehime'),(@jp,'Kochi'),(@jp,'Fukuoka'),(@jp,'Saga'),
(@jp,'Nagasaki'),(@jp,'Kumamoto'),(@jp,'Oita'),(@jp,'Miyazaki'),(@jp,'Kagoshima'),(@jp,'Okinawa');

SET @jo = (SELECT id FROM paises WHERE nombre='Jordania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@jo,'Amán'),(@jo,'Irbid'),(@jo,'Zarqa'),(@jo,'Balqa'),(@jo,'Madaba'),(@jo,'Kerak'),
(@jo,'Tafilah'),(@jo,"Ma'an"),(@jo,'Aqaba'),(@jo,'Mafraq'),(@jo,'Jerash'),(@jo,'Ajloun');

SET @kz = (SELECT id FROM paises WHERE nombre='Kazajistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kz,'Astaná'),(@kz,'Almaty (ciudad)'),(@kz,'Shymkent'),(@kz,'Abai'),(@kz,'Akmola'),
(@kz,'Aktobé'),(@kz,'Almaty (región)'),(@kz,'Atirau'),(@kz,'Kazajistán Occidental'),
(@kz,'Yambil'),(@kz,'Jetisu'),(@kz,'Kostanái'),(@kz,'Karagandá'),(@kz,'Kyzylorda'),
(@kz,'Mangystau'),(@kz,'Pavlodar'),(@kz,'Kazajistán del Norte'),(@kz,'Turquestán'),
(@kz,'Ulytau'),(@kz,'Kazajistán Oriental');

SET @kg = (SELECT id FROM paises WHERE nombre='Kirguistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kg,'Bishkek'),(@kg,'Osh (ciudad)'),(@kg,'Batken'),(@kg,'Chuy'),(@kg,'Jalal-Abad'),
(@kg,'Naryn'),(@kg,'Osh (región)'),(@kg,'Talas'),(@kg,'Issyk-Kul');

SET @kw = (SELECT id FROM paises WHERE nombre='Kuwait');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kw,'Capital'),(@kw,'Hawalli'),(@kw,'Ahmadi'),(@kw,'Farwaniya'),(@kw,'Jahra'),
(@kw,'Mubarak Al-Kabeer');

SET @la = (SELECT id FROM paises WHERE nombre='Laos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@la,'Vientián (prefectura)'),(@la,'Attapeu'),(@la,'Bokeo'),(@la,'Bolikhamxai'),
(@la,'Champasak'),(@la,'Huaphan'),(@la,'Khammuan'),(@la,'Luang Namtha'),(@la,'Luang Prabang'),
(@la,'Oudomxay'),(@la,'Phongsali'),(@la,'Saravane'),(@la,'Savannakhet'),(@la,'Sekong'),
(@la,'Vientián (provincia)'),(@la,'Xaisomboun'),(@la,'Xiangkhouang'),(@la,'Sayabury');

SET @lb = (SELECT id FROM paises WHERE nombre='Líbano');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lb,'Beirut'),(@lb,'Monte Líbano'),(@lb,'Líbano Norte'),(@lb,'Líbano Sur'),(@lb,'Becá'),
(@lb,'Nabatiye'),(@lb,'Akkar'),(@lb,'Baalbek-Hermel');

SET @my = (SELECT id FROM paises WHERE nombre='Malasia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@my,'Johor'),(@my,'Kedah'),(@my,'Kelantan'),(@my,'Malaca'),(@my,'Negeri Sembilan'),
(@my,'Pahang'),(@my,'Penang'),(@my,'Perak'),(@my,'Perlis'),(@my,'Sabah'),(@my,'Sarawak'),
(@my,'Selangor'),(@my,'Terengganu'),(@my,'Kuala Lumpur'),(@my,'Labuán'),(@my,'Putrajaya');

SET @mv = (SELECT id FROM paises WHERE nombre='Maldivas');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mv,'Malé'),(@mv,'Haa Alifu'),(@mv,'Haa Dhaalu'),(@mv,'Shaviyani'),(@mv,'Noonu'),(@mv,'Raa'),
(@mv,'Baa'),(@mv,'Lhaviyani'),(@mv,'Kaafu'),(@mv,'Alifu Alifu'),(@mv,'Alifu Dhaalu'),
(@mv,'Vaavu'),(@mv,'Meemu'),(@mv,'Faafu'),(@mv,'Dhaalu'),(@mv,'Thaa'),(@mv,'Laamu'),
(@mv,'Gaafu Alifu'),(@mv,'Gaafu Dhaalu'),(@mv,'Gnaviyani'),(@mv,'Seenu');

SET @mn = (SELECT id FROM paises WHERE nombre='Mongolia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mn,'Ulán Bator'),(@mn,'Arjangai'),(@mn,'Bayan-Ölgii'),(@mn,'Bayanjongor'),(@mn,'Bulgan'),
(@mn,'Darjan-Uul'),(@mn,'Dornod'),(@mn,'Dornogovi'),(@mn,'Dundgovi'),(@mn,'Govi-Altai'),
(@mn,'Govisümber'),(@mn,'Jentii'),(@mn,'Jovd'),(@mn,'Jövsgöl'),(@mn,'Ömnögovi'),(@mn,'Orjon'),
(@mn,'Övörjangai'),(@mn,'Selenge'),(@mn,'Sujbaatar'),(@mn,'Töv'),(@mn,'Uvs'),(@mn,'Zavjan');

SET @np = (SELECT id FROM paises WHERE nombre='Nepal');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@np,'Koshi'),(@np,'Madhesh'),(@np,'Bagmati'),(@np,'Gandaki'),(@np,'Lumbini'),(@np,'Karnali'),
(@np,'Sudurpashchim');

SET @om = (SELECT id FROM paises WHERE nombre='Omán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@om,'Mascate'),(@om,'Dhofar'),(@om,'Musandam'),(@om,'Al Buraimi'),(@om,'Ad Dajiliyah'),
(@om,'Al Batinah Norte'),(@om,'Al Batinah Sur'),(@om,'Ash Sharqiyah Norte'),
(@om,'Ash Sharqiyah Sur'),(@om,'Ad Dahira'),(@om,'Al Wusta');

SET @pk = (SELECT id FROM paises WHERE nombre='Pakistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pk,'Panyab'),(@pk,'Sind'),(@pk,'Jyber Pastunjuá'),(@pk,'Baluchistán'),
(@pk,'Territorio de la Capital Islamabad'),(@pk,'Gilgit-Baltistán'),(@pk,'Cachemira Libre');

SET @sy = (SELECT id FROM paises WHERE nombre='Siria');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sy,'Damasco'),(@sy,'Rif Dimashq'),(@sy,'Alepo'),(@sy,'Homs'),(@sy,'Hama'),(@sy,'Latakia'),
(@sy,'Idlib'),(@sy,'Al-Hasaka'),(@sy,'Deir ez-Zor'),(@sy,'Raqqa'),(@sy,'Daraa'),
(@sy,'As-Suwayda'),(@sy,'Quneitra'),(@sy,'Tartus');

SET @lk = (SELECT id FROM paises WHERE nombre='Sri Lanka');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lk,'Central'),(@lk,'Este'),(@lk,'Norte'),(@lk,'Noroccidental'),(@lk,'Norte Central'),
(@lk,'Uva'),(@lk,'Sabaragamuwa'),(@lk,'Sur'),(@lk,'Occidental');

SET @th = (SELECT id FROM paises WHERE nombre='Tailandia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@th,'Amnat Charoen'),(@th,'Ang Thong'),(@th,'Bangkok'),(@th,'Bueng Kan'),(@th,'Buri Ram'),
(@th,'Chachoengsao'),(@th,'Chai Nat'),(@th,'Chaiyaphum'),(@th,'Chanthaburi'),(@th,'Chiang Mai'),
(@th,'Chiang Rai'),(@th,'Chonburi'),(@th,'Chumphon'),(@th,'Kalasin'),(@th,'Kamphaeng Phet'),
(@th,'Kanchanaburi'),(@th,'Khon Kaen'),(@th,'Krabi'),(@th,'Lampang'),(@th,'Lamphun'),
(@th,'Loei'),(@th,'Lopburi'),(@th,'Mae Hong Son'),(@th,'Maha Sarakham'),(@th,'Mukdahan'),
(@th,'Nakhon Nayok'),(@th,'Nakhon Pathom'),(@th,'Nakhon Phanom'),(@th,'Nakhon Ratchasima'),
(@th,'Nakhon Sawan'),(@th,'Nakhon Si Thammarat'),(@th,'Nan'),(@th,'Narathiwat'),
(@th,'Nong Bua Lamphu'),(@th,'Nong Khai'),(@th,'Nonthaburi'),(@th,'Pathum Thani'),
(@th,'Pattani'),(@th,'Phang Nga'),(@th,'Phatthalung'),(@th,'Phayao'),(@th,'Phetchabun'),
(@th,'Phetchaburi'),(@th,'Phichit'),(@th,'Phitsanulok'),(@th,'Ayutthaya'),(@th,'Phrae'),
(@th,'Phuket'),(@th,'Prachinburi'),(@th,'Prachuap Khiri Khan'),(@th,'Ranong'),(@th,'Ratchaburi'),
(@th,'Rayong'),(@th,'Roi Et'),(@th,'Sa Kaeo'),(@th,'Sakon Nakhon'),(@th,'Samut Prakan'),
(@th,'Samut Sakhon'),(@th,'Samut Songkhram'),(@th,'Saraburi'),(@th,'Satun'),(@th,'Sing Buri'),
(@th,'Sisaket'),(@th,'Songkhla'),(@th,'Sukhothai'),(@th,'Suphan Buri'),(@th,'Surat Thani'),
(@th,'Surin'),(@th,'Tak'),(@th,'Trang'),(@th,'Trat'),(@th,'Ubon Ratchathani'),
(@th,'Udon Thani'),(@th,'Uthai Thani'),(@th,'Uttaradit'),(@th,'Yala'),(@th,'Yasothon');

SET @tj = (SELECT id FROM paises WHERE nombre='Tayikistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tj,'Dusambé'),(@tj,'Sughd'),(@tj,'Khatlon'),(@tj,'Gorno-Badajshán'),
(@tj,'Distritos de Subordinación Republicana');

SET @tl = (SELECT id FROM paises WHERE nombre='Timor Oriental');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tl,'Aileu'),(@tl,'Ainaro'),(@tl,'Baucau'),(@tl,'Bobonaro'),(@tl,'Cova Lima'),(@tl,'Dili'),
(@tl,'Ermera'),(@tl,'Lautém'),(@tl,'Liquiçá'),(@tl,'Manatuto'),(@tl,'Manufahi'),(@tl,'Oecusse'),
(@tl,'Viqueque');

SET @tm = (SELECT id FROM paises WHERE nombre='Turkmenistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tm,'Asjabad'),(@tm,'Ajal'),(@tm,'Balkán'),(@tm,'Dashoguz'),(@tm,'Lebap'),(@tm,'Mary');

SET @tr = (SELECT id FROM paises WHERE nombre='Turquía');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tr,'Adana'),(@tr,'Adıyaman'),(@tr,'Afyonkarahisar'),(@tr,'Ağrı'),(@tr,'Amasya'),(@tr,'Ankara'),
(@tr,'Antalya'),(@tr,'Artvin'),(@tr,'Aydın'),(@tr,'Balıkesir'),(@tr,'Bilecik'),(@tr,'Bingöl'),
(@tr,'Bitlis'),(@tr,'Bolu'),(@tr,'Burdur'),(@tr,'Bursa'),(@tr,'Çanakkale'),(@tr,'Çankırı'),
(@tr,'Çorum'),(@tr,'Denizli'),(@tr,'Diyarbakır'),(@tr,'Edirne'),(@tr,'Elazığ'),(@tr,'Erzincan'),
(@tr,'Erzurum'),(@tr,'Eskişehir'),(@tr,'Gaziantep'),(@tr,'Giresun'),(@tr,'Gümüşhane'),
(@tr,'Hakkâri'),(@tr,'Hatay'),(@tr,'Isparta'),(@tr,'Mersin'),(@tr,'Estambul'),(@tr,'Esmirna'),
(@tr,'Kars'),(@tr,'Kastamonu'),(@tr,'Kayseri'),(@tr,'Kırklareli'),(@tr,'Kırşehir'),
(@tr,'Kocaeli'),(@tr,'Konya'),(@tr,'Kütahya'),(@tr,'Malatya'),(@tr,'Manisa'),
(@tr,'Kahramanmaraş'),(@tr,'Mardin'),(@tr,'Muğla'),(@tr,'Muş'),(@tr,'Nevşehir'),(@tr,'Niğde'),
(@tr,'Ordu'),(@tr,'Rize'),(@tr,'Sakarya'),(@tr,'Samsun'),(@tr,'Siirt'),(@tr,'Sinop'),
(@tr,'Sivas'),(@tr,'Tekirdağ'),(@tr,'Tokat'),(@tr,'Trabzon'),(@tr,'Tunceli'),(@tr,'Şanlıurfa'),
(@tr,'Uşak'),(@tr,'Van'),(@tr,'Yozgat'),(@tr,'Zonguldak'),(@tr,'Aksaray'),(@tr,'Bayburt'),
(@tr,'Karaman'),(@tr,'Kırıkkale'),(@tr,'Batman'),(@tr,'Şırnak'),(@tr,'Bartın'),(@tr,'Ardahan'),
(@tr,'Iğdır'),(@tr,'Yalova'),(@tr,'Karabük'),(@tr,'Kilis'),(@tr,'Osmaniye'),(@tr,'Düzce');

SET @uz = (SELECT id FROM paises WHERE nombre='Uzbekistán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@uz,'Taskent (ciudad)'),(@uz,'Andiyán'),(@uz,'Bujará'),(@uz,'Fergana'),(@uz,'Jizzaj'),
(@uz,'Namangán'),(@uz,'Navoiy'),(@uz,'Kashkadarya'),(@uz,'Samarcanda'),(@uz,'Sirdaryá'),
(@uz,'Surjandarya'),(@uz,'Taskent (región)'),(@uz,'Corasmia'),(@uz,'Karakalpakistán');

SET @vn = (SELECT id FROM paises WHERE nombre='Vietnam');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@vn,'Hanói'),(@vn,'Ciudad Ho Chi Minh'),(@vn,'Hai Phong'),(@vn,'Đa Nang'),(@vn,'Can Tho'),
(@vn,'Hue'),(@vn,'Lai Chau'),(@vn,'Điện Biên'),(@vn,'Son La'),(@vn,'Lạng Sơn'),
(@vn,'Cao Bằng'),(@vn,'Tuyên Quang'),(@vn,'Lào Cai'),(@vn,'Thái Nguyên'),(@vn,'Phú Thọ'),
(@vn,'Bắc Ninh'),(@vn,'Hưng Yên'),(@vn,'Ninh Bình'),(@vn,'Quảng Ninh'),(@vn,'Thanh Hóa'),
(@vn,'Nghệ An'),(@vn,'Hà Tĩnh'),(@vn,'Quảng Trị'),(@vn,'Quảng Ngãi'),(@vn,'Gia Lai'),
(@vn,'Khánh Hòa'),(@vn,'Lâm Đồng'),(@vn,'Đắk Lắk'),(@vn,'Đồng Nai'),(@vn,'Tây Ninh'),
(@vn,'Vĩnh Long'),(@vn,'Đồng Tháp'),(@vn,'Cà Mau'),(@vn,'An Giang');

SET @ye = (SELECT id FROM paises WHERE nombre='Yemen');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ye,'Abyan'),(@ye,'Adén'),(@ye,'Al Bayda'),(@ye,'Al Hudaydah'),(@ye,'Al Jawf'),
(@ye,'Al Mahrah'),(@ye,'Al Mahwit'),(@ye,'Amanat Al Asimah (Saná)'),(@ye,"Amrán"),
(@ye,'Dhale'),(@ye,'Dhamar'),(@ye,'Hadramaut'),(@ye,'Hajjah'),(@ye,'Ibb'),(@ye,'Lahij'),
(@ye,'Marib'),(@ye,'Raymah'),(@ye,'Saada'),(@ye,'Shabwah'),(@ye,'Socotra'),(@ye,'Taiz');

-- ===== ÁFRICA =====

SET @ao = (SELECT id FROM paises WHERE nombre='Angola');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ao,'Bengo'),(@ao,'Benguela'),(@ao,'Bié'),(@ao,'Cabinda'),(@ao,'Cuando'),(@ao,'Cubango'),
(@ao,'Cuanza Norte'),(@ao,'Cuanza Sul'),(@ao,'Cunene'),(@ao,'Huambo'),(@ao,'Huíla'),
(@ao,'Icolo e Bengo'),(@ao,'Luanda'),(@ao,'Lunda Norte'),(@ao,'Lunda Sul'),(@ao,'Malanje'),
(@ao,'Moxico'),(@ao,'Moxico Leste'),(@ao,'Namibe'),(@ao,'Uíge'),(@ao,'Zaire');

-- Argelia: 58 wilayas (esquema vigente desde 2019; no incluye las 11 wilayas nuevas
-- anunciadas en noviembre 2025 por falta de fuente confiable con la lista completa).
SET @dz = (SELECT id FROM paises WHERE nombre='Argelia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@dz,'Adrar'),(@dz,'Chlef'),(@dz,'Laghouat'),(@dz,'Oum el Bouaghi'),(@dz,'Batna'),(@dz,'Béjaïa'),
(@dz,'Biskra'),(@dz,'Béchar'),(@dz,'Blida'),(@dz,'Bouira'),(@dz,'Tamanrasset'),(@dz,'Tébessa'),
(@dz,'Tlemcen'),(@dz,'Tiaret'),(@dz,'Tizi Ouzou'),(@dz,'Argel'),(@dz,'Djelfa'),(@dz,'Jijel'),
(@dz,'Sétif'),(@dz,'Saïda'),(@dz,'Skikda'),(@dz,'Sidi Bel Abbès'),(@dz,'Annaba'),(@dz,'Guelma'),
(@dz,'Constantina'),(@dz,'Médéa'),(@dz,'Mostaganem'),(@dz,"M'Sila"),(@dz,'Mascara'),
(@dz,'Ouargla'),(@dz,'Orán'),(@dz,'El Bayadh'),(@dz,'Illizi'),(@dz,'Bordj Bou Arréridj'),
(@dz,'Boumerdès'),(@dz,'El Tarf'),(@dz,'Tindouf'),(@dz,'Tissemsilt'),(@dz,'El Oued'),
(@dz,'Khenchela'),(@dz,'Souk Ahras'),(@dz,'Tipaza'),(@dz,'Mila'),(@dz,'Aïn Defla'),
(@dz,'Naâma'),(@dz,'Aïn Témouchent'),(@dz,'Ghardaïa'),(@dz,'Relizane'),(@dz,'Timimoun'),
(@dz,'Bordj Badji Mokhtar'),(@dz,'Ouled Djellal'),(@dz,'Béni Abbès'),(@dz,'In Salah'),
(@dz,'In Guezzam'),(@dz,'Touggourt'),(@dz,'Djanet'),(@dz,'El M\'Ghair'),(@dz,'El Meniaa');

SET @bj = (SELECT id FROM paises WHERE nombre='Benín');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bj,'Alibori'),(@bj,'Atacora'),(@bj,'Atlántico'),(@bj,'Borgou'),(@bj,'Collines'),
(@bj,'Couffo'),(@bj,'Donga'),(@bj,'Litoral'),(@bj,'Mono'),(@bj,'Ouémé'),(@bj,'Plateau'),
(@bj,'Zou');

SET @bw = (SELECT id FROM paises WHERE nombre='Botsuana');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bw,'Central'),(@bw,'Ghanzi'),(@bw,'Kgalagadi'),(@bw,'Kgatleng'),(@bw,'Kweneng'),
(@bw,'Nordeste'),(@bw,'Noroeste'),(@bw,'Sudeste'),(@bw,'Sur'),(@bw,'Gaborone');

SET @bf = (SELECT id FROM paises WHERE nombre='Burkina Faso');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bf,'Boucle du Mouhoun'),(@bf,'Cascades'),(@bf,'Centre'),(@bf,'Centre-Est'),
(@bf,'Centre-Nord'),(@bf,'Centre-Ouest'),(@bf,'Centre-Sud'),(@bf,'Est'),(@bf,'Hauts-Bassins'),
(@bf,'Nord'),(@bf,'Plateau-Central'),(@bf,'Sahel'),(@bf,'Sud-Ouest');

SET @bi = (SELECT id FROM paises WHERE nombre='Burundi');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bi,'Bubanza'),(@bi,'Bujumbura Mairie'),(@bi,'Bujumbura Rural'),(@bi,'Bururi'),
(@bi,'Cankuzo'),(@bi,'Cibitoke'),(@bi,'Gitega'),(@bi,'Karuzi'),(@bi,'Kayanza'),(@bi,'Kirundo'),
(@bi,'Makamba'),(@bi,'Muramvya'),(@bi,'Muyinga'),(@bi,'Mwaro'),(@bi,'Ngozi'),(@bi,'Rutana'),
(@bi,'Ruyigi'),(@bi,'Rumonge');

SET @cv = (SELECT id FROM paises WHERE nombre='Cabo Verde');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cv,'Boa Vista'),(@cv,'Brava'),(@cv,'Maio'),(@cv,'Mosteiros'),(@cv,'Paul'),(@cv,'Porto Novo'),
(@cv,'Praia'),(@cv,'Ribeira Brava'),(@cv,'Ribeira Grande'),(@cv,'Ribeira Grande de Santiago'),
(@cv,'Sal'),(@cv,'Santa Catarina'),(@cv,'Santa Catarina do Fogo'),(@cv,'Santa Cruz'),
(@cv,'São Domingos'),(@cv,'São Filipe'),(@cv,'São Lourenço dos Órgãos'),(@cv,'São Miguel'),
(@cv,'São Salvador do Mundo'),(@cv,'São Vicente'),(@cv,'Tarrafal'),(@cv,'Tarrafal de São Nicolau');

SET @cm = (SELECT id FROM paises WHERE nombre='Camerún');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cm,'Adamaua'),(@cm,'Centro'),(@cm,'Este'),(@cm,'Extremo Norte'),(@cm,'Litoral'),
(@cm,'Norte'),(@cm,'Noroeste'),(@cm,'Oeste'),(@cm,'Sur'),(@cm,'Suroeste');

SET @td = (SELECT id FROM paises WHERE nombre='Chad');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@td,'Bahr el Gazel'),(@td,'Barh-Köh'),(@td,'Batha'),(@td,'Borkou'),(@td,'Chari-Baguirmi'),
(@td,'Ennedi Este'),(@td,'Ennedi Oeste'),(@td,'Guéra'),(@td,'Hadjer-Lamis'),(@td,'Kanem'),
(@td,'Lac'),(@td,'Logone Occidental'),(@td,'Logone Oriental'),(@td,'Mandoul'),
(@td,'Mayo-Kebbi Este'),(@td,'Mayo-Kebbi Oeste'),(@td,'Moyen-Chari'),(@td,'Ouaddaï'),
(@td,'Salamat'),(@td,'Sila'),(@td,'Tandjilé'),(@td,'Tibesti'),(@td,'Yamena');

SET @km = (SELECT id FROM paises WHERE nombre='Comoras');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@km,'Gran Comora'),(@km,'Anjouan'),(@km,'Mohéli');

SET @ci = (SELECT id FROM paises WHERE nombre='Costa de Marfil');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ci,'Abiyán'),(@ci,'Bas-Sassandra'),(@ci,'Comoé'),(@ci,'Denguélé'),(@ci,'Gôh-Djiboua'),
(@ci,'Lacs'),(@ci,'Lagunes'),(@ci,'Montagnes'),(@ci,'Sassandra-Marahoué'),(@ci,'Savanes'),
(@ci,'Vallée du Bandama'),(@ci,'Woroba'),(@ci,'Yamusukro'),(@ci,'Zanzan');

SET @eg = (SELECT id FROM paises WHERE nombre='Egipto');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@eg,'El Cairo'),(@eg,'Alejandría'),(@eg,'Puerto Saíd'),(@eg,'Suez'),(@eg,'Damieta'),
(@eg,'Dakahlia'),(@eg,'Sharqiya'),(@eg,'Qalyubiya'),(@eg,'Kafr el-Sheij'),(@eg,'Gharbiya'),
(@eg,'Monufiya'),(@eg,'Beheira'),(@eg,'Ismailía'),(@eg,'Guiza'),(@eg,'Beni Suef'),
(@eg,'Fayum'),(@eg,'Minia'),(@eg,'Asiut'),(@eg,'Sohag'),(@eg,'Qena'),(@eg,'Luxor'),
(@eg,'Asuán'),(@eg,'Mar Rojo'),(@eg,'Nuevo Valle'),(@eg,'Matruh'),(@eg,'Sinaí del Norte'),
(@eg,'Sinaí del Sur');

SET @er = (SELECT id FROM paises WHERE nombre='Eritrea');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@er,'Maekel (Central)'),(@er,'Debub (Sur)'),(@er,'Gash-Barka'),(@er,'Anseba'),
(@er,'Mar Rojo Septentrional'),(@er,'Mar Rojo Meridional');

SET @et = (SELECT id FROM paises WHERE nombre='Etiopía');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@et,'Adís Abeba'),(@et,'Afar'),(@et,'Ámhara'),(@et,'Benishangul-Gumuz'),
(@et,'Etiopía Central'),(@et,'Dire Dawa'),(@et,'Gambela'),(@et,'Harari'),(@et,'Oromía'),
(@et,'Sidama'),(@et,'Somalí'),(@et,'Etiopía del Sur'),
(@et,'Pueblos del Suroeste de Etiopía'),(@et,'Tigray');

SET @ga = (SELECT id FROM paises WHERE nombre='Gabón');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ga,'Estuario'),(@ga,'Haut-Ogooué'),(@ga,'Moyen-Ogooué'),(@ga,'Ngounié'),(@ga,'Nyanga'),
(@ga,'Ogooué-Ivindo'),(@ga,'Ogooué-Lolo'),(@ga,'Ogooué-Marítimo'),(@ga,'Woleu-Ntem');

SET @gm = (SELECT id FROM paises WHERE nombre='Gambia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gm,'Banjul'),(@gm,'Kanifing'),(@gm,'Costa Occidental'),(@gm,'Ribera Norte'),
(@gm,'Río Bajo'),(@gm,'Río Central'),(@gm,'Río Superior');

SET @gh = (SELECT id FROM paises WHERE nombre='Ghana');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gh,'Ahafo'),(@gh,'Ashanti'),(@gh,'Bono'),(@gh,'Bono Este'),(@gh,'Central'),(@gh,'Oriental'),
(@gh,'Gran Acra'),(@gh,'Nororiental'),(@gh,'Norte'),(@gh,'Oti'),(@gh,'Savannah'),
(@gh,'Alto Oriental'),(@gh,'Alto Occidental'),(@gh,'Volta'),(@gh,'Occidental'),
(@gh,'Occidental del Norte');

SET @gn = (SELECT id FROM paises WHERE nombre='Guinea');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gn,'Boké'),(@gn,'Conakry'),(@gn,'Faranah'),(@gn,'Kankan'),(@gn,'Kindia'),(@gn,'Labé'),
(@gn,'Mamou'),(@gn,"N'Zérékoré");

SET @gw = (SELECT id FROM paises WHERE nombre='Guinea-Bisáu');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gw,'Bafatá'),(@gw,'Biombo'),(@gw,'Bisáu'),(@gw,'Bolama/Bijagós'),(@gw,'Cacheu'),
(@gw,'Gabú'),(@gw,'Oio'),(@gw,'Quinara'),(@gw,'Tombali');

SET @gq = (SELECT id FROM paises WHERE nombre='Guinea Ecuatorial');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gq,'Annobón'),(@gq,'Bioko Norte'),(@gq,'Bioko Sur'),(@gq,'Centro Sur'),(@gq,'Kié-Ntem'),
(@gq,'Litoral'),(@gq,'Wele-Nzas'),(@gq,'Djibloho');

SET @ke = (SELECT id FROM paises WHERE nombre='Kenia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ke,'Baringo'),(@ke,'Bomet'),(@ke,'Bungoma'),(@ke,'Busia'),(@ke,'Elgeyo-Marakwet'),
(@ke,'Embu'),(@ke,'Garissa'),(@ke,'Homa Bay'),(@ke,'Isiolo'),(@ke,'Kajiado'),(@ke,'Kakamega'),
(@ke,'Kericho'),(@ke,'Kiambu'),(@ke,'Kilifi'),(@ke,'Kirinyaga'),(@ke,'Kisii'),(@ke,'Kisumu'),
(@ke,'Kitui'),(@ke,'Kwale'),(@ke,'Laikipia'),(@ke,'Lamu'),(@ke,'Machakos'),(@ke,'Makueni'),
(@ke,'Mandera'),(@ke,'Marsabit'),(@ke,'Meru'),(@ke,'Migori'),(@ke,'Mombasa'),(@ke,"Murang'a"),
(@ke,'Nairobi'),(@ke,'Nakuru'),(@ke,'Nandi'),(@ke,'Narok'),(@ke,'Nyamira'),(@ke,'Nyandarua'),
(@ke,'Nyeri'),(@ke,'Samburu'),(@ke,'Siaya'),(@ke,'Taita-Taveta'),(@ke,'Tana River'),
(@ke,'Tharaka-Nithi'),(@ke,'Trans Nzoia'),(@ke,'Turkana'),(@ke,'Uasin Gishu'),(@ke,'Vihiga'),
(@ke,'Wajir'),(@ke,'West Pokot');

SET @ls = (SELECT id FROM paises WHERE nombre='Lesoto');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ls,'Berea'),(@ls,'Butha-Buthe'),(@ls,'Leribe'),(@ls,'Mafeteng'),(@ls,'Maseru'),
(@ls,"Mohale's Hoek"),(@ls,'Mokhotlong'),(@ls,"Qacha's Nek"),(@ls,'Quthing'),(@ls,'Thaba-Tseka');

SET @lr = (SELECT id FROM paises WHERE nombre='Liberia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lr,'Bomi'),(@lr,'Bong'),(@lr,'Gbarpolu'),(@lr,'Grand Bassa'),(@lr,'Grand Cape Mount'),
(@lr,'Grand Gedeh'),(@lr,'Grand Kru'),(@lr,'Lofa'),(@lr,'Margibi'),(@lr,'Maryland'),
(@lr,'Montserrado'),(@lr,'Nimba'),(@lr,'River Cess'),(@lr,'River Gee'),(@lr,'Sinoe');

-- Libia: se usan los 22 "shabiyat" históricos (2007) como nivel más alto razonable;
-- el nivel oficial vigente (baladiyat) es demasiado fragmentado y fluctuante (99-108).
SET @ly = (SELECT id FROM paises WHERE nombre='Libia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ly,'Bengasi'),(@ly,'Al Butnan'),(@ly,'Derna'),(@ly,'Al Marj'),(@ly,'Nalut'),
(@ly,'Al Jabal al Akhdar'),(@ly,'Al Jabal al Gharbi'),(@ly,'Misrata'),(@ly,'Murzuq'),
(@ly,'Trípoli'),(@ly,'Al Wahat'),(@ly,'Ghat'),(@ly,'Al Jufra'),(@ly,'Sirte'),(@ly,'Sabha'),
(@ly,'Wadi al Hayaa'),(@ly,'Wadi al Shatii'),(@ly,'Ez Zawiya'),(@ly,'Al Jfara'),
(@ly,'Al Kufra'),(@ly,'Nuqat al Jamas'),(@ly,'Al Marqab');

SET @mg = (SELECT id FROM paises WHERE nombre='Madagascar');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mg,'Alaotra-Mangoro'),(@mg,"Amoron'i Mania"),(@mg,'Analamanga'),(@mg,'Analanjirofo'),
(@mg,'Androy'),(@mg,'Anosy'),(@mg,'Atsimo-Andrefana'),(@mg,'Atsimo-Atsinanana'),
(@mg,'Atsinanana'),(@mg,'Betsiboka'),(@mg,'Boeny'),(@mg,'Bongolava'),(@mg,'Diana'),
(@mg,'Haute Matsiatra'),(@mg,'Ihorombe'),(@mg,'Itasy'),(@mg,'Melaky'),(@mg,'Menabe'),
(@mg,'Sava'),(@mg,'Sofia'),(@mg,'Vakinankaratra'),(@mg,'Vatovavy'),(@mg,'Fitovinany');

SET @mw = (SELECT id FROM paises WHERE nombre='Malaui');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mw,'Región Norte'),(@mw,'Región Central'),(@mw,'Región Sur');

SET @ml = (SELECT id FROM paises WHERE nombre='Malí');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ml,'Bamako'),(@ml,'Gao'),(@ml,'Kayes'),(@ml,'Kidal'),(@ml,'Kulikoro'),(@ml,'Menaka'),
(@ml,'Mopti'),(@ml,'Segú'),(@ml,'Sikasso'),(@ml,'Taudeni'),(@ml,'Tombuctú');

SET @ma = (SELECT id FROM paises WHERE nombre='Marruecos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ma,'Tánger-Tetuán-Alhucemas'),(@ma,'Oriental'),(@ma,'Fez-Mequinez'),
(@ma,'Rabat-Salé-Kenitra'),(@ma,'Beni Mellal-Jenifra'),(@ma,'Casablanca-Settat'),
(@ma,'Marrakech-Safi'),(@ma,'Draa-Tafilalet'),(@ma,'Sus-Masa'),
(@ma,'Guelmim-Río Noun'),(@ma,'Laâyoune-Saguía el Hamra'),(@ma,'Dajla-Río de Oro');

SET @mu = (SELECT id FROM paises WHERE nombre='Mauricio');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mu,'Black River'),(@mu,'Flacq'),(@mu,'Grand Port'),(@mu,'Moka'),(@mu,'Pamplemousses'),
(@mu,'Plaines Wilhems'),(@mu,'Port Louis'),(@mu,'Rivière du Rempart'),(@mu,'Savanne'),
(@mu,'Rodrigues');

SET @mr = (SELECT id FROM paises WHERE nombre='Mauritania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mr,'Adrar'),(@mr,'Asaba'),(@mr,'Brakna'),(@mr,'Dajlet Nuadibú'),(@mr,'Gorgol'),
(@mr,'Guidimaka'),(@mr,'Hodh Ech Chargui'),(@mr,'Hodh El Gharbi'),(@mr,'Inchiri'),
(@mr,'Nuakchot Norte'),(@mr,'Nuakchot Oeste'),(@mr,'Nuakchot Sur'),(@mr,'Tagant'),
(@mr,'Tiris Zemmour'),(@mr,'Trarza');

SET @mz = (SELECT id FROM paises WHERE nombre='Mozambique');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mz,'Cabo Delgado'),(@mz,'Gaza'),(@mz,'Inhambane'),(@mz,'Maputo (provincia)'),
(@mz,'Maputo (ciudad)'),(@mz,'Manica'),(@mz,'Nampula'),(@mz,'Niassa'),(@mz,'Sofala'),
(@mz,'Tete'),(@mz,'Zambezia');

SET @na = (SELECT id FROM paises WHERE nombre='Namibia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@na,'Erongo'),(@na,'Hardap'),(@na,'Kavango Este'),(@na,'Kavango Oeste'),(@na,'Khomas'),
(@na,'Kunene'),(@na,'Ohangwena'),(@na,'Omaheke'),(@na,'Omusati'),(@na,'Oshana'),
(@na,'Oshikoto'),(@na,'Otjozondjupa'),(@na,'Zambezi'),(@na,'Karas');

SET @ne = (SELECT id FROM paises WHERE nombre='Níger');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ne,'Agadez'),(@ne,'Diffa'),(@ne,'Dosso'),(@ne,'Maradi'),(@ne,'Niamey'),(@ne,'Tahoua'),
(@ne,'Tillabéri'),(@ne,'Zinder');

SET @ng = (SELECT id FROM paises WHERE nombre='Nigeria');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ng,'Abia'),(@ng,'Adamawa'),(@ng,'Akwa Ibom'),(@ng,'Anambra'),(@ng,'Bauchi'),(@ng,'Bayelsa'),
(@ng,'Benue'),(@ng,'Borno'),(@ng,'Cross River'),(@ng,'Delta'),(@ng,'Ebonyi'),(@ng,'Edo'),
(@ng,'Ekiti'),(@ng,'Enugu'),(@ng,'Gombe'),(@ng,'Imo'),(@ng,'Jigawa'),(@ng,'Kaduna'),
(@ng,'Kano'),(@ng,'Katsina'),(@ng,'Kebbi'),(@ng,'Kogi'),(@ng,'Kwara'),(@ng,'Lagos'),
(@ng,'Nasarawa'),(@ng,'Níger'),(@ng,'Ogun'),(@ng,'Ondo'),(@ng,'Osun'),(@ng,'Oyo'),
(@ng,'Plateau'),(@ng,'Rivers'),(@ng,'Sokoto'),(@ng,'Taraba'),(@ng,'Yobe'),(@ng,'Zamfara'),
(@ng,'Territorio de la Capital Federal (Abuya)');

SET @cf = (SELECT id FROM paises WHERE nombre='República Centroafricana');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cf,'Bamingui-Bangoran'),(@cf,'Bangui'),(@cf,'Basse-Kotto'),(@cf,'Haute-Kotto'),
(@cf,"Haut-Mbomou"),(@cf,'Kémo'),(@cf,'Lobaye'),(@cf,'Mambéré-Kadéï'),(@cf,'Mbomou'),
(@cf,'Nana-Grébizi'),(@cf,'Nana-Mambéré'),(@cf,"Ombella-M'Poko"),(@cf,'Ouaka'),(@cf,'Ouham'),
(@cf,'Ouham-Pendé'),(@cf,'Sangha-Mbaéré'),(@cf,'Vakaga');

SET @cg = (SELECT id FROM paises WHERE nombre='República del Congo');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cg,'Bouenza'),(@cg,'Cuvette'),(@cg,'Cuvette-Ouest'),(@cg,'Kouilou'),(@cg,'Lékoumou'),
(@cg,'Likouala'),(@cg,'Niari'),(@cg,'Plateaux'),(@cg,'Pointe-Noire'),(@cg,'Pool'),
(@cg,'Sangha'),(@cg,'Brazzaville');

SET @cd = (SELECT id FROM paises WHERE nombre='República Democrática del Congo');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cd,'Bas-Uele'),(@cd,'Ecuador'),(@cd,'Haut-Katanga'),(@cd,'Haut-Lomami'),(@cd,'Haut-Uele'),
(@cd,'Ituri'),(@cd,'Kasai'),(@cd,'Kasai Central'),(@cd,'Kasai Oriental'),(@cd,'Kinshasa'),
(@cd,'Kongo Central'),(@cd,'Kwango'),(@cd,'Kwilu'),(@cd,'Lomami'),(@cd,'Lualaba'),
(@cd,'Mai-Ndombe'),(@cd,'Maniema'),(@cd,'Mongala'),(@cd,'Kivu del Norte'),(@cd,'Ubangi Norte'),
(@cd,'Sankuru'),(@cd,'Kivu del Sur'),(@cd,'Ubangi Sur'),(@cd,'Tanganica'),(@cd,'Tshopo'),
(@cd,'Tshuapa');

SET @rw = (SELECT id FROM paises WHERE nombre='Ruanda');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@rw,'Kigali'),(@rw,'Norte'),(@rw,'Sur'),(@rw,'Este'),(@rw,'Oeste');

SET @st = (SELECT id FROM paises WHERE nombre='Santo Tomé y Príncipe');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@st,'Santo Tomé'),(@st,'Príncipe');

SET @sn = (SELECT id FROM paises WHERE nombre='Senegal');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sn,'Dakar'),(@sn,'Diourbel'),(@sn,'Fatick'),(@sn,'Kaffrine'),(@sn,'Kaolack'),(@sn,'Kédougou'),
(@sn,'Kolda'),(@sn,'Louga'),(@sn,'Matam'),(@sn,'Saint-Louis'),(@sn,'Sédhiou'),
(@sn,'Tambacounda'),(@sn,'Thiès'),(@sn,'Ziguinchor');

-- Seychelles: lista de CONFIANZA MEDIA (las fuentes varían entre 25, 26 y 27
-- distritos según el año; se usó la lista de 25 más citada).
SET @sc = (SELECT id FROM paises WHERE nombre='Seychelles');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sc,'Anse aux Pins'),(@sc,'Anse Boileau'),(@sc,'Anse Etoile'),(@sc,'Anse Royale'),
(@sc,'Au Cap'),(@sc,'Baie Lazare'),(@sc,'Baie Sainte Anne'),(@sc,'Beau Vallon'),
(@sc,'Bel Air'),(@sc,'Bel Ombre'),(@sc,'Cascade'),(@sc,'Glacis'),(@sc,'Grand Anse Mahé'),
(@sc,'Grand Anse Praslin'),(@sc,'La Digue'),(@sc,'La Rivière Anglaise'),(@sc,'Les Mamelles'),
(@sc,'Mont Buxton'),(@sc,'Mont Fleuri'),(@sc,'Plaisance'),(@sc,'Pointe Larue'),
(@sc,'Port Glaud'),(@sc,'Roche Caiman'),(@sc,'Saint Louis'),(@sc,'Takamaka');

SET @sl = (SELECT id FROM paises WHERE nombre='Sierra Leona');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sl,'Este'),(@sl,'Norte'),(@sl,'Noroeste'),(@sl,'Sur'),(@sl,'Área Occidental');

SET @so = (SELECT id FROM paises WHERE nombre='Somalia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@so,'Puntlandia'),(@so,'Jubalandia'),(@so,'Suroeste de Somalia'),
(@so,'Administración Regional de Banadir'),(@so,'Hirshabelle'),(@so,'Galmudug'),
(@so,'Estado Noreste (Khatumo)');

SET @za = (SELECT id FROM paises WHERE nombre='Sudáfrica');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@za,'Cabo Occidental'),(@za,'Cabo Oriental'),(@za,'Cabo Norte'),(@za,'Estado Libre'),
(@za,'Gauteng'),(@za,'KwaZulu-Natal'),(@za,'Mpumalanga'),(@za,'Limpopo'),(@za,'Noroeste');

SET @sd = (SELECT id FROM paises WHERE nombre='Sudán');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sd,'Nilo Azul'),(@sd,'Darfur Central'),(@sd,'Darfur Oriental'),(@sd,'Gedaref'),
(@sd,'Al Jazirah'),(@sd,'Kassala'),(@sd,'Jartum'),(@sd,'Darfur del Norte'),
(@sd,'Kordofán del Norte'),(@sd,'Nilo (Río Nilo)'),(@sd,'Mar Rojo'),(@sd,'Nilo Blanco'),
(@sd,'Sennar'),(@sd,'Darfur del Sur'),(@sd,'Kordofán del Sur'),(@sd,'Darfur Occidental'),
(@sd,'Kordofán Occidental');

SET @ss = (SELECT id FROM paises WHERE nombre='Sudán del Sur');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ss,'Alto Nilo'),(@ss,'Bahr el Ghazal Occidental'),(@ss,'Ecuatoria Central'),
(@ss,'Ecuatoria Oriental'),(@ss,'Ecuatoria Occidental'),(@ss,'Jonglei'),(@ss,'Lagos'),
(@ss,'Unidad'),(@ss,'Warrap'),(@ss,'Bahr el Ghazal del Norte');

SET @sz = (SELECT id FROM paises WHERE nombre='Suazilandia (Esuatini)');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sz,'Hhohho'),(@sz,'Manzini'),(@sz,'Lubombo'),(@sz,'Shiselweni');

SET @tz = (SELECT id FROM paises WHERE nombre='Tanzania');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tz,'Arusha'),(@tz,'Dar es Salaam'),(@tz,'Dodoma'),(@tz,'Geita'),(@tz,'Iringa'),
(@tz,'Kagera'),(@tz,'Katavi'),(@tz,'Kigoma'),(@tz,'Kilimanjaro'),(@tz,'Lindi'),(@tz,'Manyara'),
(@tz,'Mara'),(@tz,'Mbeya'),(@tz,'Morogoro'),(@tz,'Mtwara'),(@tz,'Mwanza'),(@tz,'Njombe'),
(@tz,'Pemba Norte'),(@tz,'Pemba Sur'),(@tz,'Pwani'),(@tz,'Rukwa'),(@tz,'Ruvuma'),
(@tz,'Shinyanga'),(@tz,'Simiyu'),(@tz,'Singida'),(@tz,'Songwe'),(@tz,'Tabora'),(@tz,'Tanga'),
(@tz,'Unguja Norte'),(@tz,'Unguja Sur'),(@tz,'Ciudad de Zanzíbar Oeste');

SET @tg = (SELECT id FROM paises WHERE nombre='Togo');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tg,'Marítima'),(@tg,'Meseta (Plateaux)'),(@tg,'Central'),(@tg,'Kara'),(@tg,'Savanas');

SET @tn = (SELECT id FROM paises WHERE nombre='Túnez');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tn,'Ariana'),(@tn,'Beja'),(@tn,'Ben Arous'),(@tn,'Bizerta'),(@tn,'Gabès'),(@tn,'Gafsa'),
(@tn,'Jendouba'),(@tn,'Kairuán'),(@tn,'Kasserine'),(@tn,'Kebili'),(@tn,'El Kef'),
(@tn,'Mahdia'),(@tn,'Manouba'),(@tn,'Medenine'),(@tn,'Monastir'),(@tn,'Nabeul'),(@tn,'Sfax'),
(@tn,'Sidi Bouzid'),(@tn,'Siliana'),(@tn,'Susa'),(@tn,'Tataouine'),(@tn,'Tozeur'),
(@tn,'Túnez'),(@tn,'Zaghouan');

SET @ug = (SELECT id FROM paises WHERE nombre='Uganda');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ug,'Central'),(@ug,'Oriental'),(@ug,'Norte'),(@ug,'Occidental');

SET @dj = (SELECT id FROM paises WHERE nombre='Yibuti');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@dj,'Ali Sabieh'),(@dj,'Arta'),(@dj,'Dikhil'),(@dj,'Yibuti (ciudad)'),(@dj,'Obock'),
(@dj,'Tadjourah');

SET @zm = (SELECT id FROM paises WHERE nombre='Zambia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@zm,'Central'),(@zm,'Copperbelt'),(@zm,'Oriental'),(@zm,'Luapula'),(@zm,'Lusaka'),
(@zm,'Muchinga'),(@zm,'Norte'),(@zm,'Noroeste'),(@zm,'Sur'),(@zm,'Occidental');

SET @zw = (SELECT id FROM paises WHERE nombre='Zimbabue');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@zw,'Bulawayo'),(@zw,'Harare'),(@zw,'Manicaland'),(@zw,'Mashonaland Central'),
(@zw,'Mashonaland Oriental'),(@zw,'Mashonaland Occidental'),(@zw,'Masvingo'),
(@zw,'Matabeleland Norte'),(@zw,'Matabeleland Sur'),(@zw,'Midlands');

-- ===== OCEANÍA =====

SET @au = (SELECT id FROM paises WHERE nombre='Australia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@au,'Nueva Gales del Sur'),(@au,'Victoria'),(@au,'Queensland'),(@au,'Australia Occidental'),
(@au,'Australia Meridional'),(@au,'Tasmania'),(@au,'Territorio del Norte'),
(@au,'Territorio de la Capital Australiana');

SET @fj = (SELECT id FROM paises WHERE nombre='Fiyi');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@fj,'División Central'),(@fj,'División Occidental'),(@fj,'División Septentrional'),
(@fj,'División Oriental');

SET @mh = (SELECT id FROM paises WHERE nombre='Islas Marshall');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@mh,'Ailinglaplap'),(@mh,'Ailuk'),(@mh,'Arno'),(@mh,'Aur'),(@mh,'Ebon'),(@mh,'Enewetak'),
(@mh,'Jabat'),(@mh,'Jaluit'),(@mh,'Kili'),(@mh,'Kwajalein'),(@mh,'Lae'),(@mh,'Lib'),
(@mh,'Likiep'),(@mh,'Majuro'),(@mh,'Maloelap'),(@mh,'Mejit'),(@mh,'Mili'),(@mh,'Namdrik'),
(@mh,'Namu'),(@mh,'Rongelap'),(@mh,'Ujae'),(@mh,'Utirik'),(@mh,'Wotho'),(@mh,'Wotje');

SET @sb = (SELECT id FROM paises WHERE nombre='Islas Salomón');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sb,'Central'),(@sb,'Choiseul'),(@sb,'Guadalcanal'),(@sb,'Isabel'),(@sb,'Makira-Ulawa'),
(@sb,'Malaita'),(@sb,'Rennell y Bellona'),(@sb,'Temotu'),(@sb,'Occidental'),(@sb,'Honiara');

SET @ki = (SELECT id FROM paises WHERE nombre='Kiribati');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ki,'Banaba'),(@ki,'Gilbert Central'),(@ki,'Islas de la Línea'),(@ki,'Gilbert del Norte'),
(@ki,'Gilbert del Sur'),(@ki,'Tarawa');

SET @fm = (SELECT id FROM paises WHERE nombre='Micronesia');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@fm,'Chuuk'),(@fm,'Kosrae'),(@fm,'Pohnpei'),(@fm,'Yap');

SET @nr = (SELECT id FROM paises WHERE nombre='Nauru');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@nr,'Aiwo'),(@nr,'Anabar'),(@nr,'Anetan'),(@nr,'Anibare'),(@nr,'Baitsi'),(@nr,'Boe'),
(@nr,'Buada'),(@nr,'Denigomodu'),(@nr,'Ewa'),(@nr,'Ijuw'),(@nr,'Meneng'),(@nr,'Nibok'),
(@nr,'Uaboe'),(@nr,'Yaren');

SET @nz = (SELECT id FROM paises WHERE nombre='Nueva Zelanda');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@nz,'Northland'),(@nz,'Auckland'),(@nz,'Waikato'),(@nz,'Bay of Plenty'),(@nz,'Gisborne'),
(@nz,"Hawke's Bay"),(@nz,'Taranaki'),(@nz,'Manawatu-Whanganui'),(@nz,'Wellington'),
(@nz,'Tasman'),(@nz,'Nelson'),(@nz,'Marlborough'),(@nz,'West Coast'),(@nz,'Canterbury'),
(@nz,'Otago'),(@nz,'Southland');

SET @pw = (SELECT id FROM paises WHERE nombre='Palaos');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pw,'Aimeliik'),(@pw,'Airai'),(@pw,'Angaur'),(@pw,'Hatohobei'),(@pw,'Kayangel'),
(@pw,'Koror'),(@pw,'Melekeok'),(@pw,'Ngaraard'),(@pw,'Ngarchelong'),(@pw,'Ngardmau'),
(@pw,'Ngatpang'),(@pw,'Ngchesar'),(@pw,'Ngeremlengui'),(@pw,'Ngiwal'),(@pw,'Peleliu'),
(@pw,'Sonsorol');

SET @pg = (SELECT id FROM paises WHERE nombre='Papúa Nueva Guinea');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pg,'Distrito de la Capital Nacional'),(@pg,'Bougainville'),(@pg,'Central'),(@pg,'Chimbu'),
(@pg,'Sepik Oriental'),(@pg,'Nueva Bretaña Oriental'),(@pg,'Tierras Altas Orientales'),
(@pg,'Enga'),(@pg,'Golfo'),(@pg,'Hela'),(@pg,'Jiwaka'),(@pg,'Madang'),(@pg,'Manus'),
(@pg,'Milne Bay'),(@pg,'Morobe'),(@pg,'Nueva Irlanda'),(@pg,'Oro'),
(@pg,'Tierras Altas de Sandaun'),(@pg,'Tierras Altas del Sur'),(@pg,'Occidental'),
(@pg,'Nueva Bretaña Occidental'),(@pg,'Tierras Altas Occidentales');

SET @ws = (SELECT id FROM paises WHERE nombre='Samoa');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ws,"A'ana"),(@ws,'Aiga-i-le-Tai'),(@ws,'Atua'),(@ws,"Fa'asaleleaga"),(@ws,"Gaga'emauga"),
(@ws,'Gagaifomauga'),(@ws,'Palauli'),(@ws,"Satupa'itea"),(@ws,'Tuamasaga'),
(@ws,"Va'a-o-Fonoti"),(@ws,'Vaisigano');

SET @to = (SELECT id FROM paises WHERE nombre='Tonga');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@to,"'Eua"),(@to,"Ha'apai"),(@to,'Niuas'),(@to,'Tongatapu'),(@to,"Vava'u");

SET @tv = (SELECT id FROM paises WHERE nombre='Tuvalu');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tv,'Funafuti'),(@tv,'Nanumanga'),(@tv,'Nanumea'),(@tv,'Niutao'),(@tv,'Nui'),
(@tv,'Nukufetau'),(@tv,'Nukulaelae'),(@tv,'Vaitupu');

SET @vu = (SELECT id FROM paises WHERE nombre='Vanuatu');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@vu,'Torba'),(@vu,'Sanma'),(@vu,'Penama'),(@vu,'Malampa'),(@vu,'Shefa'),(@vu,'Tafea');

-- ===== AMÉRICA (Caribe, Centroamérica y resto de Sudamérica) =====

SET @ag = (SELECT id FROM paises WHERE nombre='Antigua y Barbuda');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ag,'Saint George'),(@ag,'Saint John'),(@ag,'Saint Mary'),(@ag,'Saint Paul'),
(@ag,'Saint Peter'),(@ag,'Saint Philip'),(@ag,'Barbuda'),(@ag,'Redonda');

SET @bs = (SELECT id FROM paises WHERE nombre='Bahamas');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bs,'New Providence'),(@bs,'Gran Bahama'),(@bs,'Abaco'),(@bs,'Andros'),(@bs,'Bimini'),
(@bs,'Berry Islands'),(@bs,'Cat Island'),(@bs,'Eleuthera'),(@bs,'Exuma'),(@bs,'Inagua'),
(@bs,'Long Island'),(@bs,'Mayaguana'),(@bs,'Ragged Island'),(@bs,'Rum Cay'),
(@bs,'San Salvador'),(@bs,'Acklins'),(@bs,'Crooked Island');

SET @bb = (SELECT id FROM paises WHERE nombre='Barbados');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bb,'Christ Church'),(@bb,'Saint Andrew'),(@bb,'Saint George'),(@bb,'Saint James'),
(@bb,'Saint John'),(@bb,'Saint Joseph'),(@bb,'Saint Lucy'),(@bb,'Saint Michael'),
(@bb,'Saint Peter'),(@bb,'Saint Philip'),(@bb,'Saint Thomas');

SET @bz = (SELECT id FROM paises WHERE nombre='Belice');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@bz,'Belice'),(@bz,'Cayo'),(@bz,'Corozal'),(@bz,'Orange Walk'),(@bz,'Stann Creek'),
(@bz,'Toledo');

SET @cr = (SELECT id FROM paises WHERE nombre='Costa Rica');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cr,'San José'),(@cr,'Alajuela'),(@cr,'Cartago'),(@cr,'Heredia'),(@cr,'Guanacaste'),
(@cr,'Puntarenas'),(@cr,'Limón');

SET @cu = (SELECT id FROM paises WHERE nombre='Cuba');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@cu,'Pinar del Río'),(@cu,'Artemisa'),(@cu,'La Habana'),(@cu,'Mayabeque'),(@cu,'Matanzas'),
(@cu,'Cienfuegos'),(@cu,'Villa Clara'),(@cu,'Sancti Spíritus'),(@cu,'Ciego de Ávila'),
(@cu,'Camagüey'),(@cu,'Las Tunas'),(@cu,'Holguín'),(@cu,'Granma'),(@cu,'Santiago de Cuba'),
(@cu,'Guantánamo'),(@cu,'Isla de la Juventud');

SET @dm = (SELECT id FROM paises WHERE nombre='Dominica');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@dm,'Saint Andrew'),(@dm,'Saint David'),(@dm,'Saint George'),(@dm,'Saint John'),
(@dm,'Saint Joseph'),(@dm,'Saint Luke'),(@dm,'Saint Mark'),(@dm,'Saint Patrick'),
(@dm,'Saint Paul'),(@dm,'Saint Peter');

SET @sv = (SELECT id FROM paises WHERE nombre='El Salvador');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sv,'Ahuachapán'),(@sv,'Cabañas'),(@sv,'Chalatenango'),(@sv,'Cuscatlán'),(@sv,'La Libertad'),
(@sv,'La Paz'),(@sv,'La Unión'),(@sv,'Morazán'),(@sv,'San Miguel'),(@sv,'San Salvador'),
(@sv,'San Vicente'),(@sv,'Santa Ana'),(@sv,'Sonsonate'),(@sv,'Usulután');

SET @gd = (SELECT id FROM paises WHERE nombre='Granada');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gd,'Saint Andrew'),(@gd,'Saint David'),(@gd,'Saint George'),(@gd,'Saint John'),
(@gd,'Saint Mark'),(@gd,'Saint Patrick'),(@gd,'Carriacou y Petite Martinique');

SET @gt = (SELECT id FROM paises WHERE nombre='Guatemala');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gt,'Alta Verapaz'),(@gt,'Baja Verapaz'),(@gt,'Chimaltenango'),(@gt,'Chiquimula'),
(@gt,'El Progreso'),(@gt,'Escuintla'),(@gt,'Guatemala'),(@gt,'Huehuetenango'),(@gt,'Izabal'),
(@gt,'Jalapa'),(@gt,'Jutiapa'),(@gt,'Petén'),(@gt,'Quetzaltenango'),(@gt,'Quiché'),
(@gt,'Retalhuleu'),(@gt,'Sacatepéquez'),(@gt,'San Marcos'),(@gt,'Santa Rosa'),(@gt,'Sololá'),
(@gt,'Suchitepéquez'),(@gt,'Totonicapán'),(@gt,'Zacapa');

SET @gy = (SELECT id FROM paises WHERE nombre='Guyana');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@gy,'Barima-Waini'),(@gy,'Pomeroon-Supenaam'),(@gy,'Essequibo Islands-West Demerara'),
(@gy,'Demerara-Mahaica'),(@gy,'Mahaica-Berbice'),(@gy,'East Berbice-Corentyne'),
(@gy,'Cuyuni-Mazaruni'),(@gy,'Potaro-Siparuni'),(@gy,'Upper Takutu-Upper Essequibo'),
(@gy,'Upper Demerara-Berbice');

SET @ht = (SELECT id FROM paises WHERE nombre='Haití');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ht,'Artibonite'),(@ht,'Centro'),(@ht,"Grand'Anse"),(@ht,'Nippes'),(@ht,'Norte'),
(@ht,'Nordeste'),(@ht,'Noroeste'),(@ht,'Oeste'),(@ht,'Sur'),(@ht,'Sudeste');

SET @hn = (SELECT id FROM paises WHERE nombre='Honduras');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@hn,'Atlántida'),(@hn,'Choluteca'),(@hn,'Colón'),(@hn,'Comayagua'),(@hn,'Copán'),
(@hn,'Cortés'),(@hn,'El Paraíso'),(@hn,'Francisco Morazán'),(@hn,'Gracias a Dios'),
(@hn,'Intibucá'),(@hn,'Islas de la Bahía'),(@hn,'La Paz'),(@hn,'Lempira'),(@hn,'Ocotepeque'),
(@hn,'Olancho'),(@hn,'Santa Bárbara'),(@hn,'Valle'),(@hn,'Yoro');

SET @jm = (SELECT id FROM paises WHERE nombre='Jamaica');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@jm,'Kingston'),(@jm,'Saint Andrew'),(@jm,'Saint Catherine'),(@jm,'Clarendon'),
(@jm,'Manchester'),(@jm,'Saint Elizabeth'),(@jm,'Westmoreland'),(@jm,'Hanover'),
(@jm,'Saint James'),(@jm,'Trelawny'),(@jm,'Saint Ann'),(@jm,'Saint Mary'),(@jm,'Portland'),
(@jm,'Saint Thomas');

SET @ni = (SELECT id FROM paises WHERE nombre='Nicaragua');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@ni,'Boaco'),(@ni,'Carazo'),(@ni,'Chinandega'),(@ni,'Chontales'),(@ni,'Estelí'),
(@ni,'Granada'),(@ni,'Jinotega'),(@ni,'León'),(@ni,'Madriz'),(@ni,'Managua'),(@ni,'Masaya'),
(@ni,'Matagalpa'),(@ni,'Nueva Segovia'),(@ni,'Río San Juan'),(@ni,'Rivas'),
(@ni,'Costa Caribe Norte'),(@ni,'Costa Caribe Sur');

SET @pa = (SELECT id FROM paises WHERE nombre='Panamá');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@pa,'Bocas del Toro'),(@pa,'Chiriquí'),(@pa,'Coclé'),(@pa,'Colón'),(@pa,'Darién'),
(@pa,'Herrera'),(@pa,'Los Santos'),(@pa,'Panamá'),(@pa,'Panamá Oeste'),(@pa,'Veraguas'),
(@pa,'Guna Yala'),(@pa,'Emberá'),(@pa,'Ngäbe-Buglé');

SET @rd = (SELECT id FROM paises WHERE nombre='República Dominicana');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@rd,'Distrito Nacional'),(@rd,'Azua'),(@rd,'Bahoruco'),(@rd,'Barahona'),(@rd,'Dajabón'),
(@rd,'Duarte'),(@rd,'Elías Piña'),(@rd,'El Seibo'),(@rd,'Espaillat'),
(@rd,'Hato Mayor'),(@rd,'Hermanas Mirabal'),(@rd,'Independencia'),(@rd,'La Altagracia'),
(@rd,'La Romana'),(@rd,'La Vega'),(@rd,'María Trinidad Sánchez'),(@rd,'Monseñor Nouel'),
(@rd,'Monte Cristi'),(@rd,'Monte Plata'),(@rd,'Pedernales'),(@rd,'Peravia'),
(@rd,'Puerto Plata'),(@rd,'Samaná'),(@rd,'San Cristóbal'),(@rd,'San José de Ocoa'),
(@rd,'San Juan'),(@rd,'San Pedro de Macorís'),(@rd,'Sánchez Ramírez'),(@rd,'Santiago'),
(@rd,'Santiago Rodríguez'),(@rd,'Santo Domingo'),(@rd,'Valverde');

SET @kn = (SELECT id FROM paises WHERE nombre='San Cristóbal y Nieves');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@kn,'Christ Church Nichola Town'),(@kn,'Saint Anne Sandy Point'),
(@kn,'Saint George Basseterre'),(@kn,'Saint John Capisterre'),(@kn,'Saint Mary Cayon'),
(@kn,'Saint Paul Capisterre'),(@kn,'Saint Peter Basseterre'),(@kn,'Saint Thomas Middle Island'),
(@kn,'Trinity Palmetto Point'),(@kn,'Saint George Gingerland'),(@kn,'Saint James Windward'),
(@kn,'Saint John Figtree'),(@kn,'Saint Paul Charlestown'),(@kn,'Saint Thomas Lowland');

SET @vc = (SELECT id FROM paises WHERE nombre='San Vicente y las Granadinas');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@vc,'Charlotte'),(@vc,'Grenadines'),(@vc,'Saint Andrew'),(@vc,'Saint David'),
(@vc,'Saint George'),(@vc,'Saint Patrick');

SET @lc = (SELECT id FROM paises WHERE nombre='Santa Lucía');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@lc,'Anse la Raye'),(@lc,'Castries'),(@lc,'Choiseul'),(@lc,'Dennery'),(@lc,'Gros Islet'),
(@lc,'Laborie'),(@lc,'Micoud'),(@lc,'Soufrière'),(@lc,'Vieux Fort'),(@lc,'Canaries');

SET @sr = (SELECT id FROM paises WHERE nombre='Surinam');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@sr,'Brokopondo'),(@sr,'Commewijne'),(@sr,'Coronie'),(@sr,'Marowijne'),(@sr,'Nickerie'),
(@sr,'Para'),(@sr,'Paramaribo'),(@sr,'Saramacca'),(@sr,'Sipaliwini'),(@sr,'Wanica');

SET @tt = (SELECT id FROM paises WHERE nombre='Trinidad y Tobago');
INSERT INTO departamentos (pais_id, nombre) VALUES
(@tt,'Puerto España'),(@tt,'San Fernando'),(@tt,'Arima'),(@tt,'Chaguanas'),(@tt,'Point Fortin'),
(@tt,'Couva-Tabaquite-Talparo'),(@tt,'Diego Martin'),(@tt,'Mayaro-Río Claro'),
(@tt,'Penal-Debe'),(@tt,'Princes Town'),(@tt,'San Juan-Laventille'),(@tt,'Sangre Grande'),
(@tt,'Siparia'),(@tt,'Tunapuna-Piarco'),(@tt,'Tobago');
