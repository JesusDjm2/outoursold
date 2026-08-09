<?php
// shared/cotizador.php
// Plantilla única del cotizador. El caller (pen/index.php o usd/index.php) debe definir
// antes de incluir este archivo: $pageTitle, $currencySymbol, $navActive.
require_once __DIR__ . '/auth.php';
$navRoot = '../';
$navShared = '../shared/';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../shared/cotizador.css">
</head>
<body class="p-4 md:p-6">
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
    <div class="max-w-7xl mx-auto">
        <header class="mb-6">
            <h1 class="text-3xl font-bold text-slate-800 mb-2"><?= htmlspecialchars($pageTitle) ?></h1>
            <p class="text-slate-600">Sistema completo de cotización y gestión de datos</p>
        </header>
        <div class="flex mb-6 bg-white rounded-xl p-1 shadow-md">
            <button class="nav-tab flex-1 py-3 px-4 rounded-xl font-medium active" data-tab="cotizador">
                <i class="fas fa-calculator mr-2"></i>Cotizador
            </button>
            <button class="nav-tab flex-1 py-3 px-4 rounded-xl font-medium" data-tab="gestion">
                <i class="fas fa-cog mr-2"></i>Gestión de Datos
            </button>
        </div>
        <div id="cotizador-section" class="tab-content">
            <main class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <section class="lg:col-span-1 card p-3">
                    <div class="flex items-center justify-between mb-2">
                        <h2 class="text-base font-medium">1. Datos Pax</h2>
                        <span class="text-xs px-2 py-1 rounded" style="background:rgba(187,49,53,0.12);color:var(--accent-2)">ID: <span id="current-cot-id-display">Nueva</span></span>
                    </div>
                    <form id="form-pax" class="grid grid-cols-1 gap-2 small">
                        <div class="field"><span class="field-label">Agente</span><input type="text" name="agente" title="Agente que atiende esta cotización"></div>
                        <div class="field"><span class="field-label">Nombre PAX</span><input type="text" name="nombre_pax" title="Nombre completo del pasajero"></div>
                        <div class="field"><span class="field-label">Edad</span><input type="number" name="edad" title="Edad del pasajero"></div>
                        <div class="field"><span class="field-label">Contacto</span><input type="text" name="contacto" title="Teléfono o correo de contacto"></div>
                        <div class="field"><span class="field-label">Canal</span><input type="text" name="canal" placeholder="WhatsApp / Web" title="Canal por el que llegó el cliente"></div>
                        <div class="field"><span class="field-label">F. Cot.</span><input type="date" name="fecha_cot" title="Fecha de la cotización"></div>
                        <div class="field"><span class="field-label">N° PAX</span><input type="number" name="n_pax" value="1" min="1" title="Número de pasajeros"></div>
                        <div class="field"><span class="field-label">País</span><input type="text" name="pais" placeholder="Perú" title="País de procedencia del pasajero"></div>
                        <div class="field"><span class="field-label">Cod. País</span><input type="text" name="cod_pais" value="+51" title="Código telefónico del país"></div>
                        <div class="field"><span class="field-label">Dpto/Est.</span><input type="text" name="dpto" placeholder="Cusco" title="Departamento o estado de destino"></div>
                        <div class="field"><span class="field-label">F. llegada</span><input type="date" name="f_llegada" title="Fecha de llegada"></div>
                        <div class="field"><span class="field-label">H. llegada</span><input type="time" name="h_llegada" title="Hora de llegada"></div>
                        <div class="field"><span class="field-label">F. salida</span><input type="date" name="f_salida" title="Fecha de salida"></div>
                        <div class="field"><span class="field-label">H. salida</span><input type="time" name="h_salida" title="Hora de salida"></div>
                    </form>
                    <div class="mt-4 pt-4 border-t">
                        <h3 class="text-base font-medium mb-2">Gestión de Cotizaciones</h3>
                        <div class="grid grid-cols-1 gap-2 small">
                            <div class="relative">
                                <input id="buscar-cotizacion-input" class="input w-full rounded px-2 py-2 border pl-8" type="text" placeholder="Buscar por ID, Nombre o Contacto...">
                                <button id="btn-buscar" class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            <div class="mt-1 text-xs text-slate-500">
                                <strong>Últimas cotizaciones:</strong>
                                <div id="ultimas-cotizaciones" class="flex flex-wrap gap-1 mt-1"></div>
                            </div>
                            <button id="ver-registros" class="btn border w-full">
                                <i class="fas fa-table mr-2"></i>Ver todos los registros
                            </button>
                            <button id="nueva-cotizacion" class="btn border w-full">
                                <i class="fas fa-plus-circle mr-2"></i>Nueva Cotización
                            </button>
                        </div>
                    </div>
                </section>
                <section class="lg:col-span-2 space-y-4">
                    <div class="card p-3">
                        <div class="flex items-center justify-between mb-2">
                            <h2 class="text-base font-medium">2. Data Tours</h2>
                            <div class="flex items-center gap-2">
                                <button id="add-tour" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-1)">+ Fila</button>
                                <button id="clear-tours" class="px-3 py-1 rounded-md small border">Limpiar</button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full small">
                                <thead>
                                    <tr>
                                        <th class="w-8 pl-2">&nbsp;</th>
                                        <th class="w-40">Fecha</th>
                                        <th class="w-[50%]">Tour / Actividad</th>
                                        <th class="w-24">Cant.</th>
                                        <th class="w-24">Distr.</th>
                                        <th class="w-24" hidden>P.Reg</th>
                                        <th class="w-24" hidden>P.Promo</th>
                                        <th class="w-28">Total Línea</th>
                                        <th class="w-12 pr-2">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody id="tours-body" class="small"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card p-3">
                         <div class="flex items-center justify-between mb-2">
                            <h2 class="text-base font-medium">3. Data Hotel</h2>
                            <div class="flex items-center gap-2">
                                <button id="add-hotel" class="px-3 py-1 rounded-md small text-white" style="background:var(--accent-2)">+ Fila</button>
                                <button id="clear-hotels" class="px-3 py-1 rounded-md small border">Limpiar</button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full small">
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
                                        <th class="w-28">Total Línea</th>
                                        <th class="w-12 pr-2">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody id="hotels-body" class="small"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card p-0 overflow-hidden">
                        <div class="px-4 py-3 accent-header flex items-center justify-between">
                            <h3 class="text-white font-semibold">Resumen — Factura</h3>
                        </div>
                        <div class="p-4 small">
                            <div class="grid grid-cols-12 gap-2 items-center">
                                <div class="col-span-6 text-slate-600">P.V. Regular</div>
                                <div class="col-span-6 text-right font-semibold" id="pv-regular"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                <div class="col-span-6 text-slate-600">P.V. Promo</div>
                                <div class="col-span-6 text-right font-semibold" id="pv-promo"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                <div class="col-span-6 text-slate-600">Total descuento</div>
                                <div class="col-span-6 text-right" id="total-desc"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                                <div class="col-span-6 text-slate-600">Precio adicional</div>
                                <div class="col-span-6"><input id="precio-adicional" class="input w-full text-right rounded px-2 py-1 border" type="number" step="0.01" value="0"></input></div>
                                <div class="col-span-6 text-slate-600">Descuento especial</div>
                                <div class="col-span-6"><input id="descuento-especial" class="input w-full text-right rounded px-2 py-1 border" type="number" step="0.01" value="0"></input></div>
                                <div class="col-span-6 text-slate-700 font-medium">P.V. Final</div>
                                <div class="col-span-6 text-right text-2xl font-bold" id="pv-final"><?= htmlspecialchars($currencySymbol) ?>0.00</div>
                            </div>
                            <div class="mt-4 pt-4 border-t">
                                <div class="grid grid-cols-12 gap-2 items-start">
                                    <div class="col-span-9">
                                        <label for="notas_cotizacion" class="block text-slate-700 font-medium mb-1">Notas Adicionales</label>
                                        <textarea id="notas_cotizacion" class="input w-full rounded px-2 py-1 border" rows="2" placeholder="Cualquier nota para el cliente..."></textarea>
                                    </div>
                                    <div class="col-span-3">
                                        <label for="porcentaje_reserva" class="block text-slate-700 font-medium mb-1">Reserva (%)</label>
                                        <input id="porcentaje_reserva" class="input w-full text-right rounded px-2 py-1 border" type="number" value="30">
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                <button id="guardar-cotizacion" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Guardar</button>
                                <button id="generar-cotizacion-html" class="btn btn-primary" style="background:var(--accent-2);"><i class="fas fa-file-invoice mr-2"></i>Generar Cotización</button>
                                <button id="calcular" class="btn" style="background:var(--accent-3); color:white;">Recalcular</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
        <div id="gestion-section" class="tab-content hidden">
            <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit">
                <button class="subnav-tab active" data-subtab="tours">
                    <i class="fas fa-map-marked-alt mr-1"></i> Tours
                </button>
                <button class="subnav-tab" data-subtab="hoteles">
                    <i class="fas fa-hotel mr-1"></i> Hoteles
                </button>
            </div>

            <div id="gestion-tours" class="subtab-content">
                <div class="card p-6 mb-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-2">Actualizar Tours desde CSV</h2>
                    <p class="text-sm text-slate-500 mb-4">El archivo debe tener 4 columnas: <strong>Tour, Distr, P.Reg, P.Promo</strong> (sin encabezados).</p>
                    <input type="file" id="tour-csv-input" accept=".csv" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"/>
                </div>
                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h2 class="text-xl font-semibold text-slate-800">Tours Existentes</h2>
                        <div class="relative">
                            <input id="tours-search" class="input rounded px-2 py-2 border pl-8 text-sm" type="text" placeholder="Buscar tour...">
                            <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-2 mb-4 small">
                        <input id="tour-new-nombre" class="input rounded px-2 py-1 border col-span-4" type="text" placeholder="Nombre del tour">
                        <input id="tour-new-distr" class="input rounded px-2 py-1 border col-span-3" type="text" placeholder="Distribuidor">
                        <input id="tour-new-preg" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Reg.">
                        <input id="tour-new-ppromo" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Promo">
                        <button id="tour-new-add" class="btn btn-primary col-span-1" title="Agregar tour"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">Titulo</th>
                                    <th class="text-left p-3">Distr.</th>
                                    <th class="text-left p-3">P. Reg.</th>
                                    <th class="text-left p-3">P. Promocional</th>
                                    <th class="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tours-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="gestion-hoteles" class="subtab-content hidden">
                <div class="card p-6 mb-6">
                    <h2 class="text-xl font-semibold text-slate-800 mb-2">Actualizar Hoteles desde CSV</h2>
                    <p class="text-sm text-slate-500 mb-4">El archivo debe tener 4 columnas: <strong>Alojamiento, Distr, P.Reg, P.Promo</strong> (sin encabezados).</p>
                     <input type="file" id="hotel-csv-input" accept=".csv" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                </div>
                <div class="card p-6">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h2 class="text-xl font-semibold text-slate-800">Hoteles Existentes</h2>
                        <div class="relative">
                            <input id="hoteles-search" class="input rounded px-2 py-2 border pl-8 text-sm" type="text" placeholder="Buscar alojamiento...">
                            <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-2 mb-4 small">
                        <input id="hotel-new-nombre" class="input rounded px-2 py-1 border col-span-4" type="text" placeholder="Nombre del alojamiento">
                        <input id="hotel-new-distr" class="input rounded px-2 py-1 border col-span-3" type="text" placeholder="Distribuidor">
                        <input id="hotel-new-preg" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Reg.">
                        <input id="hotel-new-ppromo" class="input rounded px-2 py-1 border text-right col-span-2" type="number" step="0.01" placeholder="P. Promo">
                        <button id="hotel-new-add" class="btn btn-primary col-span-1" title="Agregar alojamiento"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">Alojamiento</th>
                                    <th class="text-left p-3">Distr.</th>
                                    <th class="text-left p-3">P. Regular</th>
                                    <th class="text-left p-3">P. Promo</th>
                                    <th class="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="hotels-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
    <div id="records-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:800px;">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold">Cotizaciones Guardadas</h2>
                <button id="close-records-modal-btn" class="text-xl text-slate-500">&times;</button>
            </div>
            <div class="relative mb-3">
                <input id="records-search-input" class="input w-full rounded px-2 py-2 border pl-8" type="text" placeholder="Buscar por ID, Nombre o Contacto...">
                <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full small">
                    <thead>
                        <tr>
                            <th class="text-left p-2">ID</th>
                            <th class="text-left p-2">Nombre PAX</th>
                            <th class="text-left p-2">Contacto</th>
                            <th class="text-left p-2">Fecha Cot.</th>
                            <th class="text-left p-2">N° PAX</th>
                            <th class="p-2"></th>
                        </tr>
                    </thead>
                    <tbody id="records-table-body"></tbody>
                </table>
            </div>
            <div class="flex justify-between items-center mt-4 text-sm text-slate-600">
                <span id="records-page-info"></span>
                <div class="flex gap-2">
                    <button id="records-prev" class="btn border">Anterior</button>
                    <button id="records-next" class="btn border">Siguiente</button>
                </div>
            </div>
        </div>
    </div>
    <script>
        window.APP_CONFIG = {
            currencySymbol: <?= json_encode($currencySymbol) ?>
        };
    </script>
    <script src="../shared/notify.js"></script>
    <script src="../shared/cotizador.js"></script>
</body>
</html>
