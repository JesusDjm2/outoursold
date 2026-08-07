<?php
// shared/usuarios.php
require_once __DIR__ . '/auth.php';

require_login();
if (!is_admin()) {
    http_response_code(403);
    die('Acceso denegado. Solo el administrador puede gestionar usuarios.');
}
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
    <div class="max-w-4xl mx-auto">
        <header class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Gestión de Usuarios</h1>
                <p class="text-slate-600">Crear cuentas, asignar roles y pausar el acceso.</p>
            </div>
            <a href="../pen/" class="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:opacity-90 transition">
                <i class="fas fa-arrow-left mr-1"></i> Volver al Cotizador
            </a>
        </header>

        <div class="card p-6 mb-6">
            <h2 class="text-xl font-semibold text-slate-800 mb-4">Nuevo Usuario</h2>
            <form id="form-nuevo-usuario" class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <label class="text-sm">Usuario
                    <input id="nuevo-usuario" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                </label>
                <label class="text-sm">Contraseña
                    <input id="nuevo-password" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                </label>
                <label class="text-sm">Rol
                    <select id="nuevo-rol" class="input w-full rounded px-2 py-2 border mt-1">
                        <option value="admin">admin</option>
                        <option value="agencia">agencia</option>
                        <option value="conta">conta</option>
                        <option value="reservas">reservas</option>
                    </select>
                </label>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-user-plus mr-2"></i>Crear
                </button>
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

    <script src="notify.js"></script>
    <script>
        const API_URL = 'usuarios-api.php';
        const ROLES = ['admin', 'agencia', 'conta', 'reservas'];

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
                    <td class="p-3">${estadoBadge}</td>
                    <td class="p-3">${u.creado_en}</td>
                    <td class="p-3">
                        <button class="btn ${u.activo == 1 ? 'btn-danger' : 'btn-primary'} toggle-btn" data-id="${u.id}" data-activo="${u.activo}">
                            ${u.activo == 1 ? 'Pausar' : 'Activar'}
                        </button>
                    </td>
                `;
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

        document.getElementById('form-nuevo-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const usuario = document.getElementById('nuevo-usuario').value.trim();
            const password = document.getElementById('nuevo-password').value;
            const rol = document.getElementById('nuevo-rol').value;

            const res = await fetch(`${API_URL}?path=crear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password, rol })
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('form-nuevo-usuario').reset();
                cargarUsuarios();
            } else {
                notifyError(result.error);
            }
        });

        cargarUsuarios();
    </script>
</body>
</html>
