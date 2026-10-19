// shared/itinerario-selector.js
// Selector visual de itinerarios del Cotizador: una vista a pantalla completa (no otra
// página, para no perder la cotización que se está armando, que no se guarda hasta
// "Guardar") donde se elige primero Con / Sin pernocte y debajo aparecen todos sus
// itinerarios agrupados por Destino → Categoría, como tarjetas con su imagen.
//
// Dos modos:
//  - 'agregar' (botón "Elegir itinerarios"): arma varios días de una vez. La bandeja de
//    abajo ("Tu itinerario") arranca con los días que ya tiene el armador y cada tarjeta
//    que se toca se suma como el día siguiente; ahí mismo se reordenan o quitan. "Aplicar"
//    reemplaza el armador por esa secuencia.
//  - 'cambiar' (clic en un día del armador): elegir una tarjeta reemplaza solo ese día.
//
// Depende de itinerario.js (modulosActivos, itinCategoriasData, urlImagenItinerario,
// addItineraryBuilderRow, recalculateDayNumbers, idiomaActivo), de destinosData de
// cotizador.js, y de escapeHtml / notify.js. Las filas del armador siguen exponiendo el
// filename en su input oculto .module-filename, que es lo que lee el resto del Cotizador.

const ISEL_GRUPOS = [
    { valor: '1', nombre: 'Con pernocte', icono: 'fa-moon' },
    { valor: '2', nombre: 'Sin pernocte', icono: 'fa-sun' }
];
const ISEL_SIN_CLASIFICAR = 'sin-clasificar';
const ISEL_GRUPO_STORAGE = 'cotizador.iselGrupo';
const ISEL_IDIOMAS = { es: 'Español', en: 'English', pt: 'Português' };

let isel = null; // estado mientras la vista está abierta

