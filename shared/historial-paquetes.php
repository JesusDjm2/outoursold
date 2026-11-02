<?php
// shared/historial-paquetes.php
// Historial completo de los paquetes predefinidos guardados, USD y PEN juntos, del más
// reciente al más antiguo: buscar, filtrar, ver su contenido y usarlo en una cotización.
// Los datos salen de ../usd/api.php y ../pen/api.php (ver historial-paquetes.js).
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';

require_login();
$navRoot = '../';
$navShared = '';
$navActive = 'historial-paquetes';
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
    <title>Historial de paquetes</title>
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
    <link rel="stylesheet" href="historial-paquetes.css?v=<?= filemtime(__DIR__ . '/historial-paquetes.css') ?>">
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
                    <h1>Historial de paquetes</h1>
                    <p>Todos los paquetes que has guardado, listos para volver a usarlos en una cotización.</p>
                </div>
            </div>
        </header>
        <main class="p-4 md:p-6">
            <div class="max-w-7xl mx-auto">
                <section id="hp-kpis" class="hp-kpis" aria-label="Resumen"></section>

                <section class="hp-barra" aria-label="Buscar y filtrar">
                    <label class="hp-buscar">
                        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                        <input id="hp-q" type="search" autocomplete="off" placeholder="Buscar paquete, actividad u hotel" aria-label="Buscar paquetes">
                    </label>
                    <div id="hp-monedas" class="hp-segmento" role="group" aria-label="Moneda"></div>
                    <select id="hp-contenido" class="hp-select" aria-label="Filtrar por contenido">
                        <option value="todos">Todo el contenido</option>
                        <option value="itinerario">Con itinerario</option>
                        <option value="actividades">Con actividades</option>
                        <option value="hoteles">Con hoteles</option>
                    </select>
                    <select id="hp-orden" class="hp-select" aria-label="Ordenar">
                        <option value="recientes">Más recientes</option>
                        <option value="antiguos">Más antiguos</option>
                        <option value="nombre">Nombre (A–Z)</option>
                        <option value="dias">Más días de itinerario</option>
                    </select>
                </section>

                <p id="hp-conteo" class="hp-conteo" role="status" aria-live="polite"></p>
                <section id="hp-lista" class="hp-lista" aria-label="Paquetes guardados"></section>
            </div>
        </main>
    </div>
    <script src="notify.js?v=<?= filemtime(__DIR__ . '/notify.js') ?>"></script>
    <script src="historial-paquetes.js?v=<?= filemtime(__DIR__ . '/historial-paquetes.js') ?>"></script>
    <script>window.ME_API_URL = 'mi-empresa-api.php';</script>
    <script src="hero-edit.js?v=<?= filemtime(__DIR__ . '/hero-edit.js') ?>"></script>
</body>
</html>
