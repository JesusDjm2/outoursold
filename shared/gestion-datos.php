<?php
// shared/gestion-datos.php
// Gestión de Datos. Pestañas superiores: Gestión USD / PEN (Destinos y Categorías, Tours,
// Hoteles, Cotizaciones Guardadas de esa moneda), Itinerarios (por idioma) y Paquetes
// predefinidos (USD y PEN juntos) — estas dos últimas vía ?vista=. El caller
// (pen/gestion.php o usd/gestion.php) debe definir antes de incluir este archivo:
// $pageTitle, $currencySymbol, $navActive.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';
$navRoot = '../';
$navShared = '../shared/';
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
$heroPosY = resolverHeroPosY($db);
$accentColorStyle = resolverAccentColorStyle($db);
$logoUrl = resolverLogoUrl($db, $navShared);
// Pestañas superiores: "moneda" (Gestión USD / PEN, con sus subpestañas) o las vistas que
// no dependen de la moneda de la página: Itinerarios (por idioma) y Paquetes predefinidos
// (USD y PEN juntos).
$vista = in_array($_GET['vista'] ?? '', ['itinerarios', 'paquetes'], true) ? $_GET['vista'] : 'moneda';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <link rel="icon" type="image/png" href="../shared/favicon-outoors.png?v=<?= filemtime(__DIR__ . '/favicon-outoors.png') ?>">
    <link rel="apple-touch-icon" href="../shared/apple-touch-icon.png?v=<?= filemtime(__DIR__ . '/apple-touch-icon.png') ?>">
    <link rel="manifest" href="../shared/site.webmanifest">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../shared/cotizador.css?v=<?= filemtime(__DIR__ . '/cotizador.css') ?>">
    <link rel="stylesheet" href="../shared/tabs.css?v=<?= filemtime(__DIR__ . '/tabs.css') ?>">
    <link rel="stylesheet" href="../shared/cascade-select.css?v=<?= filemtime(__DIR__ . '/cascade-select.css') ?>">
    <link rel="stylesheet" href="../shared/sidebar.css?v=<?= filemtime(__DIR__ . '/sidebar.css') ?>">
    <link rel="stylesheet" href="../shared/hero.css?v=<?= filemtime(__DIR__ . '/hero.css') ?>">
    <link rel="stylesheet" href="../itinerario/itinerario.css?v=<?= filemtime(__DIR__ . '/../itinerario/itinerario.css') ?>">
    <link rel="stylesheet" href="../shared/catalogo.css?v=<?= filemtime(__DIR__ . '/catalogo.css') ?>">
