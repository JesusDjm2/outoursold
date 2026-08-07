<?php
// shared/cotizador.php
// Plantilla única del cotizador. El caller (pen/index.php o usd/index.php) debe definir
// antes de incluir este archivo: $pageTitle, $currencySymbol, $switchLabel, $switchTarget.
require_once __DIR__ . '/auth.php';
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
    <div class="max-w-7xl mx-auto">
        <header class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-800 mb-2"><?= htmlspecialchars($pageTitle) ?></h1>
                <p class="text-slate-600">Sistema completo de cotización y gestión de datos</p>
            </div>
            <div class="flex items-center space-x-3 mt-2">
                <button id="switch-moneda" class="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e80c13] to-[#bb3135] text-white hover:opacity-90 transition">
                    <?= htmlspecialchars($switchLabel) ?>
                </button>
                <a href="../itinerario/index.html" class="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e80c13] to-[#bb3135] text-white hover:opacity-90 transition">
                    <i class="fas fa-route mr-1"></i> Generar Itinerario
                </a>
                <?php if (is_admin()): ?>
                <a href="../shared/usuarios.php" class="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e80c13] to-[#bb3135] text-white hover:opacity-90 transition">
                    <i class="fas fa-users-cog mr-1"></i> Gestionar Usuarios
                </a>
                <?php endif; ?>
                <button id="cerrar-sesion" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition">
                    <i class="fas fa-sign-out-alt mr-1"></i> Cerrar Sesión
                </button>
            </div>
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
                    <form id="form-pax" class="grid grid-cols-2 gap-2 small">
                        <label class="col-span-2">Agente <input class="input w-full rounded px-2 py-1 border" type="text" name="agente" placeholder="Agente"></label>
                        <label class="col-span-2">Nombre PAX <input class="input w-full rounded px-2 py-1 border" type="text" name="nombre_pax" placeholder="Ej: Juan Perez"></label>
                        <label>Edad <input class="input w-full rounded px-2 py-1 border" type="number" name="edad"></label>
                        <label>Contacto <input class="input w-full rounded px-2 py-1 border" type="text" name="contacto"></label>
                        <label>Canal <input class="input w-full rounded px-2 py-1 border" type="text" name="canal" placeholder="WhatsApp / Web"></label>
                        <label>F. Cot. <input class="input w-full rounded px-2 py-1 border" type="date" name="fecha_cot"></label>
                        <label>N° PAX <input class="input w-full rounded px-2 py-1 border" type="number" name="n_pax" value="1" min="1"></label>
                        <label>País <input class="input w-full rounded px-2 py-1 border" type="text" name="pais" placeholder="Perú"></label>
                        <label>Cod. País <input class="input w-full rounded px-2 py-1 border" type="text" name="cod_pais" value="+51"></label>
                        <label>Dpto/Est. <input class="input w-full rounded px-2 py-1 border" type="text" name="dpto" placeholder="Cusco"></label>
                        <label>F. llegada <input class="input w-full rounded px-2 py-1 border" type="date" name="f_llegada"></label>
                        <label>H. llegada <input class="input w-full rounded px-2 py-1 border" type="time" name="h_llegada"></label>
                        <label>F. salida <input class="input w-full rounded px-2 py-1 border" type="date" name="f_salida"></label>
                        <label>H. salida <input class="input w-full rounded px-2 py-1 border" type="time" name="h_salida"></label>
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                    <div class="card p-6 mb-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-2">Actualizar Tours desde CSV</h2>
                        <p class="text-sm text-slate-500 mb-4">El archivo debe tener 4 columnas: <strong>Tour, Distr, P.Reg, P.Promo</strong> (sin encabezados).</p>
                        <input type="file" id="tour-csv-input" accept=".csv" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"/>
                    </div>
                    <div class="card p-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Tours Existentes</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr>
                                        <th class="text-left p-3">Titulo</th>
                                        <th class="text-left p-3">Distr.</th>
                                        <th class="text-left p-3">P. Reg.</th>
                                        <th class="text-left p-3">P. Promocional</th>
                                    </tr>
                                </thead>
                                <tbody id="tours-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </section>
                <section>
                    <div class="card p-6 mb-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-2">Actualizar Hoteles desde CSV</h2>
                        <p class="text-sm text-slate-500 mb-4">El archivo debe tener 4 columnas: <strong>Alojamiento, Distr, P.Reg, P.Promo</strong> (sin encabezados).</p>
                         <input type="file" id="hotel-csv-input" accept=".csv" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                    </div>
                    <div class="card p-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Hoteles Existentes</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr>
                                        <th class="text-left p-3">Alojamiento</th>
                                        <th class="text-left p-3">Distr.</th>
                                        <th class="text-left p-3">P. Regular</th>
                                        <th class="text-left p-3">P. Promo</th>
                                    </tr>
                                </thead>
                                <tbody id="hotels-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
    <div id="search-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold">Resultados de Búsqueda</h2>
                <button id="close-modal-btn" class="text-xl text-slate-500">&times;</button>
            </div>
            <div id="search-results" class="space-y-2"></div>
        </div>
    </div>
    <script>
        window.APP_CONFIG = {
            currencySymbol: <?= json_encode($currencySymbol) ?>,
            switchTarget: <?= json_encode($switchTarget) ?>
        };
    </script>
    <script src="../shared/notify.js"></script>
    <script src="../shared/cotizador.js"></script>
</body>
</html>
