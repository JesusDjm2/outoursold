// shared/gestion-datos.js
// Motor de Gestión de Datos (Destinos y Categorías, Paquetes, Tours, Hoteles,
// Itinerarios), separado de shared/cotizador.js — antes vivía embebido ahí como una
// pestaña más. Usado por pen/gestion.php y usd/gestion.php. Comparte con cotizador.js
// (vía shared/catalogo-shared.js, cargado antes que este script) escapeHtml y los
// selectores en cascada de Tour/Alojamiento — cada página carga sus propios datos por
// separado con su propio cargarDatosIniciales(), no hay estado compartido entre pestañas
// del navegador.

// ===== VERIFICAR SESIÓN AL INICIAR =====
async function verificarSesion() {
    try {
        const response = await fetch('api.php?path=tours');
        if (response.status === 403 || response.status === 401) {
            throw new Error('No autorizado');
        }
        const data = await response.json();
        if (data.error && (data.error.includes('logueado') || data.error.includes('session'))) {
            throw new Error('Sesión requerida');
        }
    } catch (error) {
        await notifyWarning('Acceso restringido. Por favor, inicia sesión.');
        window.location.href = '../shared/login.php';
        return;
    }
}
verificarSesion();

// ===== CONFIGURACIÓN =====
const API_URL = 'api.php';
const CURRENCY_SYMBOL = window.APP_CONFIG.currencySymbol;

const fmt = (v) => {
    const n = Number(v) || 0;
    return CURRENCY_SYMBOL + n.toFixed(2);
};

// ===== DATOS Y ESTADO =====
let toursData = [];
let hotelsData = [];
let destinosData = [];
let categoriasData = [];
let categoriasHotelesData = [];
let destinoSeleccionadoId = null;
let categoriaTipoActivo = 'tours';
// Módulos de itinerario de los 3 idiomas, solo para contar por destino/categoría en
// Destinos y Categorías (los cataloga itinerario.js, uno por idioma).
let modulosItinTodos = { es: [], en: [], pt: [] };
let toursFilter = '';
let hotelsFilter = '';
let paquetesData = [];
let paqueteEditandoId = null;

// ===== CARGA DE DATOS =====
async function cargarDatosIniciales() {
    try {
        const [toursRes, hotelesRes, paquetesRes, destinosRes, categoriasRes, categoriasHotelesRes] = await Promise.all([
            fetch(`${API_URL}?path=tours`).then(r => r.json()),
            fetch(`${API_URL}?path=hoteles`).then(r => r.json()),
            fetch(`${API_URL}?path=paquetes-tours`).then(r => r.json()),
            fetch(`${API_URL}?path=destinos`).then(r => r.json()),
            fetch(`${API_URL}?path=categorias`).then(r => r.json()),
            fetch(`${API_URL}?path=categorias-hoteles`).then(r => r.json())
        ]);
        toursData = toursRes;
        hotelsData = hotelesRes;
        paquetesData = paquetesRes;
        destinosData = destinosRes;
        categoriasData = categoriasRes;
        categoriasHotelesData = categoriasHotelesRes;
        renderTours();
        renderHotels();
        renderDestinos();
        renderTourNewDestinoCategoria();
        renderHotelNewDestinoCategoria();
        renderPaquetesList();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        notifyError('Error al conectar con el servidor. Revisa tu conexión.');
    }
}

// Cambia de subpestaña dentro de Gestión de Datos (Destinos y Categorías / Paquetes /
// Tours / Hoteles / Itinerarios) — misma lógica que el click en un .subnav-tab, reutilizada
// por los avisos de "falta X" y por los enlaces cruzados Destino/Categoría de las tablas.
// "Itinerarios" (#gestion-itinerarios) trae anidado su PROPIO grupo de sub-pestañas
// (#itinerario-gestion-subtabs, manejado enteramente por itinerario.js, con las mismas
// clases .subnav-tab) — se excluye explícitamente para no pisarlo: sin esto, cualquier
// clic acá le quitaría el "active" a sus botones internos, y un clic allá ocultaría estos
// paneles de más (ver el mismo cuidado del lado de itinerario.js, con .itin-panel).
function irASubtabGestion(subtab) {
    const contenedor = document.getElementById('gestion-section');
    const wrapperItin = document.getElementById('gestion-itinerarios');
    const esInternoItin = (el) => el !== wrapperItin && wrapperItin.contains(el);
    contenedor.querySelectorAll('.subnav-tab').forEach(t => {
        if (!esInternoItin(t)) t.classList.toggle('active', t.dataset.subtab === subtab);
    });
    contenedor.querySelectorAll('.subtab-content').forEach(c => {
        if (!esInternoItin(c)) c.classList.add('hidden');
    });
    document.getElementById(`gestion-${subtab}`).classList.remove('hidden');
    if (subtab === 'clasificacion') actualizarConteosItinerarios();
}

// Acordeones de Datos Pax / Actividades / Hoteles / Itinerario: colapsan/expanden y
// recuerdan el estado por sección en localStorage, para que la vista siga compacta en la
// próxima carga si el usuario así la dejó (ej. Datos Pax, que tiene muchos campos).
// Llena un <select> de Destino (mismo catálogo para tours y hoteles).
function llenarSelectDestino(select, selectedId) {
    select.innerHTML = '<option value="">Sin clasificar</option>' +
        destinosData.map(d => `<option value="${d.id}" ${selectedId != null && d.id === Number(selectedId) ? 'selected' : ''}>${d.nombre}</option>`).join('');
}
// Llena un <select> de Categoría según el destino elegido — categoriasDataset es
// categoriasData (tours) o categoriasHotelesData (hoteles), cada uno su propio catálogo.
function llenarSelectCategoria(select, categoriasDataset, destinoId, selectedId) {
    if (!destinoId) {
        select.innerHTML = '<option value="">—</option>';
        select.disabled = true;
        return;
    }
    const opciones = categoriasDataset.filter(c => c.destino_id === Number(destinoId));
    select.innerHTML = '<option value="">Sin categoría</option>' +
        opciones.map(c => `<option value="${c.id}" ${selectedId != null && c.id === Number(selectedId) ? 'selected' : ''}>${c.nombre}</option>`).join('');
    select.disabled = false;
}

// "3 destinos · 12 categorías · 45 tours · 8 paquetes" arriba de las subpestañas de
// Gestión de Datos, para tener panorama general sin entrar a cada una.
function renderGestionResumen() {
    const el = document.getElementById('gestion-resumen');
    if (!el) return;
    const nCategorias = categoriasData.length + categoriasHotelesData.length;
    const pl = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
    el.textContent = [
        pl(destinosData.length, 'destino', 'destinos'),
        pl(nCategorias, 'categoría', 'categorías'),
        pl(toursData.length, 'tour', 'tours'),
        pl(hotelsData.length, 'hotel', 'hoteles'),
        pl(paquetesData.length, 'paquete', 'paquetes')
    ].join(' · ');
}

// Aviso accionable cuando falta la data de la que depende la pestaña actual (ej. Tours sin
// ningún Destino creado todavía) — evita selects vacíos sin explicación.
function actualizarAvisoDependencia(hintId, faltante, subtabDestino) {
    const hint = document.getElementById(hintId);
    if (!hint) return;
    hint.classList.toggle('hidden', !faltante);
    if (faltante && !hint.dataset.wired) {
        hint.dataset.wired = '1';
        hint.querySelector('button')?.addEventListener('click', () => irASubtabGestion(subtabDestino));
    }
}

// ===== RENDER TABLAS (gestión) — CRUD de tours y hoteles =====
// Clasificación de varios registros a la vez: el select de Destino/Categoría de cada fila
// queda siempre editable (no hace falta entrar en "Editar"); cambiar uno no guarda al toque,
// solo lo marca como pendiente acá. Un botón flotante (fijo en la pantalla, visible aunque
// haya cientos de filas y estés scrolleado) guarda todos los pendientes en un solo viaje al
// servidor — que a su vez solo toca esos IDs puntuales (UPDATE por id, no recorre la tabla).
let cambiosPendientesTours = new Map();
let cambiosPendientesHoteles = new Map();

function actualizarBotonGuardarTours() {
    const btn = document.getElementById('tours-guardar-flotante');
    const n = cambiosPendientesTours.size;
    btn.classList.toggle('hidden', n === 0);
    document.getElementById('tours-guardar-count').textContent = n;
}

function renderTours() {
    const tbody = document.getElementById('tours-table-body');
    tbody.innerHTML = '';
    cambiosPendientesTours.clear();
    actualizarBotonGuardarTours();
    const visibles = toursData
        .filter(t => t.tour.toLowerCase().includes(toursFilter))
        .sort((a, b) => a.tour.localeCompare(b.tour));
    if (visibles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-3 text-center text-slate-400">${toursFilter ? 'Sin resultados.' : 'Sin tours registrados.'}</td></tr>`;
    } else {
        visibles.forEach(t => tbody.appendChild(buildTourRow(t)));
    }
    actualizarAvisoDependencia('tours-sin-destinos-hint', destinosData.length === 0, 'clasificacion');
    renderGestionResumen();
}

