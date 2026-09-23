<?php
// itinerario/index.php
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/agencia-helpers.php';
require_login();
$navRoot = '../';
$navShared = '../shared/';
$navActive = 'itinerario';
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
$accentColorStyle = resolverAccentColorStyle($db);
$logoUrl = resolverLogoUrl($db, $navShared);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Itinerarios</title>
    <link rel="icon" type="image/png" href="../shared/favicon-outoors.png?v=<?= filemtime(__DIR__ . '/../shared/favicon-outoors.png') ?>">

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
    <script src="https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="itinerario.css?v=<?= filemtime(__DIR__ . '/itinerario.css') ?>">
    <link rel="stylesheet" href="../shared/sidebar.css?v=<?= filemtime(__DIR__ . '/../shared/sidebar.css') ?>">
    <link rel="stylesheet" href="../shared/hero.css?v=<?= filemtime(__DIR__ . '/../shared/hero.css') ?>">
    <link rel="stylesheet" href="../shared/cascade-select.css?v=<?= filemtime(__DIR__ . '/../shared/cascade-select.css') ?>">
</head>
<body<?= $accentColorStyle ? ' style="' . htmlspecialchars($accentColorStyle) . '"' : '' ?>>
    <?php require __DIR__ . '/../shared/sidebar.php'; ?>

    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($heroImagenUrl) ?>')">
            <div class="hero-actions">
                <button type="button" id="hero-logo-btn" class="hero-edit-btn" title="Agregar/cambiar el logo de tu empresa"><i class="fas fa-image"></i></button>
                <input type="file" id="hero-logo-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden">
                <button type="button" id="hero-color-btn" class="hero-edit-btn" title="Elegir color de marca (cuentagotas)"><i class="fas fa-eye-dropper"></i></button>
                <input type="color" id="hero-color-input" class="hidden">
                <button type="button" id="hero-edit-btn" class="hero-edit-btn" title="Cambiar imagen del Hero de tu empresa"><i class="fas fa-camera"></i></button>
                <input type="file" id="hero-edit-input" accept="image/jpeg,image/png,image/webp" class="hidden">
            </div>
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content" id="page-hero-content">
                    <?php if ($logoUrl): ?>
                        <img src="<?= htmlspecialchars($logoUrl) ?>" alt="Generador de Itinerarios" class="page-hero-logo">
                    <?php else: ?>
                        <h1>Generador de Itinerarios</h1>
                        <p>Plataforma B2B de cotizaciones e itinerarios turísticos</p>
                    <?php endif; ?>
                </div>
            </div>
            <div class="filter-tabs-bar">
                <div class="max-w-7xl mx-auto px-4 md:px-6">
                    <div class="filter-tabs" id="idioma-tabs">
                        <button type="button" class="filter-tab idioma-tab active" data-idioma="en">English</button>
                        <button type="button" class="filter-tab idioma-tab" data-idioma="es">Español</button>
                        <button type="button" class="filter-tab idioma-tab" data-idioma="pt">Português</button>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">

        <div class="flex mb-6 bg-white rounded-xl p-1 shadow-md" id="itinerario-main-tabs">
            <button class="nav-tab flex-1 py-3 px-4 rounded-xl font-medium active" data-tab="itinerario">
                <i class="fas fa-route mr-2"></i>Nuevo Itinerario
            </button>
            <button class="nav-tab flex-1 py-3 px-4 rounded-xl font-medium" data-tab="gestion">
                <i class="fas fa-cog mr-2"></i>Gestión de Módulos
            </button>
        </div>

        <div id="itinerario-section" class="tab-content">
            <div class="card p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="itinerary-passenger" class="font-medium text-slate-700">Nombre del Pasajero</label>
                        <input type="text" id="itinerary-passenger" placeholder="Ej: Juan Perez" class="w-full border rounded p-2 mt-1">
                    </div>
                    <div>
                        <label for="itinerary-title" class="font-medium text-slate-700">Título del Paquete</label>
                        <input type="text" id="itinerary-title" placeholder="Ej: Cusco Mágico 4 Días" class="w-full border rounded p-2 mt-1">
                    </div>
                </div>

                <div class="flex items-center gap-2 mb-3">
                    <select id="itinerario-aplicar-paquete-select" class="flex-1 border rounded p-2">
                        <option value="">Aplicar itinerario predeterminado...</option>
                    </select>
                    <button id="itinerario-historial-btn" type="button" class="btn btn-secondary small" title="Reusar un itinerario ya generado">
                        <i class="fas fa-clock-rotate-left mr-1"></i>Historial
                    </button>
                    <button id="itinerario-limpiar-builder" type="button" class="btn btn-secondary small" title="Limpiar el armador">Limpiar</button>
                </div>

                <div class="itinerary-table-container">
                    <table class="w-full">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="p-2 w-8">&nbsp;</th>
                                <th class="p-2 text-left w-24">Día</th>
                                <th class="p-2 text-left">Tour / Documento</th>
                                <th class="p-2 w-16">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="itinerary-builder-body"></tbody>
                    </table>
                </div>

                <div class="flex items-center gap-2 mt-4">
                    <button id="add-itinerary-row" class="btn btn-secondary">+ Añadir Fila</button>
                    <button id="generate-itinerary" class="btn btn-primary"><i class="fas fa-file-pdf mr-2"></i>Generar Itinerario</button>
                </div>
            </div>
        </div>

        <div id="gestion-section" class="tab-content hidden">
            <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit" id="itinerario-gestion-subtabs">
                <button class="subnav-tab active" data-subtab="modulos">
                    <i class="fas fa-file-pdf mr-1"></i>Módulos
                </button>
                <button class="subnav-tab" data-subtab="predeterminados">
                    <i class="fas fa-layer-group mr-1"></i>Itinerarios Predeterminados
                </button>
                <button class="subnav-tab" data-subtab="paginas">
                    <i class="fas fa-file-alt mr-1"></i>Páginas Fijas
                </button>
                <button class="subnav-tab" data-subtab="historial">
                    <i class="fas fa-clock-rotate-left mr-1"></i>Itinerarios Generados
                </button>
            </div>

            <div id="itinerario-gestion-modulos" class="subtab-content">
                <div class="card p-6 mb-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Subir Nuevo Módulo PDF</h2>
                    <form id="itinerary-upload-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="md:col-span-2">
                            <label for="itinerary-module-title" class="font-medium text-slate-700">Título del Módulo</label>
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
                        <button type="button" id="upload-local-module" class="btn btn-primary md:col-span-2">Subir Módulo</button>
                    </form>
                </div>

                <div class="card p-6">
                    <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <h2 class="text-xl font-semibold text-slate-800 whitespace-nowrap">Módulos Existentes</h2>
                        <div class="relative">
                            <input id="itinerario-modulos-search" class="rounded-lg pl-8 pr-3 py-1.5 border text-sm w-64" type="text" placeholder="Buscar módulo...">
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

            <div id="itinerario-gestion-predeterminados" class="subtab-content hidden">
                <div class="card p-6 mb-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-1">Nuevo Itinerario Predeterminado</h2>
                    <p class="text-sm text-slate-500 mb-4">Guarda una secuencia de módulos predefinida (por ejemplo, los días de un paquete típico) para insertarla completa en el armador de un clic.</p>
                    <input id="itinerario-paquete-nombre" class="w-full rounded px-3 py-2 border mb-3" type="text" placeholder="Nombre del itinerario predeterminado (ej. Cusco 4 días)">
                    <div id="itinerario-paquete-builder-rows" class="space-y-2 mb-3"></div>
                    <div class="flex flex-wrap gap-2">
                        <button id="itinerario-paquete-add-row" class="btn btn-secondary"><i class="fas fa-plus mr-1"></i>Agregar Módulo</button>
                        <button id="itinerario-paquete-guardar" class="btn btn-primary"><i class="fas fa-save mr-1"></i>Guardar Itinerario Predeterminado</button>
                        <button id="itinerario-paquete-cancelar-edicion" class="btn btn-secondary hidden"><i class="fas fa-times mr-1"></i>Cancelar edición</button>
                    </div>
                </div>
                <div class="card p-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Itinerarios Predeterminados Guardados</h2>
                    <div id="itinerario-paquetes-list" class="space-y-2"></div>
                </div>
            </div>

            <div id="itinerario-gestion-paginas" class="subtab-content hidden">
                <div class="card p-6 mb-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Subir Nueva Página Fija</h2>
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
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Páginas Fijas Existentes</h2>
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
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Configuración de Páginas Fijas</h2>

                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-slate-700 mb-2">Páginas de Presentación</h3>
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
                        <h3 class="text-lg font-semibold text-slate-700 mb-2">Páginas de Cierre</h3>
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

            <div id="itinerario-gestion-historial" class="subtab-content hidden">
                <div class="card p-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-4">Itinerarios Generados</h2>
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
        </div>
        </div>
    </div>

    <div id="loading-modal" class="modal">
        <div class="itinerario-loading-content">
            <h3 class="text-lg font-semibold mb-4">Generando PDF</h3>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div id="progress-bar" class="bg-cyan-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p id="loading-status" class="text-sm">Cargando fuentes...</p>
        </div>
    </div>

    <div id="itinerario-historial-modal" class="modal">
        <div class="historial-modal-content">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-slate-800">Reusar un itinerario generado</h3>
                <button id="itinerario-historial-close" class="text-slate-400 hover:text-slate-600" title="Cerrar"><i class="fas fa-times fa-lg"></i></button>
            </div>
            <div class="relative mb-3">
                <input id="itinerario-historial-search" class="rounded-lg pl-8 pr-3 py-1.5 border text-sm w-full" type="text" placeholder="Buscar por pasajero o título...">
                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            </div>
            <div id="itinerario-historial-reusar-list" class="flex-1 overflow-y-auto space-y-2 pr-1"></div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t text-sm text-slate-600">
                <span id="itinerario-historial-page-info"></span>
                <div class="flex gap-2">
                    <button id="itinerario-historial-prev" class="btn btn-secondary small">Anterior</button>
                    <button id="itinerario-historial-next" class="btn btn-secondary small">Siguiente</button>
                </div>
            </div>
        </div>
    </div>

    <div id="itinerario-pdf-preview-modal" class="modal">
        <div class="pdf-preview-content">
            <div class="pdf-preview-header">
                <h3 id="itinerario-pdf-preview-title" class="text-lg font-semibold text-slate-800">Vista previa</h3>
                <button id="itinerario-pdf-preview-close" class="text-slate-400 hover:text-slate-600" title="Cerrar"><i class="fas fa-times fa-lg"></i></button>
            </div>
            <iframe id="itinerario-pdf-preview-frame" class="pdf-preview-frame"></iframe>
            <div class="pdf-preview-footer">
                <button id="itinerario-pdf-preview-seguir-editando" class="btn btn-secondary hidden"><i class="fas fa-pen mr-2"></i>Seguir editando</button>
                <button id="itinerario-pdf-preview-download" class="btn btn-primary"><i class="fas fa-download mr-2"></i>Descargar PDF</button>
            </div>
        </div>
    </div>

    <link rel="stylesheet" href="../shared/notify.css?v=<?= filemtime(__DIR__ . '/../shared/notify.css') ?>">
    <script src="../shared/notify.js?v=<?= filemtime(__DIR__ . '/../shared/notify.js') ?>"></script>
    <script>window.ME_API_URL = '../shared/mi-empresa-api.php'; window.HERO_ASSET_BASE = '../shared/';</script>
    <script src="../shared/hero-edit.js?v=<?= filemtime(__DIR__ . '/../shared/hero-edit.js') ?>"></script>
    <script src="../shared/cascade-select.js?v=<?= filemtime(__DIR__ . '/../shared/cascade-select.js') ?>"></script>
    <script src="itinerario.js?v=<?= filemtime(__DIR__ . '/itinerario.js') ?>"></script>
</body>
</html>
