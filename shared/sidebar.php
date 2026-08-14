<?php
// shared/sidebar.php
// Menú lateral compartido por cotizador.php y usuarios.php.
// El caller debe definir antes de incluir este archivo:
//   $navRoot   ruta relativa hasta la raíz del proyecto (siempre '../' para pen/, usd/ y shared/)
//   $navShared ruta relativa hasta la carpeta shared/ ('../shared/' desde pen//usd/, '' desde shared/)
//   $navActive clave de la sección activa: 'pen' | 'usd' | 'itinerario' | 'usuarios'
// y haber cargado auth.php (usa is_admin() y $_SESSION).
?>
<script>
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
        <a href="<?= htmlspecialchars($navRoot) ?>itinerario/" class="sidebar-link<?= $navActive === 'itinerario' ? ' active' : '' ?>" title="Itinerario">
            <i class="fas fa-route"></i><span>Itinerario</span>
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