function buildTourRow(t) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    tr.innerHTML = `
        <td class="p-3 font-medium">${escapeHtml(t.tour)}</td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full tour-row-destino"></select></td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full tour-row-categoria" disabled></select></td>
        <td class="p-3">${escapeHtml(t.distr || '')}</td>
        <td class="p-3">${fmt(t.preg)}</td>
        <td class="p-3">${fmt(t.ppromo)}</td>
        <td class="p-3">${fmt(t.pconf)}</td>
        <td class="p-3">${fmt(t.pctotal)}</td>
        <td class="p-3 text-slate-500">${escapeHtml(t.creado_por_nombre || '—')}</td>
        <td class="p-3 text-right whitespace-nowrap">
            <button class="text-slate-500 hover:text-slate-700 mr-2" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    const destinoSel = tr.querySelector('.tour-row-destino');
    const categoriaSel = tr.querySelector('.tour-row-categoria');
    llenarSelectDestino(destinoSel, t.destino_id);
    llenarSelectCategoria(categoriaSel, categoriasData, t.destino_id, t.categoria_id);
    const marcarPendiente = () => {
        cambiosPendientesTours.set(t.id, { destino_id: destinoSel.value || null, categoria_id: categoriaSel.value || null });
        actualizarBotonGuardarTours();
    };
    destinoSel.addEventListener('change', () => {
        llenarSelectCategoria(categoriaSel, categoriasData, destinoSel.value, null);
        marcarPendiente();
    });
    categoriaSel.addEventListener('change', marcarPendiente);
    const [editBtn, delBtn] = tr.querySelectorAll('td:last-child button');
    editBtn.addEventListener('click', () => tr.replaceWith(buildTourEditRow(t)));
    delBtn.addEventListener('click', () => eliminarTour(t));
    return tr;
}

// Selector encadenado Destino → Categoría (sin nivel de Actividad/Alojamiento), para el
// alta/edición de un tour o un hotel: aquí es donde se define a qué ítem concreto
// pertenecen esas dos selects. categoriasDataset: categoriasData (Tours) o
// categoriasHotelesData (Hoteles) — cada tipo tiene su propio catálogo de categorías.
function buildDestinoCategoriaSelector(categoriasDataset, destinoId, categoriaId) {
    const wrap = document.createElement('div');
    wrap.className = 'grid grid-cols-2 gap-1';
    wrap.innerHTML = `
        <select class="input w-full rounded px-2 py-1 border sel-destino-tour">
            <option value="">Destino...</option>
            ${destinosData.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('')}
        </select>
        <select class="input w-full rounded px-2 py-1 border sel-categoria-tour" disabled>
            <option value="">Categoría...</option>
        </select>
    `;
    wrap.destinoSelect = wrap.querySelector('.sel-destino-tour');
    wrap.categoriaSelect = wrap.querySelector('.sel-categoria-tour');
    const llenarCategorias = (destId) => {
        wrap.categoriaSelect.innerHTML = '<option value="">Categoría...</option>' +
            categoriasDataset.filter(c => c.destino_id === Number(destId))
                .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        wrap.categoriaSelect.disabled = !destId;
    };
    wrap.destinoSelect.addEventListener('change', () => llenarCategorias(wrap.destinoSelect.value));
    if (destinoId) {
        wrap.destinoSelect.value = destinoId;
        llenarCategorias(destinoId);
        if (categoriaId) wrap.categoriaSelect.value = categoriaId;
    }
    return wrap;
}

function buildTourEditRow(t) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${escapeHtml(t.tour)}"></td>
        <td class="p-2 destino-categoria-cell" colspan="2"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${escapeHtml(t.distr || '')}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${t.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${t.ppromo}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${t.pconf || 0}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${t.pctotal || 0}"></td>
        <td class="p-2 text-slate-500">${escapeHtml(t.creado_por_nombre || '—')}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const destinoCategoriaSelector = buildDestinoCategoriaSelector(categoriasData, t.destino_id, t.categoria_id);
    tr.querySelector('.destino-categoria-cell').appendChild(destinoCategoriaSelector);
    const [tourI, distrI, pregI, ppromoI, pconfI, pctotalI] = tr.querySelectorAll('input');
    const [saveBtn, cancelBtn] = tr.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarTour({
        id: t.id, tour: tourI.value.trim(),
        destino_id: destinoCategoriaSelector.destinoSelect.value || null,
        categoria_id: destinoCategoriaSelector.categoriaSelect.value || null,
        distr: distrI.value.trim(), preg: pregI.value, ppromo: ppromoI.value,
        pconf: pconfI.value, pctotal: pctotalI.value
    }));
    cancelBtn.addEventListener('click', () => tr.replaceWith(buildTourRow(t)));
    return tr;
}

async function guardarTour(payload) {
    if (!payload.tour) { notifyError('El nombre del tour es obligatorio.'); return false; }
    try {
        const res = await fetch(`${API_URL}?path=guardar-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(payload.id ? 'Tour actualizado.' : 'Tour agregado.');
        await refrescarTours();
        return true;
    } catch (e) {
        notifyError('Error al guardar el tour: ' + e.message);
        return false;
    }
}

async function eliminarTour(t) {
    if (!await confirmAction(`¿Eliminar "${t.tour}" del catálogo de tours? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`${API_URL}?path=eliminar-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: t.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Tour eliminado.');
        await refrescarTours();
    } catch (e) {
        notifyError('Error al eliminar el tour: ' + e.message);
    }
}

async function refrescarTours() {
    toursData = await fetch(`${API_URL}?path=tours`).then(r => r.json());
    renderTours();
}

// ===== RENDER TABLAS (gestión) — CRUD de destinos y categorías =====
// Categoría vive anidada bajo un Destino: elegir un destino en la tabla superior
// carga (y permite gestionar) sus categorías en la tabla inferior.
function renderDestinos() {
    if (destinoSeleccionadoId && !destinosData.some(d => d.id === destinoSeleccionadoId)) {
        destinoSeleccionadoId = null;
    }
    const visibles = [...destinosData].sort((a, b) => a.nombre.localeCompare(b.nombre));
    // Autoselecciona el primer destino para que el panel de Categorías nunca se vea vacío
    // esperando un clic que no es obvio — solo hay que "elegir un destino" si de verdad no hay ninguno.
    if (destinoSeleccionadoId == null && visibles.length > 0) {
        destinoSeleccionadoId = visibles[0].id;
    }
    const listEl = document.getElementById('destinos-table-body');
    listEl.innerHTML = '';
    if (visibles.length === 0) {
        listEl.innerHTML = '<p class="p-3 text-center text-slate-400 text-sm">Sin destinos registrados.</p>';
    } else {
        visibles.forEach(d => listEl.appendChild(buildDestinoRow(d)));
    }
    renderCategorias();
    renderGestionResumen();
}

const IDIOMAS_ITIN = ['es', 'en', 'pt'];

async function refrescarModulosItinerario() {
    try {
        const listas = await Promise.all(IDIOMAS_ITIN.map(obtenerModulosIdioma));
        IDIOMAS_ITIN.forEach((idioma, i) => { modulosItinTodos[idioma] = Array.isArray(listas[i]) ? listas[i] : []; });
    } catch (e) {
        console.error('Error al cargar módulos de itinerario para los conteos:', e);
    }
}

// Los conteos de itinerarios cambian al editar módulos en la pestaña Itinerario, así que
// se refrescan cada vez que se entra a Destinos y Categorías.
async function actualizarConteosItinerarios() {
    await refrescarModulosItinerario();
    renderDestinos();
}

// Un módulo de itinerario existe una vez por idioma (mismo destino en ES/EN/PT): el total
// suma los 3 y el desglose por idioma va en el tooltip para no confundir.
function contarModulosItin(predicado) {
    const porIdioma = {};
    let total = 0;
    IDIOMAS_ITIN.forEach(idioma => {
        porIdioma[idioma] = modulosItinTodos[idioma].filter(predicado).length;
        total += porIdioma[idioma];
    });
    return { total, desglose: IDIOMAS_ITIN.map(i => `${NOMBRES_IDIOMA[i]}: ${porIdioma[i]}`).join(' · ') };
}

// `items(predicado)` cuenta los elementos de cada catálogo que cumplen el predicado (por
// destino_id o categoria_id) y devuelve {total, desglose?}; `getDataset` son sus categorías.
const CATEGORIA_TIPOS = {
    tours: {
        label: 'Actividades',
        sustantivo: ['actividad', 'actividades'],
        icono: 'fa-person-hiking',
        getDataset: () => categoriasData,
        apiBase: () => API_URL,
        apiGuardar: 'guardar-categoria',
        apiEliminar: 'eliminar-categoria',
        items: (pred) => ({ total: toursData.filter(pred).length })
    },
    hoteles: {
        label: 'Hoteles',
        sustantivo: ['hotel', 'hoteles'],
        icono: 'fa-hotel',
        getDataset: () => categoriasHotelesData,
        apiBase: () => API_URL,
        apiGuardar: 'guardar-categoria-hotel',
        apiEliminar: 'eliminar-categoria-hotel',
        items: (pred) => ({ total: hotelsData.filter(pred).length })
    },
    itinerarios: {
        label: 'Itinerarios',
        sustantivo: ['módulo', 'módulos'],
        icono: 'fa-route',
        getDataset: () => itinCategoriasData,
        apiBase: () => `${ITINERARIO_API_BASE}api.php`,
        apiGuardar: 'guardar-categoria-itinerario',
        apiEliminar: 'eliminar-categoria-itinerario',
        items: (pred) => contarModulosItin(pred)
    }
};

const enDestino = (destinoId) => (x) => Number(x.destino_id) === destinoId;
const enCategoria = (categoriaId) => (x) => Number(x.categoria_id) === categoriaId;

function chipConteo(icono, titulo, n, desglose) {
    return `<span class="conteo-chip${n === 0 ? ' is-cero' : ''}" title="${titulo}${desglose ? ' — ' + desglose : ''}"><i class="fas ${icono}"></i>${n}</span>`;
}

// Cuántas actividades, hoteles e itinerarios (módulos) tiene ya este destino, y cuántas
// categorías — para ver de un vistazo dónde hay contenido y dónde falta clasificar.
function resumenDestino(destinoId) {
    const chips = Object.values(CATEGORIA_TIPOS).map(t => {
        const c = t.items(enDestino(destinoId));
        return chipConteo(t.icono, t.label, c.total, c.desglose);
    }).join('');
    const nCategorias = Object.values(CATEGORIA_TIPOS).reduce((n, t) => n + t.getDataset().filter(c => c.destino_id === destinoId).length, 0);
    return { chips, categorias: nCategorias === 0 ? 'Sin categorías' : `${nCategorias} categoría${nCategorias === 1 ? '' : 's'}` };
}

function buildDestinoRow(d) {
    const div = document.createElement('div');
    div.className = `destino-item flex items-center justify-between gap-2 px-2 py-2 rounded-lg cursor-pointer ${d.id === destinoSeleccionadoId ? 'active' : ''}`;
    div.title = 'Ver categorías de este destino';
    const resumen = resumenDestino(d.id);
    div.innerHTML = `
        <div class="min-w-0">
            <div class="flex items-center gap-1.5">
                <i class="fas fa-chevron-right text-xs text-slate-300"></i>
                <span class="destino-nombre font-medium truncate">${escapeHtml(d.nombre)}</span>
            </div>
            <div class="pl-4 mt-1 flex flex-wrap gap-1">${resumen.chips}</div>
            <div class="text-xs text-slate-400 pl-4 mt-0.5">${resumen.categorias} · ${escapeHtml(d.creado_por_nombre || '—')}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
            <button class="text-slate-400 hover:text-slate-700 p-1" title="Editar"><i class="fas fa-pen text-xs"></i></button>
            <button class="text-red-400 hover:text-red-600 p-1" title="Eliminar"><i class="fas fa-trash text-xs"></i></button>
        </div>
    `;
    div.addEventListener('click', () => {
        destinoSeleccionadoId = d.id;
        renderDestinos();
    });
    const [editBtn, delBtn] = div.querySelectorAll('button');
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); div.replaceWith(buildDestinoEditRow(d)); });
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); eliminarDestino(d); });
    return div;
}

