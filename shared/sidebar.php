<?php
// shared/sidebar.php
// Menú lateral compartido por cotizador.php, gestion-datos.php y usuarios.php.
// El caller debe definir antes de incluir este archivo:
//   $navRoot   ruta relativa hasta la raíz del proyecto (siempre '../' para pen/, usd/ y shared/)
//   $navShared ruta relativa hasta la carpeta shared/ ('../shared/' desde pen//usd/, '' desde shared/)
//   $navActive clave de la sección activa: 'pen' | 'usd' | 'gestion-pen' | 'gestion-usd' |
//              'historial-cotizaciones' | 'mi-empresa' | 'usuarios'
// y haber cargado auth.php (usa is_admin() y $_SESSION).
?>
<script>
    // CSRF (ver exigirCsrf en auth.php): todo fetch a este mismo sitio que no sea GET lleva
    // el token de la sesión en la cabecera X-CSRF-Token. Va acá porque todas las vistas con
    // sesión cargan el menú antes que sus scripts.
    window.CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;
    // Permisos del rol (ver PERMISOS_POR_ROL en auth.php). El servidor los exige igual; acá
    // solo sirven para no mostrar botones que el rol no puede usar (clases sin-editar,
    // sin-borrar y sin-empresa en <body>, ver sidebar.css).
    window.PERMISOS = <?= json_encode(permisosDeSesion()) ?>;
    window.ROL = <?= json_encode($_SESSION['rol'] ?? '') ?>;
    window.ROL_ETIQUETA = <?= json_encode(ROLES_ETIQUETA[$_SESSION['rol'] ?? ''] ?? '') ?>;
    ['editar', 'borrar', 'empresa'].forEach(p => { if (!window.PERMISOS[p]) document.body.classList.add('sin-' + p); });
    // Rol de solo lectura (Contabilidad): un aviso arriba de cada vista.
    if (!window.PERMISOS.editar) {
        document.addEventListener('DOMContentLoaded', () => {
            const aviso = document.createElement('div');
            aviso.className = 'rol-aviso';
            aviso.innerHTML = '<i class="fas fa-eye"></i><span></span>';
            aviso.querySelector('span').textContent = `Tu rol (${window.ROL_ETIQUETA}) es de solo lectura: puedes ver cotizaciones, historial y precios, pero no crear, modificar ni eliminar.`;
            document.querySelector('.app-content')?.prepend(aviso);
        });
    }
    (function () {
        const fetchOriginal = window.fetch.bind(window);
        window.fetch = function (recurso, opciones = {}) {
            const metodo = String(opciones.method || (recurso instanceof Request ? recurso.method : 'GET')).toUpperCase();
            const url = new URL(recurso instanceof Request ? recurso.url : String(recurso), location.href);
            if (metodo !== 'GET' && metodo !== 'HEAD' && url.origin === location.origin) {
                const cabeceras = new Headers(opciones.headers || (recurso instanceof Request ? recurso.headers : undefined));
                cabeceras.set('X-CSRF-Token', window.CSRF_TOKEN);
                opciones = { ...opciones, headers: cabeceras };
            }
            return fetchOriginal(recurso, opciones);
        };
    })();
    if (localStorage.getItem('sidebarCollapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
    }
</script>
<aside id="app-sidebar" class="app-sidebar">
    <div class="sidebar-brand">
        <img src="<?= htmlspecialchars($navShared) ?>logo.png" alt="Logo" class="sidebar-logo">
    </div>
    <nav class="sidebar-nav">
        <a href="<?= htmlspecialchars($navShared) ?>mi-empresa.php" class="sidebar-link<?= $navActive === 'mi-empresa' ? ' active' : '' ?>" title="Mi Empresa">
            <i class="fas fa-id-card"></i><span>Mi Empresa</span>
        </a>
        <a href="<?= htmlspecialchars($navRoot) ?>usd/" class="sidebar-link<?= ($navActive === 'usd' || $navActive === 'pen') ? ' active' : '' ?>" title="Cotizador">
            <i class="fas fa-calculator"></i><span>Cotizador</span>
        </a>
        <a href="<?= htmlspecialchars($navRoot) ?>usd/gestion.php" class="sidebar-link<?= ($navActive === 'gestion-usd' || $navActive === 'gestion-pen') ? ' active' : '' ?>" title="Gestión de Datos">
            <i class="fas fa-database"></i><span>Gestión de Datos</span>
        </a>
        <a href="<?= htmlspecialchars($navShared) ?>historial-cotizaciones.php" class="sidebar-link<?= $navActive === 'historial-cotizaciones' ? ' active' : '' ?>" title="Historial">
            <i class="fas fa-clock-rotate-left"></i><span>Historial</span>
        </a>
        <?php if (is_admin()): ?>
        <a href="<?= htmlspecialchars($navShared) ?>usuarios.php" class="sidebar-link<?= $navActive === 'usuarios' ? ' active' : '' ?>" title="Usuarios">
            <i class="fas fa-users-cog"></i><span>Usuarios</span>
        </a>
        <?php endif; ?>
        <button id="sidebar-collapse-btn" class="sidebar-link sidebar-collapse-toggle" aria-label="Contraer menú" title="Contraer menú">
            <i class="fas fa-angles-left"></i>
        </button>
    </nav>
    <div class="sidebar-footer">
        <div class="sidebar-user">
            <i class="fas fa-user-circle"></i>
            <div class="sidebar-user-info">
                <div class="sidebar-user-name"><?= htmlspecialchars($_SESSION['usuario'] ?? '') ?></div>
                <div class="sidebar-user-role"><?= htmlspecialchars($_SESSION['rol'] ?? '') ?></div>
            </div>
        </div>
        <a href="<?= htmlspecialchars($navShared) ?>logout.php" id="sidebar-logout" class="sidebar-link sidebar-logout" title="Cerrar Sesión">
            <i class="fas fa-sign-out-alt"></i><span>Cerrar Sesión</span>
        </a>
    </div>
</aside>
<div id="sidebar-backdrop" class="sidebar-backdrop"></div>
<button id="sidebar-toggle" class="sidebar-toggle-btn" aria-label="Abrir menú">
    <i class="fas fa-bars"></i>
</button>
<script>
    (function () {
        const sidebar = document.getElementById('app-sidebar');
        const toggle = document.getElementById('sidebar-toggle');
        const backdrop = document.getElementById('sidebar-backdrop');
        const collapseBtn = document.getElementById('sidebar-collapse-btn');
        const close = () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); };
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            backdrop.classList.toggle('open');
        });
        backdrop.addEventListener('click', close);

        // Botón flotante: se esconde al bajar (taparía el contenido) y vuelve al subir.
        let scrollPrevio = window.scrollY;
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            if (Math.abs(y - scrollPrevio) < 8) return;
            toggle.classList.toggle('is-oculto', y > scrollPrevio && y > 80);
            scrollPrevio = y;
        }, { passive: true });

        collapseBtn.addEventListener('click', () => {
            const collapsed = document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
            collapseBtn.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
            collapseBtn.setAttribute('title', collapsed ? 'Expandir menú' : 'Contraer menú');
        });

        const logoutLink = document.getElementById('sidebar-logout');
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = logoutLink.getAttribute('href');
            if (typeof confirmAction === 'function') {
                if (await confirmAction('¿Cerrar sesión?')) window.location.href = href;
            } else {
                window.location.href = href;
            }
        });
    })();
</script>
