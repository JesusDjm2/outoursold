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
    // Antes de subir la imagen, se abre un ajuste de "arrastrar para reposicionar" (como
    // la foto de portada de Facebook/LinkedIn): el usuario elige qué parte de la imagen
    // queda visible en el recorte angosto del Hero (background-size:cover), sobre todo
    // importante en fotos verticales/retrato donde el centro por defecto corta mal.
    const btn = document.getElementById('hero-edit-btn');
    const input = document.getElementById('hero-edit-input');
    if (btn && input) {
        btn.addEventListener('click', () => input.click());

        input.addEventListener('change', async () => {
            const file = input.files[0];
            input.value = '';
            if (!file) return;
            const objectUrl = URL.createObjectURL(file);
            try {
                const posY = await abrirAjusteDePosicion(objectUrl);
                if (posY === null) return; // canceló
                await subirHero(file, posY);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        });
    }

    // Devuelve la posición elegida (0-100) o null si el usuario canceló. previewUrl es un
    // object URL del archivo recién elegido — todavía no se subió nada al servidor.
    // Dos marcos sincronizados al mismo valor: el de PC (ancho y bajo, ~7:1 — la forma real
    // del Hero en pantallas grandes) es el que se arrastra; el de celular (~2.15:1) es solo
    // de referencia, para no perder de vista cómo queda ahí también.
    function abrirAjusteDePosicion(previewUrl) {
        return new Promise((resolve) => {
            let posY = 50;
            const overlay = document.createElement('div');
            overlay.className = 'hero-pos-overlay';
            overlay.innerHTML = `
                <div class="hero-pos-modal">
                    <h3>Ajustar la imagen del Hero</h3>
                    <p>Arrastra la imagen para elegir qué parte se ve en el encabezado. Prioriza cómo queda en PC: es la vista que ve la mayoría de tus clientes.</p>
                    <div class="hero-pos-previews">
                        <div class="hero-pos-preview-block hero-pos-preview-block-pc">
                            <span class="hero-pos-label">Vista en PC</span>
                            <div class="hero-pos-frame hero-pos-frame-pc">
                                <div class="hero-pos-preview" style="background-image:url('${previewUrl}');background-position:center 50%"></div>
                                <span class="hero-pos-hint">Arrastra para ajustar</span>
                            </div>
                        </div>
                        <div class="hero-pos-preview-block hero-pos-preview-block-mobile">
                            <span class="hero-pos-label">Vista en celular</span>
                            <div class="hero-pos-frame hero-pos-frame-mobile">
                                <div class="hero-pos-preview" style="background-image:url('${previewUrl}');background-position:center 50%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="hero-pos-actions">
                        <button type="button" class="btn border" id="hero-pos-cancelar">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="hero-pos-guardar">Guardar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const frame = overlay.querySelector('.hero-pos-frame-pc');
            const previews = overlay.querySelectorAll('.hero-pos-preview');
            let arrastrando = false, startY = 0, startPos = 50;

            const aplicarPosY = () => {
                previews.forEach(p => { p.style.backgroundPosition = `center ${posY}%`; });
            };

            frame.addEventListener('pointerdown', (e) => {
                arrastrando = true;
                startY = e.clientY;
                startPos = posY;
                frame.classList.add('is-dragging', 'ya-arrastro');
                frame.setPointerCapture(e.pointerId);
            });
            frame.addEventListener('pointermove', (e) => {
                if (!arrastrando) return;
                // Arrastrar la imagen hacia abajo revela más de su parte de arriba (como
                // correr una cortina): el delta del puntero resta a la posición.
                const deltaPorcentaje = ((e.clientY - startY) / frame.offsetHeight) * 100;
                posY = Math.max(0, Math.min(100, Math.round(startPos - deltaPorcentaje)));
                aplicarPosY();
            });
            const soltar = () => frame.classList.remove('is-dragging');
            frame.addEventListener('pointerup', soltar);
            frame.addEventListener('pointercancel', soltar);
            frame.addEventListener('pointerup', () => { arrastrando = false; });
            frame.addEventListener('pointercancel', () => { arrastrando = false; });

            const cerrar = (valor) => {
                overlay.remove();
                resolve(valor);
            };
            overlay.querySelector('#hero-pos-cancelar').addEventListener('click', () => cerrar(null));
            overlay.querySelector('#hero-pos-guardar').addEventListener('click', () => cerrar(posY));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
        });
    }

    async function subirHero(file, posY) {
        btn.disabled = true;
        const iconoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const formData = new FormData();
            formData.append('imagen', file);
            formData.append('pos_y', String(posY));
            const res = await fetch(`${meApiUrl}?path=subir-hero`, { method: 'POST', body: formData });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'No se pudo actualizar la imagen.');

            const url = `${assetBase}uploads/agencias/${result.filename}?v=${result.v}`;
            document.querySelectorAll('.page-hero').forEach(hero => {
                hero.style.setProperty('--hero-bg-image', `url('${url}')`);
                hero.style.setProperty('--hero-pos-y', `${result.pos_y}%`);
            });
            notifySuccess('Imagen del Hero actualizada.');
        } catch (err) {
            notifyError(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = iconoOriginal;
        }
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

                // Fade-in en vez de un pop abrupto: arranca en opacity:0 y sube al
                // siguiente frame (ver transition en .page-hero-logo, hero.css).
                const url = `${assetBase}uploads/agencias/${result.filename}?v=${result.v}`;
                document.querySelectorAll('.page-hero-content').forEach(content => {
                    content.innerHTML = `<img src="${url}" alt="Logo" class="page-hero-logo" style="opacity:0">`;
                    const img = content.querySelector('img');
                    requestAnimationFrame(() => { img.style.opacity = '1'; });
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
    // oscureciendo ese color un 18% (ver oscurecerColorHex() en agencia-helpers.php,
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

            // En <body>, no en <html>: el server-render (resolverAccentColorStyle) inyecta
            // el color guardado como inline style justo ahí (ver <body style="--accent-1:...">
            // en cotizador.php/itinerario/index.php) — si se pisa en <html> en vez de <body>,
            // ese inline style (más cercano en el árbol) le sigue ganando y el cambio no se
            // ve hasta recargar.
            document.body.style.setProperty('--accent-1', hex);
            document.body.style.setProperty('--accent-2', oscurecerColor(hex, 0.18));
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