function buildDestinoEditRow(d) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 px-2 py-2 rounded-lg';
    div.innerHTML = `
        <input class="input flex-1 min-w-0 rounded px-2 py-1 border text-sm" type="text" value="${escapeHtml(d.nombre)}">
        <button class="text-emerald-600 hover:text-emerald-800 p-1 shrink-0" title="Guardar"><i class="fas fa-check text-xs"></i></button>
        <button class="text-slate-400 hover:text-slate-600 p-1 shrink-0" title="Cancelar"><i class="fas fa-times text-xs"></i></button>
    `;
    const nombreI = div.querySelector('input');
    const [saveBtn, cancelBtn] = div.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarDestino({ id: d.id, nombre: nombreI.value.trim() }));
    cancelBtn.addEventListener('click', () => div.replaceWith(buildDestinoRow(d)));
    return div;
}

async function guardarDestino(payload) {
    if (!payload.nombre) { notifyError('El nombre del destino es obligatorio.'); return false; }
    try {
        const res = await fetch(`${API_URL}?path=guardar-destino`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(payload.id ? 'Destino actualizado.' : 'Destino agregado.');
        await refrescarDestinosCategorias();
        return true;
    } catch (e) {
        notifyError('Error al guardar el destino: ' + e.message);
        return false;
    }
}

async function eliminarDestino(d) {
    const nTours = toursData.filter(t => t.destino_id === d.id).length;
    const nHoteles = hotelsData.filter(h => h.destino_id === d.id).length;
    let mensaje = `¿Eliminar el destino "${d.nombre}"?`;
    if (nTours || nHoteles) {
        const partes = [];
        if (nTours) partes.push(`${nTours} tour${nTours === 1 ? '' : 's'}`);
        if (nHoteles) partes.push(`${nHoteles} hotel${nHoteles === 1 ? '' : 'es'}`);
        mensaje += ` Quedarían ${partes.join(' y ')} sin destino asignado.`;
    }
    mensaje += ' Esta acción no se puede deshacer.';
    if (!await confirmAction(mensaje, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`${API_URL}?path=eliminar-destino`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: d.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Destino eliminado.');
        if (destinoSeleccionadoId === d.id) destinoSeleccionadoId = null;
        await refrescarDestinosCategorias();
    } catch (e) {
        notifyError('Error al eliminar el destino: ' + e.message);
    }
}

// Categorías de Actividades, Hoteles e Itinerarios son catálogos separados (evita mezclar
// "City Tour" con "Hotel Boutique"), pero comparten Destino y la misma UI de gestión — un
// interruptor cambia cuál de los tres catálogos se está viendo/editando para el destino
// seleccionado (ver CATEGORIA_TIPOS más arriba).
function renderCategorias() {
    const listEl = document.getElementById('categorias-table-body');
    const sinDestino = document.getElementById('categorias-sin-destino');
    const tableWrap = document.getElementById('categorias-table-wrap');
    const destino = destinosData.find(d => d.id === destinoSeleccionadoId);
    document.getElementById('categorias-destino-actual').textContent = destino ? `· ${destino.nombre}` : '';
    // Cada pestaña muestra cuántos elementos de ese tipo tiene el destino elegido.
    document.querySelectorAll('.categoria-tipo-tab').forEach(btn => {
        const t = CATEGORIA_TIPOS[btn.dataset.categoriaTipo];
        btn.classList.toggle('active', btn.dataset.categoriaTipo === categoriaTipoActivo);
        const badge = destino ? `<span class="conteo-badge" title="${t.items(enDestino(destino.id)).desglose || ''}">${t.items(enDestino(destino.id)).total}</span>` : '';
        btn.innerHTML = `${t.label}${badge}`;
    });
    if (!destino) {
        listEl.innerHTML = '';
        sinDestino.classList.remove('hidden');
        tableWrap.classList.add('hidden');
        return;
    }
    sinDestino.classList.add('hidden');
    tableWrap.classList.remove('hidden');
    listEl.innerHTML = '';
    const tipo = categoriaTipoActivo;
    const visibles = CATEGORIA_TIPOS[tipo].getDataset()
        .filter(c => c.destino_id === destinoSeleccionadoId)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (visibles.length === 0) {
        listEl.innerHTML = `<p class="p-3 text-center text-slate-400 text-sm">Sin categorías de ${CATEGORIA_TIPOS[tipo].label.toLowerCase()} para "${destino.nombre}" todavía.</p>`;
    } else {
        visibles.forEach(c => listEl.appendChild(buildCategoriaRow(tipo, c)));
    }
}

// ===== Asignaciones de una categoría (ver y editar desde Destinos y Categorías) =====
// Categorías abiertas ("tipo:id"), para que sigan desplegadas tras cada re-render.
const categoriasExpandidas = new Set();

// Elementos de cada catálogo en forma común {id, nombre, destino_id, categoria_id, idioma?}.
// Un módulo de itinerario existe una vez por idioma, así que puede repetirse su título.
function listaElementos(tipo) {
    if (tipo === 'tours') return toursData.map(t => ({ id: t.id, nombre: t.tour, destino_id: t.destino_id, categoria_id: t.categoria_id }));
    if (tipo === 'hoteles') return hotelsData.map(h => ({ id: h.id, nombre: h.aloj, destino_id: h.destino_id, categoria_id: h.categoria_id }));
    return IDIOMAS_ITIN.flatMap(idioma => modulosItinTodos[idioma].map(m => ({ id: m.id, nombre: m.titulo, destino_id: m.destino_id, categoria_id: m.categoria_id, idioma })));
}

// Guarda de inmediato el destino/categoría de UN elemento (mismos endpoints de clasificación
// en lote que usan las tablas de Tours/Hoteles/Módulos, con un solo cambio) y refresca.
// Sin aviso de éxito a propósito: el propio panel actualizándose ya lo muestra, y un
// Swal.fire() por cada movimiento haría tedioso reasignar varios.
async function asignarElemento(tipo, elemento, destinoId, categoriaId) {
    const cambios = [{ id: elemento.id, destino_id: destinoId, categoria_id: categoriaId }];
    const url = tipo === 'itinerarios'
        ? `${ITINERARIO_API_BASE}api.php?path=guardar-clasificaciones-modulos&idioma=${elemento.idioma}`
        : `${API_URL}?path=${tipo === 'tours' ? 'guardar-clasificaciones-tours' : 'guardar-clasificaciones-hoteles'}`;
    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cambios }) });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        if (tipo === 'tours') await refrescarTours();
        else if (tipo === 'hoteles') await refrescarHoteles();
        else {
            await recargarModulosIdioma(elemento.idioma);
            await refrescarModulosItinerario();
        }
        renderDestinos();
    } catch (e) {
        notifyError('Error al cambiar la asignación: ' + e.message);
    }
}

