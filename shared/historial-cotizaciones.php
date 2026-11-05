<?php
// shared/historial-cotizaciones.php
// Historial de las cotizaciones creadas, USD y PEN juntas, de la más reciente a la más
// antigua, en una tabla con lo necesario para reconocer cada una de un vistazo. Los datos
// salen de historial-cotizaciones-api.php (ver historial-cotizaciones.js).
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';

require_login();
$navRoot = '../';
$navShared = '';
$navActive = 'historial-cotizaciones';
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
$heroPosY = resolverHeroPosY($db);
$accentColorStyle = resolverAccentColorStyle($db);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historial de cotizaciones</title>
    <link rel="icon" type="image/png" href="favicon-outoors.png?v=<?= filemtime(__DIR__ . '/favicon-outoors.png') ?>">
    <link rel="apple-touch-icon" href="apple-touch-icon.png?v=<?= filemtime(__DIR__ . '/apple-touch-icon.png') ?>">
    <link rel="manifest" href="site.webmanifest">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="cotizador.css?v=<?= filemtime(__DIR__ . '/cotizador.css') ?>">
    <link rel="stylesheet" href="sidebar.css?v=<?= filemtime(__DIR__ . '/sidebar.css') ?>">
    <link rel="stylesheet" href="hero.css?v=<?= filemtime(__DIR__ . '/hero.css') ?>">
    <link rel="stylesheet" href="notify.css?v=<?= filemtime(__DIR__ . '/notify.css') ?>">
    <link rel="stylesheet" href="historial-cotizaciones.css?v=<?= filemtime(__DIR__ . '/historial-cotizaciones.css') ?>">
</head>
<body<?= $accentColorStyle ? ' style="' . htmlspecialchars($accentColorStyle) . '"' : '' ?>>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($heroImagenUrl) ?>');--hero-pos-y:<?= (int) $heroPosY ?>%">
            <div class="hero-actions">
                <button type="button" id="hero-edit-btn" class="hero-edit-btn" aria-label="Cambiar la imagen de portada" data-tooltip="Imagen de portada — la foto de fondo de esta página."><i class="fas fa-camera"></i></button>
                <input type="file" id="hero-edit-input" accept="image/jpeg,image/png,image/webp" class="hidden">
            </div>
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content">
                    <h1>Historial de cotizaciones</h1>
                    <p>Todas las cotizaciones creadas, de la más reciente a la más antigua.</p>
                </div>
            </div>
        </header>
        <main class="p-4 md:p-6">
            <div class="max-w-7xl mx-auto">
                <section id="hc-kpis" class="hc-kpis" aria-label="Resumen"></section>

                <section class="hc-barra" aria-label="Buscar y filtrar">
                    <label class="hc-buscar">
                        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                        <input id="hc-q" type="search" autocomplete="off" placeholder="Buscar por pasajero, contacto, país, paquete o ID" aria-label="Buscar cotizaciones">
                    </label>
                    <div id="hc-monedas" class="hc-segmento" role="group" aria-label="Moneda">
                        <button type="button" class="hc-segmento-btn" data-moneda="todas">Todas</button>
                        <button type="button" class="hc-segmento-btn" data-moneda="usd">USD</button>
                        <button type="button" class="hc-segmento-btn" data-moneda="pen">PEN</button>
                    </div>
                </section>

                <div class="hc-tabla-marco">
                    <table class="hc-tabla">
                        <thead>
                            <tr>
                                <th scope="col">Creada</th>
                                <th scope="col">Pasajero</th>
                                <th scope="col">País</th>
                                <th scope="col" class="is-num">Pax</th>
                                <th scope="col">Viaje</th>
                                <th scope="col">Contenido</th>
                                <th scope="col" class="is-num">Total</th>
                                <th scope="col"><span class="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody id="hc-cuerpo"></tbody>
                    </table>
                </div>

                <nav class="hc-pie" aria-label="Páginas">
                    <p id="hc-conteo" class="hc-conteo" role="status" aria-live="polite"></p>
                    <div class="hc-paginas">
                        <button type="button" id="hc-ant" class="hc-btn" aria-label="Página anterior"><i class="fas fa-chevron-left"></i></button>
                        <span id="hc-pagina" class="hc-pagina"></span>
                        <button type="button" id="hc-sig" class="hc-btn" aria-label="Página siguiente"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </nav>
            </div>
        </main>
    </div>
    <script src="notify.js?v=<?= filemtime(__DIR__ . '/notify.js') ?>"></script>
    <script src="historial-cotizaciones.js?v=<?= filemtime(__DIR__ . '/historial-cotizaciones.js') ?>"></script>
    <script>window.ME_API_URL = 'mi-empresa-api.php';</script>
    <script src="hero-edit.js?v=<?= filemtime(__DIR__ . '/hero-edit.js') ?>"></script>
</body>
</html>
