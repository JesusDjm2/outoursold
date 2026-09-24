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
            <button class="nav-tab flex-1 rounded-xl font-medium" data-tab="gestion">
                <i class="fas fa-cog"></i><span>Gestión de Datos</span>
            </button>
            <button class="nav-tab flex-1 rounded-xl font-medium" data-tab="cotizaciones">
                <i class="fas fa-folder-open"></i><span>Cotizaciones Guardadas</span>
            </button>
            <button class="nav-tab flex-1 rounded-xl font-medium" data-tab="itinerario-gestion">
                <i class="fas fa-route"></i><span>Itinerario</span>
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
                        <div class="field field-overlay"><input type="date" name="fecha_cot" title="Fecha de la cotización"><span class="field-placeholder-overlay">F. Cot.</span></div>
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
                                <button id="historial-tours-btn" type="button" class="px-3 py-1 rounded-md small border" title="Ver historial de actividades usadas en cotizaciones guardadas">
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
                            <button id="add-hotel" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-2)">+ Fila</button>
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
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <select id="itinerario-aplicar-paquete-select" class="flex-1 border rounded p-2 small" style="min-width:180px">
                                <option value="">Aplicar itinerario predeterminado...</option>
                            </select>
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
                            <button id="add-itinerary-row" type="button" class="px-3 py-1 rounded-md small border">+ Añadir Fila</button>
                            <span class="small text-slate-500">El PDF del itinerario se genera junto con la cotización al presionar Guardar.</span>
                            <button id="itinerario-ir-guardar" type="button" class="small text-[var(--accent-2)] hover:underline">Ir a Guardar <i class="fas fa-arrow-down"></i></button>
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
                                <button id="limpiar-todo" type="button" class="btn border" title="Limpia Datos Pax, Actividades, Hoteles e Itinerario de esta cotización"><i class="fas fa-broom mr-2"></i>Limpiar todo</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
        <div id="gestion-section" class="tab-content hidden">
            <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit">
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
                                <div class="flex gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
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

        <!-- Gestión de Itinerario embebida (itinerario/itinerario.js): catálogo de
             Módulos/Páginas Fijas/Itinerarios Predeterminados y el historial completo con
             filtros. El armado día-a-día para ESTA cotización vive en "4. Itinerario" de la
             pestaña Cotizador (arriba), no acá — mismos ids que la página standalone de
             Itinerario (itinerario/index.php), salvo el contenedor #gestion-section, que
             se renombra a #itinerario-gestion-section para no chocar con el propio
             #gestion-section de "Gestión de Datos" de Cotizador. -->
        <div id="itinerario-gestion-section" class="tab-content hidden">
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
                    <h2 class="text-base font-semibold text-slate-800 mb-4">Subir Nuevo Módulo PDF</h2>
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
                        <h2 class="text-base font-semibold text-slate-800 whitespace-nowrap">Módulos Existentes</h2>
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
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Nuevo Itinerario Predeterminado</h2>
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
                    <h2 class="text-base font-semibold text-slate-800 mb-4">Itinerarios Predeterminados Guardados</h2>
                    <div id="itinerario-paquetes-list" class="space-y-2"></div>
                </div>
            </div>

            <div id="itinerario-gestion-paginas" class="subtab-content hidden">
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

            <div id="itinerario-gestion-historial" class="subtab-content hidden">
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
    <script src="../shared/cotizador.js?v=<?= filemtime(__DIR__ . '/cotizador.js') ?>"></script>
</body>
</html>