const crearNodo = (tag, clase, texto) => {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    return nodo;
};

function construirPanelAsignaciones(tipo, c) {
    const t = CATEGORIA_TIPOS[tipo];
    const todos = listaElementos(tipo);
    const asignados = todos.filter(x => Number(x.categoria_id) === c.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const otrasCategorias = t.getDataset().filter(x => x.destino_id === c.destino_id && x.id !== c.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const etiqueta = (x) => x.idioma ? `${x.nombre} [${x.idioma.toUpperCase()}]` : x.nombre;
    const nombreCategoria = (id) => t.getDataset().find(x => x.id === Number(id))?.nombre;

    const panel = crearNodo('div', 'categoria-asignados ml-4 mt-1 mb-2 p-3 rounded-lg bg-slate-50 border');
    panel.appendChild(crearNodo('div', 'text-xs font-semibold text-slate-600 mb-2', `Asignados a "${c.nombre}" (${asignados.length})`));

    if (asignados.length === 0) {
        panel.appendChild(crearNodo('p', 'text-sm text-slate-400 mb-2', `Todavía no hay ${t.sustantivo[1]} en esta categoría.`));
    } else {
        const ul = crearNodo('ul', 'space-y-1 mb-3');
        asignados.forEach(x => {
            const li = crearNodo('li', 'flex items-center justify-between gap-2 text-sm');
            li.appendChild(crearNodo('span', 'min-w-0 truncate', etiqueta(x)));
            const mover = crearNodo('select', 'rounded-md small border px-2 py-0.5 shrink-0');
            mover.title = 'Mover a otra categoría de este destino, o quitarlo de esta';
            mover.appendChild(new Option('Mover a…', ''));
            mover.appendChild(new Option('— Quitar de esta categoría —', '__quitar__'));
            otrasCategorias.forEach(oc => mover.appendChild(new Option(oc.nombre, String(oc.id))));
            mover.addEventListener('change', () => {
                if (!mover.value) return;
                asignarElemento(tipo, x, c.destino_id, mover.value === '__quitar__' ? null : Number(mover.value));
            });
            li.appendChild(mover);
            ul.appendChild(li);
        });
        panel.appendChild(ul);
    }

    // Candidatos a sumar: los del mismo destino (sin categoría primero) y los aún sin
    // destino — a estos se les asigna también el destino de la categoría.
    const candidatos = todos.filter(x => Number(x.categoria_id) !== c.id && (Number(x.destino_id) === c.destino_id || x.destino_id == null));
    if (candidatos.length) {
        const grupos = [
            ['Sin categoría en este destino', candidatos.filter(x => Number(x.destino_id) === c.destino_id && x.categoria_id == null)],
            ['En otras categorías de este destino', candidatos.filter(x => Number(x.destino_id) === c.destino_id && x.categoria_id != null)],
            ['Sin destino (se les asignará también este destino)', candidatos.filter(x => x.destino_id == null)]
        ];
        const agregar = crearNodo('select', 'rounded-md small border px-2 py-1 w-full');
        agregar.appendChild(new Option('+ Agregar a esta categoría…', ''));
        grupos.forEach(([titulo, items]) => {
            if (!items.length) return;
            const og = document.createElement('optgroup');
            og.label = titulo;
            items.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(x => {
                const actual = x.categoria_id != null ? nombreCategoria(x.categoria_id) : null;
                const opt = new Option(etiqueta(x) + (actual ? ` (en ${actual})` : ''), '');
                opt.dataset.clave = `${x.idioma || ''}:${x.id}`;
                og.appendChild(opt);
            });
            agregar.appendChild(og);
        });
        agregar.addEventListener('change', () => {
            const clave = agregar.selectedOptions[0]?.dataset.clave;
            if (!clave) return;
            const x = candidatos.find(y => `${y.idioma || ''}:${y.id}` === clave);
            if (x) asignarElemento(tipo, x, c.destino_id, c.id);
        });
        panel.appendChild(agregar);
    }
    return panel;
}

function buildCategoriaRow(tipo, c) {
    const t = CATEGORIA_TIPOS[tipo];
    const clave = `${tipo}:${c.id}`;
    const abierta = categoriasExpandidas.has(clave);
    const wrapper = document.createElement('div');
    wrapper.className = 'categoria-bloque';
    const div = document.createElement('div');
    div.className = 'categoria-item flex items-center justify-between gap-2 px-2 py-2 rounded-lg';
    const cuenta = t.items(enCategoria(c.id));
    const noun = t.sustantivo[cuenta.total === 1 ? 0 : 1];
    div.innerHTML = `
        <span class="min-w-0 truncate">${escapeHtml(c.nombre)} <span class="text-xs text-slate-400">· ${escapeHtml(c.creado_por_nombre || '—')}</span></span>
        <div class="flex items-center gap-2 shrink-0">
            <button type="button" class="conteo-chip categoria-ver-btn${cuenta.total === 0 ? ' is-cero' : ''}" title="${cuenta.desglose ? cuenta.desglose + ' — ' : ''}Ver y editar sus asignaciones"><i class="fas ${t.icono}"></i>${cuenta.total} ${noun}<i class="fas fa-chevron-${abierta ? 'up' : 'down'}"></i></button>
            <div class="flex items-center gap-1 shrink-0">
                <button class="text-slate-400 hover:text-slate-700 p-1 categoria-editar-btn" title="Editar"><i class="fas fa-pen text-xs"></i></button>
                <button class="text-red-400 hover:text-red-600 p-1 categoria-eliminar-btn" title="Eliminar"><i class="fas fa-trash text-xs"></i></button>
            </div>
        </div>
    `;
    div.querySelector('.categoria-ver-btn').addEventListener('click', () => {
        if (categoriasExpandidas.has(clave)) categoriasExpandidas.delete(clave); else categoriasExpandidas.add(clave);
        renderCategorias();
    });
    div.querySelector('.categoria-editar-btn').addEventListener('click', () => wrapper.replaceWith(buildCategoriaEditRow(tipo, c)));
    div.querySelector('.categoria-eliminar-btn').addEventListener('click', () => eliminarCategoria(tipo, c));
    wrapper.appendChild(div);
    if (abierta) wrapper.appendChild(construirPanelAsignaciones(tipo, c));
    return wrapper;
}

function buildCategoriaEditRow(tipo, c) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 px-2 py-2 rounded-lg';
    div.innerHTML = `
        <input class="input flex-1 min-w-0 rounded px-2 py-1 border text-sm" type="text" value="${escapeHtml(c.nombre)}">
        <button class="text-emerald-600 hover:text-emerald-800 p-1 shrink-0" title="Guardar"><i class="fas fa-check text-xs"></i></button>
        <button class="text-slate-400 hover:text-slate-600 p-1 shrink-0" title="Cancelar"><i class="fas fa-times text-xs"></i></button>
    `;
    const nombreI = div.querySelector('input');
    const [saveBtn, cancelBtn] = div.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarCategoria(tipo, { id: c.id, destino_id: c.destino_id, nombre: nombreI.value.trim() }));
    cancelBtn.addEventListener('click', () => div.replaceWith(buildCategoriaRow(tipo, c)));
    return div;
}