function iselNormalizar(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Destinos de Itinerarios: solo los de Con / Sin pernocte, con su nombre real (sin el
// sufijo " · Con pernocte" que les agrega itinerario.js para los <select>), porque acá el
// grupo ya se eligió arriba.
function iselDestinos() {
    const lista = (typeof destinosData !== 'undefined' && Array.isArray(destinosData)) ? destinosData : [];
    return lista.filter(d => d.grupo_id != null);
}

// Catálogo del idioma activo con su clasificación resuelta. Un itinerario cuyo destino no
// es de Con / Sin pernocte (o ya no existe) va a "Sin clasificar", y una categoría que no
// es de su destino se ignora — mismo criterio que el selector en cascada.
function iselCatalogo() {
    const destinoPorId = new Map(iselDestinos().map(d => [Number(d.id), d]));
    const categoriaPorId = new Map(itinCategoriasData.map(c => [Number(c.id), c]));
    return modulosActivos().map(m => {
        const destino = m.destino_id != null ? destinoPorId.get(Number(m.destino_id)) || null : null;
        let categoria = destino && m.categoria_id != null ? categoriaPorId.get(Number(m.categoria_id)) || null : null;
        if (categoria && Number(categoria.destino_id) !== Number(destino.id)) categoria = null;
        return {
            m,
            destino,
            categoria,
            grupo: destino ? String(destino.grupo_id) : ISEL_SIN_CLASIFICAR,
            texto: iselNormalizar([m.titulo, m.lugares_visitar, destino?.nombre, categoria?.nombre].filter(Boolean).join(' '))
        };
    });
}

function iselEntradaDe(filename) {
    return isel?.catalogo.find(e => e.m.filename === filename) || iselCatalogo().find(e => e.m.filename === filename) || null;
}

function iselNombreGrupo(valor) {
    return ISEL_GRUPOS.find(g => g.valor === valor)?.nombre || 'Sin clasificar';
}

// "Cusco · City Tour · Con pernocte" (lo que haya).
function iselRuta(e, { conGrupo = true } = {}) {
    if (!e.destino) return 'Sin clasificar';
    return [e.destino.nombre, e.categoria?.nombre, conGrupo ? iselNombreGrupo(e.grupo) : null].filter(Boolean).join(' · ');
}

// ===== Imagen o, si no hay, un degradado con la inicial del destino/título =====
function iselTieneImagen(m) {
    return !!(m.imagen && m.imagen_existe !== false);
}
function iselTono(texto) {
    let h = 0;
    for (const ch of String(texto)) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
}
function iselMediaHtml(e, clase = 'isel-media') {
    if (iselTieneImagen(e.m)) {
        return `<img src="${urlImagenItinerario(e.m.imagen)}" alt="" loading="lazy" decoding="async" class="${clase}-img">`;
    }
    const base = e.destino?.nombre || e.m.titulo;
    const inicial = (base.trim()[0] || '?').toUpperCase();
    return `<div class="${clase}-vacia" style="--isel-tono:${iselTono(base)}" aria-hidden="true">
        <span class="isel-vacia-inicial">${escapeHtml(inicial)}</span>
        <i class="fas fa-mountain-sun"></i>
    </div>`;
}

// ===== Filas del armador (Cotizador): tarjeta compacta con miniatura en vez del select =====
function construirCeldaItinerarioVisual(tr, hiddenInput) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'itin-dia';
    tr._iselPintar = () => {
        const filename = hiddenInput.value;
        if (!filename) {
            btn.classList.add('is-vacio');
            btn.classList.remove('is-fuera');
            btn.innerHTML = `
                <span class="itin-dia-thumb is-vacio"><i class="fas fa-plus"></i></span>
                <span class="itin-dia-texto">
                    <span class="itin-dia-titulo">Elegir itinerario</span>
                    <span class="itin-dia-meta">Ver el catálogo con imágenes</span>
                </span>`;
            btn.setAttribute('aria-label', 'Elegir el itinerario de este día');
            return;
        }
        btn.classList.remove('is-vacio');
        const e = iselCatalogo().find(x => x.m.filename === filename);
        btn.classList.toggle('is-fuera', !e);
        btn.innerHTML = `
            <span class="itin-dia-thumb">${e ? iselMediaHtml(e, 'itin-dia-thumb') : '<i class="fas fa-triangle-exclamation"></i>'}</span>
            <span class="itin-dia-texto">
                <span class="itin-dia-titulo">${escapeHtml(e ? e.m.titulo : filename)}</span>
                <span class="itin-dia-meta">${e ? escapeHtml(iselRuta(e)) : 'Fuera de catálogo en este idioma'}</span>
            </span>
            <span class="itin-dia-cambiar"><i class="fas fa-arrows-rotate"></i><span>Cambiar</span></span>`;
        btn.setAttribute('aria-label', `Cambiar el itinerario de este día (${e ? e.m.titulo : filename})`);
    };
    hiddenInput._iselPintar = tr._iselPintar;
    btn.addEventListener('click', () => abrirSelectorItinerarios({ modo: 'cambiar', fila: tr }));
    tr._iselPintar();
    return btn;
}

function refrescarFilasItinerarioVisual() {
    document.querySelectorAll('#itinerary-builder-body tr').forEach(tr => tr._iselPintar?.());
}

function iselFilenamesArmador() {
    return [...document.querySelectorAll('#itinerary-builder-body .module-filename')].map(el => el.value).filter(Boolean);
}

// ===== Abrir / cerrar =====
function abrirSelectorItinerarios({ modo = 'agregar', fila = null } = {}) {
    if (isel) return;
    const catalogo = iselCatalogo();
    const secuencia = modo === 'agregar' ? iselFilenamesArmador() : [];
    const actual = modo === 'cambiar' ? fila.querySelector('.module-filename')?.value || '' : '';
    const filas = [...document.querySelectorAll('#itinerary-builder-body tr')];
    const diaFila = modo === 'cambiar' ? filas.indexOf(fila) + 1 : 0;

    // Pestaña inicial: la del día que se cambia; si no, la última usada; si no, la primera con itinerarios.
    const conItems = (g) => catalogo.some(e => e.grupo === g);
    let grupo = null;
    if (actual) grupo = catalogo.find(e => e.m.filename === actual)?.grupo || null;
    if (!grupo) {
        try { grupo = localStorage.getItem(ISEL_GRUPO_STORAGE); } catch (_) { grupo = null; }
        if (grupo && !conItems(grupo)) grupo = null;
    }
    if (!grupo) grupo = [...ISEL_GRUPOS.map(g => g.valor), ISEL_SIN_CLASIFICAR].find(conItems) || ISEL_GRUPOS[0].valor;

    isel = {
        modo, fila, actual, diaFila, catalogo, grupo,
        secuencia,
        secuenciaInicial: secuencia.join('\n'),
        busqueda: '',
        detalle: null,
        historial: false,
        forzarCierre: false,
        focoPrevio: document.activeElement,
        observer: null
    };

    const raiz = document.createElement('div');
    raiz.id = 'isel';
    raiz.className = `isel is-modo-${modo}`;
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-modal', 'true');
    raiz.setAttribute('aria-labelledby', 'isel-titulo');
    raiz.innerHTML = `
        <header class="isel-head">
            <button type="button" class="isel-icon-btn isel-volver" aria-label="Volver al cotizador" title="Volver al cotizador (Esc)"><i class="fas fa-arrow-left"></i></button>
            <div class="isel-head-titulos">
                <h2 id="isel-titulo">${modo === 'cambiar' ? `Itinerario del Día ${diaFila}` : 'Elegir itinerarios'}</h2>
                <p>${modo === 'cambiar'
                    ? (actual ? 'Toca una tarjeta para reemplazar el itinerario de este día.' : 'Toca una tarjeta para asignarla a este día.')
                    : 'Toca las tarjetas en el orden de los días. Cada una se suma como el día siguiente.'}</p>
            </div>
            <label class="isel-buscar">
                <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input type="search" id="isel-busqueda" placeholder="Buscar itinerario, lugar o destino..." autocomplete="off" aria-label="Buscar itinerarios">
                <kbd aria-hidden="true">/</kbd>
            </label>
            <span class="isel-idioma" title="Idioma del catálogo (el de la cotización)"><i class="fas fa-language"></i>${ISEL_IDIOMAS[idiomaActivo] || idiomaActivo}</span>
        </header>
        <div class="isel-toolbar">
            <div class="isel-grupos" role="tablist" aria-label="Tipo de itinerario"></div>
        </div>
        <div class="isel-cuerpo">
            <nav class="isel-nav" aria-label="Destinos"></nav>
            <main class="isel-main" tabindex="-1"></main>
        </div>
        ${modo === 'agregar' ? `
        <footer class="isel-bandeja">
            <div class="isel-bandeja-info">
                <strong>Tu itinerario</strong>
                <span class="isel-bandeja-count" aria-live="polite"></span>
            </div>
            <ol class="isel-bandeja-lista" aria-label="Días del itinerario"></ol>
            <div class="isel-bandeja-acciones">
                <button type="button" class="isel-btn isel-btn-ghost isel-vaciar">Vaciar</button>
                <button type="button" class="isel-btn isel-btn-secundario isel-cancelar">Cancelar</button>
                <button type="button" class="isel-btn isel-btn-primario isel-aplicar"></button>
            </div>
        </footer>` : ''}
        <div class="isel-detalle-fondo" hidden></div>
        <aside class="isel-detalle" aria-hidden="true" aria-labelledby="isel-detalle-titulo" tabindex="-1"></aside>
        <div class="isel-anuncio" aria-live="assertive" role="status"></div>
    `;
    document.body.appendChild(raiz);
    document.documentElement.classList.add('isel-abierto');
    isel.raiz = raiz;

    iselEnlazarEventos();
    iselRenderGrupos();
    iselRenderContenido();
    iselRenderBandeja();

    history.pushState({ iselAbierto: true }, '');
    isel.historial = true;

    // En pantallas táctiles no se enfoca la búsqueda (abriría el teclado tapando las tarjetas).
    requestAnimationFrame(() => {
        raiz.classList.add('is-visible');
        // Al cambiar un día, se abre mostrando la tarjeta que tiene ahora.
        if (actual) [...raiz.querySelectorAll('.isel-card')].find(c => c.dataset.filename === actual)?.scrollIntoView({ block: 'center' });
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) raiz.querySelector('#isel-busqueda').focus();
        else raiz.querySelector('.isel-volver').focus();
    });
}

