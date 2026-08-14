<?php
// itinerario/index.php
require_once __DIR__ . '/../shared/auth.php';
require_login();
$navRoot = '../';
$navShared = '../shared/';
$navActive = 'itinerario';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Itinerarios</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
    <script src="https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="itinerario.css">
    <link rel="stylesheet" href="../shared/sidebar.css">
    <link rel="stylesheet" href="../shared/hero.css">
    <link rel="stylesheet" href="../shared/cascade-select.css">
</head>
<body>
    <?php require __DIR__ . '/../shared/sidebar.php'; ?>

    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('../shared/fondo-sistema-outours.jpg')">
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content">
                    <h1>Generador de Itinerarios</h1>
                    <p>Plataforma B2B de cotizaciones e itinerarios turísticos</p>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">

        <div class="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit" id="idioma-tabs">
            <button type="button" class="categoria-tipo-tab idioma-tab active" data-idioma="es">Español</button>
            <button type="button" class="categoria-tipo-tab idioma-tab" data-idioma="en">English</button>
            <button type="button" class="categoria-tipo-tab idioma-tab" data-idioma="pt">Português</button>
        </div>

        <main class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-6">
                <section>
                    <div class="card p-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Subir Nuevo Módulo PDF</h2>
                        <form id="itinerary-upload-form" class="space-y-3">
                            <div>
                                <label for="itinerary-module-title" class="font-medium text-slate-700">Título del Módulo</label>
                                <input type="text" id="itinerary-module-title" placeholder="Ej: Tour Valle Sagrado" class="w-full border rounded p-2 mt-1" required>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
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
                            </div>
                            <div>
                                <label for="itinerary-module-pdf" class="font-medium text-slate-700">Archivo PDF</label>
                                <input type="file" id="itinerary-module-pdf" accept=".pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mt-1" required>
                            </div>
                            <button type="button" id="upload-local-module" class="btn btn-primary w-full">Subir Módulo</button>
                        </form>
                    </div>
                </section>

                <section>
                    <div class="card p-6">
                        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <h2 class="text-xl font-semibold text-slate-800 whitespace-nowrap">Módulos Existentes</h2>
                            <div class="relative">
                                <input id="itinerario-modulos-search" class="rounded-lg pl-8 pr-3 py-1.5 border text-sm w-64" type="text" placeholder="Buscar módulo...">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            </div>
                        </div>
                        <div class="itinerary-table-container max-h-96 overflow-y-auto">
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
                </section>

                <section>
                    <div class="card p-6 mb-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-1">Nuevo Paquete de Itinerario</h2>
                        <p class="text-sm text-slate-500 mb-4">Guarda una secuencia de módulos predefinida (por ejemplo, los días de un paquete típico) para insertarla completa en el armador de un clic.</p>
                        <input id="itinerario-paquete-nombre" class="w-full rounded px-3 py-2 border mb-3" type="text" placeholder="Nombre del paquete (ej. Cusco 4 días)">
                        <div id="itinerario-paquete-builder-rows" class="space-y-2 mb-3"></div>
                        <div class="flex flex-wrap gap-2">
                            <button id="itinerario-paquete-add-row" class="btn btn-secondary"><i class="fas fa-plus mr-1"></i>Agregar Módulo</button>
                            <button id="itinerario-paquete-guardar" class="btn btn-primary"><i class="fas fa-save mr-1"></i>Guardar Paquete</button>
                            <button id="itinerario-paquete-cancelar-edicion" class="btn btn-secondary hidden"><i class="fas fa-times mr-1"></i>Cancelar edición</button>
                        </div>
                    </div>
                    <div class="card p-6">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Paquetes de Itinerario Guardados</h2>
                        <div id="itinerario-paquetes-list" class="space-y-2"></div>
                    </div>
                </section>

                <section>
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
                </section>
            </div>

            <div class="space-y-6">
                <section>
                    <div class="card p-4">
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Itinerario Principal</h2>
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

                        <select id="itinerario-aplicar-paquete-select" class="w-full border rounded p-2 mb-3">
                            <option value="">Aplicar paquete de itinerario...</option>
                        </select>

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
                </section>
            </div>
        </main>
        </div>
        </div>
    </div>

    <div id="loading-modal" class="modal">
        <div class="modal-content">
            <h3 class="text-lg font-semibold mb-4">Generando PDF</h3>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div id="progress-bar" class="bg-cyan-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p id="loading-status" class="text-sm">Cargando fuentes...</p>
        </div>
    </div>

    <script src="../shared/notify.js"></script>
    <script src="../shared/cascade-select.js"></script>
    <script src="itinerario.js"></script>
</body>
</html>