async function guardarCategoria(tipo, payload) {
    if (!payload.nombre) { notifyError('El nombre de la categoría es obligatorio.'); return false; }
    try {
        const res = await fetch(`${CATEGORIA_TIPOS[tipo].apiBase()}?path=${CATEGORIA_TIPOS[tipo].apiGuardar}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(payload.id ? 'Categoría actualizada.' : 'Categoría agregada.');
        await refrescarDestinosCategorias();
        return true;
    } catch (e) {
        notifyError('Error al guardar la categoría: ' + e.message);
        return false;
    }
}

async function eliminarCategoria(tipo, c) {
    const t = CATEGORIA_TIPOS[tipo];
    const n = t.items(enCategoria(c.id)).total;
    // Las categorías de itinerario no se pueden borrar con módulos dentro (lo rechaza el
    // servidor): se avisa de entrada en vez de dejar que falle después de confirmar.
    if (tipo === 'itinerarios' && n) {
        notifyWarning(`No se puede eliminar "${c.nombre}": tiene ${n} ${t.sustantivo[n === 1 ? 0 : 1]} asociados. Reasígnalos a otra categoría primero.`);
        return;
    }
    let mensaje = `¿Eliminar la categoría "${c.nombre}"?`;
    if (n) mensaje += ` Quedarían ${n} ${t.sustantivo[n === 1 ? 0 : 1]} sin categoría asignada.`;
    mensaje += ' Esta acción no se puede deshacer.';
    if (!await confirmAction(mensaje, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`${t.apiBase()}?path=${t.apiEliminar}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Categoría eliminada.');
        await refrescarDestinosCategorias();
    } catch (e) {
        notifyError('Error al eliminar la categoría: ' + e.message);
    }
}

async function refrescarDestinosCategorias() {
    const [destinosRes, categoriasRes, categoriasHotelesRes] = await Promise.all([
        fetch(`${API_URL}?path=destinos`).then(r => r.json()),
        fetch(`${API_URL}?path=categorias`).then(r => r.json()),
        fetch(`${API_URL}?path=categorias-hoteles`).then(r => r.json()),
        refrescarCategoriasItinerario(),
        refrescarModulosItinerario()
    ]);
    destinosData = destinosRes;
    categoriasData = categoriasRes;
    categoriasHotelesData = categoriasHotelesRes;
    // Itinerario guarda su propia referencia a la lista de destinos (itinDestinosData).
    itinDestinosData = destinosData;
    renderDestinos();
    renderTourNewDestinoCategoria();
    renderHotelNewDestinoCategoria();
    // Los nombres de destino/categoría mostrados en "Tours/Hoteles Existentes" dependen de estos catálogos.
    renderTours();
    renderHotels();
}

// Recrea el selector Destino → Categoría de la fila de alta de "Tours Existentes",
// para que refleje el catálogo vigente (p.ej. tras crear un destino nuevo).
function renderTourNewDestinoCategoria() {
    const container = document.getElementById('tour-new-destino-categoria');
    container.innerHTML = '';
    container.appendChild(buildDestinoCategoriaSelector(categoriasData, null, null));
}

function actualizarBotonGuardarHoteles() {
    const btn = document.getElementById('hoteles-guardar-flotante');
    const n = cambiosPendientesHoteles.size;
    btn.classList.toggle('hidden', n === 0);
    document.getElementById('hoteles-guardar-count').textContent = n;
}

function renderHotels() {
    const tbody = document.getElementById('hotels-table-body');
    tbody.innerHTML = '';
    cambiosPendientesHoteles.clear();
    actualizarBotonGuardarHoteles();
    const visibles = hotelsData
        .filter(h => h.aloj.toLowerCase().includes(hotelsFilter))
        .sort((a, b) => a.aloj.localeCompare(b.aloj));
    if (visibles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-3 text-center text-slate-400">${hotelsFilter ? 'Sin resultados.' : 'Sin hoteles registrados.'}</td></tr>`;
    } else {
        visibles.forEach(h => tbody.appendChild(buildHotelRow(h)));
    }
    actualizarAvisoDependencia('hoteles-sin-destinos-hint', destinosData.length === 0, 'clasificacion');
    renderGestionResumen();
}

function buildHotelRow(h) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    tr.innerHTML = `
        <td class="p-3 font-medium">${escapeHtml(h.aloj)}</td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full hotel-row-destino"></select></td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full hotel-row-categoria" disabled></select></td>
        <td class="p-3">${escapeHtml(h.distr || '')}</td>
        <td class="p-3">${fmt(h.preg)}</td>
        <td class="p-3">${fmt(h.ppromo)}</td>
        <td class="p-3">${fmt(h.pconf)}</td>
        <td class="p-3">${fmt(h.pctotal)}</td>
        <td class="p-3 text-slate-500">${escapeHtml(h.creado_por_nombre || '—')}</td>
        <td class="p-3 text-right whitespace-nowrap">
            <button class="text-slate-500 hover:text-slate-700 mr-2" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    const destinoSel = tr.querySelector('.hotel-row-destino');
    const categoriaSel = tr.querySelector('.hotel-row-categoria');
    llenarSelectDestino(destinoSel, h.destino_id);
    llenarSelectCategoria(categoriaSel, categoriasHotelesData, h.destino_id, h.categoria_id);
    const marcarPendiente = () => {
        cambiosPendientesHoteles.set(h.id, { destino_id: destinoSel.value || null, categoria_id: categoriaSel.value || null });
        actualizarBotonGuardarHoteles();
    };
    destinoSel.addEventListener('change', () => {
        llenarSelectCategoria(categoriaSel, categoriasHotelesData, destinoSel.value, null);
        marcarPendiente();
    });
    categoriaSel.addEventListener('change', marcarPendiente);
    const [editBtn, delBtn] = tr.querySelectorAll('td:last-child button');
    editBtn.addEventListener('click', () => tr.replaceWith(buildHotelEditRow(h)));
    delBtn.addEventListener('click', () => eliminarHotel(h));
    return tr;
}

function buildHotelEditRow(h) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${escapeHtml(h.aloj)}"></td>
        <td class="p-2 destino-categoria-cell" colspan="2"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${escapeHtml(h.distr || '')}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${h.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${h.ppromo}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${h.pconf || 0}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" min="0" value="${h.pctotal || 0}"></td>
        <td class="p-2 text-slate-500">${escapeHtml(h.creado_por_nombre || '—')}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const destinoCategoriaSelector = buildDestinoCategoriaSelector(categoriasHotelesData, h.destino_id, h.categoria_id);
    tr.querySelector('.destino-categoria-cell').appendChild(destinoCategoriaSelector);
    const [alojI, distrI, pregI, ppromoI, pconfI, pctotalI] = tr.querySelectorAll('input');
    const [saveBtn, cancelBtn] = tr.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarHotel({
        id: h.id, aloj: alojI.value.trim(),
        destino_id: destinoCategoriaSelector.destinoSelect.value || null,
        categoria_id: destinoCategoriaSelector.categoriaSelect.value || null,
        distr: distrI.value.trim(), preg: pregI.value, ppromo: ppromoI.value,
        pconf: pconfI.value, pctotal: pctotalI.value
    }));
    cancelBtn.addEventListener('click', () => tr.replaceWith(buildHotelRow(h)));
    return tr;
}

async function guardarHotel(payload) {
    if (!payload.aloj) { notifyError('El nombre del alojamiento es obligatorio.'); return false; }
    try {
        const res = await fetch(`${API_URL}?path=guardar-hotel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(payload.id ? 'Alojamiento actualizado.' : 'Alojamiento agregado.');
        await refrescarHoteles();
        return true;
    } catch (e) {
        notifyError('Error al guardar el alojamiento: ' + e.message);
        return false;
    }
}

