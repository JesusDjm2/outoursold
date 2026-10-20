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
    // El módulo "día libre" no se elige: un día sin itinerario ya es libre (ver itinerario.js).
    return modulosActivos().filter(m => !esModuloDiaLibre(m)).map(m => {
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

// ===== Armador por días (Cotizador) =====
// Cada fila guarda su día (tr.dataset.dia, 1 = Fecha de Llegada); la fecha se calcula con la
// F. Llegada de Datos Pax, así que cambiar la llegada mueve todo el itinerario sin perder los
// días libres ni los días con varios itinerarios. Editar la fecha de una fila cambia su día.
function iselLlegada() {
    return document.querySelector('input[name="f_llegada"]')?.value || '';
}
function iselFechaDia(dia) {
    const f = iselLlegada();
    return f ? sumarDiasFechaISO(f, dia - 1) : '';
}
function iselFechaCorta(dia) {
    return fechaCortaDia(iselLlegada(), dia, 'es');
}
function iselRangoFechas(desde, hasta) {
    const a = iselFechaCorta(desde);
    if (!a) return '';
    return desde === hasta ? a : `${a} – ${iselFechaCorta(hasta)}`;
}
function iselTextoDiasRango(desde, hasta) {
    return desde === hasta ? `Día ${desde}` : `Días ${desde}–${hasta}`;
}

// Celda "Día / Fecha" y botón "+ mismo día" de una fila (la llama addItineraryBuilderRow).
function prepararFilaItinerarioConDia(tr) {
    const celda = tr.children[1];
    celda.className = 'p-2 itin-col-dia';
    celda.innerHTML = `
        <div class="itin-dia-fecha">
            <span class="itin-dia-num"></span>
            <input type="date" class="itin-dia-input" aria-label="Fecha de este día">
        </div>
        <span class="itin-mismo-dia-label"><i class="fas fa-turn-up fa-rotate-90"></i>mismo día</span>`;
    const input = celda.querySelector('.itin-dia-input');
    input.addEventListener('change', () => {
        const llegada = iselLlegada();
        if (llegada && input.value) {
            const dia = Math.round((Date.parse(input.value + 'T00:00:00Z') - Date.parse(llegada + 'T00:00:00Z')) / 86400000) + 1;
            if (dia < 1) notifyWarning('La fecha no puede ser anterior a la Fecha de llegada.');
            else tr.dataset.dia = String(dia);
        }
        refrescarArmadoItinerario();
    });

    const acciones = tr.lastElementChild;
    acciones.classList.add('itin-col-acciones');
    const mas = document.createElement('button');
    mas.type = 'button';
    mas.className = 'itin-mismo-dia-btn';
    mas.title = 'Agregar otro itinerario en este mismo día';
    mas.setAttribute('aria-label', 'Agregar otro itinerario en este mismo día');
    mas.innerHTML = '<i class="fas fa-plus"></i>';
    mas.addEventListener('click', () => iselAgregarFilaEnDia(Number(tr.dataset.dia)));
    // Separar este día del anterior con un día libre (corre este día y los siguientes).
    const libre = document.createElement('button');
    libre.type = 'button';
    libre.className = 'itin-libre-antes-btn';
    libre.title = 'Insertar un día libre antes de este día';
    libre.setAttribute('aria-label', 'Insertar un día libre antes de este día');
    libre.innerHTML = '<i class="fas fa-mug-hot"></i>';
    libre.addEventListener('click', () => iselDesplazarDiasDesde(Number(tr.dataset.dia), 1));
    acciones.prepend(libre);
    acciones.prepend(mas);
}

// Corre `delta` días todas las filas desde el día `desde` (inclusive): así se agrega o
// quita un día libre sin tocar lo que va antes.
function iselDesplazarDiasDesde(desde, delta) {
    filasArmado().forEach(tr => {
        const dia = Number(tr.dataset.dia);
        if (dia >= desde) tr.dataset.dia = String(Math.max(1, dia + delta));
    });
    refrescarArmadoItinerario();
    iselToast(delta > 0 ? 'Día libre agregado: los días siguientes se corrieron' : 'Día libre quitado: los días siguientes se adelantaron');
}

// Fila nueva en un día ya existente (o libre) y se abre el selector para elegirle itinerario;
// si se sale sin elegir, la fila vacía se descarta.
function iselAgregarFilaEnDia(dia) {
    const nueva = addItineraryBuilderRow('itinerary-builder-body', true, null, dia);
    if (nueva) abrirSelectorItinerarios({ modo: 'cambiar', fila: nueva, filaTemporal: true });
}

// Ordena las filas por día, marca las que comparten día y pone una fila "Día libre" en cada
// hueco entre días con itinerario. Se llama tras cualquier cambio (vía recalculateDayNumbers).
function refrescarArmadoItinerario() {
    const body = document.getElementById('itinerary-builder-body');
    if (!body) return;
    body.querySelectorAll('tr.itin-libre-fila').forEach(r => r.remove());
    const llegada = iselLlegada();
    const hayPlantillaLibre = modulosActivos().some(m => esModuloDiaLibre(m));
    let anterior = null;
    filasArmado()
        .map((tr, i) => ({ tr, dia: Number(tr.dataset.dia) || i + 1, i }))
        .sort((a, b) => a.dia - b.dia || a.i - b.i)
        .forEach(({ tr, dia }) => {
            tr.dataset.dia = String(dia);
            if (anterior !== null && dia - anterior > 1) body.appendChild(iselFilaLibre(anterior + 1, dia - 1, hayPlantillaLibre));
            body.appendChild(tr);
            tr.classList.toggle('is-mismo-dia', dia === anterior);
            // "Día libre antes" solo entre dos días seguidos (si ya hay un hueco, se edita
            // con − / + en su fila) y nunca en el primer día.
            tr.classList.toggle('puede-libre-antes', anterior !== null && dia - anterior === 1);
            tr.querySelector('.itin-dia-num').textContent = `Día ${dia}`;
            const input = tr.querySelector('.itin-dia-input');
            input.value = llegada ? sumarDiasFechaISO(llegada, dia - 1) : '';
            input.disabled = !llegada;
            input.title = llegada ? 'Cambiar la fecha de este día' : 'Completa la F. Llegada en Datos Pax para ver y editar las fechas';
            anterior = dia;
        });
}

function iselFilaLibre(desde, hasta, hayPlantillaLibre) {
    const n = hasta - desde + 1;
    const tr = document.createElement('tr');
    tr.className = 'itin-libre-fila';
    const fechas = iselRangoFechas(desde, hasta);
    const nota = n >= 2 && hayPlantillaLibre
        ? 'En el PDF: una sola página para estos días'
        : 'En el PDF: etiqueta en la página del día siguiente';
    tr.innerHTML = `
        <td></td>
        <td class="p-2 itin-col-dia">
            <span class="itin-dia-num">${iselTextoDiasRango(desde, hasta)}</span>
            ${fechas ? `<span class="itin-libre-fechas">${escapeHtml(fechas)}</span>` : ''}
        </td>
        <td class="p-2">
            <div class="itin-libre">
                <div class="itin-libre-stepper" role="group" aria-label="Cantidad de días libres">
                    <button type="button" class="itin-libre-menos" title="${n === 1 ? 'Quitar el día libre' : 'Un día libre menos'}" aria-label="${n === 1 ? 'Quitar el día libre' : 'Un día libre menos'}"><i class="fas fa-minus"></i></button>
                    <span class="itin-libre-badge"><i class="fas fa-mug-hot"></i>${n === 1 ? 'Día libre' : `${n} días libres`}</span>
                    <button type="button" class="itin-libre-mas" title="Un día libre más" aria-label="Un día libre más"><i class="fas fa-plus"></i></button>
                </div>
                <span class="itin-libre-nota">${nota}</span>
                <button type="button" class="itin-libre-agregar"><i class="fas fa-plus"></i><span>Agregar itinerario</span></button>
            </div>
        </td>
        <td></td>`;
    tr.querySelector('.itin-libre-agregar').addEventListener('click', () => iselAgregarFilaEnDia(desde));
    // Cambiar la cantidad corre los días que vienen después del bloque.
    tr.querySelector('.itin-libre-menos').addEventListener('click', () => iselDesplazarDiasDesde(hasta + 1, -1));
    tr.querySelector('.itin-libre-mas').addEventListener('click', () => iselDesplazarDiasDesde(hasta + 1, 1));
    return tr;
}

document.querySelector('input[name="f_llegada"]')?.addEventListener('change', refrescarArmadoItinerario);

// ===== Secuencia del selector: [{ filename, dia }] =====
function iselOrdenar(secuencia) {
    return secuencia.map((x, i) => ({ ...x, i })).sort((a, b) => a.dia - b.dia || a.i - b.i).map(({ filename, dia }) => ({ filename, dia }));
}
function iselSerializar(secuencia) {
    return iselOrdenar(secuencia).map(x => `${x.dia}:${x.filename}`).join('\n');
}
function iselMaxDia() {
    return isel.secuencia.reduce((max, x) => Math.max(max, x.dia), 0);
}
// Día al que se suma la próxima tarjeta: el elegido en la bandeja o, si no, uno nuevo al
// final (saltando los días libres que se hayan pedido con "+ Día libre").
function iselDiaDestino() {
    return isel.diaDestino ?? (iselMaxDia() + 1 + isel.saltos);
}

// ===== Abrir / cerrar =====
function abrirSelectorItinerarios({ modo = 'agregar', fila = null, filaTemporal = false } = {}) {
    if (isel) return;
    const catalogo = iselCatalogo();
    const secuencia = modo === 'agregar' ? leerArmadoItinerario() : [];
    const actual = modo === 'cambiar' ? fila.querySelector('.module-filename')?.value || '' : '';
    const diaFila = modo === 'cambiar' ? Number(fila.dataset.dia) || 1 : 0;
    const fechaFila = modo === 'cambiar' ? iselFechaCorta(diaFila) : null;

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
        modo, fila, filaTemporal, actual, diaFila, catalogo, grupo,
        secuencia,
        secuenciaInicial: iselSerializar(secuencia),
        diaDestino: null,
        saltos: 0,
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
                <h2 id="isel-titulo">${modo === 'cambiar' ? `Itinerario del Día ${diaFila}${fechaFila ? ` · ${escapeHtml(fechaFila)}` : ''}` : 'Elegir itinerarios'}</h2>
                <p>${modo === 'cambiar'
                    ? (actual ? 'Toca una tarjeta para reemplazar el itinerario de este día.' : 'Toca una tarjeta para asignarla a este día.')
                    : 'Toca las tarjetas en el orden del viaje. Para varios itinerarios en un día, elige ese día abajo.'}</p>
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
                <button type="button" class="isel-btn isel-btn-secundario isel-dia-libre" title="Deja un día libre antes del próximo itinerario"><i class="fas fa-mug-hot"></i><span>Día libre</span></button>
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
    return isel && isel.modo === 'agregar' && iselSerializar(isel.secuencia) !== isel.secuenciaInicial;
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
    const { raiz, focoPrevio, observer, modo, fila, filaTemporal } = isel;
    // "+ mismo día" / "Agregar itinerario" en un día libre: si se sale sin elegir, no queda una fila vacía.
    if (modo === 'cambiar' && filaTemporal && fila && !fila.querySelector('.module-filename')?.value) {
        fila.remove();
        refrescarArmadoItinerario();
    }
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
        if (!isel.secuencia.length && !isel.saltos) return;
        isel.secuencia = [];
        isel.saltos = 0;
        isel.diaDestino = null;
        iselActualizarSeleccion();
        iselAnunciar('Se quitaron todos los días.');
    });
    raiz.querySelector('.isel-dia-libre')?.addEventListener('click', () => {
        isel.diaDestino = null;
        isel.saltos++;
        iselActualizarSeleccion();
        iselAnunciar(`Día libre agregado. El próximo itinerario irá al Día ${iselDiaDestino()}.`);
        iselLlevarBandejaAlFinal();
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
            // Elegir a qué día se suman las próximas tarjetas (un día armado, uno libre o "nuevo").
            const destino = ev.target.closest('[data-destino]');
            if (destino) {
                const v = destino.dataset.destino;
                isel.diaDestino = v === 'nuevo' || Number(v) === isel.diaDestino ? null : Number(v);
                iselActualizarSeleccion();
                iselAnunciar(isel.diaDestino ? `Las tarjetas se agregarán al Día ${isel.diaDestino}.` : `Las tarjetas se agregarán como Día ${iselDiaDestino()}.`);
                return;
            }
            // − / + de un bloque de días libres: corre los itinerarios que vienen después.
            const ajuste = ev.target.closest('.isel-libre-ajuste');
            if (ajuste) {
                const desde = Number(ajuste.dataset.correr);
                const delta = Number(ajuste.dataset.delta);
                isel.secuencia.forEach(x => { if (x.dia >= desde) x.dia += delta; });
                if (isel.diaDestino !== null && isel.diaDestino >= desde) isel.diaDestino += delta;
                iselActualizarSeleccion();
                iselAnunciar(delta > 0 ? 'Un día libre más; los días siguientes se corrieron.' : 'Un día libre menos; los días siguientes se adelantaron.');
                return;
            }
            if (ev.target.closest('.isel-quitar-salto')) {
                isel.saltos = Math.max(0, isel.saltos - 1);
                iselActualizarSeleccion();
                return;
            }
            const chip = ev.target.closest('[data-idx]');
            if (!chip) return;
            const idx = Number(chip.dataset.idx);
            const item = isel.secuencia[idx];
            if (ev.target.closest('.isel-chip-quitar')) {
                const titulo = iselEntradaDe(item.filename)?.m.titulo || item.filename;
                isel.secuencia.splice(idx, 1);
                iselActualizarSeleccion();
                iselAnunciar(`Se quitó ${titulo} del Día ${item.dia}.`);
            } else if (ev.target.closest('.isel-chip-mover')) {
                iselMoverDia(idx, Number(ev.target.closest('.isel-chip-mover').dataset.dir));
            } else if (ev.target.closest('.isel-chip-ver')) {
                iselAbrirDetalle(item.filename);
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
        const { diaFila: dia, fila } = isel;
        const titulo = iselEntradaDe(filename)?.m.titulo || filename;
        iselAsignarAFila(fila, filename);
        isel.forzarCierre = true;
        iselSolicitarCierre();
        iselToast(`Día ${dia}: ${titulo}`);
        iselResaltarFilas([fila]);
        return;
    }
    // Agregar: tocar una tarjeta que ya está la quita (su última aparición); para repetirla
    // a propósito está el botón "Repetir" de la propia tarjeta.
    let idx = -1;
    isel.secuencia.forEach((x, i) => { if (x.filename === filename) idx = i; });
    const titulo = iselEntradaDe(filename)?.m.titulo || filename;
    if (idx !== -1) {
        const { dia } = isel.secuencia[idx];
        isel.secuencia.splice(idx, 1);
        iselActualizarSeleccion();
        iselAnunciar(`Se quitó ${titulo} del Día ${dia}.`);
    } else {
        iselAgregar(filename);
    }
}

function iselAgregar(filename) {
    const dia = iselDiaDestino();
    const nuevoDia = isel.diaDestino === null;
    isel.secuencia.push({ filename, dia });
    // Un día nuevo consume los días libres pedidos antes; elegido un día puntual, se queda
    // en ese día para poder sumarle varios itinerarios seguidos.
    if (nuevoDia) isel.saltos = 0;
    iselActualizarSeleccion();
    const titulo = iselEntradaDe(filename)?.m.titulo || filename;
    iselAnunciar(`${titulo} se agregó al Día ${dia}.`);
    const grupo = isel.raiz.querySelector(`.isel-bandeja-lista [data-grupo-dia="${dia}"]`);
    if (grupo) {
        grupo.querySelector('.isel-chip:last-of-type')?.classList.add('is-nuevo');
        grupo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

// Mueve un itinerario al día anterior / siguiente (puede caer en un día libre o en uno nuevo).
function iselMoverDia(idx, dir) {
    const item = isel.secuencia[idx];
    const dia = item.dia + dir;
    if (dia < 1) return;
    item.dia = dia;
    // Al final de su nuevo día, para que se vea dónde quedó.
    isel.secuencia.splice(idx, 1);
    isel.secuencia.push(item);
    iselActualizarSeleccion();
    iselAnunciar(`Movido al Día ${dia}.`);
    isel.raiz.querySelector(`.isel-bandeja-lista [data-grupo-dia="${dia}"] .isel-chip:last-of-type .isel-chip-mover[data-dir="${dir}"]`)?.focus();
}

function iselLlevarBandejaAlFinal() {
    const lista = isel.raiz.querySelector('.isel-bandeja-lista');
    if (lista) lista.scrollTo({ left: lista.scrollWidth, behavior: 'smooth' });
}

function iselAsignarAFila(tr, filename) {
    const hidden = tr.querySelector('.module-filename');
    if (!hidden) return;
    hidden.value = filename;
    tr._iselPintar?.();
}

function iselAplicar() {
    const body = document.getElementById('itinerary-builder-body');
    const ordenada = iselOrdenar(isel.secuencia);
    const nDias = new Set(ordenada.map(x => x.dia)).size;
    const cambios = iselHayCambios();
    // Itinerarios nuevos o cambiados de día respecto de lo que había, para resaltarlos al volver.
    const antes = new Set(isel.secuenciaInicial ? isel.secuenciaInicial.split('\n') : []);
    const tocados = new Set(ordenada.filter(x => !antes.has(`${x.dia}:${x.filename}`)).map(x => `${x.dia}:${x.filename}`));
    if (cambios) {
        body.innerHTML = '';
        if (ordenada.length) ordenada.forEach(x => addItineraryBuilderRow('itinerary-builder-body', true, x.filename, x.dia));
        else addItineraryBuilderRow('itinerary-builder-body', true);
        recalculateDayNumbers();
    }
    isel.forzarCierre = true;
    iselSolicitarCierre();
    if (cambios) {
        iselToast(ordenada.length ? `Itinerario actualizado: ${nDias} día${nDias === 1 ? '' : 's'} con itinerario` : 'Itinerario vaciado');
        iselResaltarFilas(filasArmado().filter(tr => tocados.has(`${tr.dataset.dia}:${tr.querySelector('.module-filename').value}`)));
    }
}

// Aviso breve que no bloquea (notifySuccess es un modal que pide un clic más).
function iselToast(texto) {
    Swal.fire({
        toast: true, position: 'bottom', icon: 'success', title: texto,
        showConfirmButton: false, timer: 2200, timerProgressBar: false
    });
}

// Resalta un momento las filas del armador que cambiaron.
function iselResaltarFilas(filas) {
    filas.forEach(tr => {
        const btn = tr?.querySelector('.itin-dia');
        if (!btn) return;
        btn.classList.remove('is-resaltado');
        void btn.offsetWidth;
        btn.classList.add('is-resaltado');
    });
}

// Días en los que está un itinerario dentro de la secuencia (ordenados, sin repetir).
function iselDiasDe(filename) {
    return [...new Set(isel.secuencia.filter(x => x.filename === filename).map(x => x.dia))].sort((a, b) => a - b);
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
        : `${card.dataset.titulo}. Tocar para agregar al Día ${iselDiaDestino()}.`);
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
// Por días: cada día con sus itinerarios, los días libres entre medio y, al final, el día
// nuevo al que se suman las tarjetas. El día marcado como destino recibe las próximas.
function iselRenderBandeja() {
    const lista = isel.raiz.querySelector('.isel-bandeja-lista');
    if (!lista) return;
    const max = iselMaxDia();
    if (isel.diaDestino !== null && isel.diaDestino > max) isel.diaDestino = null;
    const n = isel.secuencia.length;
    const porDia = new Map();
    isel.secuencia.forEach((x, idx) => {
        if (!porDia.has(x.dia)) porDia.set(x.dia, []);
        porDia.get(x.dia).push({ ...x, idx });
    });
    const dias = [...porDia.keys()].sort((a, b) => a - b);
    const nDias = dias.length;
    isel.raiz.querySelector('.isel-bandeja-count').textContent = n
        ? `${nDias} día${nDias === 1 ? '' : 's'} · ${n} itinerario${n === 1 ? '' : 's'}`
        : 'Sin días todavía';
    const aplicar = isel.raiz.querySelector('.isel-aplicar');
    const cambios = iselHayCambios();
    aplicar.innerHTML = cambios ? '<i class="fas fa-check"></i>Aplicar' : '<i class="fas fa-check"></i>Listo';
    aplicar.classList.toggle('is-pendiente', cambios);
    isel.raiz.querySelector('.isel-vaciar').hidden = n === 0 && !isel.saltos;
    isel.raiz.classList.toggle('bandeja-vacia', n === 0 && !isel.saltos);

    const destino = iselDiaDestino();
    const esDestino = (d) => d === destino;
    const pastillaLibre = (desde, hasta, { salto = false } = {}) => {
        const fechas = iselRangoFechas(desde, hasta);
        return `<li class="isel-libre${!salto && esDestino(desde) ? ' is-destino' : ''}">
            ${salto
                ? `<span class="isel-libre-btn"><i class="fas fa-mug-hot"></i>${iselTextoDiasRango(desde, hasta)} libre${fechas ? `<small>${escapeHtml(fechas)}</small>` : ''}</span>
                   <button type="button" class="isel-quitar-salto" aria-label="Quitar este día libre"><i class="fas fa-xmark"></i></button>`
                : `<button type="button" class="isel-libre-ajuste" data-correr="${hasta + 1}" data-delta="-1" aria-label="${desde === hasta ? 'Quitar el día libre' : 'Un día libre menos'}" title="${desde === hasta ? 'Quitar el día libre' : 'Un día libre menos'}"><i class="fas fa-minus"></i></button>
                   <button type="button" class="isel-libre-btn" data-destino="${desde}" title="Agregar itinerarios a este día">
                       <span><i class="fas fa-mug-hot"></i>${hasta - desde + 1} día${desde === hasta ? '' : 's'} libre${desde === hasta ? '' : 's'}</span><small>${iselTextoDiasRango(desde, hasta)}${fechas ? ` · ${escapeHtml(fechas)}` : ''}</small>
                   </button>
                   <button type="button" class="isel-libre-ajuste" data-correr="${hasta + 1}" data-delta="1" aria-label="Un día libre más" title="Un día libre más"><i class="fas fa-plus"></i></button>`}
        </li>`;
    };

    let html = '';
    let anterior = null;
    dias.forEach(dia => {
        if (anterior !== null && dia - anterior > 1) html += pastillaLibre(anterior + 1, dia - 1);
        const fecha = iselFechaCorta(dia);
        html += `<li class="isel-dia${esDestino(dia) ? ' is-destino' : ''}" data-grupo-dia="${dia}">
            <button type="button" class="isel-dia-head" data-destino="${dia}" aria-pressed="${esDestino(dia)}" title="${esDestino(dia) ? 'Las tarjetas se suman a este día' : 'Agregar más itinerarios a este día'}">
                <span>Día ${dia}</span>${fecha ? `<small>${escapeHtml(fecha)}</small>` : ''}
            </button>
            <div class="isel-dia-chips">${porDia.get(dia).map(x => iselChipHtml(x)).join('')}</div>
        </li>`;
        anterior = dia;
    });
    for (let s = 1; s <= isel.saltos; s++) html += pastillaLibre(max + s, max + s, { salto: true });
    const nuevo = max + isel.saltos + 1;
    const fechaNuevo = iselFechaCorta(nuevo);
    html += `<li class="isel-dia isel-dia-nuevo${isel.diaDestino === null ? ' is-destino' : ''}">
        <button type="button" class="isel-dia-head" data-destino="nuevo" aria-pressed="${isel.diaDestino === null}">
            <span><i class="fas fa-plus"></i>Día ${nuevo}</span>${fechaNuevo ? `<small>${escapeHtml(fechaNuevo)}</small>` : ''}
        </button>
        <div class="isel-dia-chips"><span class="isel-dia-nuevo-hint">${n ? 'Toca una tarjeta' : 'Toca una tarjeta para empezar'}</span></div>
    </li>`;
    lista.innerHTML = html;
}

function iselChipHtml(x) {
    const e = iselEntradaDe(x.filename);
    const titulo = e ? e.m.titulo : x.filename;
    return `<div class="isel-chip${e ? '' : ' is-fuera'}" data-idx="${x.idx}" draggable="true">
        <button type="button" class="isel-chip-ver" title="${escapeHtml(titulo)}" ${e ? '' : 'disabled'}>
            <span class="isel-chip-thumb">${e ? iselMediaHtml(e, 'isel-chip-thumb') : '<i class="fas fa-triangle-exclamation"></i>'}</span>
            <span class="isel-chip-titulo">${escapeHtml(titulo)}</span>
        </button>
        <span class="isel-chip-acciones">
            <button type="button" class="isel-chip-mover" data-dir="-1" aria-label="Pasar ${escapeHtml(titulo)} al día anterior" ${x.dia === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
            <button type="button" class="isel-chip-mover" data-dir="1" aria-label="Pasar ${escapeHtml(titulo)} al día siguiente"><i class="fas fa-chevron-right"></i></button>
            <button type="button" class="isel-chip-quitar" aria-label="Quitar ${escapeHtml(titulo)} del Día ${x.dia}"><i class="fas fa-xmark"></i></button>
        </span>
    </div>`;
}

// Arrastrar un itinerario de la bandeja a otro día (o a un día libre, o al día nuevo).
// En táctil están las flechas de cada itinerario.
function iselHabilitarArrastreBandeja(lista) {
    let desde = null;
    const diaDeDestino = (el) => {
        const zona = el.closest('[data-grupo-dia], .isel-libre, .isel-dia-nuevo');
        if (!zona) return null;
        if (zona.dataset.grupoDia) return Number(zona.dataset.grupoDia);
        const v = zona.querySelector('[data-destino]')?.dataset.destino;
        if (v === 'nuevo') return iselMaxDia() + isel.saltos + 1;
        return v ? Number(v) : null;
    };
    lista.addEventListener('dragstart', (ev) => {
        const chip = ev.target.closest('.isel-chip[data-idx]');
        if (!chip) return;
        desde = Number(chip.dataset.idx);
        chip.classList.add('is-arrastrando');
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(desde));
    });
    lista.addEventListener('dragover', (ev) => {
        if (desde === null) return;
        ev.preventDefault();
        lista.querySelectorAll('.is-destino-drop').forEach(el => el.classList.remove('is-destino-drop'));
        ev.target.closest('[data-grupo-dia], .isel-libre, .isel-dia-nuevo')?.classList.add('is-destino-drop');
    });
    lista.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const dia = diaDeDestino(ev.target);
        if (desde === null || !dia) return;
        const item = isel.secuencia[desde];
        if (item.dia === dia) return;
        const eraNuevo = dia > iselMaxDia();
        iselMoverDia(desde, dia - item.dia);
        if (eraNuevo) isel.saltos = 0;
        iselActualizarSeleccion();
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
    // "Quitar" saca la última vez que se agregó (igual que tocar la tarjeta).
    const ultima = [...isel.secuencia].reverse().find(x => x.filename === f);
    cont.innerHTML = ultima
        ? `<button type="button" class="isel-btn isel-btn-secundario" data-accion="toggle"><i class="fas fa-minus"></i>Quitar del Día ${ultima.dia}</button>
           <button type="button" class="isel-btn isel-btn-primario" data-accion="repetir"><i class="fas fa-plus"></i>Agregar al Día ${iselDiaDestino()}</button>`
        : `<button type="button" class="isel-btn isel-btn-primario" data-accion="toggle"><i class="fas fa-plus"></i>Agregar al Día ${iselDiaDestino()}</button>`;
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
