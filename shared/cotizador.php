<?php
// shared/cotizador.php
// Plantilla única del cotizador. El caller (pen/index.php o usd/index.php) debe definir
// antes de incluir este archivo: $pageTitle, $currencySymbol, $navActive.
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
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
    <script src="https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
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
                        <a href="../usd/" class="filter-tab <?= $navActive === 'usd' ? 'active' : '' ?>"><i class="fas fa-calculator"></i>Cotizador USD</a>
                        <a href="../pen/" class="filter-tab <?= $navActive === 'pen' ? 'active' : '' ?>"><i class="fas fa-calculator"></i>Cotizador PEN</a>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
        <div class="flex mb-6 bg-white rounded-xl p-1 shadow-md">
            <button class="nav-tab flex-1 rounded-xl font-medium active" data-tab="cotizador">
                <i class="fas fa-calculator"></i><span>Cotizador</span>
            </button>
            <button class="nav-tab flex-1 rounded-xl font-medium" data-tab="cotizaciones">
                <i class="fas fa-folder-open"></i><span>Cotizaciones Guardadas</span>
            </button>
        </div>
        <div id="cotizador-section" class="tab-content">
            <main class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
                <section class="lg:col-span-1 card p-3 accordion-section" data-accordion-key="datos-pax">
                    <div class="flex items-center justify-between mb-2">
                        <button type="button" class="accordion-toggle" aria-expanded="true">
                            <i class="fas fa-chevron-down accordion-caret"></i>
                            <h2 class="text-base font-medium">Datos Pax</h2>
                        </button>
                        <span class="text-xs px-2 py-1 rounded" style="background:rgba(187,49,53,0.12);color:var(--accent-2)">ID: <span id="current-cot-id-display">Nueva</span></span>
                    </div>
                    <div class="accordion-body">
                    <form id="form-pax" class="grid grid-cols-1 gap-2 small">
                        <div class="field">
                            <select name="idioma" title="Idioma de la cotización / PDF">
                                <option value="es" selected>Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>
                        <div class="field"><input type="text" name="agente" placeholder="Agente" title="Agente que atiende esta cotización"></div>
                        <div class="field"><input type="text" name="nombre_pax" placeholder="Nombre PAX" title="Nombre completo del pasajero"></div>
                        <div class="field"><input type="number" name="edad" placeholder="Edad" title="Edad del pasajero"></div>
                        <div class="field"><input type="text" name="contacto" placeholder="Contacto (tel./correo)" title="Teléfono o correo de contacto"></div>
                        <div class="field"><input type="text" name="canal" placeholder="Canal (WhatsApp, Web...)" title="Canal por el que llegó el cliente"></div>
                        <div class="field field-prefix">
                            <span class="field-prefix-label">F. Cot.</span>
                            <input type="date" name="fecha_cot" title="Fecha de la cotización">
                        </div>
                        <div class="field field-prefix">
                            <span class="field-prefix-label">N° PAX</span>
                            <input type="number" name="n_pax" value="1" min="1" title="Número de pasajeros">
                        </div>
                        <div class="field pais-combobox" style="position:relative">
                            <input type="text" name="pais" id="input-pais" placeholder="Buscar país..." title="País de procedencia del pasajero" autocomplete="off">
                            <ul id="pais-dropdown-list" class="pais-dropdown-list hidden"></ul>
                        </div>
                        <div class="field"><input type="text" name="cod_pais" value="+51" placeholder="Cód. País" title="Código telefónico del país (se autocompleta al elegir el país, editable)"></div>
                        <div class="field">
                            <select name="dpto" disabled title="Departamento/Estado del país de origen del pasajero (se completa al elegir el país)">
                                <option value="">Elige un país primero...</option>
                            </select>
                        </div>
                        <div class="field field-overlay"><input type="date" name="f_llegada" title="Fecha de llegada"><span class="field-placeholder-overlay">F. Llegada</span></div>
                        <div class="field field-overlay"><input type="time" name="h_llegada" title="Hora de llegada"><span class="field-placeholder-overlay">H. Llegada</span></div>
                        <div class="field field-overlay"><input type="date" name="f_salida" title="Fecha de salida"><span class="field-placeholder-overlay">F. Salida</span></div>
                        <div class="field field-overlay"><input type="time" name="h_salida" title="Hora de salida"><span class="field-placeholder-overlay">H. Salida</span></div>
                    </form>
                    </div>
                </section>
                <section class="lg:col-span-3 space-y-4">
                    <div class="card p-3 accordion-section" data-accordion-key="actividades">
                        <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <button type="button" class="accordion-toggle" aria-expanded="true">
                                <i class="fas fa-chevron-down accordion-caret"></i>
                                <h2 class="text-base font-medium">Actividades</h2>
                            </button>
                            <div class="flex items-center gap-2">
                                <select id="aplicar-paquete-select" class="rounded-md small border px-2 py-1">
                                    <option value="">Aplicar paquete...</option>
                                </select>
                                <button id="historial-tours-btn" type="button" class="px-3 py-1 rounded-md small border" title="Ver actividades, hoteles e itinerarios usados en cotizaciones guardadas, para reusarlos en esta">
                                    <i class="fas fa-clock-rotate-left mr-1"></i>Historial
                                </button>
                                <button id="toggle-conf-tours" type="button" class="px-3 py-1 rounded-md small border" title="Ver y editar los precios confidenciales de esta cotización (no se guardan en el catálogo)">
                                    <i class="fas fa-eye mr-1"></i>Precios confid.
                                </button>
                            </div>
                        </div>
                        <div class="accordion-body">
                        <div class="overflow-x-auto">
                            <table id="tours-table" class="w-full small">
                                <thead>
                                    <tr>
                                        <th class="w-8 pl-2">&nbsp;</th>
                                        <th class="w-40">Fecha</th>
                                        <th class="w-full">Tour / Actividad</th>
                                        <th class="w-16">Cant.</th>
                                        <th class="w-24">Distr.</th>
                                        <th class="w-24" hidden>P.Reg</th>
                                        <th class="w-24" hidden>P.Promo</th>
                                        <th class="w-24 col-confidencial" title="Uso interno de esta cotización">Precio Conf.</th>
                                        <th class="w-24 col-confidencial" title="Uso interno de esta cotización">Precio C. Total</th>
                                        <th class="w-28">Total Línea</th>
                                        <th class="w-12 pr-2">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody id="tours-body" class="small"></tbody>
                            </table>
                        </div>
                        <div class="mt-2">
                            <button id="add-tour" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-1)">+ Fila</button>
                        </div>
                        </div>
                    </div>
                    <div class="card p-3 accordion-section" data-accordion-key="hoteles">
                         <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <button type="button" class="accordion-toggle" aria-expanded="true">
                                <i class="fas fa-chevron-down accordion-caret"></i>
                                <h2 class="text-base font-medium">Hoteles</h2>
                            </button>
                            <div class="flex items-center gap-2">
                                <button id="toggle-conf-hoteles" type="button" class="px-3 py-1 rounded-md small border" title="Ver y editar los precios confidenciales de esta cotización (no se guardan en el catálogo)">
                                    <i class="fas fa-eye mr-1"></i>Precios confid.
                                </button>
                            </div>
                        </div>
                        <div class="accordion-body">
                        <div class="overflow-x-auto">
                            <table id="hotels-table" class="w-full small">
                                <thead>
                                    <tr>
                                        <th class="w-8 pl-2">&nbsp;</th>
                                        <th class="w-32">CheckIn</th>
                                        <th class="w-32">CheckOut</th>
                                        <th class="w-full">Aloj.</th>
                                        <th class="w-24">Nº Hab.</th>
                                        <th class="w-24">Noches</th>
                                        <th class="w-24" hidden>P.Reg</th>
                                        <th class="w-24" hidden>P.Promo</th>
                                        <th class="w-32 col-confidencial" title="Uso interno de esta cotización">Precio Conf.</th>
                                        <th class="w-32 col-confidencial" title="Uso interno de esta cotización">Precio C. Total</th>
                                        <th class="w-28">Total Línea</th>
                                        <th class="w-12 pr-2">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody id="hotels-body" class="small"></tbody>
                            </table>
                        </div>
                        <div class="mt-2">
                            <button id="add-hotel" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-1)">+ Fila</button>
                        </div>
                        </div>
                    </div>
                    <div class="card p-3 accordion-section" data-accordion-key="itinerario">
                        <div class="flex items-center justify-between mb-2">
                            <button type="button" class="accordion-toggle" aria-expanded="true">
                                <i class="fas fa-chevron-down accordion-caret"></i>
                                <h2 class="text-base font-medium">Itinerario</h2>
                            </button>
                        </div>
                        <div class="accordion-body">
                        <!-- Pasajero y título ya quedan ligados a la cotización (Nombre PAX y un título
                             autogenerado a partir de este, ver el listener de nombre_pax en cotizador.js)
                             en vez de pedirlos aparte acá; los inputs se mantienen ocultos porque
                             itinerario.js (compartido con la vista standalone) sigue leyéndolos. -->
                        <input type="text" id="itinerary-passenger" class="hidden">
                        <input type="text" id="itinerary-title" class="hidden">
                        <!-- El "aplicar itinerario predeterminado" viejo (solo itinerario) se quitó: el
                             selector "Aplicar paquete..." de Actividades ya cubre itinerario junto con
                             actividades y hoteles (ver #aplicar-paquete-select). -->
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <button id="itinerario-historial-btn" type="button" class="px-3 py-1 rounded-md small border" title="Reusar un itinerario ya generado">
                                <i class="fas fa-clock-rotate-left mr-1"></i>Historial
                            </button>
                        </div>
                        <div class="itinerary-table-container">
                            <table class="w-full small">
                                <thead>
                                    <tr>
                                        <th class="p-2 w-8">&nbsp;</th>
                                        <th class="p-2 text-left w-20">Día</th>
                                        <th class="p-2 text-left">Tour / Documento</th>
                                        <th class="p-2 w-16">Acción</th>
                                    </tr>
                                </thead>
                                <tbody id="itinerary-builder-body"></tbody>
                            </table>
                        </div>
                        <!-- Sin botón propio de generar: "Guardar" (Resumen de Factura) ya genera el PDF
                             del itinerario junto con el de la cotización si hay módulos armados acá. El
                             aviso de abajo lo hace descubrible, porque Guardar queda varios scrolls más abajo. -->
                        <div class="flex flex-wrap items-center gap-2 mt-3">
                            <button id="add-itinerary-row" type="button" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-1)">+ Fila</button>
                            <span class="small text-slate-500">El PDF del itinerario se genera junto con la cotización al presionar Guardar.</span>
                        </div>
                        </div>
                    </div>
                    <div class="card p-0 overflow-hidden">
                        <div class="px-4 py-3 accent-header flex items-center justify-between">
                            <h3 class="text-white font-semibold">Resumen de Factura</h3>
                        </div>
                        <div class="p-4 small">
                            <div class="grid grid-cols-1 md:grid-cols-10 gap-4">
                                <div class="md:col-span-7 flex flex-col">
                                    <label class="block text-slate-700 font-medium mb-1">Notas Adicionales</label>
                                    <div class="rte">
                                        <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                                            <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                                            <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                                            <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                                            <span class="rte-sep"></span>
                                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                                        </div>
                                        <div id="notas_cotizacion" class="rte-editor flex-1" contenteditable="true" data-placeholder="Cualquier nota para el cliente..."></div>
                                    </div>
                                </div>
                                <div class="md:col-span-3">
                                    <div class="grid grid-cols-2 gap-2 items-center">
                                        <div class="text-slate-600">P.V. Regular</div>
                                        <div class="text-right font-semibold" id="pv-regular"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                        <div class="text-slate-600">P.V. Promo</div>
                                        <div class="text-right font-semibold" id="pv-promo"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                        <div class="text-slate-600">Total descuento</div>
                                        <div class="text-right" id="total-desc"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                        <div class="text-slate-600">Precio adicional</div>
                                        <div><input id="precio-adicional" class="input w-full text-right rounded px-2 py-1 border" type="number" step="0.01" min="0" value="0"></input></div>
                                        <div class="text-slate-600">Descuento especial</div>
                                        <div><input id="descuento-especial" class="input w-full text-right rounded px-2 py-1 border" type="number" step="0.01" min="0" value="0"></input></div>
                                        <div class="text-slate-700 font-medium">P.V. Final</div>
                                        <div class="text-right text-2xl font-bold" id="pv-final"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                    </div>
                                    <div class="mt-3 pt-3 border-t">
                                        <label for="porcentaje_reserva" class="block text-slate-700 font-medium mb-1">Reserva (%)</label>
                                        <input id="porcentaje_reserva" class="input w-full text-right rounded px-2 py-1 border" type="number" value="30">
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                <button id="guardar-cotizacion" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Guardar</button>
                                <button id="guardar-como-paquete" type="button" class="btn border" title="Guarda las Actividades, Hoteles e Itinerario de esta cotización como un paquete predefinido reutilizable (sin fechas ni datos de pasajero)"><i class="fas fa-box-archive mr-2"></i>Guardar como paquete</button>
                                <button id="limpiar-todo" type="button" class="btn border" title="Limpia Datos Pax, Actividades, Hoteles e Itinerario de esta cotización"><i class="fas fa-broom mr-2"></i>Limpiar todo</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
        <div id="cotizaciones-section" class="tab-content hidden">
            <div class="card p-6">
                <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 class="text-base font-semibold text-slate-800"><?= is_admin() ? 'Cotizaciones Guardadas (todas)' : 'Mis Cotizaciones Guardadas' ?></h2>
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
                    <table class="w-full small">
                        <thead>
                            <tr>
                                <th class="text-left p-3">ID</th>
                                <th class="text-left p-3">Nombre PAX</th>
                                <th class="text-left p-3">Contacto</th>
                                <th class="text-left p-3">Fecha Cot.</th>
                                <th class="text-left p-3">N° PAX</th>
                                <th class="text-right p-3">Acciones</th>
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
        </div>
    </div>
    <div id="historial-tours-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:600px; max-height:80vh; display:flex; flex-direction:column; overflow:hidden;">
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-semibold">Historial de Cotizaciones</h2>
                <button id="close-historial-tours-btn" class="text-xl text-slate-500">&times;</button>
            </div>
            <div class="relative mb-3">
                <input id="historial-tours-search" class="input rounded px-2 py-2 border pl-8 text-sm w-full" type="text" placeholder="Buscar por ID, Nombre o Contacto...">
                <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            </div>
            <div id="historial-tours-list" class="flex-1 overflow-y-auto space-y-2 pr-1"></div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t text-sm text-slate-600">
                <span id="historial-tours-page-info"></span>
                <div class="flex gap-2">
                    <button id="historial-tours-prev" class="btn border">Anterior</button>
                    <button id="historial-tours-next" class="btn border">Siguiente</button>
                </div>
            </div>
        </div>
    </div>
    <!-- Modales del armador de Itinerario embebido (itinerario/itinerario.js) — mismos ids
         que usa la página standalone, salvo los de vista previa de PDF ya renombrados con
         prefijo itinerario- para no chocar con el propio #pdf-preview-modal de Cotizador. -->
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
    <div id="pdf-preview-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:900px; height:85vh; display:flex; flex-direction:column; overflow:hidden;">
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-semibold">Vista previa de la cotización</h2>
                <button id="close-pdf-preview-btn" class="text-xl text-slate-500">&times;</button>
            </div>
            <div class="relative flex-1" style="min-height:0;">
                <div id="pdf-preview-loading" class="absolute inset-0 flex items-center justify-center text-slate-400 hidden">
                    <i class="fas fa-spinner fa-spin text-2xl mr-2"></i> Generando PDF...
                </div>
                <iframe id="pdf-preview-frame" class="w-full h-full border rounded" style="min-height:0;"></iframe>
            </div>
            <div class="flex justify-end gap-2 mt-3 pt-3 border-t">
                <button id="pdf-preview-nueva-pestana" class="btn border"><i class="fas fa-up-right-from-square mr-2"></i>Ver en nueva pestaña</button>
                <button id="pdf-preview-descargar" class="btn btn-primary"><i class="fas fa-download mr-2"></i>Descargar PDF</button>
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
    <script src="../shared/rte.js?v=<?= filemtime(__DIR__ . '/rte.js') ?>"></script>
    <script src="../shared/cascade-select.js?v=<?= filemtime(__DIR__ . '/cascade-select.js') ?>"></script>
    <script>window.ITINERARIO_API_BASE = '../itinerario/';</script>
    <script src="../itinerario/itinerario.js?v=<?= filemtime(__DIR__ . '/../itinerario/itinerario.js') ?>"></script>
    <script src="../shared/catalogo-shared.js?v=<?= filemtime(__DIR__ . '/catalogo-shared.js') ?>"></script>
    <script src="../shared/cotizador.js?v=<?= filemtime(__DIR__ . '/cotizador.js') ?>"></script>
</body>
</html>