async function eliminarHotel(h) {
    if (!await confirmAction(`¿Eliminar "${h.aloj}" del catálogo de hoteles? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`${API_URL}?path=eliminar-hotel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: h.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Alojamiento eliminado.');
        await refrescarHoteles();
    } catch (e) {
        notifyError('Error al eliminar el alojamiento: ' + e.message);
    }
}

async function refrescarHoteles() {
    hotelsData = await fetch(`${API_URL}?path=hoteles`).then(r => r.json());
    renderHotels();
}

// Recrea el selector Destino → Categoría de la fila de alta de "Hoteles Existentes",
// para que refleje el catálogo vigente (p.ej. tras crear un destino/categoría nuevo).
function renderHotelNewDestinoCategoria() {
    const container = document.getElementById('hotel-new-destino-categoria');
    container.innerHTML = '';
    container.appendChild(buildDestinoCategoriaSelector(categoriasHotelesData, null, null));
}

// ===== PAQUETES DE TOURS (combos reutilizables para Data Tours) =====
async function cargarPaquetes() {
    try {
        paquetesData = await fetch(`${API_URL}?path=paquetes-tours`).then(r => r.json());
        renderPaquetesList();
        renderAplicarPaqueteSelect();
    } catch (e) {
        console.error('Error al cargar paquetes:', e);
    }
}

function agregarFilaPaquete(data = {}) {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-2 items-center paquete-builder-row';

    const tourInput = document.createElement('input');
    tourInput.type = 'hidden';
    tourInput.className = 'paquete-row-tour';
    tourInput.value = data.tour || '';

    const selector = buildTourSelector(data.tour || '', (tourName) => {
        tourInput.value = tourName;
    });
    selector.classList.add('flex-1');

    const cantInput = document.createElement('input');
    cantInput.className = 'input rounded px-2 py-1 border text-right paquete-row-cant';
    cantInput.type = 'number';
    cantInput.min = '1';
    cantInput.value = data.cant || 1;
    cantInput.style.width = '80px';

    const delBtn = document.createElement('button');
    delBtn.className = 'text-red-500 small paquete-row-del';
    delBtn.title = 'Quitar';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', () => row.remove());

    row.append(selector, tourInput, cantInput, delBtn);
    document.getElementById('paquete-builder-rows').appendChild(row);
}

function agregarFilaPaqueteHotel(data = {}) {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-2 items-center paquete-hotel-row';

    const hotelInput = document.createElement('input');
    hotelInput.type = 'hidden';
    hotelInput.className = 'paquete-hotel-aloj';
    hotelInput.value = data.aloj || '';

    const selector = buildHotelSelector(data.aloj || '', (alojNombre) => {
        hotelInput.value = alojNombre;
    });
    selector.classList.add('flex-1');

    const numInput = (clase, valor, titulo) => {
        const input = document.createElement('input');
        input.className = `input rounded px-2 py-1 border text-right ${clase}`;
        input.type = 'number';
        input.min = '1';
        input.value = valor;
        input.title = titulo;
        input.style.width = '80px';
        return input;
    };
    const nhabInput = numInput('paquete-hotel-nhab', data.nhab || 1, 'Nº de habitaciones');
    const nochesInput = numInput('paquete-hotel-noches', data.noches || 1, 'Noches');

    const delBtn = document.createElement('button');
    delBtn.className = 'text-red-500 small';
    delBtn.title = 'Quitar';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', () => row.remove());

    const etiqueta = (texto) => {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-500';
        span.textContent = texto;
        return span;
    };
    row.append(selector, hotelInput, etiqueta('Hab.'), nhabInput, etiqueta('Noches'), nochesInput, delBtn);
    document.getElementById('paquete-hoteles-rows').appendChild(row);
}

// Itinerario del paquete: idioma propio (select #paquete-itin-idioma), y los módulos salen
// del catálogo de ESE idioma (helpers en itinerario.js) — no del idioma activo de la cotización.
let paqueteItinIdiomaActual = null;

async function agregarFilaPaqueteItin(filename = '') {
    const idioma = document.getElementById('paquete-itin-idioma').value;
    await asegurarIdiomaCargado(idioma);
    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-2 items-center paquete-itin-row';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.className = 'paquete-itin-filename';
    hiddenInput.value = filename;

    const selector = buildSelectorModuloIdioma(idioma, filename, (fn) => { hiddenInput.value = fn; });
    selector.classList.add('flex-1');

    const delBtn = document.createElement('button');
    delBtn.className = 'text-red-500 small';
    delBtn.title = 'Quitar';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', () => row.remove());

    row.append(selector, hiddenInput, delBtn);
    document.getElementById('paquete-itin-rows').appendChild(row);
}

function modulosItinPaqueteSeleccionados() {
    return Array.from(document.querySelectorAll('.paquete-itin-filename')).map(i => i.value).filter(Boolean);
}

// Los módulos son de un solo idioma: al cambiarlo, los ya elegidos dejarían de existir.
async function cambiarIdiomaItinPaquete() {
    const select = document.getElementById('paquete-itin-idioma');
    const nuevo = select.value;
    if (nuevo === paqueteItinIdiomaActual) return;
    if (modulosItinPaqueteSeleccionados().length > 0 &&
        !await confirmAction('Los módulos elegidos son del idioma anterior. Al cambiar el idioma se quitan. ¿Continuar?', 'Sí, cambiar')) {
        select.value = paqueteItinIdiomaActual;
        return;
    }
    paqueteItinIdiomaActual = nuevo;
    document.getElementById('paquete-itin-rows').innerHTML = '';
    await agregarFilaPaqueteItin();
}

async function resetPaqueteBuilder() {
    document.getElementById('paquete-nombre').value = '';
    document.getElementById('paquete-builder-rows').innerHTML = '';
    document.getElementById('paquete-hoteles-rows').innerHTML = '';
    document.getElementById('paquete-itin-rows').innerHTML = '';
    agregarFilaPaquete();
    agregarFilaPaqueteHotel();
    // Por defecto, el itinerario del paquete arranca en español — acá no hay Datos Pax de
    // una cotización en curso (eso solo existe en Cotizador) del cual tomar el idioma.
    const idiomaSelect = document.getElementById('paquete-itin-idioma');
    idiomaSelect.value = 'es';
    paqueteItinIdiomaActual = idiomaSelect.value;
    paqueteEditandoId = null;
    document.getElementById('paquete-cancelar-edicion').classList.add('hidden');
    await agregarFilaPaqueteItin();
}

async function guardarPaquete() {
    const nombre = document.getElementById('paquete-nombre').value.trim();
    if (!nombre) { notifyError('El nombre del paquete es obligatorio.'); return; }
    const tours = Array.from(document.querySelectorAll('.paquete-builder-row')).map(row => ({
        tour: row.querySelector('.paquete-row-tour').value.trim(),
        cant: row.querySelector('.paquete-row-cant').value
    })).filter(t => t.tour);
    const hoteles = Array.from(document.querySelectorAll('.paquete-hotel-row')).map(row => ({
        aloj: row.querySelector('.paquete-hotel-aloj').value.trim(),
        nhab: row.querySelector('.paquete-hotel-nhab').value,
        noches: row.querySelector('.paquete-hotel-noches').value
    })).filter(h => h.aloj);
    const modulos = modulosItinPaqueteSeleccionados();
    if (tours.length === 0 && hoteles.length === 0 && modulos.length === 0) {
        notifyError('Agrega al menos una actividad, un hotel o un módulo de itinerario al paquete.');
        return;
    }
    try {
        const payload = {
            nombre, tours, hoteles,
            itinerario: modulos.length ? { idioma: document.getElementById('paquete-itin-idioma').value, modulos } : null
        };
        if (paqueteEditandoId) payload.id = paqueteEditandoId;
        const res = await fetch(`${API_URL}?path=guardar-paquete-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(paqueteEditandoId ? 'Paquete actualizado.' : 'Paquete guardado.');
        resetPaqueteBuilder();
        await cargarPaquetes();
    } catch (e) {
        notifyError('Error al guardar el paquete: ' + e.message);
    }
}

async function editarPaquete(paquete) {
    document.getElementById('paquete-nombre').value = paquete.nombre;
    document.getElementById('paquete-builder-rows').innerHTML = '';
    document.getElementById('paquete-hoteles-rows').innerHTML = '';
    document.getElementById('paquete-itin-rows').innerHTML = '';
    if (paquete.tours.length) paquete.tours.forEach(t => agregarFilaPaquete(t)); else agregarFilaPaquete();
    if (paquete.hoteles.length) paquete.hoteles.forEach(h => agregarFilaPaqueteHotel(h)); else agregarFilaPaqueteHotel();
    const idiomaSelect = document.getElementById('paquete-itin-idioma');
    idiomaSelect.value = paquete.itinerario?.idioma || 'es';
    paqueteItinIdiomaActual = idiomaSelect.value;
    paqueteEditandoId = paquete.id;
    document.getElementById('paquete-cancelar-edicion').classList.remove('hidden');
    const modulos = paquete.itinerario?.modulos || [];
    if (modulos.length) {
        for (const filename of modulos) await agregarFilaPaqueteItin(filename);
    } else {
        await agregarFilaPaqueteItin();
    }
    document.getElementById('paquete-nombre').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function eliminarPaquete(paquete) {
    if (!await confirmAction(`¿Eliminar el paquete "${paquete.nombre}"? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`${API_URL}?path=eliminar-paquete-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: paquete.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Paquete eliminado.');
        if (paqueteEditandoId === paquete.id) resetPaqueteBuilder();
        await cargarPaquetes();
    } catch (e) {
        notifyError('Error al eliminar el paquete: ' + e.message);
    }
}

const NOMBRES_IDIOMA = { es: 'Español', en: 'English', pt: 'Português' };

// Detalle desplegable de un paquete ("Ver"): qué trae exactamente en cada parte. El
// itinerario necesita el catálogo de módulos de SU idioma para mostrar títulos en vez de
// nombres de archivo, así que se arma bajo demanda al abrirlo.
async function construirDetallePaquete(p) {
    const seccion = (icono, titulo, itemsHtml) => `
        <div>
            <div class="text-xs font-semibold text-slate-600 mb-1"><i class="fas ${icono} mr-1"></i>${titulo}</div>
            <ul class="text-sm text-slate-700 space-y-0.5">${itemsHtml}</ul>
        </div>`;
    const partes = [];
    if (p.tours.length) {
        partes.push(seccion('fa-person-hiking', `Actividades (${p.tours.length})`, p.tours.map((t, i) => {
            const existe = toursData.some(td => td.tour === t.tour);
            return `<li><span class="text-slate-400 mr-1">${i + 1}.</span>${escapeHtml(t.tour)} <span class="text-slate-400">x${t.cant}</span>${existe ? '' : ' <span class="text-amber-600 text-xs">(ya no está en el catálogo)</span>'}</li>`;
        }).join('')));
    }
    if (p.hoteles.length) {
        partes.push(seccion('fa-hotel', `Hoteles (${p.hoteles.length})`, p.hoteles.map(h => {
            const existe = hotelsData.some(hd => hd.aloj === h.aloj);
            return `<li>${escapeHtml(h.aloj)} <span class="text-slate-400">· ${h.nhab} hab. · ${h.noches} noche${h.noches === 1 ? '' : 's'}</span>${existe ? '' : ' <span class="text-amber-600 text-xs">(ya no está en el catálogo)</span>'}</li>`;
        }).join('')));
    }
    if (p.itinerario?.modulos?.length) {
        const { idioma, modulos } = p.itinerario;
        await asegurarIdiomaCargado(idioma);
        const vigentes = new Set((idiomaCache[idioma]?.modules || []).map(m => m.filename));
        partes.push(seccion('fa-route', `Itinerario · ${NOMBRES_IDIOMA[idioma] || idioma} (${modulos.length} día${modulos.length === 1 ? '' : 's'})`, modulos.map((fn, i) => `<li><span class="text-slate-400 mr-1">Día ${i + 1}:</span>${escapeHtml(tituloModuloDeIdioma(idioma, fn))}${vigentes.has(fn) ? '' : ' <span class="text-amber-600 text-xs">(ya no está en el catálogo)</span>'}</li>`).join('')));
    }
    return partes.join('') || '<p class="text-slate-400 text-sm">Paquete vacío.</p>';
}

function renderPaquetesList() {
    const container = document.getElementById('paquetes-list');
    container.innerHTML = '';
    if (paquetesData.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm">Sin paquetes guardados.</p>';
    } else {
        paquetesData.forEach(p => {
            const chip = (icono, texto) => `<span class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><i class="fas ${icono} mr-1"></i>${texto}</span>`;
            const chips = [];
            if (p.tours.length) chips.push(chip('fa-person-hiking', `${p.tours.length} actividad${p.tours.length === 1 ? '' : 'es'}`));
            if (p.hoteles.length) chips.push(chip('fa-hotel', `${p.hoteles.length} hotel${p.hoteles.length === 1 ? '' : 'es'}`));
            if (p.itinerario?.modulos?.length) chips.push(chip('fa-route', `Itinerario ${NOMBRES_IDIOMA[p.itinerario.idioma] || ''} · ${p.itinerario.modulos.length} día${p.itinerario.modulos.length === 1 ? '' : 's'}`));
            // Un paquete puede quedar referenciando tours/hoteles que ya se borraron del
            // catálogo (o se les cambió el nombre) — avisarlo acá evita aplicar filas rotas.
            const faltantes = [
                ...p.tours.filter(t => !toursData.some(td => td.tour === t.tour)).map(t => t.tour),
                ...p.hoteles.filter(h => !hotelsData.some(hd => hd.aloj === h.aloj)).map(h => h.aloj)
            ];
            const avisoHtml = faltantes.length
                ? `<div class="text-xs text-amber-600 mt-1"><i class="fas fa-triangle-exclamation mr-1"></i>${faltantes.length} elemento${faltantes.length === 1 ? '' : 's'} ya no ${faltantes.length === 1 ? 'existe' : 'existen'} en el catálogo: ${escapeHtml(faltantes.join(', '))}</div>`
                : '';
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg';
            div.innerHTML = `
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="min-w-0">
                        <div class="font-medium">${escapeHtml(p.nombre)}</div>
                        <div class="flex flex-wrap gap-1 mt-1">${chips.join('')}</div>
                        ${avisoHtml}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button class="btn border small paquete-ver-btn" title="Ver el contenido del paquete"><i class="fas fa-eye mr-1"></i>Ver</button>
                        <button class="btn btn-primary small paquete-aplicar-btn"><i class="fas fa-check mr-1"></i>Aplicar</button>
                        <button class="text-slate-500 hover:text-slate-700 paquete-editar-btn" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="text-red-500 hover:text-red-700 paquete-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="paquete-detalle hidden mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-4"></div>
            `;
            const detalle = div.querySelector('.paquete-detalle');
            const verBtn = div.querySelector('.paquete-ver-btn');
            verBtn.addEventListener('click', async () => {
                const abrir = detalle.classList.contains('hidden');
                if (abrir && !detalle.dataset.cargado) {
                    detalle.innerHTML = '<p class="text-slate-400 text-sm">Cargando...</p>';
                    detalle.classList.remove('hidden');
                    detalle.innerHTML = await construirDetallePaquete(p);
                    detalle.dataset.cargado = '1';
                }
                detalle.classList.toggle('hidden', !abrir);
                verBtn.innerHTML = abrir ? '<i class="fas fa-eye-slash mr-1"></i>Ocultar' : '<i class="fas fa-eye mr-1"></i>Ver';
            });
            div.querySelector('.paquete-aplicar-btn').addEventListener('click', () => aplicarPaquete(p));
            div.querySelector('.paquete-editar-btn').addEventListener('click', () => editarPaquete(p));
            div.querySelector('.paquete-eliminar-btn').addEventListener('click', () => eliminarPaquete(p));
            container.appendChild(div);
        });
    }
    actualizarAvisoDependencia('paquetes-sin-tours-hint', toursData.length === 0, 'tours');
    renderGestionResumen();
}
// ===== Exportar catálogo (CSV) =====
// Genera un CSV con TU catálogo actual de tours/hoteles, mismo formato que acepta la
// carga masiva (ver upload-tours/upload-hoteles en shared/api.php), para poder editarlo
// en Excel y volver a subirlo — en vez de partir de la plantilla de ejemplo en blanco.
function csvEscaparCampo(valor) {
    const texto = String(valor ?? '');
    return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}
function descargarTextoComoArchivo(texto, filename) {
    // BOM al inicio: sin esto, Excel interpreta tildes/ñ como caracteres corruptos al
    // abrir un CSV UTF-8 (Windows asume ANSI/Latin1 salvo que el BOM le diga lo contrario).
    const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
function exportarCatalogoCsv(items, encabezado, filasDe, filenamePrefix) {
    if (items.length === 0) {
        notifyWarning('Todavía no tienes registros para exportar.');
        return;
    }
    const filas = items.map(filasDe);
    const csv = [encabezado, ...filas].map(fila => fila.map(csvEscaparCampo).join(';')).join('\r\n');
    descargarTextoComoArchivo(csv, `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
}
function exportarToursCsv() {
    exportarCatalogoCsv(
        toursData,
        ['Tour', 'Distr', 'P.Reg', 'P.Promo', 'Destino', 'Categoria', 'Precio Confidencial', 'Precio C. Total'],
        t => [
            t.tour, t.distr || '', t.preg, t.ppromo,
            destinosData.find(d => d.id === t.destino_id)?.nombre || '',
            categoriasData.find(c => c.id === t.categoria_id)?.nombre || '',
            t.pconf || 0, t.pctotal || 0
        ],
        'mi_catalogo_tours'
    );
}
function exportarHotelesCsv() {
    exportarCatalogoCsv(
        hotelsData,
        ['Alojamiento', 'Distr', 'P.Reg', 'P.Promo', 'Destino', 'Categoria', 'Precio Confidencial', 'Precio C. Total'],
        h => [
            h.aloj, h.distr || '', h.preg, h.ppromo,
            destinosData.find(d => d.id === h.destino_id)?.nombre || '',
            categoriasHotelesData.find(c => c.id === h.categoria_id)?.nombre || '',
            h.pconf || 0, h.pctotal || 0
        ],
        'mi_catalogo_hoteles'
    );
}

// Menú desplegable "Descargar" (Mi catálogo actual / Plantilla de ejemplo) — reemplaza
// los 2 íconos sueltos de antes, para ganar espacio horizontal en pantallas angostas.
function initDropdownDescarga(toggleId, menuId) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const yaAbierto = !menu.classList.contains('hidden');
        document.querySelectorAll('.csv-download-menu').forEach(m => m.classList.add('hidden'));
        menu.classList.toggle('hidden', yaAbierto);
    });
    menu.addEventListener('click', () => menu.classList.add('hidden'));
}
document.addEventListener('click', () => {
    document.querySelectorAll('.csv-download-menu').forEach(m => m.classList.add('hidden'));
});

