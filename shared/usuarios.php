<?php
// shared/usuarios.php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';

require_login();
if (!is_admin()) {
    http_response_code(403);
    die('Acceso denegado. Solo el administrador puede gestionar usuarios.');
}
$navRoot = '../';
$navShared = '';
$navActive = 'usuarios';
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Usuarios</title>
    <link rel="icon" type="image/png" href="favicon-outoors.png?v=<?= filemtime(__DIR__ . '/favicon-outoors.png') ?>">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="cotizador.css?v=<?= filemtime(__DIR__ . '/cotizador.css') ?>">
    <link rel="stylesheet" href="tabs.css?v=<?= filemtime(__DIR__ . '/tabs.css') ?>">
    <link rel="stylesheet" href="sidebar.css?v=<?= filemtime(__DIR__ . '/sidebar.css') ?>">
    <link rel="stylesheet" href="hero.css?v=<?= filemtime(__DIR__ . '/hero.css') ?>">
</head>
<body>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($heroImagenUrl) ?>')">
            <button type="button" id="hero-edit-btn" class="hero-edit-btn" title="Cambiar imagen del Hero de tu empresa"><i class="fas fa-camera"></i></button>
            <input type="file" id="hero-edit-input" accept="image/jpeg,image/png,image/webp" class="hidden">
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content">
                    <h1 id="page-hero-title">Usuarios</h1>
                    <p id="page-hero-subtitle">Crear cuentas, asignar roles y gestionar el acceso.</p>
                </div>
            </div>
            <div class="filter-tabs-bar">
                <div class="max-w-7xl mx-auto px-4 md:px-6">
                    <div class="filter-tabs">
                        <button type="button" class="filter-tab subnav-tab active" data-subtab="usuarios" data-title="Usuarios" data-subtitle="Crear cuentas, asignar roles y gestionar el acceso.">
                            <i class="fas fa-users"></i>Usuarios
                        </button>
                        <button type="button" class="filter-tab subnav-tab" data-subtab="agencias" data-title="Agencias" data-subtitle="Agencias registradas, comparativo de actividad y detalle de cada una.">
                            <i class="fas fa-building"></i>Agencias
                        </button>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">

        <div id="panel-usuarios" class="subtab-content">
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-semibold text-slate-800">Usuarios Existentes</h2>
                    <button type="button" id="abrir-nuevo-usuario-btn" class="btn btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>Nuevo Usuario
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full small">
                        <thead>
                            <tr>
                                <th class="text-left p-3">Usuario</th>
                                <th class="text-left p-3">Email</th>
                                <th class="text-left p-3">Rol</th>
                                <th class="text-left p-3">Agencia</th>
                                <th class="text-left p-3">Estado</th>
                                <th class="text-left p-3">Último acceso</th>
                                <th class="text-left p-3">Creado</th>
                                <th class="text-left p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="usuarios-body"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="panel-agencias" class="subtab-content hidden">
            <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4">
                <button type="button" class="categoria-tipo-tab agsub-tab active" data-agsub="listado"><i class="fas fa-list mr-1"></i>Listado</button>
                <button type="button" class="categoria-tipo-tab agsub-tab" data-agsub="comparativo"><i class="fas fa-chart-column mr-1"></i>Comparativo</button>
                <button type="button" class="categoria-tipo-tab agsub-tab" data-agsub="conexiones"><i class="fas fa-tower-broadcast mr-1"></i>Conexiones</button>
            </div>

            <div id="agsub-listado" class="agsub-panel">
                <div class="card p-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Agencias Existentes</h2>
                    <p class="text-xs text-slate-500 mb-4">Los datos de contacto, logo y términos de cada agencia los completa la propia agencia desde su "Mi Empresa". Aquí solo se administra la cuenta.</p>
                    <div class="overflow-x-auto">
                        <table class="w-full small">
                            <thead>
                                <tr>
                                    <th class="p-3"></th>
                                    <th class="text-left p-3">Nombre</th>
                                    <th class="text-left p-3">RUC</th>
                                    <th class="text-left p-3">Teléfono</th>
                                    <th class="text-left p-3">WhatsApp</th>
                                    <th class="text-left p-3">Colores</th>
                                    <th class="text-left p-3">Principal</th>
                                    <th class="text-right p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="agencias-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="agsub-comparativo" class="agsub-panel hidden">
                <div class="card p-6 mb-5">
                    <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
                        <h2 class="text-base font-semibold text-slate-800">Cotizaciones generadas</h2>
                        <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                            <button type="button" class="categoria-tipo-tab cotchart-grano active" data-grano="dia">Día</button>
                            <button type="button" class="categoria-tipo-tab cotchart-grano" data-grano="mes">Mes</button>
                            <button type="button" class="categoria-tipo-tab cotchart-grano" data-grano="anio">Año</button>
                        </div>
                    </div>
                    <div id="cotchart-empty" class="text-center text-slate-400 py-10 hidden">Sin cotizaciones en este período.</div>
                    <div id="cotchart-wrap" class="relative" style="height:220px;">
                        <svg id="cotchart-svg" width="100%" height="220"></svg>
                        <div id="cotchart-tooltip" class="cotchart-tooltip hidden"></div>
                    </div>
                </div>

                <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-base font-semibold text-slate-800">Comparativo entre Agencias</h2>
                        <span class="text-xs text-slate-500">Clic en una columna para ordenar el ranking. Clic en una agencia para ver su detalle.</span>
                    </div>
                    <div id="comparativo-empty" class="text-center text-slate-400 py-6 hidden">Sin agencias registradas.</div>
                    <div id="comparativo-loading" class="text-center text-slate-400 py-6">Cargando...</div>
                    <div class="overflow-x-auto">
                        <table class="w-full small" id="comparativo-tabla" style="display:none">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">#</th>
                                    <th class="text-left p-3">Agencia</th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="destinos">Destinos <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="categorias">Categorías <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="cotizaciones">Cotizaciones <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="actividades">Actividades <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="hoteles">Hoteles <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="itinerarios">Itinerarios <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="ingresos_pen">Ingresos S/ <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-right p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="ingresos_usd">Ingresos $ <i class="fas fa-sort text-slate-300"></i></th>
                                    <th class="text-left p-3 comparativo-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="ultima_actividad">Última actividad <i class="fas fa-sort text-slate-300"></i></th>
                                </tr>
                            </thead>
                            <tbody id="comparativo-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="agsub-conexiones" class="agsub-panel hidden">
                <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4 flex-wrap">
                    <button type="button" class="categoria-tipo-tab conexiones-subtab active" data-conexiones-subtab="conectados"><i class="fas fa-satellite-dish mr-1"></i>Conectados ahora</button>
                    <button type="button" class="categoria-tipo-tab conexiones-subtab" data-conexiones-subtab="ranking"><i class="fas fa-ranking-star mr-1"></i>Ranking de accesos</button>
                    <button type="button" class="categoria-tipo-tab conexiones-subtab" data-conexiones-subtab="bitacora"><i class="fas fa-list-check mr-1"></i>Bitácora</button>
                </div>

                <div id="conexiones-panel-conectados" class="conexiones-panel">
                    <div class="card p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-base font-semibold text-slate-800">Conectados ahora</h2>
                            <button type="button" id="conectados-refresh-btn" class="text-xs text-slate-500 hover:text-[var(--accent-2)]"><i class="fas fa-rotate mr-1"></i>Actualizar</button>
                        </div>
                        <div id="conectados-vacio" class="text-center text-slate-400 py-6 hidden">Nadie conectado en los últimos minutos.</div>
                        <div id="conectados-lista" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"></div>
                    </div>
                </div>

                <div id="conexiones-panel-ranking" class="conexiones-panel hidden">
                    <div class="card p-6">
                        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <h2 class="text-base font-semibold text-slate-800">Ranking de accesos por agencia</h2>
                            <span class="text-xs text-slate-500">Clic en una columna para ordenar — de menor a mayor para ver quién conecta menos.</span>
                        </div>
                        <div id="accesos-empty" class="text-center text-slate-400 py-6 hidden">Sin agencias registradas.</div>
                        <div class="overflow-x-auto">
                            <table class="w-full small" id="accesos-tabla">
                                <thead>
                                    <tr>
                                        <th class="text-left p-3">#</th>
                                        <th class="text-left p-3">Agencia</th>
                                        <th class="text-right p-3 accesos-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="conexiones_exitosas">Conexiones <i class="fas fa-sort text-slate-300"></i></th>
                                        <th class="text-right p-3 accesos-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="conexiones_fallidas">Fallidas <i class="fas fa-sort text-slate-300"></i></th>
                                        <th class="text-right p-3 accesos-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="accesos_totales">Total registros <i class="fas fa-sort text-slate-300"></i></th>
                                        <th class="text-left p-3 accesos-sort-th cursor-pointer select-none hover:text-slate-700" data-campo="ultima_conexion">Última conexión <i class="fas fa-sort text-slate-300"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="accesos-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="conexiones-panel-bitacora" class="conexiones-panel hidden">
                <div class="card p-6">
                    <h2 class="text-base font-semibold text-slate-800 mb-1">Bitácora de accesos</h2>
                    <p class="text-xs text-slate-500 mb-4">Historial de inicios de sesión, exitosos y fallidos.</p>
                    <div class="flex flex-wrap gap-3 items-center mb-3">
                        <div class="relative flex-1 min-w-[220px]">
                            <input id="bitacora-search" class="input rounded px-2 py-2 border pl-8 text-sm w-full" type="text" placeholder="Buscar por usuario, email o agencia...">
                            <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        </div>
                        <label class="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" id="bitacora-solo-fallidos" class="rounded">
                            Solo fallidos
                        </label>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full small">
                            <thead>
                                <tr>
                                    <th class="text-left p-3">Fecha</th>
                                    <th class="text-left p-3">Usuario/Email intentado</th>
                                    <th class="text-left p-3">Agencia</th>
                                    <th class="text-left p-3">IP</th>
                                    <th class="text-left p-3">Resultado</th>
                                </tr>
                            </thead>
                            <tbody id="bitacora-body"></tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-3 pt-3 border-t text-sm text-slate-600">
                        <span id="bitacora-page-info"></span>
                        <div class="flex gap-2">
                            <button id="bitacora-prev" class="btn border">Anterior</button>
                            <button id="bitacora-next" class="btn border">Siguiente</button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    </div>
    </div>

    <div id="usuario-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:640px;">
            <div class="flex justify-between items-center mb-4">
                <h2 id="usuario-form-title" class="text-lg font-semibold">Nuevo Usuario</h2>
                <button id="close-usuario-modal-btn" class="text-xl text-slate-500">&times;</button>
            </div>
            <form id="form-usuario" class="space-y-3">
                <label class="text-sm block">Usuario
                    <input id="usuario-nombre" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                </label>
                <label class="text-sm block" id="usuario-email-label">Email <span id="usuario-email-required" class="text-red-500 hidden">*</span>
                    <input id="usuario-email" class="input w-full rounded px-2 py-2 border mt-1" type="email" title="Con rol agencia, es el login de esa cuenta.">
                </label>
                <label class="text-sm block">Contraseña
                    <input id="usuario-password" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                </label>
                <label class="text-sm block">Rol
                    <select id="usuario-rol" class="input w-full rounded px-2 py-2 border mt-1">
                        <option value="admin">admin</option>
                        <option value="agencia">agencia</option>
                        <option value="conta">conta</option>
                        <option value="reservas">reservas</option>
                    </select>
                </label>
                <label class="text-sm block">Agencia
                    <select id="usuario-agencia" class="input w-full rounded px-2 py-2 border mt-1">
                        <option value="">— Sin agencia —</option>
                    </select>
                </label>
                <div class="flex gap-2 justify-end pt-2">
                    <button type="button" id="usuario-cancelar-edicion" class="btn border">Cancelar</button>
                    <button type="submit" id="usuario-form-submit" class="btn btn-primary flex-1">
                        <i class="fas fa-user-plus mr-2"></i>Crear
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div id="agencia-detalle-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:960px; max-height:88vh; display:flex; flex-direction:column; overflow:hidden;">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3 min-w-0">
                    <img id="agdet-logo" class="h-12 w-12 object-contain rounded border bg-white flex-shrink-0 hidden">
                    <div class="min-w-0">
                        <h2 class="text-lg font-semibold truncate">
                            <span id="agdet-nombre"></span>
                            <span id="agdet-principal-badge" class="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium align-middle hidden"><i class="fas fa-star mr-1"></i>Principal</span>
                        </h2>
                        <p class="text-xs text-slate-500 mt-0.5">Cliente desde <span id="agdet-creado"></span></p>
                    </div>
                </div>
                <button id="close-agencia-detalle-btn" class="text-xl text-slate-500 flex-shrink-0">&times;</button>
            </div>

            <div class="overflow-y-auto flex-1 pr-1">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                    <div><span class="text-slate-500">RUC</span><div id="agdet-ruc" class="font-medium">—</div></div>
                    <div><span class="text-slate-500">Teléfono</span><div id="agdet-telefono" class="font-medium">—</div></div>
                    <div><span class="text-slate-500">2do Teléfono</span><div id="agdet-telefono2" class="font-medium">—</div></div>
                    <div><span class="text-slate-500">WhatsApp</span><div id="agdet-whatsapp" class="font-medium">—</div></div>
                    <div class="col-span-2 md:col-span-4"><span class="text-slate-500">Dirección</span><div id="agdet-direccion" class="font-medium">—</div></div>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-5">
                    <div class="card p-3 text-center">
                        <div id="agdet-stat-cotizaciones" class="text-2xl font-semibold text-slate-800">0</div>
                        <div class="text-xs text-slate-500">Cotizaciones</div>
                    </div>
                    <div class="card p-3 text-center">
                        <div id="agdet-stat-itinerarios" class="text-2xl font-semibold text-slate-800">0</div>
                        <div class="text-xs text-slate-500">Itinerarios</div>
                    </div>
                    <div class="card p-3 text-center">
                        <div id="agdet-stat-actividad" class="text-sm font-semibold text-slate-800 mt-1.5">—</div>
                        <div class="text-xs text-slate-500">Última actividad</div>
                    </div>
                </div>

                <div class="mb-5">
                    <h3 class="text-sm font-semibold text-slate-700 mb-2"><i class="fas fa-users mr-1"></i>Usuarios de la agencia</h3>
                    <p class="text-xs text-slate-500 mb-2">Pausa un usuario para bloquear su acceso de inmediato, sin eliminar la cuenta.</p>
                    <div class="overflow-x-auto">
                        <table class="w-full small">
                            <thead>
                                <tr>
                                    <th class="text-left p-2">Usuario</th>
                                    <th class="text-left p-2">Email</th>
                                    <th class="text-left p-2">Rol</th>
                                    <th class="text-left p-2">Estado</th>
                                    <th class="text-left p-2">Último acceso</th>
                                    <th class="p-2"></th>
                                </tr>
                            </thead>
                            <tbody id="agdet-usuarios-body"></tbody>
                        </table>
                    </div>
                </div>

                <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-3">
                    <button type="button" class="categoria-tipo-tab agdet-subtab active" data-agdet-subtab="cotizaciones"><i class="fas fa-file-invoice-dollar mr-1"></i>Cotizaciones</button>
                    <button type="button" class="categoria-tipo-tab agdet-subtab" data-agdet-subtab="itinerarios"><i class="fas fa-route mr-1"></i>Itinerarios</button>
                    <button type="button" class="categoria-tipo-tab agdet-subtab" data-agdet-subtab="catalogo"><i class="fas fa-map-location-dot mr-1"></i>Catálogo</button>
                </div>

                <div id="agdet-panel-cotizaciones" class="agdet-panel">
                    <div class="relative mb-2">
                        <input id="agdet-cot-search" class="input rounded px-2 py-2 border pl-8 text-sm w-full" type="text" placeholder="Buscar por ID o nombre del pasajero...">
                        <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full small">
                            <thead>
                                <tr>
                                    <th class="text-left p-2">ID</th>
                                    <th class="text-left p-2">Pasajero</th>
                                    <th class="text-left p-2">Moneda</th>
                                    <th class="text-left p-2">Fecha</th>
                                    <th class="text-right p-2">Total</th>
                                    <th class="text-left p-2">Vendedor</th>
                                    <th class="p-2"></th>
                                </tr>
                            </thead>
                            <tbody id="agdet-cot-body"></tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t text-sm text-slate-600">
                        <span id="agdet-cot-page-info"></span>
                        <div class="flex gap-2">
                            <button id="agdet-cot-prev" class="btn border">Anterior</button>
                            <button id="agdet-cot-next" class="btn border">Siguiente</button>
                        </div>
                    </div>
                </div>

                <div id="agdet-panel-itinerarios" class="agdet-panel hidden">
                    <div class="relative mb-2">
                        <input id="agdet-itin-search" class="input rounded px-2 py-2 border pl-8 text-sm w-full" type="text" placeholder="Buscar por pasajero o título...">
                        <i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full small">
                            <thead>
                                <tr>
                                    <th class="text-left p-2">Pasajero</th>
                                    <th class="text-left p-2">Título</th>
                                    <th class="text-left p-2">Idioma</th>
                                    <th class="text-left p-2">Fecha</th>
                                    <th class="text-left p-2">Generado por</th>
                                    <th class="p-2"></th>
                                </tr>
                            </thead>
                            <tbody id="agdet-itin-body"></tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-2 pt-2 border-t text-sm text-slate-600">
                        <span id="agdet-itin-page-info"></span>
                        <div class="flex gap-2">
                            <button id="agdet-itin-prev" class="btn border">Anterior</button>
                            <button id="agdet-itin-next" class="btn border">Siguiente</button>
                        </div>
                    </div>
                </div>

                <div id="agdet-panel-catalogo" class="agdet-panel hidden">
                    <div id="agdet-catalogo-vacio" class="text-center text-slate-400 py-6 hidden">Esta agencia todavía no registró destinos ni categorías propias.</div>
                    <div id="agdet-catalogo-contenido" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 class="text-sm font-semibold text-slate-700 mb-2"><i class="fas fa-map-pin mr-1"></i>Destinos</h3>
                            <div id="agdet-destinos-lista" class="space-y-1 text-sm"></div>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-slate-700 mb-2"><i class="fas fa-layer-group mr-1"></i>Categorías</h3>
                            <div id="agdet-categorias-lista" class="space-y-1 text-sm"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <link rel="stylesheet" href="notify.css?v=<?= filemtime(__DIR__ . '/notify.css') ?>">
    <script src="notify.js?v=<?= filemtime(__DIR__ . '/notify.js') ?>"></script>
    <script>window.ME_API_URL = 'mi-empresa-api.php';</script>
    <script src="hero-edit.js?v=<?= filemtime(__DIR__ . '/hero-edit.js') ?>"></script>
    <script>
        const API_URL = 'usuarios-api.php';
        const AGENCIAS_API_URL = 'agencias-api.php';
        const ROLES = ['admin', 'agencia', 'conta', 'reservas'];
        let agenciasData = [];
        let usuarioEditandoId = null;

        // "En línea" = actividad en los últimos 5 minutos (heartbeat en is_logged_in(),
        // ver auth.php) — coincide con la ventana que usa el endpoint ?path=conectados.
        const EN_LINEA_MINUTOS = 5;

        function esEnLinea(fechaStr) {
            if (!fechaStr) return false;
            const minutos = (Date.now() - new Date(fechaStr.replace(' ', 'T')).getTime()) / 60000;
            return minutos >= 0 && minutos <= EN_LINEA_MINUTOS;
        }

        function haceCuanto(fechaStr) {
            const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaStr.replace(' ', 'T')).getTime()) / 60000));
            if (minutos < 1) return 'ahora';
            if (minutos < 60) return `hace ${minutos} min`;
            const horas = Math.round(minutos / 60);
            if (horas < 24) return `hace ${horas} h`;
            const dias = Math.round(horas / 24);
            return `hace ${dias} d`;
        }

        function fmtUltimoAcceso(fechaStr) {
            if (!fechaStr) return '<span class="text-slate-400">Nunca</span>';
            const dot = esEnLinea(fechaStr)
                ? '<span class="estado-dot en-linea" title="En línea"></span>'
                : '<span class="estado-dot desconectado"></span>';
            return `${dot}${haceCuanto(fechaStr)}`;
        }

        // ===== Sub-tabs de nivel superior (Usuarios / Agencias) =====
        document.querySelectorAll('.subnav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.subnav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(`panel-${tab.dataset.subtab}`).classList.remove('hidden');
                document.getElementById('page-hero-title').textContent = tab.dataset.title;
                document.getElementById('page-hero-subtitle').textContent = tab.dataset.subtitle;
            });
        });

        // ===== Sub-tabs internos de Agencias (Listado / Comparativo / Conexiones) =====
        let conectadosInterval = null;
        document.querySelectorAll('.agsub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.agsub-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.agsub-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(`agsub-${tab.dataset.agsub}`).classList.remove('hidden');

                clearInterval(conectadosInterval);
                if (tab.dataset.agsub === 'comparativo') {
                    cargarComparativo();
                    cargarCotizacionesChart();
                } else if (tab.dataset.agsub === 'conexiones') {
                    activarConexionesSubtab('conectados');
                }
            });
        });

        // ===== Sub-tabs internos de Conexiones (Conectados ahora / Ranking / Bitácora) =====
        // Evita que la pestaña Conexiones se vuelva una sola página larguísima con las 3
        // secciones apiladas: cada una vive en su propio panel, uno a la vez.
        function activarConexionesSubtab(sub) {
            document.querySelectorAll('.conexiones-subtab').forEach(t => t.classList.toggle('active', t.dataset.conexionesSubtab === sub));
            const nuevoPanel = document.getElementById(`conexiones-panel-${sub}`);
            const yaVisible = !nuevoPanel.classList.contains('hidden');
            document.querySelectorAll('.conexiones-panel').forEach(p => {
                if (p !== nuevoPanel) p.classList.add('hidden');
            });
            nuevoPanel.classList.remove('hidden');
            if (window.gsap && !yaVisible) {
                gsap.fromTo(nuevoPanel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
            }

            clearInterval(conectadosInterval);
            if (sub === 'conectados') {
                cargarConectados();
                conectadosInterval = setInterval(cargarConectados, 30000);
            } else if (sub === 'ranking') {
                cargarRankingAccesos();
            } else if (sub === 'bitacora') {
                cargarBitacora();
            }
        }
        document.querySelectorAll('.conexiones-subtab').forEach(tab => {
            tab.addEventListener('click', () => activarConexionesSubtab(tab.dataset.conexionesSubtab));
        });

        // ===== Usuarios =====
        async function cargarUsuarios() {
            const res = await fetch(`${API_URL}?path=listar`);
            const usuarios = await res.json();
            const tbody = document.getElementById('usuarios-body');
            tbody.innerHTML = '';
            usuarios.forEach(u => {
                const tr = document.createElement('tr');
                const estadoBadge = u.activo == 1
                    ? '<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Activo</span>'
                    : '<span class="px-2 py-1 rounded bg-red-100 text-red-700">Pausado</span>';
                const rolOptions = ROLES.map(r => `<option value="${r}" ${r === u.rol ? 'selected' : ''}>${r}</option>`).join('');
                tr.innerHTML = `
                    <td class="p-3 font-medium">${u.usuario}</td>
                    <td class="p-3">${u.email || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3"><select class="input rounded px-2 py-1 border rol-select" data-id="${u.id}">${rolOptions}</select></td>
                    <td class="p-3">${u.agencia_nombre || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${estadoBadge}</td>
                    <td class="p-3 whitespace-nowrap">${fmtUltimoAcceso(u.ultimo_acceso)}</td>
                    <td class="p-3">${u.creado_en}</td>
                    <td class="p-3 whitespace-nowrap">
                        <button class="text-slate-500 hover:text-slate-700 mr-2 editar-usuario-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn ${u.activo == 1 ? 'btn-danger' : 'btn-primary'} toggle-btn" data-id="${u.id}" data-activo="${u.activo}">
                            ${u.activo == 1 ? 'Pausar' : 'Activar'}
                        </button>
                    </td>
                `;
                tr.querySelector('.editar-usuario-btn').addEventListener('click', () => editarUsuario(u));
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll('.rol-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const id = sel.dataset.id;
                    const rol = sel.value;
                    const res = await fetch(`${API_URL}?path=cambiar-rol`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, rol })
                    });
                    const result = await res.json();
                    if (!result.success) notifyError(result.error);
                });
            });

            tbody.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    const activo = btn.dataset.activo == '1';
                    const accion = activo ? 'pausar' : 'activar';
                    const res = await fetch(`${API_URL}?path=${accion}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    const result = await res.json();
                    if (result.success) {
                        cargarUsuarios();
                    } else {
                        notifyError(result.error);
                    }
                });
            });
        }

        // Rol 'agencia' inicia sesión con email (ver auth.php), así que ahí es obligatorio;
        // para los demás roles queda opcional (login con usuario sigue funcionando siempre).
        function actualizarEmailRequerido() {
            const esAgencia = document.getElementById('usuario-rol').value === 'agencia';
            document.getElementById('usuario-email').required = esAgencia;
            document.getElementById('usuario-email-required').classList.toggle('hidden', !esAgencia);
        }
        document.getElementById('usuario-rol').addEventListener('change', actualizarEmailRequerido);
        actualizarEmailRequerido();

        function abrirUsuarioModal() {
            document.getElementById('usuario-modal').classList.remove('hidden');
        }
        function cerrarUsuarioModal() {
            document.getElementById('usuario-modal').classList.add('hidden');
            resetFormUsuario();
        }
        document.getElementById('abrir-nuevo-usuario-btn').addEventListener('click', abrirUsuarioModal);
        document.getElementById('close-usuario-modal-btn').addEventListener('click', cerrarUsuarioModal);
        document.getElementById('usuario-modal').addEventListener('click', (e) => {
            if (e.target.id === 'usuario-modal') cerrarUsuarioModal();
        });

        function editarUsuario(u) {
            usuarioEditandoId = u.id;
            document.getElementById('usuario-form-title').textContent = `Editar Usuario: ${u.usuario}`;
            document.getElementById('usuario-nombre').value = u.usuario;
            document.getElementById('usuario-email').value = u.email || '';
            document.getElementById('usuario-password').value = '';
            document.getElementById('usuario-password').placeholder = 'Dejar en blanco para no cambiar';
            document.getElementById('usuario-rol').value = u.rol;
            document.getElementById('usuario-agencia').value = u.agencia_id || '';
            document.getElementById('usuario-form-submit').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar cambios';
            actualizarEmailRequerido();
            abrirUsuarioModal();
        }

        function resetFormUsuario() {
            usuarioEditandoId = null;
            document.getElementById('form-usuario').reset();
            document.getElementById('usuario-form-title').textContent = 'Nuevo Usuario';
            document.getElementById('usuario-password').placeholder = '';
            document.getElementById('usuario-form-submit').innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear';
            actualizarEmailRequerido();
        }

        document.getElementById('usuario-cancelar-edicion').addEventListener('click', cerrarUsuarioModal);

        document.getElementById('form-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const usuario = document.getElementById('usuario-nombre').value.trim();
            const email = document.getElementById('usuario-email').value.trim();
            const password = document.getElementById('usuario-password').value;
            const rol = document.getElementById('usuario-rol').value;
            const agencia_id = document.getElementById('usuario-agencia').value || null;

            if (rol === 'agencia' && !email) {
                notifyError('El email es obligatorio para usuarios con rol agencia: lo usan para iniciar sesión.');
                return;
            }

            const path = usuarioEditandoId ? 'editar' : 'crear';
            const payload = usuarioEditandoId
                ? { id: usuarioEditandoId, usuario, email, password, rol, agencia_id }
                : { usuario, email, password, rol, agencia_id };

            const res = await fetch(`${API_URL}?path=${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                notifySuccess(usuarioEditandoId ? 'Usuario actualizado.' : 'Usuario creado.');
                cerrarUsuarioModal();
                cargarUsuarios();
            } else {
                notifyError(result.error);
            }
        });

        // ===== Agencias =====
        // El formulario completo de datos de la agencia (RUC, dirección, logo, términos...)
        // vive en "Mi Empresa": lo llena la propia agencia al entrar a su dashboard, no el
        // admin. Aquí solo se administra la cuenta: listar, ver detalle/CRM, marcar
        // principal y eliminar. Para dar de alta una agencia nueva, se usa el selector
        // "+ Crear nueva agencia..." del formulario de Usuario (solo pide el nombre).
        async function cargarAgencias() {
            const res = await fetch(`${AGENCIAS_API_URL}?path=listar`);
            agenciasData = await res.json();

            const select = document.getElementById('usuario-agencia');
            const current = select.value;
            select.innerHTML = '<option value="">— Sin agencia —</option>';
            agenciasData.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = a.nombre;
                select.appendChild(opt);
            });
            const nuevaOpt = document.createElement('option');
            nuevaOpt.value = '__new__';
            nuevaOpt.textContent = '+ Crear nueva agencia...';
            select.appendChild(nuevaOpt);
            select.value = current;

            const tbody = document.getElementById('agencias-body');
            tbody.innerHTML = '';
            if (agenciasData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="p-3 text-center text-slate-400">Sin agencias registradas.</td></tr>';
                return;
            }
            agenciasData.forEach(a => {
                const tr = document.createElement('tr');
                const logoImg = a.logo
                    ? `<img src="uploads/agencias/${a.logo}" class="h-8 w-8 object-contain rounded border">`
                    : '<div class="h-8 w-8 rounded border bg-slate-50 flex items-center justify-center text-slate-300"><i class="fas fa-building"></i></div>';
                const principalCell = a.es_principal == 1
                    ? '<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium"><i class="fas fa-star mr-1"></i>Principal</span>'
                    : '<button class="marcar-principal-btn text-xs text-slate-500 hover:text-[#e80c13] transition">Marcar como principal</button>';
                const swatch = (color) => `<span class="inline-block h-4 w-4 rounded-full border" style="background:${color}"></span>`;
                const coloresCell = (a.color_principal || a.color_secundario)
                    ? `<span class="flex items-center gap-1">${swatch(a.color_principal || '#ff0000')}${swatch(a.color_secundario || '#0566cf')}</span>`
                    : '<span class="text-slate-400">Predeterminado</span>';
                tr.innerHTML = `
                    <td class="p-3">${logoImg}</td>
                    <td class="p-3 font-medium">${a.nombre}</td>
                    <td class="p-3">${a.ruc || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.telefono || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.whatsapp || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${coloresCell}</td>
                    <td class="p-3">${principalCell}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button class="text-slate-500 hover:text-[var(--accent-2)] mr-2 ver-agencia-btn" title="Ver detalle"><i class="fas fa-eye"></i></button>
                        <button class="text-red-500 hover:text-red-700 eliminar-agencia-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tr.querySelector('.ver-agencia-btn').addEventListener('click', () => abrirAgenciaDetalle(a.id));
                tr.querySelector('.eliminar-agencia-btn').addEventListener('click', () => eliminarAgencia(a));
                const marcarBtn = tr.querySelector('.marcar-principal-btn');
                if (marcarBtn) marcarBtn.addEventListener('click', () => marcarAgenciaPrincipal(a));
                tbody.appendChild(tr);
            });
        }

        // "+ Crear nueva agencia..." en el select de Agencia del formulario de Usuario: solo
        // pide el nombre (lo mínimo para poder asignarla), el resto lo completa la agencia
        // desde su "Mi Empresa" al iniciar sesión.
        document.getElementById('usuario-agencia').addEventListener('change', async (e) => {
            if (e.target.value !== '__new__') return;
            const { value: nombre } = await Swal.fire({
                title: 'Nueva agencia',
                input: 'text',
                inputLabel: 'Nombre de la agencia',
                inputPlaceholder: 'Ej. Andes Travel SAC',
                showCancelButton: true,
                confirmButtonText: 'Crear',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#e80c13',
                cancelButtonColor: '#64748b',
                inputValidator: (v) => (!v || !v.trim()) ? 'El nombre es obligatorio' : undefined
            });
            if (!nombre) {
                e.target.value = '';
                return;
            }
            const formData = new FormData();
            formData.append('nombre', nombre.trim());
            const res = await fetch(`${AGENCIAS_API_URL}?path=crear`, { method: 'POST', body: formData });
            const result = await res.json();
            if (!result.success) {
                notifyError(result.error);
                e.target.value = '';
                return;
            }
            await cargarAgencias();
            e.target.value = result.id;
            notifySuccess(`Agencia "${nombre.trim()}" creada. Ya puedes asignarla a este usuario.`);
        });

        async function marcarAgenciaPrincipal(a) {
            const res = await fetch(`${AGENCIAS_API_URL}?path=marcar-principal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: a.id })
            });
            const result = await res.json();
            if (result.success) {
                notifySuccess(`"${a.nombre}" marcada como agencia principal.`);
                await cargarAgencias();
            } else {
                notifyError(result.error);
            }
        }

        async function eliminarAgencia(a) {
            if (!await confirmAction(`¿Eliminar la agencia "${a.nombre}"? Los usuarios asignados quedarán sin agencia. Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
            const res = await fetch(`${AGENCIAS_API_URL}?path=eliminar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: a.id })
            });
            const result = await res.json();
            if (result.success) {
                notifySuccess('Agencia eliminada.');
                await cargarAgencias();
                cargarUsuarios();
            } else {
                notifyError(result.error);
            }
        }

        // ===== Detalle de Agencia (CRM: ficha + usuarios + cotizaciones + itinerarios) =====
        const AGDET_PAGE_SIZE = 15;
        let agDetState = null;
        let agDetCotSearchDebounce = null;
        let agDetItinSearchDebounce = null;

        function seleccionarAgdetSubtab(subtab) {
            document.querySelectorAll('.agdet-subtab').forEach(t => t.classList.toggle('active', t.dataset.agdetSubtab === subtab));
            document.querySelectorAll('.agdet-panel').forEach(p => p.classList.toggle('hidden', p.id !== `agdet-panel-${subtab}`));
            if (subtab === 'catalogo' && agDetState) cargarAgenciaCatalogo();
        }
        document.querySelectorAll('.agdet-subtab').forEach(tab => {
            tab.addEventListener('click', () => seleccionarAgdetSubtab(tab.dataset.agdetSubtab));
        });

        async function abrirAgenciaDetalle(id) {
            document.getElementById('agencia-detalle-modal').classList.remove('hidden');
            agDetState = {
                id,
                cot: { term: '', offset: 0, total: 0 },
                itin: { term: '', offset: 0, total: 0 }
            };
            document.getElementById('agdet-cot-search').value = '';
            document.getElementById('agdet-itin-search').value = '';
            seleccionarAgdetSubtab('cotizaciones');
            await cargarAgenciaDetalleFicha(id);
            await Promise.all([cargarAgenciaCotizaciones(), cargarAgenciaItinerarios()]);
        }

        function cerrarAgenciaDetalle() {
            document.getElementById('agencia-detalle-modal').classList.add('hidden');
            agDetState = null;
        }

        async function cargarAgenciaDetalleFicha(id) {
            const res = await fetch(`${AGENCIAS_API_URL}?path=detalle&id=${id}`);
            const result = await res.json();
            if (result.error) { notifyError(result.error); cerrarAgenciaDetalle(); return; }
            const { agencia, usuarios, stats } = result;

            const logo = document.getElementById('agdet-logo');
            if (agencia.logo) {
                logo.src = `uploads/agencias/${agencia.logo}`;
                logo.classList.remove('hidden');
            } else {
                logo.classList.add('hidden');
            }
            document.getElementById('agdet-nombre').textContent = agencia.nombre;
            document.getElementById('agdet-principal-badge').classList.toggle('hidden', agencia.es_principal != 1);
            document.getElementById('agdet-creado').textContent = agencia.creado_en ? agencia.creado_en.substring(0, 10) : '—';
            document.getElementById('agdet-ruc').textContent = agencia.ruc || '—';
            document.getElementById('agdet-direccion').textContent = agencia.direccion || '—';
            document.getElementById('agdet-telefono').textContent = agencia.telefono || '—';
            document.getElementById('agdet-telefono2').textContent = agencia.telefono2 || '—';
            document.getElementById('agdet-whatsapp').textContent = agencia.whatsapp || '—';

            document.getElementById('agdet-stat-cotizaciones').textContent = stats.total_cotizaciones;
            document.getElementById('agdet-stat-itinerarios').textContent = stats.total_itinerarios;
            document.getElementById('agdet-stat-actividad').textContent = stats.ultima_actividad
                ? stats.ultima_actividad.substring(0, 16).replace('T', ' ')
                : 'Sin actividad';

            const tbody = document.getElementById('agdet-usuarios-body');
            tbody.innerHTML = '';
            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-2 text-center text-slate-400">Sin usuarios asociados.</td></tr>';
            } else {
                usuarios.forEach(u => {
                    const tr = document.createElement('tr');
                    const estadoBadge = u.activo == 1
                        ? '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs">Activo</span>'
                        : '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">Pausado</span>';
                    tr.innerHTML = `
                        <td class="p-2">${u.usuario}</td>
                        <td class="p-2">${u.email || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-2">${u.rol}</td>
                        <td class="p-2">${estadoBadge}</td>
                        <td class="p-2 whitespace-nowrap">${fmtUltimoAcceso(u.ultimo_acceso)}</td>
                        <td class="p-2 text-right">
                            <button class="btn ${u.activo == 1 ? 'btn-danger' : 'btn-primary'} agdet-toggle-usuario-btn" data-id="${u.id}" data-activo="${u.activo}" style="padding:2px 10px;font-size:0.75rem;">
                                ${u.activo == 1 ? 'Pausar' : 'Activar'}
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                tbody.querySelectorAll('.agdet-toggle-usuario-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const usuarioId = btn.dataset.id;
                        const activo = btn.dataset.activo == '1';
                        const accion = activo ? 'pausar' : 'activar';
                        const res2 = await fetch(`${API_URL}?path=${accion}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: usuarioId })
                        });
                        const result2 = await res2.json();
                        if (result2.success) {
                            await cargarAgenciaDetalleFicha(id);
                            cargarUsuarios();
                        } else {
                            notifyError(result2.error);
                        }
                    });
                });
            }
        }

        function fmtMoneda(moneda, n) {
            const symbol = moneda === 'pen' ? 'S/' : '$';
            return `${symbol} ${Number(n || 0).toFixed(2)}`;
        }

        async function cargarAgenciaCotizaciones() {
            if (!agDetState) return;
            const { id, cot } = agDetState;
            const tbody = document.getElementById('agdet-cot-body');
            tbody.innerHTML = '<tr><td colspan="7" class="p-2 text-center text-slate-400">Cargando...</td></tr>';
            const params = new URLSearchParams({ id, q: cot.term, limit: AGDET_PAGE_SIZE, offset: cot.offset });
            const res = await fetch(`${AGENCIAS_API_URL}?path=agencia-cotizaciones&${params}`);
            const { results, total } = await res.json();
            cot.total = total;
            tbody.innerHTML = '';
            if (results.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-2 text-center text-slate-400">${cot.term ? 'Sin resultados.' : 'Sin cotizaciones registradas.'}</td></tr>`;
            } else {
                results.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2 font-medium">${c.id}</td>
                        <td class="p-2">${c.nombre_pax || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-2 uppercase">${c.moneda}</td>
                        <td class="p-2">${(c.fecha_guardado || '').substring(0, 10)}</td>
                        <td class="p-2 text-right">${fmtMoneda(c.moneda, c.total)}</td>
                        <td class="p-2">${c.creado_por_nombre || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-2 text-right">
                            <a href="../${c.moneda}/index.php?cotizacion=${encodeURIComponent(c.id)}" target="_blank" class="text-slate-500 hover:text-[var(--accent-2)]" title="Abrir en el cotizador"><i class="fas fa-up-right-from-square"></i></a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            const shown = cot.offset + results.length;
            document.getElementById('agdet-cot-page-info').textContent = total === 0 ? '' : `${cot.offset + 1}-${shown} de ${total}`;
            document.getElementById('agdet-cot-prev').disabled = cot.offset === 0;
            document.getElementById('agdet-cot-next').disabled = shown >= total;
        }

        async function cargarAgenciaItinerarios() {
            if (!agDetState) return;
            const { id, itin } = agDetState;
            const tbody = document.getElementById('agdet-itin-body');
            tbody.innerHTML = '<tr><td colspan="6" class="p-2 text-center text-slate-400">Cargando...</td></tr>';
            const params = new URLSearchParams({ id, q: itin.term, limit: AGDET_PAGE_SIZE, offset: itin.offset });
            const res = await fetch(`${AGENCIAS_API_URL}?path=agencia-itinerarios&${params}`);
            const { results, total } = await res.json();
            itin.total = total;
            tbody.innerHTML = '';
            if (results.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-2 text-center text-slate-400">${itin.term ? 'Sin resultados.' : 'Sin itinerarios generados.'}</td></tr>`;
            } else {
                results.forEach(it => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="p-2 font-medium">${it.pasajero}</td>
                        <td class="p-2">${it.titulo}</td>
                        <td class="p-2 uppercase">${it.idioma}</td>
                        <td class="p-2">${(it.generado_en || '').substring(0, 10)}</td>
                        <td class="p-2">${it.generado_por_nombre || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-2 text-right">
                            <a href="../itinerario/uploads/${it.idioma}/${encodeURIComponent(it.filename)}" target="_blank" class="text-slate-500 hover:text-[var(--accent-2)]" title="Descargar PDF"><i class="fas fa-download"></i></a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            const shown = itin.offset + results.length;
            document.getElementById('agdet-itin-page-info').textContent = total === 0 ? '' : `${itin.offset + 1}-${shown} de ${total}`;
            document.getElementById('agdet-itin-prev').disabled = itin.offset === 0;
            document.getElementById('agdet-itin-next').disabled = shown >= total;
        }

        async function cargarAgenciaCatalogo() {
            if (!agDetState) return;
            const listaDestinos = document.getElementById('agdet-destinos-lista');
            const listaCategorias = document.getElementById('agdet-categorias-lista');
            listaDestinos.innerHTML = '<p class="text-slate-400">Cargando...</p>';
            listaCategorias.innerHTML = '';
            const res = await fetch(`${AGENCIAS_API_URL}?path=agencia-catalogo&id=${agDetState.id}`);
            const { destinos, categorias } = await res.json();

            const vacio = document.getElementById('agdet-catalogo-vacio');
            const contenido = document.getElementById('agdet-catalogo-contenido');
            if (destinos.length === 0 && categorias.length === 0) {
                vacio.classList.remove('hidden');
                contenido.classList.add('hidden');
                return;
            }
            vacio.classList.add('hidden');
            contenido.classList.remove('hidden');

            listaDestinos.innerHTML = destinos.length
                ? destinos.map(d => `<div class="px-2 py-1.5 border rounded">${d.nombre}</div>`).join('')
                : '<p class="text-slate-400">Sin destinos propios.</p>';

            listaCategorias.innerHTML = categorias.length
                ? categorias.map(c => `
                    <div class="px-2 py-1.5 border rounded flex items-center justify-between gap-2">
                        <span class="truncate">${c.nombre} <span class="text-xs text-slate-400">· ${c.destino_nombre}</span></span>
                        <span class="text-xs px-1.5 py-0.5 rounded ${c.tipo === 'tour' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'} flex-shrink-0">${c.tipo === 'tour' ? 'Tour' : 'Hotel'}</span>
                    </div>
                `).join('')
                : '<p class="text-slate-400">Sin categorías propias.</p>';
        }

        document.getElementById('close-agencia-detalle-btn').addEventListener('click', cerrarAgenciaDetalle);
        document.getElementById('agencia-detalle-modal').addEventListener('click', (e) => {
            if (e.target.id === 'agencia-detalle-modal') cerrarAgenciaDetalle();
        });
        document.getElementById('agdet-cot-search').addEventListener('input', (e) => {
            clearTimeout(agDetCotSearchDebounce);
            agDetCotSearchDebounce = setTimeout(() => {
                if (!agDetState) return;
                agDetState.cot.term = e.target.value.trim();
                agDetState.cot.offset = 0;
                cargarAgenciaCotizaciones();
            }, 300);
        });
        document.getElementById('agdet-itin-search').addEventListener('input', (e) => {
            clearTimeout(agDetItinSearchDebounce);
            agDetItinSearchDebounce = setTimeout(() => {
                if (!agDetState) return;
                agDetState.itin.term = e.target.value.trim();
                agDetState.itin.offset = 0;
                cargarAgenciaItinerarios();
            }, 300);
        });
        document.getElementById('agdet-cot-prev').addEventListener('click', () => {
            if (!agDetState) return;
            agDetState.cot.offset = Math.max(0, agDetState.cot.offset - AGDET_PAGE_SIZE);
            cargarAgenciaCotizaciones();
        });
        document.getElementById('agdet-cot-next').addEventListener('click', () => {
            if (!agDetState) return;
            agDetState.cot.offset += AGDET_PAGE_SIZE;
            cargarAgenciaCotizaciones();
        });
        document.getElementById('agdet-itin-prev').addEventListener('click', () => {
            if (!agDetState) return;
            agDetState.itin.offset = Math.max(0, agDetState.itin.offset - AGDET_PAGE_SIZE);
            cargarAgenciaItinerarios();
        });
        document.getElementById('agdet-itin-next').addEventListener('click', () => {
            if (!agDetState) return;
            agDetState.itin.offset += AGDET_PAGE_SIZE;
            cargarAgenciaItinerarios();
        });

        // ===== Comparativo / Ranking entre agencias =====
        let comparativoData = null;
        let comparativoSort = { campo: 'cotizaciones', dir: 'desc' };

        async function cargarComparativo() {
            document.getElementById('comparativo-loading').classList.remove('hidden');
            document.getElementById('comparativo-empty').classList.add('hidden');
            document.getElementById('comparativo-tabla').style.display = 'none';
            const res = await fetch(`${AGENCIAS_API_URL}?path=ranking`);
            comparativoData = await res.json();
            document.getElementById('comparativo-loading').classList.add('hidden');
            if (comparativoData.length === 0) {
                document.getElementById('comparativo-empty').classList.remove('hidden');
                return;
            }
            document.getElementById('comparativo-tabla').style.display = '';
            renderComparativoTabla();
        }

        function renderComparativoTabla() {
            if (!comparativoData) return;
            const { campo, dir } = comparativoSort;
            const ordenado = [...comparativoData].sort((a, b) => {
                if (campo === 'ultima_actividad') {
                    const va = a[campo] || '', vb = b[campo] || '';
                    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                }
                return dir === 'asc' ? a[campo] - b[campo] : b[campo] - a[campo];
            });

            document.querySelectorAll('.comparativo-sort-th').forEach(th => {
                const icon = th.querySelector('i');
                if (th.dataset.campo === campo) {
                    icon.className = dir === 'asc' ? 'fas fa-sort-up text-[var(--accent-2)]' : 'fas fa-sort-down text-[var(--accent-2)]';
                } else {
                    icon.className = 'fas fa-sort text-slate-300';
                }
            });

            const medallas = ['🥇', '🥈', '🥉'];
            const tbody = document.getElementById('comparativo-body');
            tbody.innerHTML = '';
            ordenado.forEach((a, i) => {
                const tr = document.createElement('tr');
                tr.className = 'cursor-pointer hover:bg-slate-50';
                const logoImg = a.logo
                    ? `<img src="uploads/agencias/${a.logo}" class="h-6 w-6 object-contain rounded border inline-block mr-2 align-middle">`
                    : '';
                const principalBadge = a.es_principal == 1 ? ' <span class="text-xs text-emerald-600"><i class="fas fa-star"></i></span>' : '';
                tr.innerHTML = `
                    <td class="p-3">${medallas[i] || (i + 1)}</td>
                    <td class="p-3 font-medium">${logoImg}${a.nombre}${principalBadge}</td>
                    <td class="p-3 text-right">${a.destinos}</td>
                    <td class="p-3 text-right">${a.categorias}</td>
                    <td class="p-3 text-right">${a.cotizaciones}</td>
                    <td class="p-3 text-right">${a.actividades}</td>
                    <td class="p-3 text-right">${a.hoteles}</td>
                    <td class="p-3 text-right">${a.itinerarios}</td>
                    <td class="p-3 text-right">S/ ${Number(a.ingresos_pen).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td class="p-3 text-right">$ ${Number(a.ingresos_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="p-3">${a.ultima_actividad ? a.ultima_actividad.substring(0, 16).replace('T', ' ') : '<span class="text-slate-400">Sin actividad</span>'}</td>
                `;
                tr.addEventListener('click', () => abrirAgenciaDetalle(a.id));
                tbody.appendChild(tr);
            });
        }

        document.querySelectorAll('.comparativo-sort-th').forEach(th => {
            th.addEventListener('click', () => {
                const campo = th.dataset.campo;
                comparativoSort = comparativoSort.campo === campo
                    ? { campo, dir: comparativoSort.dir === 'asc' ? 'desc' : 'asc' }
                    : { campo, dir: 'desc' };
                renderComparativoTabla();
            });
        });

        // ===== Gráfico "Cotizaciones generadas" (día/mes/año) =====
        let cotChartGrano = 'dia';
        let cotChartData = null;

        document.querySelectorAll('.cotchart-grano').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cotchart-grano').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                cotChartGrano = btn.dataset.grano;
                cargarCotizacionesChart();
            });
        });

        async function cargarCotizacionesChart() {
            const res = await fetch(`${AGENCIAS_API_URL}?path=cotizaciones-por-tiempo&agrupar=${cotChartGrano}`);
            cotChartData = await res.json();
            renderCotizacionesChart();
        }

        function fmtPeriodoLabel(periodo, grano) {
            if (grano === 'dia') {
                const [, m, d] = periodo.split('-');
                return `${d}/${m}`;
            }
            if (grano === 'mes') {
                const [y, m] = periodo.split('-');
                const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${nombres[parseInt(m, 10) - 1]} ${y.slice(2)}`;
            }
            return periodo;
        }

        // Redondea el techo del eje Y a un número "agradable" (1/2/5 x potencia de 10),
        // para que las líneas de grilla muestren valores limpios en vez de fracciones.
        function techoRedondo(n) {
            if (n <= 10) return 10;
            const magnitud = Math.pow(10, Math.floor(Math.log10(n)));
            const normalizado = n / magnitud;
            const pasos = [1, 2, 5, 10];
            const paso = pasos.find(p => normalizado <= p) || 10;
            return paso * magnitud;
        }

        function escapeXml(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function renderCotizacionesChart() {
            const wrap = document.getElementById('cotchart-wrap');
            const svg = document.getElementById('cotchart-svg');
            const empty = document.getElementById('cotchart-empty');
            const tooltip = document.getElementById('cotchart-tooltip');

            if (!cotChartData || cotChartData.length === 0) {
                wrap.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }
            wrap.classList.remove('hidden');
            empty.classList.add('hidden');

            const W = wrap.clientWidth;
            const H = 220;
            const padL = 38, padR = 12, padT = 16, padB = 24;
            const plotW = W - padL - padR;
            const plotH = H - padT - padB;
            const n = cotChartData.length;

            const totales = cotChartData.map(p => p.pen + p.usd);
            const yMax = techoRedondo(Math.max(1, ...totales));

            const x = i => n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
            const y = v => padT + plotH - (v / yMax) * plotH;

            const gridSvg = [0, yMax / 2, yMax].map(v => `
                <line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" class="cotchart-grid"></line>
                <text x="${padL - 8}" y="${y(v) + 3}" class="cotchart-axis-label" text-anchor="end">${Math.round(v)}</text>
            `).join('');

            const areaPoints = cotChartData.map((p, i) => `${x(i)},${y(p.pen + p.usd)}`).join(' L ');
            const areaPath = `M ${padL},${y(0)} L ${areaPoints} L ${x(n - 1)},${y(0)} Z`;
            const linePath = `M ${areaPoints}`;

            const maxEtiquetas = 8;
            const paso = Math.max(1, Math.ceil(n / maxEtiquetas));
            const xLabelsSvg = cotChartData.map((p, i) => {
                if (i % paso !== 0 && i !== n - 1) return '';
                return `<text x="${x(i)}" y="${H - 4}" class="cotchart-axis-label" text-anchor="middle">${escapeXml(fmtPeriodoLabel(p.periodo, cotChartGrano))}</text>`;
            }).join('');

            const ultimo = cotChartData[n - 1];
            const ultimoTotal = ultimo.pen + ultimo.usd;

            svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            svg.innerHTML = `
                ${gridSvg}
                <path d="${areaPath}" class="cotchart-area"></path>
                <path d="${linePath}" class="cotchart-line" fill="none"></path>
                ${xLabelsSvg}
                <circle cx="${x(n - 1)}" cy="${y(ultimoTotal)}" r="4" class="cotchart-enddot"></circle>
                <text x="${x(n - 1)}" y="${y(ultimoTotal) - 10}" class="cotchart-endlabel" text-anchor="${n > 3 ? 'end' : 'middle'}">${ultimoTotal}</text>
                <line id="cotchart-crosshair" x1="0" y1="${padT}" x2="0" y2="${H - padB}" class="cotchart-crosshair" style="display:none"></line>
                <circle id="cotchart-hoverdot" r="5" class="cotchart-enddot" style="display:none"></circle>
            `;

            const crosshair = document.getElementById('cotchart-crosshair');
            const hoverDot = document.getElementById('cotchart-hoverdot');
            const hitLayer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hitLayer.setAttribute('x', padL);
            hitLayer.setAttribute('y', padT);
            hitLayer.setAttribute('width', Math.max(0, plotW));
            hitLayer.setAttribute('height', Math.max(0, plotH));
            hitLayer.setAttribute('fill', 'transparent');
            hitLayer.style.cursor = 'crosshair';
            svg.appendChild(hitLayer);

            hitLayer.addEventListener('mousemove', (e) => {
                const rect = svg.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                let idx = n === 1 ? 0 : Math.round(((mx - padL) / plotW) * (n - 1));
                idx = Math.max(0, Math.min(n - 1, idx));
                const punto = cotChartData[idx];
                const total = punto.pen + punto.usd;
                const px = x(idx);
                const py = y(total);

                crosshair.setAttribute('x1', px);
                crosshair.setAttribute('x2', px);
                crosshair.style.display = '';
                hoverDot.setAttribute('cx', px);
                hoverDot.setAttribute('cy', py);
                hoverDot.style.display = '';

                tooltip.innerHTML = '';
                const fila1 = document.createElement('div');
                fila1.className = 'font-medium';
                fila1.textContent = fmtPeriodoLabel(punto.periodo, cotChartGrano);
                const fila2 = document.createElement('div');
                const strong = document.createElement('strong');
                strong.textContent = total;
                fila2.appendChild(strong);
                fila2.appendChild(document.createTextNode(total === 1 ? ' cotización' : ' cotizaciones'));
                const fila3 = document.createElement('div');
                fila3.className = 'text-slate-300 text-xs';
                fila3.textContent = `PEN: ${punto.pen} · USD: ${punto.usd}`;
                tooltip.appendChild(fila1);
                tooltip.appendChild(fila2);
                tooltip.appendChild(fila3);

                const left = Math.min(Math.max(px, 70), W - 70);
                const top = Math.max(4, py - 66);
                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
                tooltip.classList.remove('hidden');
            });
            hitLayer.addEventListener('mouseleave', () => {
                crosshair.style.display = 'none';
                hoverDot.style.display = 'none';
                tooltip.classList.add('hidden');
            });
        }

        // ===== Conectados ahora =====
        async function cargarConectados() {
            const res = await fetch(`${API_URL}?path=conectados&minutos=${EN_LINEA_MINUTOS}`);
            const conectados = await res.json();
            const lista = document.getElementById('conectados-lista');
            const vacio = document.getElementById('conectados-vacio');
            lista.innerHTML = '';
            if (conectados.length === 0) {
                vacio.classList.remove('hidden');
                return;
            }
            vacio.classList.add('hidden');
            conectados.forEach(u => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-3 p-3 border rounded-lg';
                div.innerHTML = `
                    <span class="estado-dot en-linea" style="width:10px;height:10px;"></span>
                    <div class="min-w-0">
                        <div class="font-medium truncate">${u.usuario}</div>
                        <div class="text-xs text-slate-500 truncate">${u.agencia_nombre || u.rol}</div>
                    </div>
                    <div class="ml-auto text-xs text-slate-400 flex-shrink-0">${haceCuanto(u.ultimo_acceso)}</div>
                `;
                lista.appendChild(div);
            });
            animarFilas(lista.children);
        }
        document.getElementById('conectados-refresh-btn').addEventListener('click', cargarConectados);

        // Pequeño stagger de entrada para listas/tablas que se recargan — sutil, consistente
        // en toda la pestaña Conexiones. No hace nada si GSAP no cargó (CDN caído, etc.).
        function animarFilas(elementos) {
            if (!window.gsap || !elementos || !elementos.length) return;
            gsap.from(elementos, { opacity: 0, y: 6, duration: 0.3, stagger: 0.035, ease: 'power1.out' });
        }

        // ===== Ranking de accesos por agencia (Conexiones) =====
        let accesosData = null;
        let accesosSort = { campo: 'conexiones_exitosas', dir: 'desc' };

        async function cargarRankingAccesos() {
            const res = await fetch(`${AGENCIAS_API_URL}?path=ranking-accesos`);
            accesosData = await res.json();
            const empty = document.getElementById('accesos-empty');
            const tabla = document.getElementById('accesos-tabla');
            if (accesosData.length === 0) {
                empty.classList.remove('hidden');
                tabla.style.display = 'none';
                return;
            }
            empty.classList.add('hidden');
            tabla.style.display = '';
            renderRankingAccesos();
        }

        function renderRankingAccesos() {
            if (!accesosData) return;
            const { campo, dir } = accesosSort;
            const ordenado = [...accesosData].sort((a, b) => {
                if (campo === 'ultima_conexion') {
                    const va = a[campo] || '', vb = b[campo] || '';
                    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                }
                return dir === 'asc' ? a[campo] - b[campo] : b[campo] - a[campo];
            });

            document.querySelectorAll('.accesos-sort-th').forEach(th => {
                const icon = th.querySelector('i');
                if (th.dataset.campo === campo) {
                    icon.className = dir === 'asc' ? 'fas fa-sort-up text-[var(--accent-2)]' : 'fas fa-sort-down text-[var(--accent-2)]';
                } else {
                    icon.className = 'fas fa-sort text-slate-300';
                }
            });

            const medallas = ['🥇', '🥈', '🥉'];
            const tbody = document.getElementById('accesos-body');
            tbody.innerHTML = '';
            ordenado.forEach((a, i) => {
                const tr = document.createElement('tr');
                tr.className = 'cursor-pointer hover:bg-slate-50';
                const logoImg = a.logo
                    ? `<img src="uploads/agencias/${a.logo}" class="h-6 w-6 object-contain rounded border inline-block mr-2 align-middle">`
                    : '';
                const principalBadge = a.es_principal == 1 ? ' <span class="text-xs text-emerald-600"><i class="fas fa-star"></i></span>' : '';
                tr.innerHTML = `
                    <td class="p-3">${medallas[i] || (i + 1)}</td>
                    <td class="p-3 font-medium">${logoImg}${a.nombre}${principalBadge}</td>
                    <td class="p-3 text-right">${a.conexiones_exitosas}</td>
                    <td class="p-3 text-right">${a.conexiones_fallidas}</td>
                    <td class="p-3 text-right">${a.accesos_totales}</td>
                    <td class="p-3">${a.ultima_conexion ? a.ultima_conexion.substring(0, 16).replace('T', ' ') : '<span class="text-slate-400">Sin registros</span>'}</td>
                `;
                tr.addEventListener('click', () => abrirAgenciaDetalle(a.id));
                tbody.appendChild(tr);
            });
            animarFilas(tbody.children);
        }

        document.querySelectorAll('.accesos-sort-th').forEach(th => {
            th.addEventListener('click', () => {
                const campo = th.dataset.campo;
                accesosSort = accesosSort.campo === campo
                    ? { campo, dir: accesosSort.dir === 'asc' ? 'desc' : 'asc' }
                    : { campo, dir: 'desc' };
                renderRankingAccesos();
            });
        });

        const BITACORA_PAGE_SIZE = 15;
        let bitacoraState = { term: '', soloFallidos: false, offset: 0, total: 0 };
        let bitacoraSearchDebounce = null;

        async function cargarBitacora() {
            const tbody = document.getElementById('bitacora-body');
            tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400">Cargando...</td></tr>';
            const params = new URLSearchParams({
                q: bitacoraState.term,
                solo_fallidos: bitacoraState.soloFallidos ? '1' : '0',
                limit: BITACORA_PAGE_SIZE,
                offset: bitacoraState.offset
            });
            const res = await fetch(`${API_URL}?path=bitacora&${params}`);
            const { results, total } = await res.json();
            bitacoraState.total = total;
            tbody.innerHTML = '';
            if (results.length === 0) {
                const msg = (bitacoraState.term || bitacoraState.soloFallidos) ? 'Sin resultados.' : 'Sin accesos registrados todavía.';
                tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-slate-400">${msg}</td></tr>`;
            } else {
                results.forEach(b => {
                    const tr = document.createElement('tr');
                    const resultadoBadge = b.exito == 1
                        ? '<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs">Exitoso</span>'
                        : `<span class="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">${b.motivo === 'pausado' ? 'Cuenta pausada' : 'Credenciales inválidas'}</span>`;
                    tr.innerHTML = `
                        <td class="p-3 whitespace-nowrap">${b.creado_en}</td>
                        <td class="p-3">${b.usuario_nombre || b.identificador}</td>
                        <td class="p-3">${b.agencia_nombre || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-3">${b.ip || '<span class="text-slate-400">—</span>'}</td>
                        <td class="p-3">${resultadoBadge}</td>
                    `;
                    tbody.appendChild(tr);
                });
                animarFilas(tbody.children);
            }
            const shown = bitacoraState.offset + results.length;
            document.getElementById('bitacora-page-info').textContent = total === 0 ? '' : `${bitacoraState.offset + 1}-${shown} de ${total}`;
            document.getElementById('bitacora-prev').disabled = bitacoraState.offset === 0;
            document.getElementById('bitacora-next').disabled = shown >= total;
        }

        document.getElementById('bitacora-search').addEventListener('input', (e) => {
            clearTimeout(bitacoraSearchDebounce);
            bitacoraSearchDebounce = setTimeout(() => {
                bitacoraState.term = e.target.value.trim();
                bitacoraState.offset = 0;
                cargarBitacora();
            }, 300);
        });
        document.getElementById('bitacora-solo-fallidos').addEventListener('change', (e) => {
            bitacoraState.soloFallidos = e.target.checked;
            bitacoraState.offset = 0;
            cargarBitacora();
        });
        document.getElementById('bitacora-prev').addEventListener('click', () => {
            bitacoraState.offset = Math.max(0, bitacoraState.offset - BITACORA_PAGE_SIZE);
            cargarBitacora();
        });
        document.getElementById('bitacora-next').addEventListener('click', () => {
            bitacoraState.offset += BITACORA_PAGE_SIZE;
            cargarBitacora();
        });

        (async function initPagina() {
            await cargarAgencias();
            cargarUsuarios();
        })();
    </script>
</body>
</html>
