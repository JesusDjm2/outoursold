<?php
// shared/usuarios.php
require_once __DIR__ . '/auth.php';

require_login();
if (!is_admin()) {
    http_response_code(403);
    die('Acceso denegado. Solo el administrador puede gestionar usuarios.');
}
$navRoot = '../';
$navShared = '';
$navActive = 'usuarios';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Usuarios</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="cotizador.css">
    <link rel="stylesheet" href="sidebar.css">
    <link rel="stylesheet" href="hero.css">
</head>
<body>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($navShared) ?>fondo-sistema-outours.jpg')">
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
                        <button type="button" class="filter-tab subnav-tab" data-subtab="agencias" data-title="Agencias" data-subtitle="Gestionar agencias asociadas y sus datos de contacto.">
                            <i class="fas fa-building"></i>Agencias
                        </button>
                    </div>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">

        <div id="panel-usuarios" class="subtab-content">
            <div class="card p-6 mb-6">
                <h2 id="usuario-form-title" class="text-xl font-semibold text-slate-800 mb-4">Nuevo Usuario</h2>
                <form id="form-usuario" class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <label class="text-sm">Usuario
                        <input id="usuario-nombre" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                    </label>
                    <label class="text-sm">Contraseña
                        <input id="usuario-password" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">Rol
                        <select id="usuario-rol" class="input w-full rounded px-2 py-2 border mt-1">
                            <option value="admin">admin</option>
                            <option value="agencia">agencia</option>
                            <option value="conta">conta</option>
                            <option value="reservas">reservas</option>
                        </select>
                    </label>
                    <label class="text-sm">Agencia
                        <select id="usuario-agencia" class="input w-full rounded px-2 py-2 border mt-1">
                            <option value="">— Sin agencia —</option>
                        </select>
                    </label>
                    <div class="flex gap-2">
                        <button type="submit" id="usuario-form-submit" class="btn btn-primary flex-1">
                            <i class="fas fa-user-plus mr-2"></i>Crear
                        </button>
                        <button type="button" id="usuario-cancelar-edicion" class="btn border hidden">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </form>
            </div>

            <div class="card p-6">
                <h2 class="text-xl font-semibold text-slate-800 mb-4">Usuarios Existentes</h2>
                <div class="overflow-x-auto">
                    <table class="w-full small">
                        <thead>
                            <tr>
                                <th class="text-left p-3">Usuario</th>
                                <th class="text-left p-3">Rol</th>
                                <th class="text-left p-3">Agencia</th>
                                <th class="text-left p-3">Estado</th>
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
            <div class="card p-6 mb-6">
                <h2 id="agencia-form-title" class="text-xl font-semibold text-slate-800 mb-4">Nueva Agencia</h2>
                <form id="form-agencia" class="space-y-3">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label class="text-sm">Nombre
                            <input id="agencia-nombre" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                        </label>
                        <label class="text-sm">RUC
                            <input id="agencia-ruc" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm">Dirección
                            <input id="agencia-direccion" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm">Teléfono
                            <input id="agencia-telefono" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm">2do Número
                            <input id="agencia-telefono2" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm">WhatsApp
                            <input id="agencia-whatsapp" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm md:col-span-3">Logo
                            <input id="agencia-logo" class="block w-full text-sm text-slate-500 mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        </label>
                    </div>

                    <label class="flex items-center gap-2 text-sm bg-slate-50 border rounded-lg p-3">
                        <input id="agencia-es-principal" type="checkbox" class="rounded">
                        <span>
                            <span class="font-medium">Marcar como agencia principal</span>
                            <span class="block text-slate-500">Sus datos se usan en el PDF de cotización cuando quien la crea no tiene una agencia asignada (por ejemplo, el admin).</span>
                        </span>
                    </label>

                    <div>
                        <div class="text-sm font-medium text-slate-700 mb-1">Términos y Condiciones</div>
                        <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-2">
                            <button type="button" class="categoria-tipo-tab terminos-lang-tab active" data-lang="es">Español</button>
                            <button type="button" class="categoria-tipo-tab terminos-lang-tab" data-lang="en">English</button>
                            <button type="button" class="categoria-tipo-tab terminos-lang-tab" data-lang="pt">Português</button>
                        </div>
                        <div class="rte terminos-panel" data-lang="es" style="min-height:160px">
                            <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                                <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                                <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                                <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                                <span class="rte-sep"></span>
                                <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                            </div>
                            <div id="agencia-terminos-es" class="rte-editor flex-1" contenteditable="true" data-placeholder="Términos y condiciones en español..."></div>
                        </div>
                        <div class="rte terminos-panel hidden" data-lang="en" style="min-height:160px">
                            <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                                <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                                <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                                <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                                <span class="rte-sep"></span>
                                <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                            </div>
                            <div id="agencia-terminos-en" class="rte-editor flex-1" contenteditable="true" data-placeholder="Terms and conditions in English..."></div>
                        </div>
                        <div class="rte terminos-panel hidden" data-lang="pt" style="min-height:160px">
                            <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                                <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                                <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                                <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                                <span class="rte-sep"></span>
                                <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                            </div>
                            <div id="agencia-terminos-pt" class="rte-editor flex-1" contenteditable="true" data-placeholder="Termos e condições em português..."></div>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button type="submit" id="agencia-form-submit" class="btn btn-primary">
                            <i class="fas fa-building mr-2"></i>Crear Agencia
                        </button>
                        <button type="button" id="agencia-cancelar-edicion" class="btn border hidden">
                            <i class="fas fa-times mr-1"></i>Cancelar edición
                        </button>
                    </div>
                </form>
            </div>

            <div class="card p-6">
                <h2 class="text-xl font-semibold text-slate-800 mb-4">Agencias Existentes</h2>
                <div class="overflow-x-auto">
                    <table class="w-full small">
                        <thead>
                            <tr>
                                <th class="p-3"></th>
                                <th class="text-left p-3">Nombre</th>
                                <th class="text-left p-3">RUC</th>
                                <th class="text-left p-3">Teléfono</th>
                                <th class="text-left p-3">WhatsApp</th>
                                <th class="text-left p-3">Principal</th>
                                <th class="text-right p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="agencias-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    </div>

    <script src="notify.js"></script>
    <script src="rte.js"></script>
    <script>
        const API_URL = 'usuarios-api.php';
        const AGENCIAS_API_URL = 'agencias-api.php';
        const ROLES = ['admin', 'agencia', 'conta', 'reservas'];
        const TERMINOS_LANGS = ['es', 'en', 'pt'];
        let agenciasData = [];
        let usuarioEditandoId = null;
        let agenciaEditandoId = null;

        // ===== Editor de Términos y Condiciones (3 idiomas) =====
        TERMINOS_LANGS.forEach(lang => initRichTextEditor(document.getElementById(`agencia-terminos-${lang}`)));

        document.querySelectorAll('.terminos-lang-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.terminos-lang-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.terminos-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                document.querySelector(`.terminos-panel[data-lang="${tab.dataset.lang}"]`).classList.remove('hidden');
            });
        });

        // ===== Sub-tabs =====
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
                    <td class="p-3"><select class="input rounded px-2 py-1 border rol-select" data-id="${u.id}">${rolOptions}</select></td>
                    <td class="p-3">${u.agencia_nombre || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${estadoBadge}</td>
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

        function editarUsuario(u) {
            usuarioEditandoId = u.id;
            document.getElementById('usuario-form-title').textContent = `Editar Usuario: ${u.usuario}`;
            document.getElementById('usuario-nombre').value = u.usuario;
            document.getElementById('usuario-password').value = '';
            document.getElementById('usuario-password').placeholder = 'Dejar en blanco para no cambiar';
            document.getElementById('usuario-rol').value = u.rol;
            document.getElementById('usuario-agencia').value = u.agencia_id || '';
            document.getElementById('usuario-form-submit').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar cambios';
            document.getElementById('usuario-cancelar-edicion').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function resetFormUsuario() {
            usuarioEditandoId = null;
            document.getElementById('form-usuario').reset();
            document.getElementById('usuario-form-title').textContent = 'Nuevo Usuario';
            document.getElementById('usuario-password').placeholder = '';
            document.getElementById('usuario-form-submit').innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear';
            document.getElementById('usuario-cancelar-edicion').classList.add('hidden');
        }

        document.getElementById('usuario-cancelar-edicion').addEventListener('click', resetFormUsuario);

        document.getElementById('form-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const usuario = document.getElementById('usuario-nombre').value.trim();
            const password = document.getElementById('usuario-password').value;
            const rol = document.getElementById('usuario-rol').value;
            const agencia_id = document.getElementById('usuario-agencia').value || null;

            const path = usuarioEditandoId ? 'editar' : 'crear';
            const payload = usuarioEditandoId
                ? { id: usuarioEditandoId, usuario, password, rol, agencia_id }
                : { usuario, password, rol, agencia_id };

            const res = await fetch(`${API_URL}?path=${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                notifySuccess(usuarioEditandoId ? 'Usuario actualizado.' : 'Usuario creado.');
                resetFormUsuario();
                cargarUsuarios();
            } else {
                notifyError(result.error);
            }
        });

        // ===== Agencias =====
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
            select.value = current;

            const tbody = document.getElementById('agencias-body');
            tbody.innerHTML = '';
            if (agenciasData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-400">Sin agencias registradas.</td></tr>';
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
                tr.innerHTML = `
                    <td class="p-3">${logoImg}</td>
                    <td class="p-3 font-medium">${a.nombre}</td>
                    <td class="p-3">${a.ruc || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.telefono || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.whatsapp || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${principalCell}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button class="text-slate-500 hover:text-slate-700 mr-2 editar-agencia-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="text-red-500 hover:text-red-700 eliminar-agencia-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tr.querySelector('.editar-agencia-btn').addEventListener('click', () => editarAgencia(a));
                tr.querySelector('.eliminar-agencia-btn').addEventListener('click', () => eliminarAgencia(a));
                const marcarBtn = tr.querySelector('.marcar-principal-btn');
                if (marcarBtn) marcarBtn.addEventListener('click', () => marcarAgenciaPrincipal(a));
                tbody.appendChild(tr);
            });
        }

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

        function seleccionarTerminosLangTab(lang) {
            document.querySelectorAll('.terminos-lang-tab').forEach(t => t.classList.toggle('active', t.dataset.lang === lang));
            document.querySelectorAll('.terminos-panel').forEach(p => p.classList.toggle('hidden', p.dataset.lang !== lang));
        }

        function editarAgencia(a) {
            agenciaEditandoId = a.id;
            document.getElementById('agencia-form-title').textContent = `Editar Agencia: ${a.nombre}`;
            document.getElementById('agencia-nombre').value = a.nombre || '';
            document.getElementById('agencia-ruc').value = a.ruc || '';
            document.getElementById('agencia-direccion').value = a.direccion || '';
            document.getElementById('agencia-telefono').value = a.telefono || '';
            document.getElementById('agencia-telefono2').value = a.telefono2 || '';
            document.getElementById('agencia-whatsapp').value = a.whatsapp || '';
            document.getElementById('agencia-logo').value = '';
            document.getElementById('agencia-es-principal').checked = a.es_principal == 1;
            TERMINOS_LANGS.forEach(lang => {
                document.getElementById(`agencia-terminos-${lang}`).innerHTML = a[`terminos_${lang}`] || '';
            });
            seleccionarTerminosLangTab('es');
            document.getElementById('agencia-form-submit').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar cambios';
            document.getElementById('agencia-cancelar-edicion').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function resetFormAgencia() {
            agenciaEditandoId = null;
            document.getElementById('form-agencia').reset();
            TERMINOS_LANGS.forEach(lang => {
                document.getElementById(`agencia-terminos-${lang}`).innerHTML = '';
            });
            seleccionarTerminosLangTab('es');
            document.getElementById('agencia-form-title').textContent = 'Nueva Agencia';
            document.getElementById('agencia-form-submit').innerHTML = '<i class="fas fa-building mr-2"></i>Crear Agencia';
            document.getElementById('agencia-cancelar-edicion').classList.add('hidden');
        }

        document.getElementById('agencia-cancelar-edicion').addEventListener('click', resetFormAgencia);

        document.getElementById('form-agencia').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('agencia-nombre').value.trim();
            if (!nombre) { notifyError('El nombre de la agencia es obligatorio.'); return; }

            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('ruc', document.getElementById('agencia-ruc').value.trim());
            formData.append('direccion', document.getElementById('agencia-direccion').value.trim());
            formData.append('telefono', document.getElementById('agencia-telefono').value.trim());
            formData.append('telefono2', document.getElementById('agencia-telefono2').value.trim());
            formData.append('whatsapp', document.getElementById('agencia-whatsapp').value.trim());
            TERMINOS_LANGS.forEach(lang => {
                formData.append(`terminos_${lang}`, document.getElementById(`agencia-terminos-${lang}`).innerHTML);
            });
            const logoFile = document.getElementById('agencia-logo').files[0];
            if (logoFile) formData.append('logo', logoFile);

            const marcarComoPrincipal = document.getElementById('agencia-es-principal').checked;
            const path = agenciaEditandoId ? 'editar' : 'crear';
            if (agenciaEditandoId) formData.append('id', agenciaEditandoId);

            const res = await fetch(`${AGENCIAS_API_URL}?path=${path}`, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                const idGuardado = agenciaEditandoId || result.id;
                if (marcarComoPrincipal) {
                    await fetch(`${AGENCIAS_API_URL}?path=marcar-principal`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: idGuardado })
                    });
                }
                notifySuccess(agenciaEditandoId ? 'Agencia actualizada.' : 'Agencia creada.');
                resetFormAgencia();
                await cargarAgencias();
            } else {
                notifyError(result.error);
            }
        });

        async function eliminarAgencia(a) {
            if (!await confirmAction(`¿Eliminar la agencia "${a.nombre}"? Los usuarios asignados quedarán sin agencia.`)) return;
            const res = await fetch(`${AGENCIAS_API_URL}?path=eliminar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: a.id })
            });
            const result = await res.json();
            if (result.success) {
                notifySuccess('Agencia eliminada.');
                if (agenciaEditandoId === a.id) resetFormAgencia();
                await cargarAgencias();
                cargarUsuarios();
            } else {
                notifyError(result.error);
            }
        }

        (async function initPagina() {
            await cargarAgencias();
            cargarUsuarios();
        })();
    </script>
</body>
</html>