</head>
<body<?= $accentColorStyle ? ' style="' . htmlspecialchars($accentColorStyle) . '"' : '' ?>>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($heroImagenUrl) ?>');--hero-pos-y:<?= (int) $heroPosY ?>%">
            <div class="hero-actions">
                <button type="button" id="hero-logo-btn" class="hero-edit-btn" aria-label="Cambiar el logo de tu agencia" data-tooltip="Logo de tu agencia — se muestra en el encabezado y en el PDF de tus cotizaciones."><i class="fas fa-image"></i></button>
                <input type="file" id="hero-logo-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden">
                <button type="button" id="hero-color-btn" class="hero-edit-btn" aria-label="Elegir el color de marca con el cuentagotas" data-tooltip="Color de marca — captura cualquier color con el cuentagotas y se aplica al instante a botones y acentos."><i class="fas fa-eye-dropper"></i></button>
                <input type="color" id="hero-color-input" class="hidden">
                <button type="button" id="hero-edit-btn" class="hero-edit-btn" aria-label="Cambiar la imagen de portada" data-tooltip="Imagen de portada — la foto de fondo de esta página."><i class="fas fa-camera"></i></button>
                <input type="file" id="hero-edit-input" accept="image/jpeg,image/png,image/webp" class="hidden">
            </div>
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content" id="page-hero-content">
                    <?php if ($logoUrl): ?>
                        <img src="<?= htmlspecialchars($logoUrl) ?>" alt="<?= htmlspecialchars($pageTitle) ?>" class="page-hero-logo">
                    <?php else: ?>
                        <h1><?= htmlspecialchars($pageTitle) ?></h1>
                        <p>Plataforma B2B de cotizaciones e itinerarios turísticos</p>
                    <?php endif; ?>
                </div>
            </div>
            <div class="filter-tabs-bar">
                <div class="max-w-7xl mx-auto px-4 md:px-6">
                    <div class="filter-tabs">
                        <a href="../usd/gestion.php" class="filter-tab <?= $vista === 'moneda' && $navActive === 'gestion-usd' ? 'active' : '' ?>"><i class="fas fa-database"></i>Gestión USD</a>
                        <a href="../pen/gestion.php" class="filter-tab <?= $vista === 'moneda' && $navActive === 'gestion-pen' ? 'active' : '' ?>"><i class="fas fa-database"></i>Gestión PEN</a>
                        <a href="gestion.php?vista=itinerarios" class="filter-tab <?= $vista === 'itinerarios' ? 'active' : '' ?>"><i class="fas fa-route"></i>Itinerarios</a>
                        <a href="gestion.php?vista=paquetes" class="filter-tab <?= $vista === 'paquetes' ? 'active' : '' ?>"><i class="fas fa-box-archive"></i>Paquetes predefinidos</a>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
        <div id="gestion-section" class="<?= $vista === 'moneda' ? '' : 'hidden' ?>">
            <div class="subnav-tabs-bar gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit">
                <button class="subnav-tab active" data-subtab="clasificacion">
                    <i class="fas fa-tags mr-1"></i> Destinos y Categorías
                </button>
                <button class="subnav-tab" data-subtab="tours">
                    <i class="fas fa-map-marked-alt mr-1"></i> Tours
                </button>
                <button class="subnav-tab" data-subtab="hoteles">
                    <i class="fas fa-hotel mr-1"></i> Hoteles
                </button>
                <button class="subnav-tab" data-subtab="cotizaciones">
                    <i class="fas fa-folder-open mr-1"></i> Cotizaciones Guardadas
                </button>
            </div>
            <div id="gestion-resumen" class="text-xs text-slate-500 mb-3"></div>

            <div id="gestion-tours" class="subtab-content hidden">
                <div class="card cat-card">
                    <div class="cat-header">
                        <div>
                            <h2 class="cat-title">Tours y Actividades</h2>
                            <p class="cat-subtitle"><span id="tours-count">0</span> en tu catálogo</p>
                        </div>
                        <div class="cat-tools">
                            <div class="cat-search">
                                <i class="fas fa-search"></i>
                                <input id="tours-search" type="text" placeholder="Buscar tour...">
                            </div>
                            <select id="tours-filtro-destino" class="cat-filter" aria-label="Filtrar por destino"></select>
                            <div class="relative">
                                <button type="button" id="tours-download-toggle" class="cat-icon-btn" title="Descargar CSV"><i class="fas fa-download"></i></button>
                                <div id="tours-download-menu" class="csv-download-menu hidden absolute right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-20 text-sm overflow-hidden">
                                    <button type="button" id="tours-export-btn" class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2">
                                        <i class="fas fa-file-export text-slate-400 mt-0.5"></i>
                                        <span>Mi catálogo actual<br><span class="text-xs text-slate-400">Lo que ya tienes cargado, para editarlo</span></span>
                                    </button>
                                    <a href="../shared/plantilla_tours.csv" download class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 border-t">
                                        <i class="fas fa-file-alt text-slate-400 mt-0.5"></i>
                                        <span>Plantilla de ejemplo<br><span class="text-xs text-slate-400">Para armar tu catálogo desde cero</span></span>
                                    </a>
                                </div>
                            </div>
                            <label for="tour-csv-input" class="cat-icon-btn" title="Importar desde CSV (columnas: Tour, Distr, P.Reg, P.Promo, Destino, Categoría, Precio Confidencial, Precio C. Total — las últimas 4 opcionales. Acepta separador punto y coma o coma, con o sin fila de encabezado. Compara por nombre: actualiza lo existente y crea lo nuevo, sin borrar el resto de tu catálogo)"><i class="fas fa-file-csv"></i></label>
                            <input type="file" id="tour-csv-input" accept=".csv" class="hidden">
                            <button type="button" id="tours-nuevo-toggle" class="cat-new-btn"><i class="fas fa-plus"></i>Nuevo tour</button>
                        </div>
                    </div>
                    <div id="tours-sin-destinos-hint" class="cat-hint hidden p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 flex-wrap">
                        <span><i class="fas fa-circle-info mr-1"></i>Aún no hay destinos ni categorías creados. Es recomendable crearlos primero para poder clasificar tus tours.</span>
                        <button type="button" class="text-xs px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100 whitespace-nowrap">Crear destino →</button>
                    </div>
                    <div id="tours-nuevo-panel" class="cat-new-panel hidden">
                        <h3>Nuevo tour</h3>
                        <div class="cat-form-grid">
                            <div class="cat-field cat-span-6">
                                <label for="tour-new-nombre">Nombre</label>
                                <input id="tour-new-nombre" type="text" placeholder="ej. City Tour Cusco">
                            </div>
                            <div class="cat-field cat-span-6">
                                <label>Destino / Categoría</label>
                                <div id="tour-new-destino-categoria"></div>
                            </div>
                            <div class="cat-field cat-span-4">
                                <label for="tour-new-distr">Distribuidor</label>
                                <input id="tour-new-distr" type="text" placeholder="Opcional">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="tour-new-preg">P. Regular</label>
                                <input id="tour-new-preg" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="tour-new-ppromo">P. Promo</label>
                                <input id="tour-new-ppromo" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="tour-new-pconf"><i class="fas fa-lock text-[9px] mr-1"></i>P. Confid.</label>
                                <input id="tour-new-pconf" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="tour-new-pctotal"><i class="fas fa-lock text-[9px] mr-1"></i>P. C. Total</label>
                                <input id="tour-new-pctotal" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <p class="cat-form-hint"><i class="fas fa-lock mr-1"></i>Los precios confidenciales son de uso interno: nunca se muestran en la cotización salvo que se revelen a propósito.</p>
                        </div>
                        <div class="cat-form-actions">
                            <button type="button" id="tours-nuevo-cancelar" class="btn border small">Cancelar</button>
                            <button type="button" id="tour-new-add" class="btn btn-primary small"><i class="fas fa-plus mr-1"></i>Agregar</button>
                        </div>
                    </div>
                    <div class="cat-table-wrap">
                        <table class="cat-table is-compacta">
                            <thead>
                                <tr>
                                    <th class="cat-col-name">Tour / Actividad</th>
                                    <th class="cat-col-clasif">Destino / Categoría</th>
                                    <th class="cat-col-precio">Precio venta</th>
                                    <th class="cat-col-precio"><i class="fas fa-lock text-[9px] mr-1"></i>Confidencial</th>
                                    <th class="cat-actions">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tours-table-body"></tbody>
                        </table>
                    </div>
                    <div id="tours-paginacion" class="cat-pag" hidden></div>
                </div>
                <button id="tours-guardar-flotante" type="button" class="hidden fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg">
                    <i class="fas fa-save mr-2"></i>Guardar clasificación (<span id="tours-guardar-count">0</span>)
                </button>
            </div>

            <div id="gestion-hoteles" class="subtab-content hidden">
                <div class="card cat-card">
                    <div class="cat-header">
                        <div>
                            <h2 class="cat-title">Hoteles y Hospedajes</h2>
                            <p class="cat-subtitle"><span id="hoteles-count">0</span> en tu catálogo</p>
                        </div>
                        <div class="cat-tools">
                            <div class="cat-search">
                                <i class="fas fa-search"></i>
                                <input id="hoteles-search" type="text" placeholder="Buscar alojamiento...">
                            </div>
                            <select id="hoteles-filtro-destino" class="cat-filter" aria-label="Filtrar por destino"></select>
                            <div class="relative">
                                <button type="button" id="hoteles-download-toggle" class="cat-icon-btn" title="Descargar CSV"><i class="fas fa-download"></i></button>
                                <div id="hoteles-download-menu" class="csv-download-menu hidden absolute right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-20 text-sm overflow-hidden">
                                    <button type="button" id="hoteles-export-btn" class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2">
                                        <i class="fas fa-file-export text-slate-400 mt-0.5"></i>
                                        <span>Mi catálogo actual<br><span class="text-xs text-slate-400">Lo que ya tienes cargado, para editarlo</span></span>
                                    </button>
                                    <a href="../shared/plantilla_hoteles.csv" download class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 border-t">
                                        <i class="fas fa-file-alt text-slate-400 mt-0.5"></i>
                                        <span>Plantilla de ejemplo<br><span class="text-xs text-slate-400">Para armar tu catálogo desde cero</span></span>
                                    </a>
                                </div>
                            </div>
                            <label for="hotel-csv-input" class="cat-icon-btn" title="Importar desde CSV (columnas: Alojamiento, Distr, P.Reg, P.Promo, Destino, Categoría, Precio Confidencial, Precio C. Total — las últimas 4 opcionales. Acepta separador punto y coma o coma, con o sin fila de encabezado. Compara por nombre: actualiza lo existente y crea lo nuevo, sin borrar el resto de tu catálogo)"><i class="fas fa-file-csv"></i></label>
                            <input type="file" id="hotel-csv-input" accept=".csv" class="hidden">
                            <button type="button" id="hoteles-nuevo-toggle" class="cat-new-btn"><i class="fas fa-plus"></i>Nuevo alojamiento</button>
                        </div>
                    </div>
                    <div id="hoteles-sin-destinos-hint" class="cat-hint hidden p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 flex-wrap">
                        <span><i class="fas fa-circle-info mr-1"></i>Aún no hay destinos ni categorías creados. Es recomendable crearlos primero para poder clasificar tus alojamientos.</span>
                        <button type="button" class="text-xs px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100 whitespace-nowrap">Crear destino →</button>
                    </div>
                    <div id="hoteles-nuevo-panel" class="cat-new-panel hidden">
                        <h3>Nuevo alojamiento</h3>
                        <div class="cat-form-grid">
                            <div class="cat-field cat-span-6">
                                <label for="hotel-new-nombre">Nombre</label>
                                <input id="hotel-new-nombre" type="text" placeholder="ej. Hotel Plaza Cusco">
                            </div>
                            <div class="cat-field cat-span-6">
                                <label>Destino / Categoría</label>
                                <div id="hotel-new-destino-categoria"></div>
                            </div>
                            <div class="cat-field cat-span-4">
                                <label for="hotel-new-distr">Distribuidor</label>
                                <input id="hotel-new-distr" type="text" placeholder="Opcional">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="hotel-new-preg">P. Regular</label>
                                <input id="hotel-new-preg" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="hotel-new-ppromo">P. Promo</label>
                                <input id="hotel-new-ppromo" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="hotel-new-pconf"><i class="fas fa-lock text-[9px] mr-1"></i>P. Confid.</label>
                                <input id="hotel-new-pconf" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <div class="cat-field cat-span-2">
                                <label for="hotel-new-pctotal"><i class="fas fa-lock text-[9px] mr-1"></i>P. C. Total</label>
                                <input id="hotel-new-pctotal" type="number" step="0.01" placeholder="0.00">
                            </div>
                            <p class="cat-form-hint"><i class="fas fa-lock mr-1"></i>Los precios confidenciales son de uso interno: nunca se muestran en la cotización salvo que se revelen a propósito.</p>
                        </div>
                        <div class="cat-form-actions">
                            <button type="button" id="hoteles-nuevo-cancelar" class="btn border small">Cancelar</button>
                            <button type="button" id="hotel-new-add" class="btn btn-primary small"><i class="fas fa-plus mr-1"></i>Agregar</button>
                        </div>
                    </div>
                    <div class="cat-table-wrap">
                        <table class="cat-table is-compacta">
                            <thead>
                                <tr>
                                    <th class="cat-col-name">Alojamiento</th>
                                    <th class="cat-col-clasif">Destino / Categoría</th>
                                    <th class="cat-col-precio">Precio venta</th>
                                    <th class="cat-col-precio"><i class="fas fa-lock text-[9px] mr-1"></i>Confidencial</th>
                                    <th class="cat-actions">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="hotels-table-body"></tbody>
                        </table>
                    </div>
                    <div id="hoteles-paginacion" class="cat-pag" hidden></div>
                </div>
                <button id="hoteles-guardar-flotante" type="button" class="hidden fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg">
                    <i class="fas fa-save mr-2"></i>Guardar clasificación (<span id="hoteles-guardar-count">0</span>)
                </button>
            </div>

            <div id="gestion-clasificacion" class="subtab-content">
                <div class="card p-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Destinos y Categorías</h2>
                    <p class="text-sm text-slate-500 mb-4">Los destinos son compartidos por Actividades, Hoteles e Itinerarios. Cada destino muestra cuántas actividades y hoteles tiene; elige uno a la izquierda para ver y gestionar sus categorías. Las categorías de itinerarios y los grupos Con / Sin hotel se gestionan en la pestaña <a href="gestion.php?vista=itinerarios" class="underline">Itinerarios</a>.</p>
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div class="lg:col-span-4 border rounded-lg p-3">
                            <h3 class="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Destinos</h3>
                            <div class="flex gap-2 mb-3">
                                <input id="destino-new-nombre" class="input flex-1 rounded px-2 py-1 border text-sm" type="text" placeholder="Nuevo destino (ej. Cusco)">
                                <button id="destino-new-add" class="btn btn-primary px-3" title="Agregar destino"><i class="fas fa-plus"></i></button>
                            </div>
                            <div id="destinos-table-body" class="divide-y" style="max-height:420px; overflow-y:auto"></div>
                        </div>
                        <div class="lg:col-span-8 border rounded-lg p-3">
                            <div class="flex items-center gap-3 mb-3 flex-wrap">
                                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categorías <span id="categorias-destino-actual" class="text-slate-400 normal-case font-normal"></span></h3>
                                <div class="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 sm:ml-auto">
                                    <button class="categoria-tipo-tab active" data-categoria-tipo="tours">Actividades</button>
                                    <button class="categoria-tipo-tab" data-categoria-tipo="hoteles">Hoteles</button>
                                </div>
                            </div>
                            <p id="categorias-sin-destino" class="text-sm text-slate-500 hidden">Crea un destino para empezar a agregar categorías.</p>
                            <div id="categorias-table-wrap">
                                <div class="flex gap-2 mb-3">
                                    <input id="categoria-new-nombre" class="input flex-1 rounded px-2 py-1 border text-sm" type="text" placeholder="Nueva categoría">
                                    <button id="categoria-new-add" class="btn btn-primary px-3" title="Agregar categoría"><i class="fas fa-plus"></i></button>
                                </div>
                                <div id="categorias-table-body" class="divide-y" style="max-height:420px; overflow-y:auto"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cotizaciones Guardadas: antes pestaña del Cotizador, ahora acá — mismos ids
                 que usaba (cot-search, cot-nueva, cot-table-body, cot-page-info, cot-prev,
                 cot-next), ver shared/gestion-datos.js. -->
            <div id="gestion-cotizaciones" class="subtab-content hidden">
                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h2 class="text-base font-semibold text-slate-800">Cotizaciones Guardadas de mi agencia</h2>
                        <div class="flex items-center gap-2 flex-wrap">
                            <div class="relative">
                                <input id="cot-search" class="input rounded px-2 py-2 border pl-8 text-sm" type="text" placeholder="Buscar por ID, Nombre o Contacto...">
                                <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            </div>
                            <button id="cot-nueva" class="btn btn-primary">
                                <i class="fas fa-plus-circle mr-2"></i>Nueva Cotización
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full small" style="min-width:640px">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">ID</th>
                                    <th class="text-left p-3">Nombre PAX</th>
                                    <th class="text-left p-3">Contacto</th>
                                    <th class="text-left p-3">Fecha Cot.</th>
                                    <th class="text-left p-3">N° PAX</th>
                                    <th class="text-left p-3">Paquete</th>
                                    <th class="text-right p-3 w-14">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="cot-table-body"></tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-4 text-sm text-slate-600">
                        <span id="cot-page-info"></span>
                        <div class="flex gap-2">
                            <button id="cot-prev" class="btn border">Anterior</button>
                            <button id="cot-next" class="btn border">Siguiente</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista "Itinerarios" (pestaña superior, ?vista=itinerarios): no depende de la moneda,
             sí del idioma — cada idioma tiene su propio catálogo de itinerarios y páginas fijas
             (las pestañas .idioma-tab las maneja itinerario.js). Mismos ids que la página
             standalone de Itinerario (itinerario/index.php); sus paneles internos usan
             itin-panel en vez de subtab-content para no chocar con las subpestañas de moneda. -->
        <div id="vista-itinerarios" class="<?= $vista === 'itinerarios' ? '' : 'hidden' ?>">
            <!-- Primero Destinos y Categorías; a su lado los idiomas (inglés primero), cada uno con
                 su catálogo de itinerarios y páginas fijas (ver initPestanasItinerarios en
                 gestion-datos.js). -->
            <div class="flex flex-wrap gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit" id="itinerario-idioma-tabs">
                <button type="button" class="subnav-tab active" data-itin-vista="clasificacion"><i class="fas fa-tags mr-1"></i> Destinos y Categorías</button>
                <button type="button" class="subnav-tab idioma-tab" data-idioma="en"><i class="fas fa-language mr-1"></i> English</button>
                <button type="button" class="subnav-tab idioma-tab" data-idioma="es"><i class="fas fa-language mr-1"></i> Español</button>
                <button type="button" class="subnav-tab idioma-tab" data-idioma="pt"><i class="fas fa-language mr-1"></i> Português</button>
            </div>

            <!-- Destinos y Categorías de Itinerarios: Con pernocte y Sin pernocte (grupo padre,
                 migraciones 032 y 034) tienen cada uno sus propios destinos — puede haber un
                 "Cusco" en cada uno — y estos son solo de Itinerarios: Actividades y Hoteles usan
                 los destinos sin grupo. Las categorías son las propias de Itinerarios. Ver
                 CLASIF_CTX.itin en gestion-datos.js. -->
            <div id="itin-clasificacion">
                <div class="flex flex-wrap gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit" id="itin-grupos-tabs"></div>
                <div class="card p-6">
                    <p class="text-sm text-slate-500 mb-4"><strong>Con hotel</strong> y <strong>Sin hotel</strong> tienen cada uno sus propios destinos y categorías (puede haber un mismo nombre, como "Cusco", en los dos). Elige un destino para ver y gestionar sus categorías. Estos destinos son solo de Itinerarios; los de Actividades y Hoteles se gestionan en Gestión USD / PEN.</p>
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div class="lg:col-span-5 border rounded-lg p-3">
                            <h3 class="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Destinos</h3>
                            <div id="itin-destino-new-wrap" class="flex gap-2 mb-3">
                                <input id="itin-destino-new-nombre" class="input flex-1 rounded px-2 py-1 border text-sm" type="text" placeholder="Nuevo destino (ej. Cusco)">
                                <button id="itin-destino-new-add" class="btn btn-primary px-3" title="Agregar destino en este grupo"><i class="fas fa-plus"></i></button>
                            </div>
                            <div id="itin-destinos-table-body" class="divide-y" style="max-height:480px; overflow-y:auto"></div>
                        </div>
                        <div class="lg:col-span-7 border rounded-lg p-3">
                            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Categorías de itinerarios <span id="itin-categorias-destino-actual" class="text-slate-400 normal-case font-normal"></span></h3>
                            <p id="itin-categorias-sin-destino" class="text-sm text-slate-500 hidden">Elige o crea un destino para empezar a agregar categorías.</p>
                            <div id="itin-categorias-table-wrap">
                                <div class="flex gap-2 mb-3">
                                    <input id="itin-categoria-new-nombre" class="input flex-1 rounded px-2 py-1 border text-sm" type="text" placeholder="Nueva categoría (ej. Full Day)">
                                    <button id="itin-categoria-new-add" class="btn btn-primary px-3" title="Agregar categoría"><i class="fas fa-plus"></i></button>
                                </div>
                                <div id="itin-categorias-table-body" class="divide-y" style="max-height:480px; overflow-y:auto"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="gestion-itinerarios" class="hidden">
                <!-- Por idioma: primero Páginas Fijas, después Itinerarios. Ambos se suben en lote
                     (varios PDF a la vez; el título sale del nombre del archivo, ver
                     initSubidaMasiva en itinerario.js). -->
                <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit" id="itinerario-gestion-subtabs">
                    <button class="subnav-tab active" data-subtab="paginas">
                        <i class="fas fa-file-alt mr-1"></i>Páginas Fijas
                    </button>
                    <button class="subnav-tab" data-subtab="modulos">
                        <i class="fas fa-file-pdf mr-1"></i>Itinerarios
                    </button>
                </div>

                <!-- Páginas Fijas: subida en lote + tablero para arrastrar cada página a
                     Presentación (inicio del PDF) o Cierre (final), en el orden en que quedan.
                     Se guarda solo al soltar (api.php?path=guardar-config de este idioma). -->
                <div id="itinerario-gestion-paginas" class="itin-panel">
                    <div class="card cat-card">
                        <div class="cat-header">
                            <div>
                                <h2 class="cat-title">Páginas Fijas</h2>
                                <p class="cat-subtitle"><span id="paginas-fijas-count">0 páginas</span> · arrástralas a Presentación o Cierre</p>
                            </div>
                            <div class="cat-tools">
                                <button type="button" id="paginas-nuevo-toggle" class="cat-new-btn"><i class="fas fa-upload"></i>Subir PDFs</button>
                            </div>
                        </div>
                        <div id="paginas-nuevo-panel" class="cat-new-panel hidden">
                            <h3>Subir páginas fijas (PDF)</h3>
                            <label class="pdf-drop" for="paginas-pdf-input">
                                <i class="fas fa-file-arrow-up"></i>
                                <span><strong>Elige o arrastra aquí</strong> uno o varios PDF</span>
                                <small>El título de cada página será el nombre del archivo (los guiones pasan a espacios).</small>
                                <input type="file" id="paginas-pdf-input" accept=".pdf,application/pdf" multiple class="hidden">
                            </label>
                            <div id="paginas-subida-lista" class="subida-lista"></div>
                            <div class="cat-form-actions">
                                <button type="button" id="paginas-nuevo-cancelar" class="btn border small">Cancelar</button>
                                <button type="button" id="paginas-subir-btn" class="btn btn-primary small" disabled><i class="fas fa-upload mr-1"></i>Subir</button>
                            </div>
                        </div>
                        <div class="pf-board">
                            <div class="pf-zona" data-zona="sin">
                                <div class="pf-zona-head"><i class="fas fa-inbox"></i>Sin asignar <span class="conteo-badge" data-conteo="sin">0</span></div>
                                <p class="pf-zona-hint">Recién subidas o que no van en el itinerario.</p>
                                <div class="pf-lista" id="pf-zona-sin"></div>
                            </div>
                            <div class="pf-zona" data-zona="start">
                                <div class="pf-zona-head"><i class="fas fa-flag"></i>Páginas de Presentación <span class="conteo-badge" data-conteo="start">0</span></div>
                                <p class="pf-zona-hint">Van al inicio del PDF, en este orden.</p>
                                <div class="pf-lista" id="pf-zona-start"></div>
                            </div>
                            <div class="pf-zona" data-zona="end">
                                <div class="pf-zona-head"><i class="fas fa-flag-checkered"></i>Páginas de Cierre <span class="conteo-badge" data-conteo="end">0</span></div>
                                <p class="pf-zona-hint">Van al final del PDF, en este orden.</p>
                                <div class="pf-lista" id="pf-zona-end"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mismo componente que Tours / Hoteles (shared/catalogo.css); mismos ids que
                     lee itinerario.js. -->
                <div id="itinerario-gestion-modulos" class="itin-panel hidden">
                    <div class="card cat-card">
                        <div class="cat-header">
                            <div>
                                <h2 class="cat-title">Itinerarios</h2>
                                <p class="cat-subtitle"><span id="itinerario-modulos-count">0</span> en tu catálogo</p>
                            </div>
                            <div class="cat-tools">
                                <div class="cat-search">
                                    <i class="fas fa-search"></i>
                                    <input id="itinerario-modulos-search" type="text" placeholder="Buscar itinerario...">
                                </div>
                                <button type="button" id="itinerarios-nuevo-toggle" class="cat-new-btn"><i class="fas fa-upload"></i>Subir PDFs</button>
                            </div>
                        </div>
                        <div id="itinerarios-nuevo-panel" class="cat-new-panel hidden">
                            <h3>Subir itinerarios (PDF)</h3>
                            <label class="pdf-drop" for="itinerary-module-pdf">
                                <i class="fas fa-file-arrow-up"></i>
                                <span><strong>Elige o arrastra aquí</strong> uno o varios PDF</span>
                                <small>El título de cada itinerario será el nombre del archivo (los guiones pasan a espacios).</small>
                                <input type="file" id="itinerary-module-pdf" accept=".pdf,application/pdf" multiple class="hidden">
                            </label>
                            <div id="itinerarios-subida-lista" class="subida-lista"></div>
                            <form id="itinerary-upload-form" class="cat-form-grid mt-3" onsubmit="return false">
                                <div class="cat-field cat-span-6">
                                    <label for="itinerary-module-destino">Destino <span class="normal-case font-normal">(para todos los de este lote, opcional)</span></label>
                                    <select id="itinerary-module-destino">
                                        <option value="">Sin clasificar</option>
                                    </select>
                                </div>
                                <div class="cat-field cat-span-6">
                                    <label for="itinerary-module-categoria">Categoría</label>
                                    <select id="itinerary-module-categoria" disabled>
                                        <option value="">—</option>
                                    </select>
                                </div>
                            </form>
                            <div class="cat-form-actions">
                                <button type="button" id="itinerarios-nuevo-cancelar" class="btn border small">Cancelar</button>
                                <button type="button" id="upload-local-module" class="btn btn-primary small" disabled><i class="fas fa-upload mr-1"></i>Subir</button>
                            </div>
                        </div>
                        <div class="cat-table-wrap">
                            <table class="cat-table">
                                <thead>
                                    <tr>
                                        <th class="cat-col-name">Itinerario</th>
                                        <th class="cat-col-clasif">Destino / Categoría</th>
                                        <th class="cat-actions">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="itinerario-modulos-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <button id="modulos-guardar-flotante" type="button" class="hidden fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg">
                        <i class="fas fa-save mr-2"></i>Guardar clasificación (<span id="modulos-guardar-count">0</span>)
                    </button>
                </div>
            </div>
        </div>

        <!-- Vista "Paquetes predefinidos" (pestaña superior, ?vista=paquetes): los paquetes son
             por moneda (usan los tours/hoteles de ese catálogo), así que se listan USD y PEN
             juntos. Acá solo se ven / eliminan; se crean y editan en el Cotizador de su moneda
             ("Guardar como paquete" / ?editarPaquete=ID, ver shared/cotizador.js). -->
        <div id="vista-paquetes" class="<?= $vista === 'paquetes' ? '' : 'hidden' ?> space-y-6">
            <div class="card cat-card">
                <div class="cat-header">
                    <div>
                        <h2 class="cat-title">Paquetes USD</h2>
                        <p class="cat-subtitle"><span id="paquetes-count-usd">0 paquetes</span> · se aplican en el Cotizador USD</p>
                    </div>
                    <div class="cat-tools">
                        <a href="../usd/index.php" class="cat-new-btn" title="Arma Itinerario, Actividades y Hoteles en el Cotizador USD y usa «Guardar como paquete»"><i class="fas fa-plus"></i>Crear en el Cotizador USD</a>
                    </div>
                </div>
                <div id="paquetes-list-usd" class="space-y-2 p-5"></div>
            </div>
            <div class="card cat-card">
                <div class="cat-header">
                    <div>
                        <h2 class="cat-title">Paquetes PEN</h2>
                        <p class="cat-subtitle"><span id="paquetes-count-pen">0 paquetes</span> · se aplican en el Cotizador PEN</p>
                    </div>
                    <div class="cat-tools">
                        <a href="../pen/index.php" class="cat-new-btn" title="Arma Itinerario, Actividades y Hoteles en el Cotizador PEN y usa «Guardar como paquete»"><i class="fas fa-plus"></i>Crear en el Cotizador PEN</a>
                    </div>
                </div>
                <div id="paquetes-list-pen" class="space-y-2 p-5"></div>
            </div>
        </div>
        </div>
        </div>
    </div>

    <script>
        window.APP_CONFIG = {
            currencySymbol: <?= json_encode($currencySymbol) ?>,
            monedaCodigo: <?= json_encode($navActive === 'gestion-usd' ? 'usd' : 'pen') ?>,
            vista: <?= json_encode($vista) ?>
        };
    </script>
    <link rel="stylesheet" href="../shared/notify.css?v=<?= filemtime(__DIR__ . '/notify.css') ?>">
    <script src="../shared/notify.js?v=<?= filemtime(__DIR__ . '/notify.js') ?>"></script>
    <script>window.ME_API_URL = '../shared/mi-empresa-api.php'; window.HERO_ASSET_BASE = '../shared/';</script>
    <script src="../shared/hero-edit.js?v=<?= filemtime(__DIR__ . '/hero-edit.js') ?>"></script>
    <script src="../shared/cascade-select.js?v=<?= filemtime(__DIR__ . '/cascade-select.js') ?>"></script>
    <script>window.ITINERARIO_API_BASE = '../itinerario/';</script>
    <script src="../itinerario/itinerario.js?v=<?= filemtime(__DIR__ . '/../itinerario/itinerario.js') ?>"></script>
    <script src="../shared/catalogo-shared.js?v=<?= filemtime(__DIR__ . '/catalogo-shared.js') ?>"></script>
    <script src="../shared/gestion-datos.js?v=<?= filemtime(__DIR__ . '/gestion-datos.js') ?>"></script>
</body>
</html>