function iselHayCambios() {
    return isel && isel.modo === 'agregar' && isel.secuencia.join('\n') !== isel.secuenciaInicial;
}

// Cierre pedido por el usuario (Volver, Cancelar, Esc): si hay días sin aplicar, confirma.
// Con historial, el cierre real lo hace el popstate de history.back() — así el botón
// "atrás" del navegador/celular y el de la vista hacen exactamente lo mismo.
async function iselSolicitarCierre() {
    if (!isel) return;
    if (!isel.forzarCierre && iselHayCambios() && !await confirmAction(
        '¿Salir sin aplicar los cambios? Los días que elegiste en esta vista no se agregarán al itinerario.',
        'Sí, salir', 'Seguir eligiendo'
    )) return;
    isel.forzarCierre = true;
    if (isel.historial) history.back();
    else iselCerrarInterno();
}

function iselCerrarInterno() {
    if (!isel) return;
    const { raiz, focoPrevio, observer } = isel;
    observer?.disconnect();
    document.removeEventListener('keydown', iselOnKeydown, true);
    isel = null;
    document.documentElement.classList.remove('isel-abierto');
    raiz.classList.remove('is-visible');
    setTimeout(() => raiz.remove(), 180);
    if (focoPrevio && document.contains(focoPrevio)) focoPrevio.focus({ preventScroll: true });
}

window.addEventListener('popstate', async () => {
    if (!isel) return;
    if (isel.forzarCierre || !iselHayCambios()) { iselCerrarInterno(); return; }
    // "Atrás" del navegador con días sin aplicar: se vuelve a poner la entrada y se pregunta.
    history.pushState({ iselAbierto: true }, '');
    if (await confirmAction(
        '¿Salir sin aplicar los cambios? Los días que elegiste en esta vista no se agregarán al itinerario.',
        'Sí, salir', 'Seguir eligiendo'
    )) {
        isel.forzarCierre = true;
        history.back();
    }
});

// ===== Eventos =====
function iselEnlazarEventos() {
    const { raiz } = isel;
    raiz.querySelector('.isel-volver').addEventListener('click', iselSolicitarCierre);
    raiz.querySelector('.isel-cancelar')?.addEventListener('click', iselSolicitarCierre);
    raiz.querySelector('.isel-aplicar')?.addEventListener('click', iselAplicar);
    raiz.querySelector('.isel-vaciar')?.addEventListener('click', () => {
        if (!isel.secuencia.length) return;
        isel.secuencia = [];
        iselActualizarSeleccion();
        iselAnunciar('Se quitaron todos los días.');
    });

    let debounce;
    raiz.querySelector('#isel-busqueda').addEventListener('input', (ev) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            isel.busqueda = iselNormalizar(ev.target.value.trim());
            iselRenderGrupos();
            iselRenderContenido();
        }, 120);
    });

    raiz.querySelector('.isel-grupos').addEventListener('click', (ev) => {
        const tab = ev.target.closest('[data-grupo]');
        if (tab) iselCambiarGrupo(tab.dataset.grupo);
    });
    // Flechas entre pestañas (patrón ARIA de tablist).
    raiz.querySelector('.isel-grupos').addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        const tabs = [...raiz.querySelectorAll('.isel-grupo')];
        const i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        const sig = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        sig.focus();
        iselCambiarGrupo(sig.dataset.grupo);
    });

    raiz.querySelector('.isel-nav').addEventListener('click', (ev) => {
        const link = ev.target.closest('[data-ir]');
        if (!link) return;
        ev.preventDefault();
        const destino = raiz.querySelector(`#${link.dataset.ir}`);
        destino?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });

    raiz.querySelector('.isel-main').addEventListener('click', (ev) => {
        const otroGrupo = ev.target.closest('[data-ver-grupo]');
        if (otroGrupo) { iselCambiarGrupo(otroGrupo.dataset.verGrupo); return; }
        if (ev.target.closest('.isel-limpiar-busqueda')) {
            const input = raiz.querySelector('#isel-busqueda');
            input.value = '';
            input.dispatchEvent(new Event('input'));
            input.focus();
            return;
        }
        const card = ev.target.closest('.isel-card');
        if (!card) return;
        const filename = card.dataset.filename;
        if (ev.target.closest('.isel-card-info')) { iselAbrirDetalle(filename); return; }
        if (ev.target.closest('.isel-card-repetir')) { iselAgregar(filename); return; }
        if (ev.target.closest('.isel-card-main')) iselElegir(filename);
    });

    const lista = raiz.querySelector('.isel-bandeja-lista');
    if (lista) {
        lista.addEventListener('click', (ev) => {
            const li = ev.target.closest('li[data-idx]');
            if (!li) return;
            const idx = Number(li.dataset.idx);
            if (ev.target.closest('.isel-chip-quitar')) {
                const titulo = iselEntradaDe(isel.secuencia[idx])?.m.titulo || isel.secuencia[idx];
                isel.secuencia.splice(idx, 1);
                iselActualizarSeleccion();
                iselAnunciar(`Se quitó el Día ${idx + 1}: ${titulo}.`);
                // Mantiene el foco en la bandeja en vez de perderlo al re-renderizar.
                const chips = isel.raiz.querySelectorAll('.isel-bandeja-lista li');
                chips[Math.min(idx, chips.length - 1)]?.querySelector('.isel-chip-quitar')?.focus();
            } else if (ev.target.closest('.isel-chip-mover')) {
                const dir = Number(ev.target.closest('.isel-chip-mover').dataset.dir);
                iselMover(idx, idx + dir);
            } else if (ev.target.closest('.isel-chip-ver')) {
                iselAbrirDetalle(isel.secuencia[idx]);
            }
        });
        iselHabilitarArrastreBandeja(lista);
    }

    raiz.querySelector('.isel-detalle-fondo').addEventListener('click', iselCerrarDetalle);
    document.addEventListener('keydown', iselOnKeydown, true);
}

