// shared/hero-edit.js
// Botón (para cualquier usuario logueado) que reemplaza la imagen del Hero de SU PROPIA
// agencia, visible en cualquier vista — no solo en "Mi Empresa". Sube el archivo vía
// mi-empresa-api.php?path=subir-hero (autoservicio: el backend resuelve la agencia del
// usuario logueado, nunca un id que venga del cliente) y, si sale bien, actualiza en vivo
// el fondo de todos los .page-hero de la página actual, sin recargar.
(function () {
    const btn = document.getElementById('hero-edit-btn');
    const input = document.getElementById('hero-edit-input');
    if (!btn || !input) return;

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
            const meApiUrl = window.ME_API_URL || 'mi-empresa-api.php';
            const assetBase = window.HERO_ASSET_BASE || '';
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
})();
