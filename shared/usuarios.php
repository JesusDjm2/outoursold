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
</head>
<body class="p-4 md:p-6">
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
    <div class="max-w-4xl mx-auto">
        <header class="mb-6">
            <h1 class="text-3xl font-bold text-slate-800 mb-2">Gestión de Usuarios</h1>
            <p class="text-slate-600">Crear cuentas, asignar roles, gestionar agencias y pausar el acceso.</p>
        </header>

        <div class="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-md w-fit">
            <button class="subnav-tab active" data-subtab="usuarios">
                <i class="fas fa-users mr-1"></i> Usuarios
            </button>
            <button class="subnav-tab" data-subtab="agencias">
                <i class="fas fa-building mr-1"></i> Agencias
            </button>
        </div>

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
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <label class="text-sm">WhatsApp
                            <input id="agencia-whatsapp" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                        </label>
                        <label class="text-sm">Logo
                            <input id="agencia-logo" class="block w-full text-sm text-slate-500 mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        </label>
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
    <script>
        const API_URL = 'usuarios-api.php';
        const AGENCIAS_API_URL = 'agencias-api.php';
        const ROLES = ['admin', 'agencia', 'conta', 'reservas'];
        let agenciasData = [];
        let usuarioEditandoId = null;
        let agenciaEditandoId = null;

        // ===== Sub-tabs =====
        document.querySelectorAll('.subnav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.subnav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(`panel-${tab.dataset.subtab}`).classList.remove('hidden');
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
                tr.innerHTML = `
                    <td class="p-3">${logoImg}</td>
                    <td class="p-3 font-medium">${a.nombre}</td>
                    <td class="p-3">${a.ruc || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.telefono || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3">${a.whatsapp || '<span class="text-slate-400">—</span>'}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button class="text-slate-500 hover:text-slate-700 mr-2 editar-agencia-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="text-red-500 hover:text-red-700 eliminar-agencia-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tr.querySelector('.editar-agencia-btn').addEventListener('click', () => editarAgencia(a));
                tr.querySelector('.eliminar-agencia-btn').addEventListener('click', () => eliminarAgencia(a));
                tbody.appendChild(tr);
            });
        }

        function editarAgencia(a) {
            agenciaEditandoId = a.id;
            document.getElementById('agencia-form-title').textContent = `Editar Agencia: ${a.nombre}`;
            document.getElementById('agencia-nombre').value = a.nombre || '';
            document.getElementById('agencia-ruc').value = a.ruc || '';
            document.getElementById('agencia-direccion').value = a.direccion || '';
            document.getElementById('agencia-telefono').value = a.telefono || '';
            document.getElementById('agencia-whatsapp').value = a.whatsapp || '';
            document.getElementById('agencia-logo').value = '';
            document.getElementById('agencia-form-submit').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar cambios';
            document.getElementById('agencia-cancelar-edicion').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function resetFormAgencia() {
            agenciaEditandoId = null;
            document.getElementById('form-agencia').reset();
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
            formData.append('whatsapp', document.getElementById('agencia-whatsapp').value.trim());
            const logoFile = document.getElementById('agencia-logo').files[0];
            if (logoFile) formData.append('logo', logoFile);

            const path = agenciaEditandoId ? 'editar' : 'crear';
            if (agenciaEditandoId) formData.append('id', agenciaEditandoId);

            const res = await fetch(`${AGENCIAS_API_URL}?path=${path}`, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
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
