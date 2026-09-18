// shared/hero-edit.js
// Botones (para cualquier usuario logueado) que personalizan la marca de SU PROPIA
// agencia desde el Hero, visibles en cualquier vista — no solo en "Mi Empresa": imagen de
// fondo, logo y color de marca. Cada uno sube/guarda vía mi-empresa-api.php (autoservicio:
// el backend resuelve la agencia del usuario logueado, nunca un id que venga del cliente)
// y, si sale bien, aplica el cambio en vivo sin recargar la página.
(function () {
    const meApiUrl = window.ME_API_URL || 'mi-empresa-api.php';
    const assetBase = window.HERO_ASSET_BASE || '';

    // ===== Imagen de fondo del Hero =====
    const btn = document.getElementById('hero-edit-btn');
    const input = document.getElementById('hero-edit-input');
    if (btn && input) {
        btn.addEventListener('click', () => input.click());

        input.addEventListener('change', async () => {
            const file = input.files[0];
            input.value = '';
            if (!file) return;

            if (!await confirmAction('¿Reemplazar la imagen del Hero de tu empresa?', 'Sí, reemplazar')) return;

            btn.disabled = true;
            const iconoOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const formData = new FormData();
                formData.append('imagen', file);
                const res = await fetch(`${meApiUrl}?path=subir-hero`, { method: 'POST', body: formData });
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'No se pudo actualizar la imagen.');

                const url = `${assetBase}uploads/agencias/${result.filename}?v=${result.v}`;
                document.querySelectorAll('.page-hero').forEach(hero => {
                    hero.style.setProperty('--hero-bg-image', `url('${url}')`);
                });
                notifySuccess('Imagen del Hero actualizada.');
            } catch (err) {
                notifyError(err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = iconoOriginal;
            }
        });
    }

    // ===== Logo de la empresa =====
    // Reemplaza el bloque de título/subtítulo del Hero (título + "Plataforma B2B...") por
    // el logo, ver #page-hero-content en cotizador.php/itinerario/index.php — y también se
    // usa en el PDF de cotización/itinerario.
    const logoBtn = document.getElementById('hero-logo-btn');
    const logoInput = document.getElementById('hero-logo-input');
    if (logoBtn && logoInput) {
        logoBtn.addEventListener('click', () => logoInput.click());

        logoInput.addEventListener('change', async () => {
            const file = logoInput.files[0];
            logoInput.value = '';
            if (!file) return;

            if (!await confirmAction('¿Reemplazar el logo de tu empresa?', 'Sí, reemplazar')) return;

            logoBtn.disabled = true;
            const iconoOriginal = logoBtn.innerHTML;
            logoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const formData = new FormData();
                formData.append('logo', file);
                const res = await fetch(`${meApiUrl}?path=subir-logo`, { method: 'POST', body: formData });
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'No se pudo actualizar el logo.');

                const url = `${assetBase}uploads/agencias/${result.filename}?v=${result.v}`;
                document.querySelectorAll('.page-hero-content').forEach(content => {
                    content.innerHTML = `<img src="${url}" alt="Logo" class="page-hero-logo">`;
                });
                notifySuccess('Logo actualizado.');
            } catch (err) {
                notifyError(err.message);
            } finally {
                logoBtn.disabled = false;
                logoBtn.innerHTML = iconoOriginal;
            }
        });
    }

    // ===== Color de marca (cuentagotas) =====
    // Reemplaza --accent-1/--accent-2 (botones/degradados actualmente rojos, definidos en
    // :root de cotizador.css) por el color que el usuario elija. --accent-2 se deriva
    // oscureciendo el mismo color un 18% (ver oscurecerColorHex() en agencia-helpers.php,
    // mismo criterio, para que coincida con lo que se renderiza server-side la próxima vez).
    const colorBtn = document.getElementById('hero-color-btn');
    const colorInput = document.getElementById('hero-color-input');
    if (colorBtn) {
        colorBtn.addEventListener('click', async () => {
            if (window.EyeDropper) {
                try {
                    const resultado = await new EyeDropper().open();
                    await guardarColorPrincipal(resultado.sRGBHex);
                } catch (err) {
                    // Cancelado con Escape/click fuera del cuentagotas: no es un error real.
                }
            } else if (colorInput) {
                colorInput.click();
            } else {
                notifyError('Tu navegador no soporta el cuentagotas de color.');
            }
        });
    }
    if (colorInput) {
        colorInput.addEventListener('change', async () => {
            if (colorInput.value) await guardarColorPrincipal(colorInput.value);
        });
    }

    async function guardarColorPrincipal(hex) {
        colorBtn.disabled = true;
        const iconoOriginal = colorBtn.innerHTML;
        colorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const formData = new FormData();
            formData.append('color_principal', hex);
            const res = await fetch(`${meApiUrl}?path=guardar-color`, { method: 'POST', body: formData });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'No se pudo actualizar el color.');

            document.documentElement.style.setProperty('--accent-1', hex);
            document.documentElement.style.setProperty('--accent-2', oscurecerColor(hex, 0.18));
            notifySuccess('Color de marca actualizado.');
        } catch (err) {
            notifyError(err.message);
        } finally {
            colorBtn.disabled = false;
            colorBtn.innerHTML = iconoOriginal;
        }
    }

    function oscurecerColor(hex, porcentaje) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.round(((num >> 16) & 0xff) * (1 - porcentaje));
        const g = Math.round(((num >> 8) & 0xff) * (1 - porcentaje));
        const b = Math.round((num & 0xff) * (1 - porcentaje));
        return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
    }
})();