// ===== CSV =====
// Arma el bloque HTML de "creados / actualizados / errores" que se muestra tanto en la
// confirmación previa (con números reales, no una advertencia genérica) como en el
// resumen final tras aplicar.
function construirResumenHtmlCsv(data) {
    let html = `<div class="text-left text-sm">
        <p>✅ <b>${data.creados}</b> nuevo(s)</p>
        <p>🔄 <b>${data.actualizados}</b> actualizado(s) (coincidieron por nombre)</p>`;
    if (data.errores.length) {
        html += `<p class="mt-2" style="color:#b45309">⚠️ ${data.errores.length} fila(s) con error — se omitirán:</p>
            <ul class="text-xs text-left" style="max-height:8rem;overflow-y:auto">`;
        data.errores.slice(0, 12).forEach(e => { html += `<li>Fila ${e.fila}: ${e.motivo}</li>`; });
        if (data.errores.length > 12) html += `<li>... y ${data.errores.length - 12} más.</li>`;
        html += `</ul>`;
    }
    html += `</div>`;
    return html;
}

// Sube un CSV de tours/hoteles en 2 pasos: primero un preview (valida y calcula
// creados/actualizados/errores SIN tocar la base de datos), muestra esos números reales
// en una confirmación, y solo si el usuario confirma se vuelve a enviar para aplicarlo.
// Coincide por nombre (tolerante a mayúsculas/espacios): lo que ya existe se actualiza,
// lo nuevo se crea, y lo que no viene en el archivo se queda intacto (ya no se borra todo).
async function subirCsvConPreview(tipo, file) {
    const endpoint = tipo === 'tours' ? 'upload-tours' : 'upload-hoteles';
    const nombrePlural = tipo === 'tours' ? 'tours' : 'hoteles';

    const enviar = async (preview) => {
        const formData = new FormData();
        formData.append('file', file);
        if (preview) formData.append('preview', '1');
        const res = await fetch(`${API_URL}?path=${endpoint}`, { method: 'POST', body: formData });
        return res.json();
    };

    const previo = await enviar(true);
    if (!previo.success) {
        let html = `<p>${escapeHtml(previo.error)}</p>`;
        if (previo.errores?.length) {
            html += `<ul class="text-xs text-left mt-2" style="max-height:10rem;overflow-y:auto">` +
                previo.errores.slice(0, 15).map(e => `<li>Fila ${escapeHtml(e.fila)}: ${escapeHtml(e.motivo)}</li>`).join('') +
                (previo.errores.length > 15 ? `<li>... y ${previo.errores.length - 15} más.</li>` : '') + `</ul>`;
        }
        await Swal.fire({ icon: 'error', title: 'No se pudo subir el archivo', html, confirmButtonColor: '#e80c13' });
        return;
    }
    if (previo.creados === 0 && previo.actualizados === 0) {
        notifyWarning('No se encontró ninguna fila válida para procesar en ese archivo.');
        return;
    }

    const confirmado = (await Swal.fire({
        icon: 'question',
        title: `¿Confirmas subir este archivo de ${nombrePlural}?`,
        html: construirResumenHtmlCsv(previo),
        showCancelButton: true,
        confirmButtonText: 'Sí, aplicar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e80c13',
        cancelButtonColor: '#64748b'
    })).isConfirmed;
    if (!confirmado) return;

    const final = await enviar(false);
    if (!final.success) {
        notifyError(final.error || 'Error desconocido al aplicar el archivo.');
        return;
    }
    await Swal.fire({ icon: 'success', title: '¡Listo!', html: construirResumenHtmlCsv(final), confirmButtonColor: '#e80c13' });
    cargarDatosIniciales();
}