function iselOnKeydown(ev) {
    if (!isel) return;
    // Con un Swal de confirmación abierto, el teclado es de él (un toast no cuenta).
    if (Swal.isVisible() && !Swal.getPopup()?.classList.contains('swal2-toast')) return;
    if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        if (isel.detalle) iselCerrarDetalle();
        else iselSolicitarCierre();
        return;
    }
    const enCampo = ev.target.closest('input, textarea, select, [contenteditable="true"]');
    if (ev.key === '/' && !enCampo) {
        ev.preventDefault();
        isel.raiz.querySelector('#isel-busqueda').focus();
        return;
    }
    if (ev.key === 'Tab') iselAtraparFoco(ev);
}

// Mantiene el Tab dentro de la vista (o del detalle, si está abierto).
function iselAtraparFoco(ev) {
    const cont = isel.detalle ? isel.raiz.querySelector('.isel-detalle') : isel.raiz;
    const focoables = [...cont.querySelectorAll('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null && !el.closest('[hidden]') && (isel.detalle || !el.closest('.isel-detalle')));
    if (!focoables.length) return;
    const primero = focoables[0];
    const ultimo = focoables[focoables.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    else if (!cont.contains(document.activeElement)) { ev.preventDefault(); primero.focus(); }
}

function iselAnunciar(texto) {
    const el = isel?.raiz.querySelector('.isel-anuncio');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = texto; });
}

// ===== Selección =====
function iselElegir(filename) {
    if (isel.modo === 'cambiar') {
        const dia = isel.diaFila;
        const titulo = iselEntradaDe(filename)?.m.titulo || filename;
        iselAsignarAFila(isel.fila, filename);
        isel.forzarCierre = true;
        iselSolicitarCierre();
        iselToast(`Día ${dia}: ${titulo}`);
        iselResaltarFilas([dia - 1]);
        return;
    }
    // Agregar: tocar una tarjeta que ya está la quita (su última aparición); para repetirla
    // a propósito está el botón "Repetir" de la propia tarjeta.
    const idx = isel.secuencia.lastIndexOf(filename);
    const titulo = iselEntradaDe(filename)?.m.titulo || filename;
    if (idx !== -1) {
        isel.secuencia.splice(idx, 1);
        iselActualizarSeleccion();
        iselAnunciar(`Se quitó el Día ${idx + 1}: ${titulo}.`);
    } else {
        iselAgregar(filename);
    }
}

function iselAgregar(filename) {
    isel.secuencia.push(filename);
    iselActualizarSeleccion();
    const titulo = iselEntradaDe(filename)?.m.titulo || filename;
    iselAnunciar(`${titulo} se agregó como Día ${isel.secuencia.length}.`);
    // Lleva la bandeja al último día agregado.
    const lista = isel.raiz.querySelector('.isel-bandeja-lista');
    if (lista) {
        const ultimo = lista.lastElementChild;
        ultimo?.classList.add('is-nuevo');
        ultimo?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }
}

function iselMover(desde, hasta) {
    if (hasta < 0 || hasta >= isel.secuencia.length || desde === hasta) return;
    const [f] = isel.secuencia.splice(desde, 1);
    isel.secuencia.splice(hasta, 0, f);
    iselActualizarSeleccion();
    iselAnunciar(`Movido al Día ${hasta + 1}.`);
    isel.raiz.querySelectorAll('.isel-bandeja-lista li')[hasta]
        ?.querySelector(`.isel-chip-mover[data-dir="${hasta > desde ? 1 : -1}"]`)?.focus();
}

function iselAsignarAFila(tr, filename) {
    const hidden = tr.querySelector('.module-filename');
    if (!hidden) return;
    hidden.value = filename;
    tr._iselPintar?.();
}

function iselAplicar() {
    const body = document.getElementById('itinerary-builder-body');
    const n = isel.secuencia.length;
    const cambios = iselHayCambios();
    // Días nuevos o movidos respecto de lo que había, para resaltarlos al volver.
    const antes = isel.secuenciaInicial ? isel.secuenciaInicial.split('\n') : [];
    const tocados = isel.secuencia.map((f, i) => (antes[i] !== f ? i : -1)).filter(i => i !== -1);
    if (cambios) {
        body.innerHTML = '';
        if (n) isel.secuencia.forEach(f => addItineraryBuilderRow('itinerary-builder-body', true, f));
        else addItineraryBuilderRow('itinerary-builder-body', true);
        recalculateDayNumbers();
    }
    isel.forzarCierre = true;
    iselSolicitarCierre();
    if (cambios) {
        iselToast(n ? `Itinerario actualizado: ${n} día${n === 1 ? '' : 's'}` : 'Itinerario vaciado');
        iselResaltarFilas(tocados);
    }
}

// Aviso breve que no bloquea (notifySuccess es un modal que pide un clic más).
function iselToast(texto) {
    Swal.fire({
        toast: true, position: 'bottom', icon: 'success', title: texto,
        showConfirmButton: false, timer: 2200, timerProgressBar: false
    });
}

// Resalta un momento las filas del armador que cambiaron (índices 0-based).
function iselResaltarFilas(indices) {
    const filas = document.querySelectorAll('#itinerary-builder-body tr');
    indices.forEach(i => {
        const btn = filas[i]?.querySelector('.itin-dia');
        if (!btn) return;
        btn.classList.remove('is-resaltado');
        void btn.offsetWidth;
        btn.classList.add('is-resaltado');
    });
}

// Días (1-based) en los que está un itinerario dentro de la secuencia.
function iselDiasDe(filename) {
    const dias = [];
    isel.secuencia.forEach((f, i) => { if (f === filename) dias.push(i + 1); });
    return dias;
}

function iselTextoDias(dias) {
    if (!dias.length) return '';
    if (dias.length === 1) return `Día ${dias[0]}`;
    return `Días ${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;
}

// Refresca solo el estado de las tarjetas y la bandeja (sin volver a pintar el catálogo,
// para no perder el scroll ni recargar imágenes).
function iselActualizarSeleccion() {
    isel.raiz.querySelectorAll('.isel-card').forEach(card => iselPintarEstadoCard(card));
    iselRenderBandeja();
    if (isel.detalle) iselPintarAccionesDetalle();
}

function iselPintarEstadoCard(card) {
    const filename = card.dataset.filename;
    const badge = card.querySelector('.isel-card-badge');
    const main = card.querySelector('.isel-card-main');
    if (isel.modo === 'cambiar') {
        const esActual = filename === isel.actual;
        card.classList.toggle('is-seleccionada', esActual);
        badge.innerHTML = esActual ? '<i class="fas fa-check"></i>Actual' : '';
        main.setAttribute('aria-label', `${card.dataset.titulo}${esActual ? ' (actual)' : ''}: elegir para el Día ${isel.diaFila}`);
        return;
    }
    const dias = iselDiasDe(filename);
    card.classList.toggle('is-seleccionada', dias.length > 0);
    badge.innerHTML = dias.length ? `<i class="fas fa-check"></i>${iselTextoDias(dias)}` : '';
    main.setAttribute('aria-pressed', dias.length > 0 ? 'true' : 'false');
    main.setAttribute('aria-label', dias.length
        ? `${card.dataset.titulo}, en el ${iselTextoDias(dias)}. Tocar para quitar.`
        : `${card.dataset.titulo}. Tocar para agregar como Día ${isel.secuencia.length + 1}.`);
}

// ===== Render: pestañas Con / Sin pernocte =====
function iselEntradasFiltradas(grupo) {
    return isel.catalogo.filter(e => e.grupo === grupo && (!isel.busqueda || e.texto.includes(isel.busqueda)));
}

function iselRenderGrupos() {
    const cont = isel.raiz.querySelector('.isel-grupos');
    const grupos = [...ISEL_GRUPOS];
    // "Sin clasificar" solo si hay itinerarios sin destino de Con / Sin pernocte.
    if (isel.catalogo.some(e => e.grupo === ISEL_SIN_CLASIFICAR)) {
        grupos.push({ valor: ISEL_SIN_CLASIFICAR, nombre: 'Sin clasificar', icono: 'fa-folder-open' });
    }
    cont.innerHTML = grupos.map(g => {
        const n = iselEntradasFiltradas(g.valor).length;
        const activo = g.valor === isel.grupo;
        return `<button type="button" role="tab" class="isel-grupo${activo ? ' is-activo' : ''}${n === 0 ? ' is-vacio' : ''}" data-grupo="${g.valor}"
                    aria-selected="${activo}" tabindex="${activo ? 0 : -1}">
            <i class="fas ${g.icono}" aria-hidden="true"></i><span>${g.nombre}</span><span class="isel-grupo-n">${n}</span>
        </button>`;
    }).join('');
}

function iselCambiarGrupo(grupo) {
    if (grupo === isel.grupo) return;
    isel.grupo = grupo;
    if (grupo !== ISEL_SIN_CLASIFICAR) {
        try { localStorage.setItem(ISEL_GRUPO_STORAGE, grupo); } catch (_) { /* sin almacenamiento */ }
    }
    iselRenderGrupos();
    iselRenderContenido();
    isel.raiz.querySelector('.isel-main').scrollTop = 0;
}

// ===== Render: Destino → Categoría → tarjetas =====
function iselSecciones(entradas) {
    const porDestino = new Map();
    entradas.forEach(e => {
        const kd = e.destino ? Number(e.destino.id) : 0;
        if (!porDestino.has(kd)) porDestino.set(kd, { destino: e.destino, categorias: new Map(), total: 0 });
        const d = porDestino.get(kd);
        const kc = e.categoria ? Number(e.categoria.id) : 0;
        if (!d.categorias.has(kc)) d.categorias.set(kc, { categoria: e.categoria, items: [] });
        d.categorias.get(kc).items.push(e);
        d.total++;
    });
    const porNombre = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
    return [...porDestino.values()]
        .sort((a, b) => (!a.destino) - (!b.destino) || porNombre(a.destino?.nombre || '', b.destino?.nombre || ''))
        .map(d => ({
            ...d,
            categorias: [...d.categorias.values()]
                .sort((a, b) => (!a.categoria) - (!b.categoria) || porNombre(a.categoria?.nombre || '', b.categoria?.nombre || ''))
                .map(c => ({ ...c, items: c.items.sort((a, b) => porNombre(a.m.titulo, b.m.titulo)) }))
        }));
}

function iselRenderContenido() {
    const main = isel.raiz.querySelector('.isel-main');
    const nav = isel.raiz.querySelector('.isel-nav');
    isel.observer?.disconnect();
    const secciones = iselSecciones(iselEntradasFiltradas(isel.grupo));

    if (!secciones.length) {
        nav.innerHTML = '';
        main.innerHTML = iselEstadoVacioHtml();
        return;
    }

    nav.innerHTML = `<ul>${secciones.map((s, i) => {
        const id = `isel-d-${s.destino ? s.destino.id : 0}`;
        const nombre = s.destino?.nombre || 'Sin clasificar';
        const cats = s.categorias.length > 1 || s.categorias[0].categoria
            ? `<ul>${s.categorias.map(c => `<li><a href="#${id}-c-${c.categoria ? c.categoria.id : 0}" data-ir="${id}-c-${c.categoria ? c.categoria.id : 0}">${escapeHtml(c.categoria?.nombre || 'Sin categoría')}<span>${c.items.length}</span></a></li>`).join('')}</ul>`
            : '';
        return `<li class="isel-nav-destino${i === 0 ? ' is-activo' : ''}" data-seccion="${id}">
            <a href="#${id}" data-ir="${id}"><i class="fas fa-location-dot" aria-hidden="true"></i>${escapeHtml(nombre)}<span>${s.total}</span></a>${cats}
        </li>`;
    }).join('')}</ul>`;

    main.innerHTML = secciones.map(s => {
        const id = `isel-d-${s.destino ? s.destino.id : 0}`;
        const mostrarCategorias = s.categorias.length > 1 || !!s.categorias[0].categoria;
        return `<section class="isel-destino" id="${id}" aria-labelledby="${id}-h">
            <header class="isel-destino-head">
                <h3 id="${id}-h">${escapeHtml(s.destino?.nombre || 'Sin clasificar')}</h3>
                <span>${s.total} itinerario${s.total === 1 ? '' : 's'}</span>
            </header>
            ${!s.destino ? '<p class="isel-aviso"><i class="fas fa-circle-info"></i>Estos itinerarios todavía no tienen destino de Con / Sin pernocte. Puedes clasificarlos en Gestión de Datos › Itinerarios.</p>' : ''}
            ${s.categorias.map(c => `
                <div class="isel-categoria" id="${id}-c-${c.categoria ? c.categoria.id : 0}">
                    ${mostrarCategorias ? `<h4 class="isel-categoria-head">${escapeHtml(c.categoria?.nombre || 'Sin categoría')}<span>${c.items.length}</span></h4>` : ''}
                    <div class="isel-grid">${c.items.map(iselCardHtml).join('')}</div>
                </div>`).join('')}
        </section>`;
    }).join('');

    main.querySelectorAll('.isel-card').forEach(iselPintarEstadoCard);
    iselObservarSecciones();
}

function iselEstadoVacioHtml() {
    if (isel.busqueda) {
        const otros = [...ISEL_GRUPOS.map(g => g.valor), ISEL_SIN_CLASIFICAR]
            .filter(g => g !== isel.grupo)
            .map(g => ({ g, n: iselEntradasFiltradas(g).length }))
            .filter(x => x.n > 0);
        return `<div class="isel-vacio">
            <i class="fas fa-magnifying-glass"></i>
            <h3>Sin resultados en ${iselNombreGrupo(isel.grupo)}</h3>
            <p>No hay itinerarios que coincidan con tu búsqueda en esta pestaña.</p>
            <div class="isel-vacio-acciones">
                ${otros.map(x => `<button type="button" class="isel-btn isel-btn-secundario" data-ver-grupo="${x.g}">Ver ${x.n} en ${iselNombreGrupo(x.g)}</button>`).join('')}
                <button type="button" class="isel-btn isel-btn-ghost isel-limpiar-busqueda">Limpiar búsqueda</button>
            </div>
        </div>`;
    }
    return `<div class="isel-vacio">
        <i class="fas fa-route"></i>
        <h3>Aún no hay itinerarios ${iselNombreGrupo(isel.grupo).toLowerCase()}</h3>
        <p>Asigna destinos de ${iselNombreGrupo(isel.grupo)} a tus itinerarios en Gestión de Datos › Itinerarios y aparecerán aquí.</p>
    </div>`;
}

function iselCardHtml(e) {
    const m = e.m;
    const lugares = (m.lugares_visitar || '').split(/\r?\n|,\s*/).map(s => s.trim()).filter(Boolean);
    const sub = lugares.length
        ? `<span class="isel-card-lugares"><i class="fas fa-location-dot" aria-hidden="true"></i>${escapeHtml(lugares.slice(0, 3).join(' · '))}${lugares.length > 3 ? ` +${lugares.length - 3}` : ''}</span>`
        : `<span class="isel-card-lugares is-vacio">${escapeHtml(e.categoria?.nombre || (e.destino ? 'Sin categoría' : 'Sin clasificar'))}</span>`;
    return `<article class="isel-card" data-filename="${escapeHtml(m.filename)}" data-titulo="${escapeHtml(m.titulo)}">
        <button type="button" class="isel-card-main">
            <span class="isel-card-media">${iselMediaHtml(e, 'isel-card-media')}</span>
            <span class="isel-card-body">
                <span class="isel-card-titulo">${escapeHtml(m.titulo)}</span>
                ${sub}
            </span>
        </button>
        <span class="isel-card-badge" aria-hidden="true"></span>
        <button type="button" class="isel-card-info" aria-label="Ver detalle de ${escapeHtml(m.titulo)}" title="Ver detalle"><i class="fas fa-expand"></i></button>
        <button type="button" class="isel-card-repetir" aria-label="Agregar ${escapeHtml(m.titulo)} otra vez" title="Agregar otra vez (repetir en otro día)"><i class="fas fa-plus"></i>Repetir</button>
    </article>`;
}

// Resalta en el índice el destino que se está viendo.
function iselObservarSecciones() {
    const main = isel.raiz.querySelector('.isel-main');
    const nav = isel.raiz.querySelector('.isel-nav');
    if (!('IntersectionObserver' in window)) return;
    isel.observer = new IntersectionObserver((entries) => {
        const visible = entries.filter(en => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        nav.querySelectorAll('.isel-nav-destino').forEach(li => li.classList.toggle('is-activo', li.dataset.seccion === visible.target.id));
        nav.querySelector('.isel-nav-destino.is-activo')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, { root: main, rootMargin: '0px 0px -65% 0px', threshold: 0 });
    main.querySelectorAll('.isel-destino').forEach(s => isel.observer.observe(s));
}

// ===== Render: bandeja "Tu itinerario" =====
function iselRenderBandeja() {
    const lista = isel.raiz.querySelector('.isel-bandeja-lista');
    if (!lista) return;
    const n = isel.secuencia.length;
    isel.raiz.querySelector('.isel-bandeja-count').textContent = n ? `${n} día${n === 1 ? '' : 's'}` : 'Sin días todavía';
    const aplicar = isel.raiz.querySelector('.isel-aplicar');
    const cambios = iselHayCambios();
    aplicar.innerHTML = cambios
        ? `<i class="fas fa-check"></i>Aplicar${n ? ` ${n} día${n === 1 ? '' : 's'}` : ''}`
        : '<i class="fas fa-check"></i>Listo';
    aplicar.classList.toggle('is-pendiente', cambios);
    isel.raiz.querySelector('.isel-vaciar').hidden = n === 0;
    isel.raiz.classList.toggle('bandeja-vacia', n === 0);

    if (!n) {
        lista.innerHTML = '<li class="isel-bandeja-vacia">Toca una tarjeta para agregarla como Día 1.</li>';
        return;
    }
    lista.innerHTML = isel.secuencia.map((f, i) => {
        const e = iselEntradaDe(f);
        const titulo = e ? e.m.titulo : f;
        return `<li data-idx="${i}" draggable="true" class="${e ? '' : 'is-fuera'}">
            <span class="isel-chip-dia">${i + 1}</span>
            <button type="button" class="isel-chip-ver" title="${escapeHtml(titulo)}" ${e ? '' : 'disabled'}>
                <span class="isel-chip-thumb">${e ? iselMediaHtml(e, 'isel-chip-thumb') : '<i class="fas fa-triangle-exclamation"></i>'}</span>
                <span class="isel-chip-titulo">${escapeHtml(titulo)}</span>
            </button>
            <span class="isel-chip-acciones">
                <button type="button" class="isel-chip-mover" data-dir="-1" aria-label="Mover el Día ${i + 1} antes" ${i === 0 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                <button type="button" class="isel-chip-mover" data-dir="1" aria-label="Mover el Día ${i + 1} después" ${i === n - 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                <button type="button" class="isel-chip-quitar" aria-label="Quitar el Día ${i + 1}: ${escapeHtml(titulo)}"><i class="fas fa-xmark"></i></button>
            </span>
        </li>`;
    }).join('');
}

// Arrastrar para reordenar los días de la bandeja (escritorio; en táctil están las flechas).
function iselHabilitarArrastreBandeja(lista) {
    let desde = null;
    lista.addEventListener('dragstart', (ev) => {
        const li = ev.target.closest('li[data-idx]');
        if (!li) return;
        desde = Number(li.dataset.idx);
        li.classList.add('is-arrastrando');
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(desde));
    });
    lista.addEventListener('dragover', (ev) => {
        if (desde === null) return;
        ev.preventDefault();
        lista.querySelectorAll('.is-destino-drop').forEach(el => el.classList.remove('is-destino-drop'));
        ev.target.closest('li[data-idx]')?.classList.add('is-destino-drop');
    });
    lista.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const li = ev.target.closest('li[data-idx]');
        if (desde !== null && li) iselMover(desde, Number(li.dataset.idx));
    });
    lista.addEventListener('dragend', () => {
        desde = null;
        lista.querySelectorAll('.is-arrastrando, .is-destino-drop').forEach(el => el.classList.remove('is-arrastrando', 'is-destino-drop'));
    });
}

// ===== Detalle (panel lateral en escritorio, hoja inferior en móvil) =====
function iselLista(texto) {
    return String(texto || '').split(/\r?\n/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

function iselAbrirDetalle(filename) {
    const e = iselEntradaDe(filename);
    if (!e) return;
    isel.detalle = filename;
    const aside = isel.raiz.querySelector('.isel-detalle');
    const m = e.m;
    const lugares = iselLista(m.lugares_visitar);
    const incluye = iselLista(m.incluye);
    const noIncluye = iselLista(m.no_incluye);
    const pdfUrl = `${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(m.filename)}`;
    aside.innerHTML = `
        <div class="isel-detalle-media">
            ${iselMediaHtml(e, 'isel-detalle-media')}
            <button type="button" class="isel-icon-btn isel-detalle-cerrar" aria-label="Cerrar detalle"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="isel-detalle-body">
            <p class="isel-detalle-ruta">${escapeHtml(iselRuta(e))}</p>
            <h3 id="isel-detalle-titulo">${escapeHtml(m.titulo)}</h3>
            ${lugares.length ? `<section><h4><i class="fas fa-location-dot"></i>Lugares a visitar</h4>
                ${lugares.length > 1 ? `<ul class="isel-lugares">${lugares.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : `<p>${escapeHtml(lugares[0])}</p>`}</section>` : ''}
            ${incluye.length ? `<section><h4><i class="fas fa-circle-check"></i>Incluye</h4>
                <ul class="isel-incluye">${incluye.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></section>` : ''}
            ${noIncluye.length ? `<section><h4><i class="fas fa-circle-xmark"></i>No incluye</h4>
                <ul class="isel-no-incluye">${noIncluye.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></section>` : ''}
            ${!lugares.length && !incluye.length && !noIncluye.length ? '<p class="isel-detalle-sin">Este itinerario todavía no tiene lugares a visitar ni lo que incluye. Puedes completarlos en Gestión de Datos › Itinerarios.</p>' : ''}
            <a class="isel-detalle-pdf" href="${pdfUrl}" target="_blank" rel="noopener"${m.archivo_existe === false ? ' aria-disabled="true"' : ''}>
                <i class="fas fa-file-pdf"></i><span>Ver el PDF del itinerario</span><i class="fas fa-arrow-up-right-from-square"></i>
            </a>
        </div>
        <div class="isel-detalle-acciones"></div>
    `;
    aside.querySelector('.isel-detalle-cerrar').addEventListener('click', iselCerrarDetalle);
    aside.querySelector('.isel-detalle-acciones').addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'repetir') iselAgregar(filename);
        else iselElegir(filename);
    });
    iselPintarAccionesDetalle();
    isel.raiz.querySelector('.isel-detalle-fondo').hidden = false;
    aside.setAttribute('aria-hidden', 'false');
    aside.setAttribute('role', 'dialog');
    aside.scrollTop = 0;
    requestAnimationFrame(() => {
        aside.classList.add('is-abierto');
        aside.querySelector('.isel-detalle-cerrar').focus();
    });
}

function iselPintarAccionesDetalle() {
    const cont = isel.raiz.querySelector('.isel-detalle-acciones');
    if (!cont || !isel.detalle) return;
    const f = isel.detalle;
    if (isel.modo === 'cambiar') {
        const esActual = f === isel.actual;
        cont.innerHTML = `<button type="button" class="isel-btn isel-btn-primario" data-accion="elegir"${esActual ? ' disabled' : ''}>
            <i class="fas fa-check"></i>${esActual ? `Ya es el Día ${isel.diaFila}` : `Usar en el Día ${isel.diaFila}`}</button>`;
        return;
    }
    const dias = iselDiasDe(f);
    cont.innerHTML = dias.length
        ? `<button type="button" class="isel-btn isel-btn-secundario" data-accion="toggle"><i class="fas fa-minus"></i>Quitar del ${iselTextoDias([dias[dias.length - 1]])}</button>
           <button type="button" class="isel-btn isel-btn-primario" data-accion="repetir"><i class="fas fa-plus"></i>Agregar otra vez</button>`
        : `<button type="button" class="isel-btn isel-btn-primario" data-accion="toggle"><i class="fas fa-plus"></i>Agregar como Día ${isel.secuencia.length + 1}</button>`;
}

function iselCerrarDetalle() {
    if (!isel?.detalle) return;
    const filename = isel.detalle;
    isel.detalle = null;
    const aside = isel.raiz.querySelector('.isel-detalle');
    aside.classList.remove('is-abierto');
    aside.setAttribute('aria-hidden', 'true');
    aside.removeAttribute('role');
    isel.raiz.querySelector('.isel-detalle-fondo').hidden = true;
    // Devuelve el foco a la tarjeta de la que salió.
    const card = [...isel.raiz.querySelectorAll('.isel-card')].find(c => c.dataset.filename === filename);
    card?.querySelector('.isel-card-info')?.focus({ preventScroll: true });
}

document.getElementById('elegir-itinerarios')?.addEventListener('click', () => abrirSelectorItinerarios({ modo: 'agregar' }));
