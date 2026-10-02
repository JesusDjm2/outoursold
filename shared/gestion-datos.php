<?php
// shared/gestion-datos.php
// Gestión de Datos (Destinos y Categorías, Paquetes, Tours, Hoteles, Itinerarios), antes
// una pestaña embebida en Cotizador — ahora su propia vista, con botón propio en el menú
// lateral. El caller (pen/gestion.php o usd/gestion.php) debe definir antes de incluir
// este archivo: $pageTitle, $currencySymbol, $navActive.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';
$navRoot = '../';
$navShared = '../shared/';
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
$heroPosY = resolverHeroPosY($db);
$accentColorStyle = resolverAccentColorStyle($db);
$logoUrl = resolverLogoUrl($db, $navShared);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <link rel="icon" type="image/png" href="../shared/favicon-outoors.png?v=<?= filemtime(__DIR__ . '/favicon-outoors.png') ?>">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../shared/cotizador.css?v=<?= filemtime(__DIR__ . '/cotizador.css') ?>">
    <link rel="stylesheet" href="../shared/tabs.css?v=<?= filemtime(__DIR__ . '/tabs.css') ?>">
    <link rel="stylesheet" href="../shared/cascade-select.css?v=<?= filemtime(__DIR__ . '/cascade-select.css') ?>">
    <link rel="stylesheet" href="../shared/sidebar.css?v=<?= filemtime(__DIR__ . '/sidebar.css') ?>">
    <link rel="stylesheet" href="../shared/hero.css?v=<?= filemtime(__DIR__ . '/hero.css') ?>">
    <link rel="stylesheet" href="../itinerario/itinerario.css?v=<?= filemtime(__DIR__ . '/../itinerario/itinerario.css') ?>">
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
                        <a href="../usd/gestion.php" class="filter-tab <?= $navActive === 'gestion-usd' ? 'active' : '' ?>"><i class="fas fa-database"></i>Gestión USD</a>
                        <a href="../pen/gestion.php" class="filter-tab <?= $navActive === 'gestion-pen' ? 'active' : '' ?>"><i class="fas fa-database"></i>Gestión PEN</a>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
        <div id="gestion-section">
            <div class="flex flex-wrap gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit">
                <button class="subnav-tab active" data-subtab="clasificacion">
                    <i class="fas fa-tags mr-1"></i> Destinos y Categorías
                </button>
                <button class="subnav-tab" data-subtab="paquetes">
                    <i class="fas fa-box-open mr-1"></i> Paquetes
                </button>
                <button class="subnav-tab" data-subtab="tours">
                    <i class="fas fa-map-marked-alt mr-1"></i> Tours
                </button>
                <button class="subnav-tab" data-subtab="hoteles">
                    <i class="fas fa-hotel mr-1"></i> Hoteles
                </button>
                <button class="subnav-tab" data-subtab="itinerarios">
                    <i class="fas fa-route mr-1"></i> Itinerarios
                </button>
            </div>
            <div id="gestion-resumen" class="text-xs text-slate-500 mb-3"></div>

            <div id="gestion-tours" class="subtab-content hidden">
                <div class="card p-6">
                    <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <h2 class="text-base font-semibold text-slate-800 whitespace-nowrap">Tours Existentes</h2>
                        <div class="flex items-center gap-1 flex-wrap flex-1 sm:flex-none justify-end">
                            <div class="relative flex-1 min-w-[160px] sm:flex-none">
                                <input id="tours-search" class="input rounded-lg pl-8 pr-3 py-1.5 border text-sm w-full sm:w-64 md:w-80" type="text" placeholder="Buscar tour...">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            </div>
                            <div class="relative">
                                <button type="button" id="tours-download-toggle" class="text-slate-400 hover:text-[#e80c13] transition p-2" title="Descargar CSV">
                                    <i class="fas fa-download text-xl"></i>
                                </button>
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
                            <label for="tour-csv-input" class="text-slate-400 hover:text-[#e80c13] transition cursor-pointer p-2" title="Importar desde CSV (columnas: Tour, Distr, P.Reg, P.Promo, Destino, Categoría, Precio Confidencial, Precio C. Total — las últimas 4 opcionales. Acepta separador punto y coma o coma, con o sin fila de encabezado. Compara por nombre: actualiza lo existente y crea lo nuevo, sin borrar el resto de tu catálogo)">
                                <i class="fas fa-file-csv text-xl"></i>
                            </label>
                            <input type="file" id="tour-csv-input" accept=".csv" class="hidden">
                        </div>
                    </div>
                    <div id="tours-sin-destinos-hint" class="hidden mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 flex-wrap">
                        <span><i class="fas fa-circle-info mr-1"></i>Aún no hay destinos ni categorías creados. Es recomendable crearlos primero para poder clasificar tus tours.</span>
                        <button type="button" class="text-xs px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100 whitespace-nowrap">Crear destino →</button>
                    </div>
                    <div class="bg-slate-50 border rounded-lg p-3 mb-4">
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Agregar nuevo tour</h3>
                        <div class="grid grid-cols-12 gap-2 small">
                            <input id="tour-new-nombre" class="input rounded px-2 py-1 border col-span-12" type="text" placeholder="Nombre del tour">
                            <div id="tour-new-destino-categoria" class="col-span-4"></div>
                            <input id="tour-new-distr" class="input rounded px-2 py-1 border col-span-2" type="text" placeholder="Distribuidor">
                            <input id="tour-new-preg" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Reg.">
                            <input id="tour-new-ppromo" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Promo">
                            <button id="tour-new-add" class="btn btn-primary col-span-2" title="Agregar tour"><i class="fas fa-plus"></i></button>
                        </div>
                        <div class="grid grid-cols-12 gap-2 small mt-2">
                            <span class="col-span-12 text-[11px] text-slate-400"><i class="fas fa-lock mr-1"></i>Precios confidenciales (uso interno, nunca se muestran en la cotización salvo que se revelen a propósito)</span>
                            <input id="tour-new-pconf" class="input rounded px-2 py-1 border text-right col-span-6" type="number" step="0.01" placeholder="Precio Confidencial">
                            <input id="tour-new-pctotal" class="input rounded px-2 py-1 border text-right col-span-6" type="number" step="0.01" placeholder="Precio C. Total">
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">Titulo</th>
                                    <th class="text-left p-3">Destino</th>
                                    <th class="text-left p-3">Categoría</th>
                                    <th class="text-left p-3">Distr.</th>
                                    <th class="text-left p-3">P. Reg.</th>
                                    <th class="text-left p-3">P. Promocional</th>
                                    <th class="text-left p-3" title="Uso interno, no se muestra en la cotización"><i class="fas fa-lock text-[10px] mr-1"></i>Precio Conf.</th>
                                    <th class="text-left p-3" title="Uso interno, no se muestra en la cotización"><i class="fas fa-lock text-[10px] mr-1"></i>Precio C. Total</th>
                                    <th class="text-left p-3">Creado por</th>
                                    <th class="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tours-table-body"></tbody>
                        </table>
                    </div>
                </div>
                <button id="tours-guardar-flotante" type="button" class="hidden fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg">
                    <i class="fas fa-save mr-2"></i>Guardar clasificación (<span id="tours-guardar-count">0</span>)
                </button>
            </div>

            <div id="gestion-hoteles" class="subtab-content hidden">
                <div class="card p-6">
                    <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <h2 class="text-base font-semibold text-slate-800 whitespace-nowrap">Hoteles Existentes</h2>
                        <div class="flex items-center gap-1 flex-wrap flex-1 sm:flex-none justify-end">
                            <div class="relative flex-1 min-w-[160px] sm:flex-none">
                                <input id="hoteles-search" class="input rounded-lg pl-8 pr-3 py-1.5 border text-sm w-full sm:w-64 md:w-80" type="text" placeholder="Buscar alojamiento...">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            </div>
                            <div class="relative">
                                <button type="button" id="hoteles-download-toggle" class="text-slate-400 hover:text-[#e80c13] transition p-2" title="Descargar CSV">
                                    <i class="fas fa-download text-xl"></i>
                                </button>
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
                            <label for="hotel-csv-input" class="text-slate-400 hover:text-[#e80c13] transition cursor-pointer p-2" title="Importar desde CSV (columnas: Alojamiento, Distr, P.Reg, P.Promo, Destino, Categoría, Precio Confidencial, Precio C. Total — las últimas 4 opcionales. Acepta separador punto y coma o coma, con o sin fila de encabezado. Compara por nombre: actualiza lo existente y crea lo nuevo, sin borrar el resto de tu catálogo)">
                                <i class="fas fa-file-csv text-xl"></i>
                            </label>
                            <input type="file" id="hotel-csv-input" accept=".csv" class="hidden">
                        </div>
                    </div>
                    <div id="hoteles-sin-destinos-hint" class="hidden mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 flex-wrap">
                        <span><i class="fas fa-circle-info mr-1"></i>Aún no hay destinos ni categorías creados. Es recomendable crearlos primero para poder clasificar tus alojamientos.</span>
                        <button type="button" class="text-xs px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100 whitespace-nowrap">Crear destino →</button>
                    </div>
                    <div class="bg-slate-50 border rounded-lg p-3 mb-4">
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Agregar nuevo alojamiento</h3>
                        <div class="grid grid-cols-12 gap-2 small">
                            <input id="hotel-new-nombre" class="input rounded px-2 py-1 border col-span-12" type="text" placeholder="Nombre del alojamiento">
                            <div id="hotel-new-destino-categoria" class="col-span-4"></div>
                            <input id="hotel-new-distr" class="input rounded px-2 py-1 border col-span-2" type="text" placeholder="Distribuidor">
                            <input id="hotel-new-preg" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Reg.">
                            <input id="hotel-new-ppromo" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Promo">
                            <button id="hotel-new-add" class="btn btn-primary col-span-2" title="Agregar alojamiento"><i class="fas fa-plus"></i></button>
                        </div>
                        <div class="grid grid-cols-12 gap-2 small mt-2">
                            <span class="col-span-12 text-[11px] text-slate-400"><i class="fas fa-lock mr-1"></i>Precios confidenciales (uso interno, nunca se muestran en la cotización salvo que se revelen a propósito)</span>
                            <input id="hotel-new-pconf" class="input rounded px-2 py-1 border text-right col-span-6" type="number" step="0.01" placeholder="Precio Confidencial">
                            <input id="hotel-new-pctotal" class="input rounded px-2 py-1 border text-right col-span-6" type="number" step="0.01" placeholder="Precio C. Total">
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">Alojamiento</th>
                                    <th class="text-left p-3">Destino</th>
                                    <th class="text-left p-3">Categoría</th>
                                    <th class="text-left p-3">Distr.</th>
                                    <th class="text-left p-3">P. Regular</th>
                                    <th class="text-left p-3">P. Promo</th>
                                    <th class="text-left p-3" title="Uso interno, no se muestra en la cotización"><i class="fas fa-lock text-[10px] mr-1"></i>Precio Conf.</th>
                                    <th class="text-left p-3" title="Uso interno, no se muestra en la cotización"><i class="fas fa-lock text-[10px] mr-1"></i>Precio C. Total</th>
                                    <th class="text-left p-3">Creado por</th>
                                    <th class="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="hotels-table-body"></tbody>
                        </table>
                    </div>
                </div>
                <button id="hoteles-guardar-flotante" type="button" class="hidden fixed bottom-6 right-6 z-40 btn btn-primary shadow-lg">
                    <i class="fas fa-save mr-2"></i>Guardar clasificación (<span id="hoteles-guardar-count">0</span>)
                </button>
            </div>

            <!-- Gestión de Itinerario embebida (itinerario/itinerario.js): catálogo de
                 itinerarios (antes "Módulos") + Páginas Fijas + historial de generados.
                 Mismos ids que la página standalone de Itinerario (itinerario/index.php),
                 salvo: sin la pestaña "Itinerarios Predeterminados" (cubierta por Paquetes,
                 arriba) y con clase itin-panel en vez de subtab-content en sus 3 paneles
                 internos — evita que el switch de pestañas de ACÁ (irASubtabGestion, en
                 cotizador.js) las tape/oculte por accidente al compartir selector. -->
            <div id="gestion-itinerarios" class="subtab-content hidden">
                <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit" id="itinerario-gestion-subtabs">
                    <button class="subnav-tab active" data-subtab="modulos">
                        <i class="fas fa-file-pdf mr-1"></i>Itinerarios
                    </button>
                    <button class="subnav-tab" data-subtab="paginas">
                        <i class="fas fa-file-alt mr-1"></i>Páginas Fijas
                    </button>
                    <button class="subnav-tab" data-subtab="historial">
                        <i class="fas fa-clock-rotate-left mr-1"></i>Itinerarios Generados
                    </button>
                </div>

                <div id="itinerario-gestion-modulos" class="itin-panel">
                    <div class="card p-6 mb-6">
                        <h2 class="text-base font-semibold text-slate-800 mb-4">Subir Nuevo Itinerario (PDF)</h2>
                        <form id="itinerary-upload-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="md:col-span-2">
                                <label for="itinerary-module-title" class="font-medium text-slate-700">Título del Itinerario</label>
                                <input type="text" id="itinerary-module-title" placeholder="Ej: Tour Valle Sagrado" class="w-full border rounded p-2 mt-1" required>
                            </div>
                            <div>
                                <label for="itinerary-module-destino" class="font-medium text-slate-700">Destino <span class="text-slate-400 font-normal">(opcional)</span></label>
                                <select id="itinerary-module-destino" class="w-full border rounded p-2 mt-1">
                                    <option value="">Sin clasificar</option>
                                </select>
                            </div>
                            <div>
                                <label for="itinerary-module-categoria" class="font-medium text-slate-700">Categoría</label>
                                <select id="itinerary-module-categoria" class="w-full border rounded p-2 mt-1" disabled>
                                    <option value="">—</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="itinerary-module-pdf" class="font-medium text-slate-700">Archivo PDF</label>
                                <input type="file" id="itinerary-module-pdf" accept=".pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mt-1" required>
                            </div>
                            <button type="button" id="upload-local-module" class="btn btn-primary md:col-span-2">Subir Itinerario</button>
                        </form>
                    </div>

                    <div class="card p-6">
                        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <h2 class="text-base font-semibold text-slate-800 whitespace-nowrap">Itinerarios Existentes</h2>
                            <div class="relative">
                                <input id="itinerario-modulos-search" class="rounded-lg pl-8 pr-3 py-1.5 border text-sm w-64" type="text" placeholder="Buscar itinerario...">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            </div>
                        </div>
                        <div class="itinerary-table-container">
                            <table class="w-full">
                                <thead class="bg-slate-50">
                                    <tr>
                                        <th class="text-left p-2">Título</th>
                                        <th class="text-left p-2">Destino</th>
                                        <th class="text-left p-2">Categoría</th>
                                        <th class="text-left p-2">Creado por</th>
                                        <th class="text-right p-2">Acciones</th>
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

                <div id="itinerario-gestion-paginas" class="itin-panel hidden">
                    <div class="card p-6 mb-6">
                        <h2 class="text-base font-semibold text-slate-800 mb-4">Subir Nueva Página Fija</h2>
                        <p class="text-sm text-slate-500 mb-4">Documentos que no se clasifican por destino ni categoría — siempre van al inicio o cierre del itinerario (portada, legalidad, términos, etc.).</p>
                        <form id="pagina-fija-upload-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="md:col-span-2">
                                <label for="pagina-fija-titulo" class="font-medium text-slate-700">Título</label>
                                <input type="text" id="pagina-fija-titulo" placeholder="Ej: Portada" class="w-full border rounded p-2 mt-1" required>
                            </div>
                            <div class="md:col-span-2">
                                <label for="pagina-fija-pdf" class="font-medium text-slate-700">Archivo PDF</label>
                                <input type="file" id="pagina-fija-pdf" accept=".pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mt-1" required>
                            </div>
                            <button type="button" id="upload-pagina-fija" class="btn btn-primary md:col-span-2">Subir Página Fija</button>
                        </form>
                    </div>

                    <div class="card p-6 mb-6">
                        <h2 class="text-base font-semibold text-slate-800 mb-4">Páginas Fijas Existentes</h2>
                        <div class="itinerary-table-container">
                            <table class="w-full">
                                <thead class="bg-slate-50">
                                    <tr>
                                        <th class="text-left p-2">Título</th>
                                        <th class="text-left p-2">Archivo</th>
                                        <th class="text-left p-2">Creado por</th>
                                        <th class="text-right p-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="paginas-fijas-table-body"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card p-4">
                        <h2 class="text-base font-semibold text-slate-800 mb-4">Configuración de Páginas Fijas</h2>

                        <div class="mb-6">
                            <h3 class="text-sm font-semibold text-slate-700 mb-2">Páginas de Presentación</h3>
                            <div class="itinerary-table-container">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="p-2 w-8">&nbsp;</th>
                                            <th class="p-2 text-left">Documento</th>
                                            <th class="p-2 w-16">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody id="start-builder-body"></tbody>
                                </table>
                            </div>
                            <button id="add-start-row" class="btn btn-secondary mt-2">+ Añadir Fila</button>
                        </div>

                        <div class="mb-6">
                            <h3 class="text-sm font-semibold text-slate-700 mb-2">Páginas de Cierre</h3>
                            <div class="itinerary-table-container">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="p-2 w-8">&nbsp;</th>
                                            <th class="p-2 text-left">Documento</th>
                                            <th class="p-2 w-16">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody id="end-builder-body"></tbody>
                                </table>
                            </div>
                            <button id="add-end-row" class="btn btn-secondary mt-2">+ Añadir Fila</button>
                        </div>

                        <button id="save-default-config" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Guardar como predeterminado</button>
                    </div>
                </div>

                <div id="itinerario-gestion-historial" class="itin-panel hidden">
                    <div class="card p-6">
                        <h2 class="text-base font-semibold text-slate-800 mb-4">Itinerarios Generados</h2>
                        <div class="flex flex-wrap items-end gap-3 mb-4">
                            <div>
                                <label for="historial-filtro-texto" class="block text-xs font-medium text-slate-600 mb-1">Pasajero o título</label>
                                <input id="historial-filtro-texto" type="text" placeholder="Buscar..." class="rounded-lg px-3 py-1.5 border text-sm w-56">
                            </div>
                            <div>
                                <label for="historial-filtro-agencia" class="block text-xs font-medium text-slate-600 mb-1">Agencia / usuario</label>
                                <select id="historial-filtro-agencia" class="rounded-lg px-3 py-1.5 border text-sm w-48">
                                    <option value="">Todos</option>
                                </select>
                            </div>
                            <div>
                                <label for="historial-filtro-desde" class="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                                <input id="historial-filtro-desde" type="date" class="rounded-lg px-3 py-1.5 border text-sm">
                            </div>
                            <div>
                                <label for="historial-filtro-hasta" class="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
                                <input id="historial-filtro-hasta" type="date" class="rounded-lg px-3 py-1.5 border text-sm">
                            </div>
                            <button id="historial-filtro-limpiar" class="btn btn-secondary">Limpiar filtros</button>
                        </div>
                        <div class="itinerary-table-container">
                            <table class="w-full">
                                <thead class="bg-slate-50">
                                    <tr>
                                        <th class="text-left p-2">Pasajero</th>
                                        <th class="text-left p-2">Título</th>
                                        <th class="text-left p-2">Generado por</th>
                                        <th class="text-left p-2">Fecha</th>
                                        <th class="text-right p-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="historial-generados-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div id="gestion-paquetes" class="subtab-content hidden">
                <div id="paquetes-sin-tours-hint" class="hidden mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 flex-wrap">
                    <span><i class="fas fa-circle-info mr-1"></i>Aún no hay tours en el catálogo. Agrega uno primero para poder incluir actividades en tus paquetes.</span>
                    <button type="button" class="text-xs px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100 whitespace-nowrap">Crear tour →</button>
                </div>
                <div class="card p-6 mb-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Nuevo Paquete</h2>
                    <p class="text-sm text-slate-500 mb-4">Combina Actividades, Hoteles e Itinerario en un solo paquete para aplicarlo completo a una cotización de un clic. Alcanza con que tenga al menos una de las tres partes.</p>
                    <input id="paquete-nombre" class="input w-full rounded px-3 py-2 border mb-4" type="text" placeholder="Nombre del paquete (ej. Cusco 4 días)">

                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-slate-700 mb-2"><i class="fas fa-person-hiking mr-1"></i>Actividades</h3>
                        <div id="paquete-builder-rows" class="space-y-2 mb-2"></div>
                        <button id="paquete-add-row" class="btn border small"><i class="fas fa-plus mr-1"></i>Agregar Actividad</button>
                    </div>

                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-slate-700 mb-2"><i class="fas fa-hotel mr-1"></i>Hoteles</h3>
                        <div id="paquete-hoteles-rows" class="space-y-2 mb-2"></div>
                        <button id="paquete-hotel-add-row" class="btn border small"><i class="fas fa-plus mr-1"></i>Agregar Hotel</button>
                    </div>

                    <div class="mb-4">
                        <div class="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <h3 class="text-sm font-semibold text-slate-700"><i class="fas fa-route mr-1"></i>Itinerario</h3>
                            <label class="text-xs text-slate-500 flex items-center gap-2">Idioma del itinerario
                                <select id="paquete-itin-idioma" class="rounded-md small border px-2 py-1">
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                    <option value="pt">Português</option>
                                </select>
                            </label>
                        </div>
                        <div id="paquete-itin-rows" class="space-y-2 mb-2"></div>
                        <button id="paquete-itin-add-row" class="btn border small"><i class="fas fa-plus mr-1"></i>Agregar Módulo</button>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <button id="paquete-guardar" class="btn btn-primary"><i class="fas fa-save mr-1"></i>Guardar Paquete</button>
                        <button id="paquete-cancelar-edicion" class="btn border hidden"><i class="fas fa-times mr-1"></i>Cancelar edición</button>
                    </div>
                </div>
                <div class="card p-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-4">Paquetes Guardados</h2>
                    <div id="paquetes-list" class="space-y-2"></div>
                </div>
            </div>

            <div id="gestion-clasificacion" class="subtab-content">
                <div class="card p-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Destinos y Categorías</h2>
                    <p class="text-sm text-slate-500 mb-4">Los destinos son compartidos por Actividades, Hoteles e Itinerarios. Cada destino muestra cuántos de cada uno tiene; elige uno a la izquierda para ver y gestionar sus categorías (y cuántos elementos hay en cada una).</p>
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div class="md:col-span-4 border rounded-lg p-3">
                            <h3 class="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Destinos</h3>
                            <div class="flex gap-2 mb-3">
                                <input id="destino-new-nombre" class="input flex-1 rounded px-2 py-1 border text-sm" type="text" placeholder="Nuevo destino (ej. Cusco)">
                                <button id="destino-new-add" class="btn btn-primary px-3" title="Agregar destino"><i class="fas fa-plus"></i></button>
                            </div>
                            <div id="destinos-table-body" class="divide-y" style="max-height:420px; overflow-y:auto"></div>
                        </div>
                        <div class="md:col-span-8 border rounded-lg p-3">
                            <div class="flex items-center gap-3 mb-3 flex-wrap">
                                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categorías <span id="categorias-destino-actual" class="text-slate-400 normal-case font-normal"></span></h3>
                                <div class="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 sm:ml-auto">
                                    <button class="categoria-tipo-tab active" data-categoria-tipo="tours">Actividades</button>
                                    <button class="categoria-tipo-tab" data-categoria-tipo="hoteles">Hoteles</button>
                                    <button class="categoria-tipo-tab" data-categoria-tipo="itinerarios">Itinerarios</button>
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
        </div>
        </div>
        </div>
    </div>

    <script>
        window.APP_CONFIG = {
            currencySymbol: <?= json_encode($currencySymbol) ?>
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