async function handleTourCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        await subirCsvConPreview('tours', file);
    } catch (error) {
        notifyError('Error al subir tours: ' + error.message);
    }
    event.target.value = '';
}

async function handleHotelCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        await subirCsvConPreview('hoteles', file);
    } catch (error) {
        notifyError('Error al subir hoteles: ' + error.message);
    }
    event.target.value = '';
}


async function init() {
    await cargarDatosIniciales();
    // El armador de itinerario embebido en "Itinerarios" (subir/editar módulos, páginas
    // fijas, historial de generados) no tiene un idioma propio elegido por el usuario acá
    // (no hay Datos Pax en esta página) — arranca en 'es' fijo, igual que la página
    // standalone de Itinerario.
    await initItinerario('es');
    actualizarConteosItinerarios();

    document.querySelectorAll('#gestion-section > div > .subnav-tab').forEach(tab => {
        tab.addEventListener('click', () => irASubtabGestion(tab.dataset.subtab));
    });

    document.getElementById('tours-search').addEventListener('input', (e) => {
        toursFilter = e.target.value.trim().toLowerCase();
        renderTours();
    });
    document.getElementById('hoteles-search').addEventListener('input', (e) => {
        hotelsFilter = e.target.value.trim().toLowerCase();
        renderHotels();
    });
    // Guarda de una sola vez todas las clasificaciones Destino/Categoría pendientes (marcadas
    // al tocar los selects de cada fila) — un solo request, el servidor solo actualiza esos IDs.
    document.getElementById('tours-guardar-flotante').addEventListener('click', async () => {
        if (cambiosPendientesTours.size === 0) return;
        const cambios = Array.from(cambiosPendientesTours, ([id, v]) => ({ id, ...v }));
        try {
            const res = await fetch(`${API_URL}?path=guardar-clasificaciones-tours`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cambios })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error desconocido');
            notifySuccess(`${result.actualizados} tour(es) actualizado(s).`);
            await refrescarTours();
        } catch (e) {
            notifyError('Error al guardar la clasificación: ' + e.message);
        }
    });
    document.getElementById('hoteles-guardar-flotante').addEventListener('click', async () => {
        if (cambiosPendientesHoteles.size === 0) return;
        const cambios = Array.from(cambiosPendientesHoteles, ([id, v]) => ({ id, ...v }));
        try {
            const res = await fetch(`${API_URL}?path=guardar-clasificaciones-hoteles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cambios })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error desconocido');
            notifySuccess(`${result.actualizados} alojamiento(s) actualizado(s).`);
            await refrescarHoteles();
        } catch (e) {
            notifyError('Error al guardar la clasificación: ' + e.message);
        }
    });

    document.getElementById('paquete-add-row').addEventListener('click', () => agregarFilaPaquete());
    document.getElementById('paquete-hotel-add-row').addEventListener('click', () => agregarFilaPaqueteHotel());
    document.getElementById('paquete-itin-add-row').addEventListener('click', () => agregarFilaPaqueteItin());
    document.getElementById('paquete-itin-idioma').addEventListener('change', cambiarIdiomaItinPaquete);
    document.getElementById('paquete-guardar').addEventListener('click', guardarPaquete);
    document.getElementById('paquete-cancelar-edicion').addEventListener('click', resetPaqueteBuilder);
    resetPaqueteBuilder();

    document.getElementById('tour-csv-input').addEventListener('change', handleTourCsvUpload);
    document.getElementById('hotel-csv-input').addEventListener('change', handleHotelCsvUpload);
    document.getElementById('tours-export-btn').addEventListener('click', exportarToursCsv);
    document.getElementById('hoteles-export-btn').addEventListener('click', exportarHotelesCsv);
    initDropdownDescarga('tours-download-toggle', 'tours-download-menu');
    initDropdownDescarga('hoteles-download-toggle', 'hoteles-download-menu');
    document.getElementById('tour-new-add').addEventListener('click', async () => {
        const destinoCategoriaContainer = document.getElementById('tour-new-destino-categoria');
        const destinoSel = destinoCategoriaContainer.querySelector('.sel-destino-tour');
        const categoriaSel = destinoCategoriaContainer.querySelector('.sel-categoria-tour');
        const ok = await guardarTour({
            tour: document.getElementById('tour-new-nombre').value.trim(),
            destino_id: destinoSel.value || null,
            categoria_id: categoriaSel.value || null,
            distr: document.getElementById('tour-new-distr').value.trim(),
            preg: document.getElementById('tour-new-preg').value,
            ppromo: document.getElementById('tour-new-ppromo').value,
            pconf: document.getElementById('tour-new-pconf').value,
            pctotal: document.getElementById('tour-new-pctotal').value
        });
        if (ok) {
            ['tour-new-nombre', 'tour-new-distr', 'tour-new-preg', 'tour-new-ppromo', 'tour-new-pconf', 'tour-new-pctotal'].forEach(id => document.getElementById(id).value = '');
            renderTourNewDestinoCategoria();
        }
    });
    document.getElementById('destino-new-add').addEventListener('click', async () => {
        const ok = await guardarDestino({ nombre: document.getElementById('destino-new-nombre').value.trim() });
        if (ok) document.getElementById('destino-new-nombre').value = '';
    });
    document.getElementById('categoria-new-add').addEventListener('click', async () => {
        if (!destinoSeleccionadoId) { notifyError('Selecciona un destino primero.'); return; }
        const ok = await guardarCategoria(categoriaTipoActivo, { destino_id: destinoSeleccionadoId, nombre: document.getElementById('categoria-new-nombre').value.trim() });
        if (ok) document.getElementById('categoria-new-nombre').value = '';
    });
    document.querySelectorAll('.categoria-tipo-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            categoriaTipoActivo = btn.dataset.categoriaTipo;
            renderCategorias();
        });
    });
    document.getElementById('hotel-new-add').addEventListener('click', async () => {
        const destinoCategoriaContainer = document.getElementById('hotel-new-destino-categoria');
        const destinoSel = destinoCategoriaContainer.querySelector('.sel-destino-tour');
        const categoriaSel = destinoCategoriaContainer.querySelector('.sel-categoria-tour');
        const ok = await guardarHotel({
            aloj: document.getElementById('hotel-new-nombre').value.trim(),
            destino_id: destinoSel.value || null,
            categoria_id: categoriaSel.value || null,
            distr: document.getElementById('hotel-new-distr').value.trim(),
            preg: document.getElementById('hotel-new-preg').value,
            ppromo: document.getElementById('hotel-new-ppromo').value,
            pconf: document.getElementById('hotel-new-pconf').value,
            pctotal: document.getElementById('hotel-new-pctotal').value
        });
        if (ok) {
            ['hotel-new-nombre', 'hotel-new-distr', 'hotel-new-preg', 'hotel-new-ppromo', 'hotel-new-pconf', 'hotel-new-pctotal'].forEach(id => document.getElementById(id).value = '');
            renderHotelNewDestinoCategoria();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
