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
</head>
<body class="p-4 md:p-6">
    <?php require __DIR__ . '/../shared/sidebar.php'; ?>

    <div class="app-content">
    <div class="max-w-7xl mx-auto">
        <header class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Generador de Itinerarios</h1>
                <p class="text-slate-600">Gestión y creación de programas de viaje en PDF.</p>
            </div>
        </header>

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
                        <h2 class="text-xl font-semibold text-slate-800 mb-4">Módulos Existentes</h2>
                        <div id="itinerary-list" class="space-y-2 max-h-60 overflow-y-auto pr-2"></div>
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
    <script src="itinerario.js"></script>
</body>
</html>
