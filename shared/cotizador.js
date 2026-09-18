// shared/cotizador.js
// Motor único del cotizador, usado por pen/index.php y usd/index.php.
// Requiere que la página defina window.APP_CONFIG = { currencySymbol, switchTarget } antes de este script.

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

// Ejecutar al cargar
verificarSesion();

// ===== CONFIGURACIÓN =====
const API_URL = 'api.php';
const CURRENCY_SYMBOL = window.APP_CONFIG.currencySymbol;

// ===== DATOS Y ESTADO =====
let toursData = [];
let hotelsData = [];
let destinosData = [];
let categoriasData = [];
let categoriasHotelesData = [];
let paisesData = []; // {id, nombre, codigo_telefono} — catálogo global (shared/migrations/027_...)
let destinoSeleccionadoId = null;
let categoriaTipoActivo = 'tours';
let cotizaciones = {};
let currentCotizacionId = null;
let toursFilter = '';
let hotelsFilter = '';
let paquetesData = [];
let paqueteEditandoId = null;
let pdfPreviewUrl = null;
let pdfPreviewFilename = '';
let pdfPreviewCotizacionId = null;

// Etiquetas fijas de la plantilla del PDF (shared/pdf-template.html /
// pdf-terminos-template.html), traducidas a los 3 idiomas de exportación. Los datos
// variables (tours, hoteles, notas) no se traducen: quedan tal como los escribió el
// usuario; solo el "chrome" de la plantilla y el título de Términos cambian de idioma.
const PDF_LABELS = {
    es: {
        eCotizacion: 'E-COTIZACIÓN', agente: 'Agente de reservas:', reservaTuPaquete: 'Reserva tu paquete con el',
        llegada: 'Llegada', salida: 'Salida', fecha: 'Fecha', tourActividad: 'Tour/Actividad', cant: 'Cant.',
        pReg: 'P.Reg.', pPromo: 'P. Promo', totalLinea: 'Total línea', checkIn: 'Check in', checkOut: 'Check out',
        alojamiento: 'Alojamiento', nHab: 'N° hab.', nNoches: 'N° noches', pRegNoche: 'P. reg. x noche',
        pPromoNoche: 'P. promo x noche', nota: 'NOTA:', sinNotas: 'Sin notas adicionales.',
        cantidadBaseTotal: 'Cantidad base total', descuentoTotal: '(-) Descuento Total',
        precioAdicional: 'Precio adicional:', totalFinal: 'Total final', terminosTitulo: 'Términos y Condiciones',
        ruc: 'RUC:', telf: 'Telf:', cel: 'Cel:', whatsapp: 'Whatsapp:',
        na: 'N/A', actividadNoEspecificada: 'Actividad no especificada'
    },
    en: {
        eCotizacion: 'E-QUOTE', agente: 'Booking agent:', reservaTuPaquete: 'Book your package with',
        llegada: 'Arrival', salida: 'Departure', fecha: 'Date', tourActividad: 'Tour/Activity', cant: 'Qty.',
        pReg: 'Reg. Price', pPromo: 'Promo Price', totalLinea: 'Line total', checkIn: 'Check in', checkOut: 'Check out',
        alojamiento: 'Accommodation', nHab: 'Rooms', nNoches: 'Nights', pRegNoche: 'Reg. price/night',
        pPromoNoche: 'Promo price/night', nota: 'NOTE:', sinNotas: 'No additional notes.',
        cantidadBaseTotal: 'Total base amount', descuentoTotal: '(-) Total discount',
        precioAdicional: 'Additional price:', totalFinal: 'Final total', terminosTitulo: 'Terms and Conditions',
        ruc: 'Tax ID:', telf: 'Phone:', cel: 'Mobile:', whatsapp: 'WhatsApp:',
        na: 'N/A', actividadNoEspecificada: 'Activity not specified'
    },
    pt: {
        eCotizacion: 'E-COTAÇÃO', agente: 'Agente de reservas:', reservaTuPaquete: 'Reserve seu pacote com',
        llegada: 'Chegada', salida: 'Partida', fecha: 'Data', tourActividad: 'Passeio/Atividade', cant: 'Qtd.',
        pReg: 'Preço Reg.', pPromo: 'Preço Promo', totalLinea: 'Total da linha', checkIn: 'Check in', checkOut: 'Check out',
        alojamiento: 'Hospedagem', nHab: 'N° quartos', nNoches: 'N° noites', pRegNoche: 'Preço reg. por noite',
        pPromoNoche: 'Preço promo por noite', nota: 'NOTA:', sinNotas: 'Sem notas adicionais.',
        cantidadBaseTotal: 'Valor base total', descuentoTotal: '(-) Desconto Total',
        precioAdicional: 'Preço adicional:', totalFinal: 'Total final', terminosTitulo: 'Termos e Condições',
        ruc: 'RUC:', telf: 'Tel:', cel: 'Celular:', whatsapp: 'WhatsApp:',
        na: 'N/D', actividadNoEspecificada: 'Atividade não especificada'
    }
};

// Fallback si una cotización no tiene ninguna agencia asociada y tampoco existe una fila
// marcada como principal (caso límite de integridad de datos) — evita que la generación
// del PDF se rompa por completo.
const EMPRESA_FALLBACK = {
    nombre: 'OUTOORS AGENCIA DE VIAJES', ruc: '20609305755',
    direccion: 'Jose Carlos Mariategui F-2, Cusco, Perú',
    telefono: '(084)', telefono2: '(+51) 970-824-536', whatsapp: '(+51) 935-095-895',
    logo: null, terminos_es: null, terminos_en: null, terminos_pt: null
};

// ===== UTILIDADES =====
const fmt = (v) => {
    const n = Number(v) || 0;
    return CURRENCY_SYMBOL + n.toFixed(2);
};

function safeJsonStringify(obj) {
    return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function safeJsonParse(str) {
    try {
        return JSON.parse(decodeURIComponent(atob(str)));
    } catch (e) {
        console.error('Error al decodificar JSON:', e);
        return {};
    }
}

// notasLegacyToHtml() e initRichTextEditor() ahora viven en shared/rte.js (compartidas con
// el editor de Términos y Condiciones de Agencias en usuarios.php).

// ===== CARGA DE DATOS =====
async function cargarDatosIniciales() {
    try {
        const [toursRes, hotelesRes, paquetesRes, destinosRes, categoriasRes, categoriasHotelesRes, paisesRes] = await Promise.all([
            fetch(`${API_URL}?path=tours`).then(r => r.json()),
            fetch(`${API_URL}?path=hoteles`).then(r => r.json()),
            fetch(`${API_URL}?path=paquetes-tours`).then(r => r.json()),
            fetch(`${API_URL}?path=destinos`).then(r => r.json()),
            fetch(`${API_URL}?path=categorias`).then(r => r.json()),
            fetch(`${API_URL}?path=categorias-hoteles`).then(r => r.json()),
            fetch(`${API_URL}?path=paises`).then(r => r.json())
        ]);
        toursData = toursRes;
        hotelsData = hotelesRes;
        paquetesData = paquetesRes;
        destinosData = destinosRes;
        categoriasData = categoriasRes;
        categoriasHotelesData = categoriasHotelesRes;
        paisesData = paisesRes;
        cotizaciones = {};
        renderTours();
        renderHotels();
        renderDestinos();
        renderTourNewDestinoCategoria();
        renderHotelNewDestinoCategoria();
        renderPaquetesList();
        renderAplicarPaqueteSelect();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        notifyError('Error al conectar con el servidor. Revisa tu conexión.');
    }
}

// ===== SELECTOR EN CASCADA: Destino → Categoría → Ítem =====
// crearHelpersClasificacion / buildClasificacionSelector ahora viven en
// shared/cascade-select.js (compartido con el Generador de Itinerarios).
const toursHelpers = crearHelpersClasificacion(() => toursData, () => categoriasData, 'tour');
const hotelesHelpers = crearHelpersClasificacion(() => hotelsData, () => categoriasHotelesData, 'aloj');

function buildTourSelector(initialTourName, onResolved) {
    return buildClasificacionSelector(toursHelpers, 'Actividad...', initialTourName, onResolved);
}
function buildHotelSelector(initialHotelName, onResolved) {
    return buildClasificacionSelector(hotelesHelpers, 'Alojamiento...', initialHotelName, onResolved);
}

// Cambia de subpestaña dentro de Gestión de Datos (Destinos y Categorías / Paquetes /
// Tours / Hoteles) — misma lógica que el click en un .subnav-tab, reutilizada por los
// avisos de "falta X" y por los enlaces cruzados Destino/Categoría de las tablas.
// Acotado a #gestion-section (no ".subnav-tab"/"​.subtab-content" a secas): Itinerario
// embebido tiene su propio grupo de subpestañas con las mismas clases CSS
// (#itinerario-gestion-subtabs, manejado enteramente por itinerario.js) — sin acotar acá,
// un clic ahí también dispararía esta función y reventaría con "gestion-modulos" inexistente.
function irASubtabGestion(subtab) {
    const contenedor = document.getElementById('gestion-section');
    contenedor.querySelectorAll('.subnav-tab').forEach(t => t.classList.toggle('active', t.dataset.subtab === subtab));
    contenedor.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`gestion-${subtab}`).classList.remove('hidden');
}

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
        <td class="p-3 font-medium">${t.tour}</td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full tour-row-destino"></select></td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full tour-row-categoria" disabled></select></td>
        <td class="p-3">${t.distr || ''}</td>
        <td class="p-3">${fmt(t.preg)}</td>
        <td class="p-3">${fmt(t.ppromo)}</td>
        <td class="p-3">${fmt(t.pconf)}</td>
        <td class="p-3">${fmt(t.pctotal)}</td>
        <td class="p-3 text-slate-500">${t.creado_por_nombre || '—'}</td>
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
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.tour}"></td>
        <td class="p-2 destino-categoria-cell" colspan="2"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.distr || ''}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.ppromo}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.pconf || 0}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.pctotal || 0}"></td>
        <td class="p-2 text-slate-500">${t.creado_por_nombre || '—'}</td>
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
    if (!await confirmAction(`¿Eliminar "${t.tour}" del catálogo de tours?`)) return;
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

// Cuántas categorías (de Tours y de Hoteles) tiene ya este destino — ayuda a ver de un
// vistazo dónde falta clasificar, sin tener que entrar a revisar uno por uno.
function resumenCategoriasDestino(destinoId) {
    const nTours = categoriasData.filter(c => c.destino_id === destinoId).length;
    const nHoteles = categoriasHotelesData.filter(c => c.destino_id === destinoId).length;
    if (nTours === 0 && nHoteles === 0) return 'Sin categorías';
    const partes = [];
    if (nTours > 0) partes.push(`${nTours} tour${nTours === 1 ? '' : 's'}`);
    if (nHoteles > 0) partes.push(`${nHoteles} hotel${nHoteles === 1 ? '' : 'es'}`);
    return partes.join(' · ');
}

function buildDestinoRow(d) {
    const div = document.createElement('div');
    div.className = `destino-item flex items-center justify-between gap-2 px-2 py-2 rounded-lg cursor-pointer ${d.id === destinoSeleccionadoId ? 'active' : ''}`;
    div.title = 'Ver categorías de este destino';
    div.innerHTML = `
        <div class="min-w-0">
            <div class="flex items-center gap-1.5">
                <i class="fas fa-chevron-right text-xs text-slate-300"></i>
                <span class="destino-nombre font-medium truncate">${d.nombre}</span>
            </div>
            <div class="text-xs text-slate-400 pl-4">${resumenCategoriasDestino(d.id)} · ${d.creado_por_nombre || '—'}</div>
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
        <input class="input flex-1 min-w-0 rounded px-2 py-1 border text-sm" type="text" value="${d.nombre}">
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
    if (!await confirmAction(mensaje)) return;
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

// Categorías de Tours y de Hoteles son catálogos separados (evita mezclar "City Tour" con
// "Hotel Boutique"), pero comparten Destino y la misma UI de gestión — un interruptor cambia
// cuál de los dos catálogos se está viendo/editando para el destino seleccionado.
const CATEGORIA_TIPOS = {
    tours: {
        label: 'Tours',
        getDataset: () => categoriasData,
        apiGuardar: 'guardar-categoria',
        apiEliminar: 'eliminar-categoria'
    },
    hoteles: {
        label: 'Hoteles',
        getDataset: () => categoriasHotelesData,
        apiGuardar: 'guardar-categoria-hotel',
        apiEliminar: 'eliminar-categoria-hotel'
    }
};

function renderCategorias() {
    const listEl = document.getElementById('categorias-table-body');
    const sinDestino = document.getElementById('categorias-sin-destino');
    const tableWrap = document.getElementById('categorias-table-wrap');
    const destino = destinosData.find(d => d.id === destinoSeleccionadoId);
    document.getElementById('categorias-destino-actual').textContent = destino ? `· ${destino.nombre}` : '';
    document.querySelectorAll('.categoria-tipo-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.categoriaTipo === categoriaTipoActivo);
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

function buildCategoriaRow(tipo, c) {
    const div = document.createElement('div');
    div.className = 'categoria-item flex items-center justify-between gap-2 px-2 py-2 rounded-lg';
    div.innerHTML = `
        <span class="min-w-0 truncate">${c.nombre} <span class="text-xs text-slate-400">· ${c.creado_por_nombre || '—'}</span></span>
        <div class="flex items-center gap-1 shrink-0">
            <button class="text-slate-400 hover:text-slate-700 p-1" title="Editar"><i class="fas fa-pen text-xs"></i></button>
            <button class="text-red-400 hover:text-red-600 p-1" title="Eliminar"><i class="fas fa-trash text-xs"></i></button>
        </div>
    `;
    const [editBtn, delBtn] = div.querySelectorAll('button');
    editBtn.addEventListener('click', () => div.replaceWith(buildCategoriaEditRow(tipo, c)));
    delBtn.addEventListener('click', () => eliminarCategoria(tipo, c));
    return div;
}

function buildCategoriaEditRow(tipo, c) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 px-2 py-2 rounded-lg';
    div.innerHTML = `
        <input class="input flex-1 min-w-0 rounded px-2 py-1 border text-sm" type="text" value="${c.nombre}">
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
        const res = await fetch(`${API_URL}?path=${CATEGORIA_TIPOS[tipo].apiGuardar}`, {
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
    const dataset = tipo === 'hoteles' ? hotelsData : toursData;
    const n = dataset.filter(x => x.categoria_id === c.id).length;
    let mensaje = `¿Eliminar la categoría "${c.nombre}"?`;
    if (n) {
        const sustantivo = tipo === 'hoteles' ? `hotel${n === 1 ? '' : 'es'}` : `tour${n === 1 ? '' : 's'}`;
        mensaje += ` Quedarían ${n} ${sustantivo} sin categoría asignada.`;
    }
    if (!await confirmAction(mensaje)) return;
    try {
        const res = await fetch(`${API_URL}?path=${CATEGORIA_TIPOS[tipo].apiEliminar}`, {
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
        fetch(`${API_URL}?path=categorias-hoteles`).then(r => r.json())
    ]);
    destinosData = destinosRes;
    categoriasData = categoriasRes;
    categoriasHotelesData = categoriasHotelesRes;
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
        <td class="p-3 font-medium">${h.aloj}</td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full hotel-row-destino"></select></td>
        <td class="p-3"><select class="input rounded px-2 py-1 border text-xs w-full hotel-row-categoria" disabled></select></td>
        <td class="p-3">${h.distr || ''}</td>
        <td class="p-3">${fmt(h.preg)}</td>
        <td class="p-3">${fmt(h.ppromo)}</td>
        <td class="p-3">${fmt(h.pconf)}</td>
        <td class="p-3">${fmt(h.pctotal)}</td>
        <td class="p-3 text-slate-500">${h.creado_por_nombre || '—'}</td>
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
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${h.aloj}"></td>
        <td class="p-2 destino-categoria-cell" colspan="2"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${h.distr || ''}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.ppromo}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.pconf || 0}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.pctotal || 0}"></td>
        <td class="p-2 text-slate-500">${h.creado_por_nombre || '—'}</td>
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
    if (!await confirmAction(`¿Eliminar "${h.aloj}" del catálogo de hoteles?`)) return;
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
    row.className = 'flex gap-2 items-center paquete-builder-row';

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

function resetPaqueteBuilder() {
    document.getElementById('paquete-nombre').value = '';
    document.getElementById('paquete-builder-rows').innerHTML = '';
    agregarFilaPaquete();
    paqueteEditandoId = null;
    document.getElementById('paquete-cancelar-edicion').classList.add('hidden');
}

async function guardarPaquete() {
    const nombre = document.getElementById('paquete-nombre').value.trim();
    if (!nombre) { notifyError('El nombre del paquete es obligatorio.'); return; }
    const tours = Array.from(document.querySelectorAll('.paquete-builder-row')).map(row => ({
        tour: row.querySelector('.paquete-row-tour').value.trim(),
        cant: row.querySelector('.paquete-row-cant').value
    })).filter(t => t.tour);
    if (tours.length === 0) { notifyError('Agrega al menos un tour al paquete.'); return; }
    try {
        const payload = { nombre, tours };
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

function editarPaquete(paquete) {
    document.getElementById('paquete-nombre').value = paquete.nombre;
    document.getElementById('paquete-builder-rows').innerHTML = '';
    paquete.tours.forEach(t => agregarFilaPaquete(t));
    paqueteEditandoId = paquete.id;
    document.getElementById('paquete-cancelar-edicion').classList.remove('hidden');
}

async function eliminarPaquete(paquete) {
    if (!await confirmAction(`¿Eliminar el paquete "${paquete.nombre}"?`)) return;
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

function renderPaquetesList() {
    const container = document.getElementById('paquetes-list');
    container.innerHTML = '';
    if (paquetesData.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm">Sin paquetes guardados.</p>';
    } else {
        paquetesData.forEach(p => {
            const preview = p.tours.map(t => `${t.tour} x${t.cant}`).join(', ');
            // Un paquete puede quedar referenciando tours que ya se borraron del catálogo
            // (o se les cambió el nombre) — avisarlo acá evita aplicar filas rotas a una cotización.
            const faltantes = p.tours.filter(t => !toursData.some(td => td.tour === t.tour));
            const avisoHtml = faltantes.length
                ? `<div class="text-xs text-amber-600 mt-1"><i class="fas fa-triangle-exclamation mr-1"></i>${faltantes.length} tour${faltantes.length === 1 ? '' : 's'} ya no ${faltantes.length === 1 ? 'existe' : 'existen'} en el catálogo: ${faltantes.map(t => t.tour).join(', ')}</div>`
                : '';
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap';
            div.innerHTML = `
                <div class="min-w-0">
                    <div class="font-medium">${p.nombre}</div>
                    <div class="text-xs text-slate-500 truncate">${preview}</div>
                    ${avisoHtml}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button class="btn btn-primary small paquete-aplicar-btn"><i class="fas fa-check mr-1"></i>Aplicar</button>
                    <button class="text-slate-500 hover:text-slate-700 paquete-editar-btn" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="text-red-500 hover:text-red-700 paquete-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            `;
            div.querySelector('.paquete-aplicar-btn').addEventListener('click', () => aplicarPaquete(p));
            div.querySelector('.paquete-editar-btn').addEventListener('click', () => editarPaquete(p));
            div.querySelector('.paquete-eliminar-btn').addEventListener('click', () => eliminarPaquete(p));
            container.appendChild(div);
        });
    }
    actualizarAvisoDependencia('paquetes-sin-tours-hint', toursData.length === 0, 'tours');
    renderGestionResumen();
}

function renderAplicarPaqueteSelect() {
    const select = document.getElementById('aplicar-paquete-select');
    select.innerHTML = '<option value="">Aplicar paquete...</option>';
    paquetesData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        select.appendChild(opt);
    });
}

// Inserta filas de tour en la tabla, reutilizando primero las filas ya presentes que
// están vacías (sin tour elegido, típicamente la fila 1 en blanco de una cotización
// nueva) en vez de siempre agregar al final dejándolas vacías de por medio. Solo cuando
// se acaban las filas vacías se agregan filas nuevas al final — igual que antes.
function agregarFilasTours(filasDatos, dispatchInput) {
    const toursBody = document.getElementById('tours-body');
    const filasVacias = Array.from(toursBody.querySelectorAll('tr')).filter(tr => !tr.querySelector('.tour-name').value);
    filasDatos.forEach((datos, i) => {
        const tr = createTourRow(datos);
        if (dispatchInput) tr.querySelector('.tour-name').dispatchEvent(new Event('input'));
        if (i < filasVacias.length) {
            filasVacias[i].replaceWith(tr);
        } else {
            toursBody.appendChild(tr);
        }
    });
    calcularResumen();
}

// Igual que agregarFilasTours pero para la tabla de hoteles.
function agregarFilasHoteles(filasDatos, dispatchInput) {
    const hotelsBody = document.getElementById('hotels-body');
    const filasVacias = Array.from(hotelsBody.querySelectorAll('tr')).filter(tr => !tr.querySelector('.hotel-name').value);
    filasDatos.forEach((datos, i) => {
        const tr = createHotelRow(datos);
        if (dispatchInput) tr.querySelector('.hotel-name').dispatchEvent(new Event('input'));
        if (i < filasVacias.length) {
            filasVacias[i].replaceWith(tr);
        } else {
            hotelsBody.appendChild(tr);
        }
    });
    calcularResumen();
}

function aplicarPaquete(paquete) {
    // Sin "cant" explícito, cada fila nace en modo "auto" (igual que una fila agregada a
    // mano) y sigue a N° PAX hasta que el usuario la edite — antes se fijaba con la
    // cantidad guardada en el paquete y quedaba sorda a los cambios de N° PAX.
    const filas = paquete.tours.map(item => ({ tour: item.tour }));
    agregarFilasTours(filas, true);
    irATabCotizador();
}

// ===== Historial de Cotizaciones guardadas (traer TODAS sus actividades a la vista actual) =====
const HIST_PAGE_SIZE = 15;
const histState = { term: '', offset: 0, total: 0 };
let histSearchDebounce = null;

async function abrirHistorialTours() {
    document.getElementById('historial-tours-modal').classList.remove('hidden');
    histState.term = '';
    histState.offset = 0;
    document.getElementById('historial-tours-search').value = '';
    await cargarHistorialTours();
}

async function cargarHistorialTours() {
    const container = document.getElementById('historial-tours-list');
    container.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Cargando...</p>';
    try {
        const params = new URLSearchParams({ q: histState.term, limit: HIST_PAGE_SIZE, offset: histState.offset });
        const res = await fetch(`${API_URL}?path=cotizaciones&${params}`).then(r => r.json());
        renderHistorialTours(res.results || [], res.total || 0);
    } catch (e) {
        container.innerHTML = '<p class="text-red-500 text-sm text-center py-6">Error al cargar el historial.</p>';
        document.getElementById('historial-tours-page-info').textContent = '';
        document.getElementById('historial-tours-prev').disabled = true;
        document.getElementById('historial-tours-next').disabled = true;
    }
}

function cerrarHistorialTours() {
    document.getElementById('historial-tours-modal').classList.add('hidden');
}

function renderHistorialTours(cotizacionesGuardadas, total) {
    const container = document.getElementById('historial-tours-list');
    // Solo interesan las que ya traen actividades, y no la que se está editando ahora mismo.
    const conActividades = cotizacionesGuardadas.filter(c =>
        c.id !== currentCotizacionId && Array.isArray(c.data?.tours) && c.data.tours.filter(t => t.tour).length > 0
    );
    container.innerHTML = '';
    if (!conActividades.length) {
        container.innerHTML = `<p class="text-slate-400 text-sm text-center py-6">${histState.term ? 'Sin resultados.' : 'Todavía no hay cotizaciones guardadas con actividades.'}</p>`;
    } else {
        conActividades.forEach(c => {
            const nombre = c.data.pax?.nombre_pax || 'Sin nombre';
            const tours = c.data.tours.filter(t => t.tour);
            const preview = tours.map(t => t.tour).join(', ');
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3';
            div.innerHTML = `
                <div class="min-w-0">
                    <div class="font-medium truncate">${c.id} — ${nombre}</div>
                    <div class="text-xs text-slate-500 truncate">${tours.length} actividad(es): ${preview}</div>
                </div>
                <button class="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] transition flex-shrink-0">Reusar</button>
            `;
            div.querySelector('button').addEventListener('click', () => reusarHistorialCotizacion(c));
            container.appendChild(div);
        });
    }
    const shown = histState.offset + cotizacionesGuardadas.length;
    document.getElementById('historial-tours-page-info').textContent = total === 0 ? '' : `${histState.offset + 1}-${shown} de ${total}`;
    document.getElementById('historial-tours-prev').disabled = histState.offset === 0;
    document.getElementById('historial-tours-next').disabled = shown >= total;
}

// Trae TODAS las actividades y hoteles de esa cotización guardada a la vista actual,
// tal cual quedaron (misma fecha/cant/precio/distribuidor). Reutiliza primero las filas
// vacías que ya haya en las tablas (ver agregarFilasTours/agregarFilasHoteles) y recién
// luego agrega al final.
function reusarHistorialCotizacion(c) {
    // Sin "cant" explícito, cada fila nace en modo "auto" (igual que una fila agregada a
    // mano o un paquete aplicado) y sigue a N° PAX hasta que el usuario la edite — antes
    // se fijaba con la cantidad de la cotización histórica y quedaba sorda a N° PAX.
    const filasTours = c.data.tours.filter(t => t.tour).map(t => ({
        tour: t.tour,
        fecha: t.fecha || '',
        distr: t.distr,
        preg: t.preg,
        ppromo: t.ppromo,
        pconf: t.pconf,
        pctotal: t.pctotal
    }));
    agregarFilasTours(filasTours, false);

    const filasHoteles = (c.data.hotels || []).filter(h => h.aloj).map(h => ({
        aloj: h.aloj,
        cin: h.cin || '',
        cout: h.cout || '',
        nhab: h.nhab,
        noches: h.noches,
        preg: h.preg,
        ppromo: h.ppromo,
        pconf: h.pconf,
        pctotal: h.pctotal
    }));
    agregarFilasHoteles(filasHoteles, false);

    cerrarHistorialTours();
}

// Sugiere la fecha de una nueva fila de actividad: el día siguiente a la fecha más
// tardía ya puesta en alguna fila existente (típico armado de itinerario día por día).
// Si ninguna fila tiene fecha todavía, no sugiere nada (queda vacía, como antes).
function sugerirSiguienteFechaTour() {
    const fechas = Array.from(document.querySelectorAll('#tours-body tr td:nth-child(2) input'))
        .map(input => input.value)
        .filter(Boolean);
    if (fechas.length === 0) {
        // Primer día de Actividades: parte de la Fecha de Llegada de Datos Pax.
        return document.querySelector('input[name="f_llegada"]').value || '';
    }
    const ultima = fechas.reduce((max, f) => f > max ? f : max);
    const siguiente = new Date(ultima + 'T00:00:00');
    siguiente.setDate(siguiente.getDate() + 1);
    return siguiente.toISOString().split('T')[0];
}

// Igual que sugerirSiguienteFechaTour() pero para Hoteles: el primer check-in parte de
// la Fecha de Llegada de Datos Pax; los siguientes toman el check-out de la fila
// inmediatamente anterior (el usuario define ese check-out libremente: día siguiente o
// varios días después), y así seguidamente. Si la fila anterior todavía no tiene
// check-out cargado, no hay de dónde correlacionar y se deja vacío para completar a mano.
function sugerirSiguienteCheckinHotel() {
    const filas = document.querySelectorAll('#hotels-body tr');
    if (filas.length === 0) {
        return document.querySelector('input[name="f_llegada"]').value || '';
    }
    const anterior = filas[filas.length - 1];
    return anterior.querySelector('td:nth-child(3) input').value || '';
}

// Las filas que ya existían ANTES de completar la Fecha de Llegada (ej. la fila inicial
// en blanco de una cotización nueva) no la "escuchan" retroactivamente — solo las filas
// agregadas después vía sugerirSiguienteFechaTour()/sugerirSiguienteCheckinHotel(). Este
// listener resincroniza las filas que sigan vacías apenas cambia Fecha de Llegada, sin
// tocar ninguna fecha que el usuario ya haya cargado a mano.
function resincronizarFechasConLlegada() {
    const fLlegada = document.querySelector('input[name="f_llegada"]').value;
    if (!fLlegada) return;

    let ultimaFechaTour = null;
    document.querySelectorAll('#tours-body tr').forEach(tr => {
        const input = tr.querySelector('td:nth-child(2) input');
        if (input.value) {
            ultimaFechaTour = input.value;
            return;
        }
        if (ultimaFechaTour) {
            const siguiente = new Date(ultimaFechaTour + 'T00:00:00');
            siguiente.setDate(siguiente.getDate() + 1);
            input.value = siguiente.toISOString().split('T')[0];
        } else {
            input.value = fLlegada;
        }
        ultimaFechaTour = input.value;
    });

    let esPrimeraFilaHotel = true;
    let ultimoCheckout = null;
    document.querySelectorAll('#hotels-body tr').forEach(tr => {
        const cin = tr.querySelector('td:nth-child(2) input');
        const cout = tr.querySelector('td:nth-child(3) input');
        if (!cin.value) {
            cin.value = esPrimeraFilaHotel ? fLlegada : (ultimoCheckout || '');
        }
        esPrimeraFilaHotel = false;
        ultimoCheckout = cout.value;
    });
}

// ===== FILAS =====
function createTourRow(data = {}) {
    const tr = document.createElement('tr');
    tr.className = 'draggable';
    tr.draggable = true;

    // Si la fila no trae cantidad explícita (fila nueva), se autocompleta con
    // N° PAX y queda "auto": seguirá sincronizándose si N° PAX cambia, hasta
    // que el usuario la edite a mano.
    const isAutoCant = data.cant === undefined;
    const nPax = parseFloat(document.querySelector('input[name="n_pax"]')?.value) || 0;
    const initialCant = isAutoCant ? nPax : (Number(data.cant) || 0);
    tr.dataset.autoCant = isAutoCant ? 'true' : 'false';

    const initialPpromo = Number(data.ppromo) || 0;
    const initialTotal = initialCant * initialPpromo;

    tr.innerHTML = `
        <td class="pl-2"><div class="handle">≡</div></td>
        <td><input class="input w-full rounded px-2 py-1 border" type="date" value="${data.fecha || ''}"></td>
        <td class="tour-selector-cell"></td>
        <td><input class="input w-full max-w-20 rounded px-2 py-1 border text-right cant" type="number" min="0" value="${initialCant}"></td>
        <td><input class="input w-full rounded px-2 py-1 border distr" type="text" value="${data.distr || ''}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pconf" type="number" step="0.01" value="${data.pconf || 0}"></td>
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pctotal" type="number" step="0.01" value="${data.pctotal || 0}"></td>
        <td class="text-right total-line">${fmt(initialTotal)}</td>
        <td class="pr-2 text-right"><button class="text-red-500 small"><i class="fas fa-trash"></i></button></td>
    `;
    tr.querySelector('button').onclick = () => { tr.remove(); calcularResumen(); };
    tr.querySelector('input.cant').addEventListener('input', () => {
        tr.dataset.autoCant = 'false';
        const cant = parseFloat(tr.querySelector('.cant').value) || 0;
        const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
        tr.querySelector('.total-line').textContent = fmt(cant * ppromo);
        calcularResumen();
    });

    const tourInput = document.createElement('input');
    tourInput.type = 'hidden';
    tourInput.className = 'tour-name';
    tourInput.value = data.tour || '';

    tourInput.addEventListener('input', function() {
        const tour = toursData.find(t => t.tour === this.value);
        if (tour) {
            tr.querySelector('.preg').value = tour.preg;
            tr.querySelector('.ppromo').value = tour.ppromo;
            tr.querySelector('.distr').value = tour.distr;
            tr.querySelector('.pconf').value = tour.pconf || 0;
            tr.querySelector('.pctotal').value = tour.pctotal || 0;
            const cant = parseFloat(tr.querySelector('.cant').value) || 0;
            tr.querySelector('.total-line').textContent = fmt(cant * tour.ppromo);
            calcularResumen();
        }
    });

    const selector = buildTourSelector(data.tour || '', (tourName) => {
        tourInput.value = tourName;
        tourInput.dispatchEvent(new Event('input'));
    });
    const cell = tr.querySelector('.tour-selector-cell');
    cell.appendChild(selector);
    cell.appendChild(tourInput);

    addDragHandlers(tr);
    return tr;
}

// Propaga N° PAX a la Cant. de cada fila de tour que siga en modo "auto"
// (no editada a mano). Las filas editadas manualmente ya no se tocan.
function sincronizarCantidadTours() {
    const nPax = parseFloat(document.querySelector('input[name="n_pax"]').value) || 0;
    document.querySelectorAll('#tours-body tr').forEach(tr => {
        if (tr.dataset.autoCant === 'false') return;
        const cantInput = tr.querySelector('.cant');
        const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
        cantInput.value = nPax;
        tr.querySelector('.total-line').textContent = fmt(nPax * ppromo);
    });
    calcularResumen();
}

// Los campos de fecha/hora de Datos Pax no tienen label ni placeholder nativo (los
// navegadores ignoran el atributo placeholder en type="date"/"time") — en su lugar
// muestran un overlay de texto (ver .field-placeholder-overlay en cotizador.css) que se
// oculta con esta clase apenas el campo tiene un valor. Como se asigna con .value = ...
// al cargar una cotización guardada (no dispara 'input'), hay que refrescarlo a mano
// cada vez que el formulario se llena por código en vez de por tipeo del usuario.
function actualizarEstadoCampoFecha(input) {
    input.closest('.field-overlay')?.classList.toggle('has-value', input.value !== '');
}
function actualizarEstadosCamposFecha() {
    document.querySelectorAll('.field-overlay input').forEach(actualizarEstadoCampoFecha);
}

function createHotelRow(data = {}) {
    const tr = document.createElement('tr');
    tr.className = 'draggable';
    tr.draggable = true;

    const initialNhab = Number(data.nhab) || 0;
    const initialNoches = Number(data.noches) || 1;
    const initialPpromo = Number(data.ppromo) || 0;
    const initialTotal = initialNhab * initialNoches * initialPpromo;

    tr.innerHTML = `
        <td class="pl-2"><div class="handle">≡</div></td>
        <td><input class="input w-full rounded px-2 py-1 border" type="date" value="${data.cin || ''}"></td>
        <td><input class="input w-full rounded px-2 py-1 border" type="date" value="${data.cout || ''}"></td>
        <td class="hotel-selector-cell"></td>
        <td><input class="input w-full max-w-20 rounded px-2 py-1 border text-right nhab" type="number" min="0" value="${initialNhab}"></td>
        <td><input class="input w-full max-w-20 rounded px-2 py-1 border text-right noches" type="number" min="1" value="${initialNoches}"></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pconf" type="number" step="0.01" value="${data.pconf || 0}"></td>
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pctotal" type="number" step="0.01" value="${data.pctotal || 0}"></td>
        <td class="text-right total-line">${fmt(initialTotal)}</td>
        <td class="pr-2 text-right"><button class="text-red-500 small"><i class="fas fa-trash"></i></button></td>
    `;
    tr.querySelector('button').onclick = () => { tr.remove(); calcularResumen(); };
    tr.querySelectorAll('input.nhab, input.noches').forEach(input => {
        input.addEventListener('input', () => {
            const nhab = parseFloat(tr.querySelector('.nhab').value) || 0;
            const noches = parseFloat(tr.querySelector('.noches').value) || 0;
            const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
            tr.querySelector('.total-line').textContent = fmt(nhab * noches * ppromo);
            calcularResumen();
        });
    });

    const hotelInput = document.createElement('input');
    hotelInput.type = 'hidden';
    hotelInput.className = 'hotel-name';
    hotelInput.value = data.aloj || '';

    hotelInput.addEventListener('input', function() {
        const hotel = hotelsData.find(h => h.aloj === this.value);
        if (hotel) {
            tr.querySelector('.preg').value = hotel.preg;
            tr.querySelector('.ppromo').value = hotel.ppromo;
            tr.querySelector('.pconf').value = hotel.pconf || 0;
            tr.querySelector('.pctotal').value = hotel.pctotal || 0;
            const nhab = parseFloat(tr.querySelector('.nhab').value) || 0;
            const noches = parseFloat(tr.querySelector('.noches').value) || 0;
            tr.querySelector('.total-line').textContent = fmt(nhab * noches * hotel.ppromo);
            calcularResumen();
        }
    });

    const hotelSelector = buildHotelSelector(data.aloj || '', (alojNombre) => {
        hotelInput.value = alojNombre;
        hotelInput.dispatchEvent(new Event('input'));
    });
    const hotelCell = tr.querySelector('.hotel-selector-cell');
    hotelCell.appendChild(hotelSelector);
    hotelCell.appendChild(hotelInput);

    const checkin = tr.querySelector('td:nth-child(2) input');
    const checkout = tr.querySelector('td:nth-child(3) input');
    const nochesInput = tr.querySelector('.noches');
    const updateNights = () => {
        if (checkin.value && checkout.value) {
            const diff = Math.ceil((new Date(checkout.value) - new Date(checkin.value)) / (1000 * 60 * 60 * 24));
            nochesInput.value = Math.max(0, diff);
            const event = new Event('input', { bubbles: true });
            nochesInput.dispatchEvent(event);
        }
    };
    checkin.addEventListener('change', updateNights);
    checkout.addEventListener('change', updateNights);
    addDragHandlers(tr);
    return tr;
}

// ===== DRAG & DROP =====
function addDragHandlers(row) {
    row.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', '');
        row.classList.add('opacity-60');
        window._dragging = row;
    });
    row.addEventListener('dragend', () => {
        row.classList.remove('opacity-60');
        delete window._dragging;
    });
}

function setupDragDrop() {
    ['tours-body', 'hotels-body'].forEach(id => {
        const container = document.getElementById(id);
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const after = getDragAfterElement(container, e.clientY);
            if (window._dragging) {
                if (after) {
                    container.insertBefore(window._dragging, after);
                } else {
                    container.appendChild(window._dragging);
                }
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('tr.draggable:not(.opacity-60)')];
    return els.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ===== CÁLCULOS =====
function validarFechas() {
    const fLlegada = document.querySelector('input[name="f_llegada"]').value;
    const fSalida = document.querySelector('input[name="f_salida"]').value;
    if (fLlegada && fSalida && fSalida < fLlegada) {
        notifyWarning("La fecha de salida no puede ser anterior a la de llegada.");
        return false;
    }
    return true;
}

function calcularResumen() {
    let pvReg = 0, pvPromo = 0;
    document.querySelectorAll('#tours-body tr').forEach(tr => {
        const cant = parseFloat(tr.querySelector('.cant').value) || 0;
        const preg = parseFloat(tr.querySelector('.preg').value) || 0;
        const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
        pvReg += preg * cant;
        pvPromo += ppromo * cant;
    });
    document.querySelectorAll('#hotels-body tr').forEach(tr => {
        const nhab = parseFloat(tr.querySelector('.nhab').value) || 0;
        const noches = parseFloat(tr.querySelector('.noches').value) || 0;
        const preg = parseFloat(tr.querySelector('.preg').value) || 0;
        const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
        pvReg += preg * nhab * noches;
        pvPromo += ppromo * nhab * noches;
    });
    const precioAd = parseFloat(document.getElementById('precio-adicional').value) || 0;
    const dsctoEsp = parseFloat(document.getElementById('descuento-especial').value) || 0;
    const totalDesc = pvReg - pvPromo;
    const pvFinal = pvPromo + precioAd - dsctoEsp;
    document.getElementById('pv-regular').textContent = fmt(pvReg);
    document.getElementById('pv-promo').textContent = fmt(pvPromo);
    document.getElementById('total-desc').textContent = fmt(totalDesc);
    document.getElementById('pv-final').textContent = fmt(pvFinal);
}

// ===== COTIZACIONES =====
async function guardarCotizacion() {
    if (!validarFechas()) return;
    let id = currentCotizacionId || 'COT-' + Date.now();
    const form = document.getElementById('form-pax');
    const tours = Array.from(document.getElementById('tours-body').querySelectorAll('tr')).map(tr => ({
        fecha: tr.querySelector('td:nth-child(2) input').value,
        tour: tr.querySelector('.tour-name').value,
        cant: tr.querySelector('.cant').value,
        distr: tr.querySelector('.distr').value,
        preg: tr.querySelector('.preg').value,
        ppromo: tr.querySelector('.ppromo').value,
        pconf: tr.querySelector('.pconf').value,
        pctotal: tr.querySelector('.pctotal').value
    }));
    const hotels = Array.from(document.getElementById('hotels-body').querySelectorAll('tr')).map(tr => ({
        cin: tr.querySelector('td:nth-child(2) input').value,
        cout: tr.querySelector('td:nth-child(3) input').value,
        aloj: tr.querySelector('.hotel-name').value,
        nhab: tr.querySelector('.nhab').value,
        noches: tr.querySelector('.noches').value,
        preg: tr.querySelector('.preg').value,
        ppromo: tr.querySelector('.ppromo').value,
        pconf: tr.querySelector('.pconf').value,
        pctotal: tr.querySelector('.pctotal').value
    }));
    const data = {
        id,
        fechaGuardado: new Date().toISOString(),
        pax: Object.fromEntries(new FormData(form)),
        tours,
        hotels,
        precios: {
            precioAdicional: document.getElementById('precio-adicional').value,
            descuentoEspecial: document.getElementById('descuento-especial').value,
        },
        notas: document.getElementById('notas_cotizacion').innerHTML,
        porcentaje_reserva: document.getElementById('porcentaje_reserva').value,
        itinerarioArmado: {
            pasajero: document.getElementById('itinerary-passenger').value,
            titulo: document.getElementById('itinerary-title').value,
            modulos: Array.from(document.querySelectorAll('#itinerary-builder-body .module-filename')).map(el => el.value).filter(Boolean)
        }
    };
    try {
        const response = await fetch(`${API_URL}?path=guardar-cotizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            cotizaciones[id] = data;
            currentCotizacionId = id;
            document.getElementById('current-cot-id-display').textContent = id;
            const generarPdf = await notifySuccessAction(`Cotización guardada con ID: ${id}`, 'Generar PDF');
            if (generarPdf) mostrarVistaPreviaPdf(id);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        notifyError("Error al guardar: " + error.message);
    }
}

async function cargarCotizacion(id) {
    try {
        const response = await fetch(`${API_URL}?path=cotizacion&id=${id}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        nuevaCotizacion(false);
        const form = document.getElementById('form-pax');
        Object.keys(data.pax).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = data.pax[key];
        });
        // El select de dpto necesita sus <option> del país guardado antes de que el
        // .value de arriba (que ya intentó fijarlo sin opciones cargadas) pueda "pegar".
        const paisGuardado = paisesData.find(p => p.nombre === data.pax.pais);
        await llenarDepartamentosSelect(paisGuardado?.id || null, data.pax.dpto || '');
        actualizarEstadosCamposFecha();
        const toursBody = document.getElementById('tours-body');
        toursBody.innerHTML = '';
        data.tours.forEach(t => toursBody.appendChild(createTourRow(t)));
        const hotelsBody = document.getElementById('hotels-body');
        hotelsBody.innerHTML = '';
        data.hotels.forEach(h => hotelsBody.appendChild(createHotelRow(h)));
        document.getElementById('precio-adicional').value = data.precios.precioAdicional || 0;
        document.getElementById('descuento-especial').value = data.precios.descuentoEspecial || 0;
        data.notas = notasLegacyToHtml(data.notas);
        document.getElementById('notas_cotizacion').innerHTML = data.notas;
        document.getElementById('porcentaje_reserva').value = data.porcentaje_reserva || 30;
        restaurarItinerarioArmado(data.itinerarioArmado);
        calcularResumen();
        cotizaciones[id] = data;
        currentCotizacionId = id;
        document.getElementById('current-cot-id-display').textContent = id;
    } catch (error) {
        notifyError("Error al cargar cotización: " + error.message);
    }
}

function nuevaCotizacion(showAlert = true) {
    document.getElementById('form-pax').reset();
    document.getElementById('tours-body').innerHTML = '';
    document.getElementById('hotels-body').innerHTML = '';
    document.getElementById('precio-adicional').value = 0;
    document.getElementById('descuento-especial').value = 0;
    document.getElementById('notas_cotizacion').innerHTML = '';
    document.getElementById('porcentaje_reserva').value = 30;
    currentCotizacionId = null;
    document.getElementById('current-cot-id-display').textContent = 'Nueva';
    document.querySelector('input[name="fecha_cot"]').value = new Date().toISOString().split('T')[0];
    actualizarEstadosCamposFecha();
    document.getElementById('tours-body').appendChild(createTourRow());
    document.getElementById('hotels-body').appendChild(createHotelRow());
    llenarDepartamentosSelect(null, null);
    limpiarItinerarioArmado();
    calcularResumen();
    if(showAlert) notifySuccess('Formulario limpiado para una nueva cotización.');
}

// ===== Itinerario (armador embebido — ver itinerario/itinerario.js) =====
// El día-por-día que arma el usuario en "4. Itinerario" se guarda como parte de la
// cotización (nombres de archivo de módulo, en orden), y se reconstruye con la misma
// addItineraryBuilderRow() que ya usa el armador standalone — no hay lógica propia acá.
function limpiarItinerarioArmado() {
    document.getElementById('itinerary-passenger').value = '';
    document.getElementById('itinerary-title').value = '';
    document.getElementById('itinerary-builder-body').innerHTML = '';
    addItineraryBuilderRow('itinerary-builder-body', true);
}

function restaurarItinerarioArmado(armado) {
    document.getElementById('itinerary-passenger').value = armado?.pasajero || document.querySelector('input[name="nombre_pax"]').value || '';
    document.getElementById('itinerary-title').value = armado?.titulo || '';
    const body = document.getElementById('itinerary-builder-body');
    body.innerHTML = '';
    const modulos = armado?.modulos || [];
    if (modulos.length === 0) {
        addItineraryBuilderRow('itinerary-builder-body', true);
    } else {
        modulos.forEach(filename => addItineraryBuilderRow('itinerary-builder-body', true, filename));
    }
}

// ===== COTIZACIONES GUARDADAS (pestaña con tabla, búsqueda y paginación) =====
const COT_PAGE_SIZE = 15;
const cotState = { term: '', offset: 0, total: 0 };
let cotSearchDebounce = null;

async function cargarCotizacionesGuardadas() {
    const tbody = document.getElementById('cot-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-400">Cargando...</td></tr>';
    try {
        const params = new URLSearchParams({
            q: cotState.term,
            limit: COT_PAGE_SIZE,
            offset: cotState.offset
        });
        const res = await fetch(`${API_URL}?path=cotizaciones&${params}`);
        const { results, total } = await res.json();
        cotState.total = total;
        tbody.innerHTML = '';
        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-3 text-center text-slate-400">${cotState.term ? 'Sin resultados.' : 'Sin cotizaciones guardadas.'}</td></tr>`;
        } else {
            results.forEach(cot => tbody.appendChild(buildCotRow(cot)));
        }
        const shown = cotState.offset + results.length;
        document.getElementById('cot-page-info').textContent = total === 0 ? '' : `${cotState.offset + 1}-${shown} de ${total}`;
        document.getElementById('cot-prev').disabled = cotState.offset === 0;
        document.getElementById('cot-next').disabled = shown >= total;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-red-500">Error al cargar.</td></tr>';
    }
}

function buildCotRow(cot) {
    const pax = cot.data.pax || {};
    const tr = document.createElement('tr');
    tr.className = 'border-t hover:bg-slate-50';
    tr.innerHTML = `
        <td class="p-3 font-medium">${cot.id}</td>
        <td class="p-3">${pax.nombre_pax || '-'}</td>
        <td class="p-3">${pax.contacto || '-'}</td>
        <td class="p-3">${pax.fecha_cot || '-'}</td>
        <td class="p-3">${pax.n_pax || '-'}</td>
        <td class="p-3 text-right whitespace-nowrap"></td>
    `;
    const actionsCell = tr.querySelector('td:last-child');

    const abrirBtn = document.createElement('button');
    abrirBtn.className = 'text-slate-500 hover:text-slate-700 mr-2';
    abrirBtn.title = 'Abrir';
    abrirBtn.innerHTML = '<i class="fas fa-folder-open"></i>';
    abrirBtn.addEventListener('click', () => abrirCotizacionGuardada(cot.id));

    const dupBtn = document.createElement('button');
    dupBtn.className = 'text-slate-500 hover:text-slate-700 mr-2';
    dupBtn.title = 'Duplicar';
    dupBtn.innerHTML = '<i class="fas fa-copy"></i>';
    dupBtn.addEventListener('click', () => duplicarCotizacionGuardada(cot.id));

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'text-slate-500 hover:text-slate-700 mr-2';
    pdfBtn.title = 'Ver / Descargar PDF';
    pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i>';
    pdfBtn.addEventListener('click', () => verPdfCotizacionGuardada(cot.id, pdfBtn));

    const delBtn = document.createElement('button');
    delBtn.className = 'text-red-500 hover:text-red-700';
    delBtn.title = 'Eliminar';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', () => eliminarCotizacionGuardada(cot.id, pax.nombre_pax));

    actionsCell.append(abrirBtn, dupBtn, pdfBtn, delBtn);
    return tr;
}

function irATabCotizador() {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelector('.nav-tab[data-tab="cotizador"]').classList.add('active');
    document.getElementById('cotizador-section').classList.remove('hidden');
}

async function abrirCotizacionGuardada(id) {
    await cargarCotizacion(id);
    irATabCotizador();
}

async function duplicarCotizacionGuardada(id) {
    try {
        const res = await fetch(`${API_URL}?path=cotizacion&id=${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const newId = 'COT-' + Date.now();
        const copia = { ...data, id: newId, fechaGuardado: new Date().toISOString() };
        const saveRes = await fetch(`${API_URL}?path=guardar-cotizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(copia)
        });
        const result = await saveRes.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(`Cotización duplicada con ID: ${newId}`);
        await cargarCotizacion(newId);
        irATabCotizador();
    } catch (e) {
        notifyError('Error al duplicar: ' + e.message);
    }
}

async function verPdfCotizacionGuardada(id, btn) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    try {
        await cargarCotizacion(id);
        await mostrarVistaPreviaPdf(id);
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

async function eliminarCotizacionGuardada(id, nombre) {
    if (!await confirmAction(`¿Eliminar la cotización ${id}${nombre ? ' (' + nombre + ')' : ''}? Esta acción no se puede deshacer.`)) return;
    try {
        const res = await fetch(`${API_URL}?path=eliminar-cotizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        if (currentCotizacionId === id) currentCotizacionId = null;
        delete cotizaciones[id];
        notifySuccess('Cotización eliminada.');
        cargarCotizacionesGuardadas();
    } catch (e) {
        notifyError('Error al eliminar: ' + e.message);
    }
}

// Rasteriza un HTML de una página (.pdf-page) a un PDF de una sola página en memoria.
// Compartido por la página principal de la cotización y la página de Términos y
// Condiciones, que se construyen igual pero con plantillas distintas.
async function renderHtmlPageBytes(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    // Sin esto, html2canvas puede capturar antes de que termine de bajar la fuente Bega
    // (@font-face en pdf-styles.css, ver Términos y Condiciones) y usar la de respaldo.
    await document.fonts.ready;
    const canvas = await html2canvas(container.querySelector('.pdf-page'), { scale: 1.5, useCORS: true });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    const { jsPDF } = window.jspdf;
    const pagePdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pagePdf.internal.pageSize.getWidth();
    const pageHeight = pagePdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    pagePdf.addImage(imgData, 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
    return pagePdf.output('arraybuffer');
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Arma los bytes del PDF a partir de una cotización ya guardada (pax/tours/hotels/precios).
// `agencia` son los datos de empresa ya resueltos (agencia del creador o la principal, ver
// mostrarVistaPreviaPdf) e `idioma` es 'es'|'en'|'pt', elegido en el modal de vista previa.
// No descarga nada ni toca el DOM del formulario: es puro "datos adentro, PDF afuera".
async function construirPdfBytes(cotizacionActual, agencia, idioma = 'es') {
    agencia = agencia || EMPRESA_FALLBACK;
    const labels = PDF_LABELS[idioma] || PDF_LABELS.es;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    {
        const [
            templateHtml,
            terminosTemplateHtml,
            templateCss,
            staticLogoBlob
        ] = await Promise.all([
            // Cache-busting con Date.now(): son pocos archivos chicos, solo se piden al
            // generar un PDF (no en cada carga de página), así que no vale la pena
            // arriesgarse a que el navegador sirva una versión vieja cacheada.
            fetch(`../shared/pdf-template.html?v=${Date.now()}`).then(res => res.text()),
            fetch(`../shared/pdf-terminos-template.html?v=${Date.now()}`).then(res => res.text()),
            fetch(`../shared/pdf-styles.css?v=${Date.now()}`).then(res => res.text()),
            fetch('../shared/logo.png').then(res => res.blob())
        ]);

        let logoBase64 = await blobToBase64(staticLogoBlob);
        if (agencia.logo) {
            try {
                const agenciaLogoBlob = await fetch(`../shared/uploads/agencias/${agencia.logo}`).then(res => {
                    if (!res.ok) throw new Error('Logo de agencia no encontrado');
                    return res.blob();
                });
                logoBase64 = await blobToBase64(agenciaLogoBlob);
            } catch (e) {
                console.warn('No se pudo cargar el logo de la agencia, se usa el logo por defecto.', e);
            }
        }

        const fmtCurrency = (v, currency = CURRENCY_SYMBOL) => {
            const n = Number(v) || 0;
            return currency + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        };

        let pvReg = 0, pvPromo = 0;
        cotizacionActual.tours.forEach(t => {
            pvPromo += (Number(t.ppromo) || 0) * (Number(t.cant) || 0);
            pvReg += (Number(t.preg) || 0) * (Number(t.cant) || 0);
        });
        cotizacionActual.hotels.forEach(h => {
            pvPromo += (Number(h.ppromo) || 0) * (Number(h.nhab) || 0) * (Number(h.noches) || 0);
            pvReg += (Number(h.preg) || 0) * (Number(h.nhab) || 0) * (Number(h.noches) || 0);
        });

        const precioAd = Number(cotizacionActual.precios.precioAdicional) || 0;
        const dsctoEsp = Number(cotizacionActual.precios.descuentoEspecial) || 0;
        const pvFinal = pvPromo + precioAd - dsctoEsp;
        const totalDesc = pvReg - pvPromo;
        const porcentajeReserva = Number(cotizacionActual.porcentaje_reserva) || 30;
        const montoReserva = (pvFinal * porcentajeReserva) / 100;

        // 1. Generar filas de Tours, con alineación de Cant. a la izquierda
        const tourRowsHtml = cotizacionActual.tours.map(t => `
            <tr>
               <td class="left">${formatDate(t.fecha)}</td>
                <td class="left" colspan="2">${t.tour || labels.actividadNoEspecificada}</td>
                <td></td>
                <td class="left compact-cell">${t.cant || 1}</td> <td class="center compact-cell">${fmtCurrency(t.preg)}</td>
                <td class="center compact-cell">${fmtCurrency(t.ppromo)}</td>
                <td class="right compact-cell">${fmtCurrency((Number(t.cant) || 1) * (Number(t.ppromo) || 0))}</td>
            </tr>
        `).join('');

        // 2. Crear la fila de encabezado de Hoteles, añadiendo la clase espaciadora
        let hotelHeaderRowHtml = '';
        if (cotizacionActual.hotels && cotizacionActual.hotels.length > 0 && cotizacionActual.hotels[0].aloj) {
            hotelHeaderRowHtml = `
                <tr><td colspan="8" style="padding-top: 50px;"></td></tr>

                <tr class="section-spacer">
                    <th class="left col-hotel-cin hotel-header"><div>${labels.checkIn}</div></th>
                    <th class="left col-hotel-cout hotel-header"><div>${labels.checkOut}</div></th>
                    <th class="left col-hotel-desc hotel-header"><div>${labels.alojamiento}</div></th>
                    <th class="center col-qty compact-cell hotel-header"><div>${labels.nHab}</div></th>
                    <th class="center col-qty compact-cell hotel-header"><div>${labels.nNoches}</div></th>
                    <th class="center col-price compact-cell hotel-header"><div>${labels.pRegNoche}</div></th>
                    <th class="center col-price compact-cell hotel-header"><div>${labels.pPromoNoche}</div></th>
                    <th class="right col-line-total compact-cell hotel-header"><div>${labels.totalLinea}</div></th>
                </tr>
            `;
        }

        const hotelRowsHtml = cotizacionActual.hotels.map(h => `
            <tr>
                <td class="left">${formatDate(h.cin)}</td>
<td class="left">${formatDate(h.cout)}</td>
                <td class="left">${h.aloj || ''}</td>
                <td class="center compact-cell">${h.nhab || 1}</td>
                <td class="center compact-cell">${h.noches || 1}</td>
                <td class="center compact-cell">${fmtCurrency(h.preg)}</td>
                <td class="center compact-cell">${fmtCurrency(h.ppromo)}</td>
                <td class="right compact-cell">${fmtCurrency((Number(h.nhab) || 1) * (Number(h.noches) || 1) * (Number(h.ppromo) || 0))}</td>
            </tr>
        `).join('');

        const tableRows = tourRowsHtml + hotelHeaderRowHtml + hotelRowsHtml;

        const fechaCot = new Date(cotizacionActual.pax.fecha_cot + 'T00:00:00');
        const fLlegada = cotizacionActual.pax.f_llegada ? new Date(cotizacionActual.pax.f_llegada + 'T00:00:00') : null;
        const fSalida = cotizacionActual.pax.f_salida ? new Date(cotizacionActual.pax.f_salida + 'T00:00:00') : null;
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const localeIdioma = { es: 'es-ES', en: 'en-US', pt: 'pt-BR' }[idioma] || 'es-ES';

        // Acento de marca por agencia: si no configuró colores, no se agrega override y el
        // CSS usa sus valores originales (var(--accent-primary, #ff0000) etc.), así que el
        // PDF se ve exactamente igual que antes de existir estos campos.
        let colorOverridesCss = '';
        if (agencia.color_principal || agencia.color_secundario) {
            const vars = [];
            if (agencia.color_principal) vars.push(`--accent-primary:${agencia.color_principal};`);
            if (agencia.color_secundario) vars.push(`--accent-secondary:${agencia.color_secundario};`);
            colorOverridesCss = `.pdf-page{${vars.join('')}}`;
        }

        // Solo se listan las líneas de contacto que la agencia realmente tiene cargadas
        // (no se muestra "Cel: " vacío si esa agencia no configuró un 2do número, etc).
        const companyInfoParts = [];
        if (agencia.ruc) companyInfoParts.push(`<span class="company-ruc">${labels.ruc} ${agencia.ruc}</span>`);
        if (agencia.direccion) companyInfoParts.push(`<span class="company-address">${agencia.direccion}</span>`);
        if (agencia.telefono) companyInfoParts.push(`<span class="company-address">${labels.telf} ${agencia.telefono}</span>`);
        if (agencia.telefono2) companyInfoParts.push(`<span class="company-address">${labels.cel} ${agencia.telefono2}</span>`);
        if (agencia.whatsapp) companyInfoParts.push(`<span class="company-address">${labels.whatsapp} ${agencia.whatsapp}</span>`);

        let finalHtml = templateHtml
            .replace('{{cotizacionId}}', cotizacionActual.id)
            .replace('{{fechaCotizacion}}', fechaCot.toLocaleDateString(localeIdioma))
            .replace('{{agente}}', cotizacionActual.pax.agente || labels.na)
            .replace('{{nombrePax}}', cotizacionActual.pax.nombre_pax || '')
            .replace('{{contactoPax}}', cotizacionActual.pax.contacto || '')
            .replace('{{porcentajeReserva}}', `${porcentajeReserva}`)
            .replace('{{montoReserva}}', fmtCurrency(montoReserva))
            .replace('{{fechaLlegada}}', fLlegada ? fLlegada.toLocaleDateString(localeIdioma, dateOptions) : labels.na)
            .replace('{{horaLlegada}}', cotizacionActual.pax.h_llegada || '')
            .replace('{{fechaSalida}}', fSalida ? fSalida.toLocaleDateString(localeIdioma, dateOptions) : labels.na)
            .replace('{{horaSalida}}', cotizacionActual.pax.h_salida || '')
            .replace('{{tableRows}}', () => tableRows)
            .replace('{{notas}}', () => cotizacionActual.notas || labels.sinNotas)
            .replace('{{totalRegular}}', fmtCurrency(pvReg))
            .replace('{{descuentoTotal}}', fmtCurrency(totalDesc))
            .replace('{{precioAdicional}}', fmtCurrency(precioAd))
            .replace('{{totalFinal}}', fmtCurrency(pvFinal))
            .replace('{{companyNombre}}', agencia.nombre || EMPRESA_FALLBACK.nombre)
            .replace('{{companyInfoLines}}', () => companyInfoParts.join(''))
            .replace('{{labelECotizacion}}', labels.eCotizacion)
            .replace('{{labelAgente}}', labels.agente)
            .replace('{{labelReservaTuPaquete}}', labels.reservaTuPaquete)
            .replace('{{labelLlegada}}', labels.llegada)
            .replace('{{labelSalida}}', labels.salida)
            .replace('{{labelFecha}}', labels.fecha)
            .replace('{{labelTourActividad}}', labels.tourActividad)
            .replace('{{labelCant}}', labels.cant)
            .replace('{{labelPReg}}', labels.pReg)
            .replace('{{labelPPromo}}', labels.pPromo)
            .replace('{{labelTotalLinea}}', labels.totalLinea)
            .replace('{{labelNota}}', labels.nota)
            .replace('{{labelCantidadBaseTotal}}', labels.cantidadBaseTotal)
            .replace('{{labelDescuentoTotal}}', labels.descuentoTotal)
            .replace('{{labelPrecioAdicional}}', labels.precioAdicional)
            .replace('{{labelTotalFinal}}', labels.totalFinal)
            .replace('<link rel="stylesheet" href="pdf-styles.css">', `<style>${templateCss}${colorOverridesCss}</style>`)
            .replace('src="logo.png"', `src="${logoBase64}"`);

        const { PDFDocument } = PDFLib;
        const finalPdfDoc = await PDFDocument.create();

        const page1Bytes = await renderHtmlPageBytes(finalHtml);
        const page1Doc = await PDFDocument.load(page1Bytes);
        const [page1] = await finalPdfDoc.copyPages(page1Doc, [0]);
        finalPdfDoc.addPage(page1);

        // Página de Términos y Condiciones: dinámica, sale de la agencia resuelta. Si esa
        // agencia no tiene términos guardados para este idioma, simplemente no se agrega
        // segunda página (más limpio que un placeholder de "sin términos" en un documento
        // de cara al cliente).
        const terminosContenido = agencia[`terminos_${idioma}`];
        if (terminosContenido && terminosContenido.trim() !== '') {
            const terminosFinalHtml = terminosTemplateHtml
                .replace('{{terminosTitulo}}', labels.terminosTitulo)
                .replace('{{terminosContenido}}', () => terminosContenido)
                .replace('<link rel="stylesheet" href="pdf-styles.css">', `<style>${templateCss}</style>`);
            const page2Bytes = await renderHtmlPageBytes(terminosFinalHtml);
            const page2Doc = await PDFDocument.load(page2Bytes);
            const [page2] = await finalPdfDoc.copyPages(page2Doc, [0]);
            finalPdfDoc.addPage(page2);
        }

        return finalPdfDoc.save();
    }
}

// Trae los datos de empresa a usar para el PDF de una cotización: la agencia de quien la
// creó, o la marcada como principal si no tiene una asignada (típicamente el admin). Se
// pide siempre fresco al servidor (no se cachea junto con la cotización) para que el
// logo/términos usados reflejen la ficha de agencia actual.
async function obtenerAgenciaDeCotizacion(id) {
    try {
        const res = await fetch(`${API_URL}?path=cotizacion-agencia&id=${id}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn('No se pudo obtener la agencia de la cotización.', e);
        return null;
    }
}

// Genera el PDF de una cotización ya guardada y lo muestra en el modal de vista previa
// (nunca descarga directo — el usuario decide si descargar o abrirlo en una pestaña nueva
// desde ahí, con el PDF ya a la vista). El idioma ya no se elige acá: se usa el que quedó
// guardado con la cotización (elegido al inicio, en Datos Pax).
async function mostrarVistaPreviaPdf(id) {
    const cotizacionActual = cotizaciones[id];
    if (!cotizacionActual) {
        notifyError('No se encontró la cotización.');
        return;
    }
    const idioma = cotizacionActual.pax.idioma || 'es';
    pdfPreviewCotizacionId = id;
    abrirModalPdfCargando();
    try {
        const agencia = await obtenerAgenciaDeCotizacion(id);
        const bytes = await construirPdfBytes(cotizacionActual, agencia, idioma);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        pdfPreviewUrl = URL.createObjectURL(blob);
        pdfPreviewFilename = `Cotizacion_${cotizacionActual.id}_${cotizacionActual.pax.nombre_pax || 'cliente'}.pdf`;
        document.getElementById('pdf-preview-frame').src = pdfPreviewUrl;
        document.getElementById('pdf-preview-loading').classList.add('hidden');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        cerrarModalPdf();
        notifyError('Hubo un error al generar el PDF. Revisa la consola para más detalles.');
    }
}

function abrirModalPdfCargando() {
    document.getElementById('pdf-preview-loading').classList.remove('hidden');
    document.getElementById('pdf-preview-frame').src = 'about:blank';
    document.getElementById('pdf-preview-modal').classList.remove('hidden');
}

function cerrarModalPdf() {
    document.getElementById('pdf-preview-modal').classList.add('hidden');
    document.getElementById('pdf-preview-frame').src = 'about:blank';
    pdfPreviewCotizacionId = null;
    if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
        pdfPreviewUrl = null;
    }
}

function descargarPdfPreview() {
    if (!pdfPreviewUrl) return;
    const link = document.createElement('a');
    link.href = pdfPreviewUrl;
    link.download = pdfPreviewFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function abrirPdfPreviewNuevaPestana() {
    if (!pdfPreviewUrl) return;
    window.open(pdfPreviewUrl, '_blank');
}

// ===== INICIALIZACIÓN =====
async function init() {
    await cargarDatosIniciales();
    // Itinerario (itinerario/itinerario.js, embebido — ver window.ITINERARIO_API_BASE en
    // este mismo archivo) arranca con el idioma que ya trae Datos Pax, en vez del 'en'
    // fijo de la página standalone — y de ahí en más lo sigue en vivo (ver el listener
    // del <select name="idioma"> más abajo).
    await initItinerario(document.querySelector('select[name="idioma"]').value || 'es');
    nuevaCotizacion(false);

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-section`).classList.remove('hidden');
            if (tab.dataset.tab === 'cotizaciones') cargarCotizacionesGuardadas();
        });
    });

    document.querySelectorAll('#gestion-section .subnav-tab').forEach(tab => {
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

    document.getElementById('guardar-cotizacion').addEventListener('click', guardarCotizacion);
    document.querySelector('input[name="n_pax"]').addEventListener('input', sincronizarCantidadTours);
    document.querySelectorAll('.field-overlay input').forEach(input => {
        input.addEventListener('input', () => actualizarEstadoCampoFecha(input));
    });
    actualizarEstadosCamposFecha();

    document.getElementById('historial-tours-btn').addEventListener('click', abrirHistorialTours);
    document.getElementById('close-historial-tours-btn').addEventListener('click', cerrarHistorialTours);
    // Itinerario embebido: sigue el idioma de Datos Pax en vez de sus propias pestañas
    // (que no se renderizan acá), y el Nombre PAX precompleta el pasajero del armador.
    document.querySelector('select[name="idioma"]').addEventListener('change', (e) => activarIdioma(e.target.value));
    document.querySelector('input[name="nombre_pax"]').addEventListener('input', (e) => {
        document.getElementById('itinerary-passenger').value = e.target.value;
    });
    document.querySelector('input[name="f_llegada"]').addEventListener('change', resincronizarFechasConLlegada);
    document.getElementById('historial-tours-modal').addEventListener('click', (e) => {
        if (e.target.id === 'historial-tours-modal') cerrarHistorialTours();
    });
    document.getElementById('historial-tours-search').addEventListener('input', (e) => {
        clearTimeout(histSearchDebounce);
        const term = e.target.value.trim();
        histSearchDebounce = setTimeout(() => {
            histState.term = term;
            histState.offset = 0;
            cargarHistorialTours();
        }, 300);
    });
    document.getElementById('historial-tours-prev').addEventListener('click', () => {
        histState.offset = Math.max(0, histState.offset - HIST_PAGE_SIZE);
        cargarHistorialTours();
    });
    document.getElementById('historial-tours-next').addEventListener('click', () => {
        histState.offset += HIST_PAGE_SIZE;
        cargarHistorialTours();
    });

    document.getElementById('close-pdf-preview-btn').addEventListener('click', cerrarModalPdf);
    document.getElementById('pdf-preview-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('pdf-preview-modal')) cerrarModalPdf();
    });
    document.getElementById('pdf-preview-descargar').addEventListener('click', descargarPdfPreview);
    document.getElementById('pdf-preview-nueva-pestana').addEventListener('click', abrirPdfPreviewNuevaPestana);

    document.getElementById('cot-nueva').addEventListener('click', () => {
        nuevaCotizacion();
        irATabCotizador();
    });
    document.getElementById('cot-search').addEventListener('input', (e) => {
        clearTimeout(cotSearchDebounce);
        const term = e.target.value.trim();
        cotSearchDebounce = setTimeout(() => {
            cotState.term = term;
            cotState.offset = 0;
            cargarCotizacionesGuardadas();
        }, 300);
    });
    document.getElementById('cot-prev').addEventListener('click', () => {
        cotState.offset = Math.max(0, cotState.offset - COT_PAGE_SIZE);
        cargarCotizacionesGuardadas();
    });
    document.getElementById('cot-next').addEventListener('click', () => {
        cotState.offset += COT_PAGE_SIZE;
        cargarCotizacionesGuardadas();
    });
    document.getElementById('paquete-add-row').addEventListener('click', () => agregarFilaPaquete());
    document.getElementById('paquete-guardar').addEventListener('click', guardarPaquete);
    document.getElementById('paquete-cancelar-edicion').addEventListener('click', resetPaqueteBuilder);
    document.getElementById('aplicar-paquete-select').addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        const paquete = paquetesData.find(p => String(p.id) === id);
        if (paquete) aplicarPaquete(paquete);
        e.target.value = '';
    });
    agregarFilaPaquete();

    document.getElementById('add-tour').addEventListener('click', () => document.getElementById('tours-body').appendChild(createTourRow({ fecha: sugerirSiguienteFechaTour() })));
    document.getElementById('add-hotel').addEventListener('click', () => document.getElementById('hotels-body').appendChild(createHotelRow({ cin: sugerirSiguienteCheckinHotel() })));
    document.getElementById('clear-tours').addEventListener('click', () => { document.getElementById('tours-body').innerHTML = ''; calcularResumen(); });
    document.getElementById('clear-hotels').addEventListener('click', () => { document.getElementById('hotels-body').innerHTML = ''; calcularResumen(); });
    // Revela/edita Precio Confidencial y Precio C. Total para TODAS las filas de la tabla
    // a la vez (columnas .col-confidencial, ver cotizador.css). Siempre arranca oculto al
    // cargar la página — es información sensible, no debe quedar expuesta por defecto.
    ['tours', 'hoteles'].forEach(tipo => {
        document.getElementById(`toggle-conf-${tipo}`).addEventListener('click', function() {
            const tabla = document.getElementById(tipo === 'tours' ? 'tours-table' : 'hotels-table');
            const visible = tabla.classList.toggle('mostrar-confidencial');
            this.classList.toggle('confid-toggle-activo', visible);
            this.innerHTML = visible
                ? '<i class="fas fa-eye-slash mr-1"></i>Ocultar confid.'
                : '<i class="fas fa-eye mr-1"></i>Precios confid.';
        });
    });
    document.getElementById('precio-adicional').addEventListener('input', calcularResumen);
    document.getElementById('descuento-especial').addEventListener('input', calcularResumen);
    initRichTextEditor(document.getElementById('notas_cotizacion'));
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
    setupDragDrop();
    initPaisAutocomplete();

    // Deep link desde fuera del cotizador (ej. el detalle de una agencia en Usuarios):
    // ?cotizacion=ID abre esa cotización directamente en la pestaña Cotizador.
    const cotizacionUrlId = new URLSearchParams(window.location.search).get('cotizacion');
    if (cotizacionUrlId) {
        await abrirCotizacionGuardada(cotizacionUrlId);
        history.replaceState(null, '', window.location.pathname);
    }
}

// ===== Buscador de País (Datos Pax) =====
// El input name="pais" sigue siendo un <input type="text"> normal (lo que ya leen/escriben
// FormData(form-pax) y la carga de cotizaciones guardadas) — esto solo le agrega un dropdown
// de búsqueda encima para elegir rápido en vez de tipear el país completo a mano. La lista
// de países sale de paisesData (shared/migrations/027_...), ya cargada por cargarDatosIniciales().

// Al elegir un país: autocompleta cod_pais (teléfono) y recarga el <select name="dpto"> con
// los departamentos/estados de ese país (shared/migrations/027_...). cod_pais queda editable.
async function llenarDepartamentosSelect(paisId, valorSeleccionado) {
    const select = document.querySelector('select[name="dpto"]');
    if (!paisId) {
        select.innerHTML = '<option value="">Elige un país primero...</option>';
        select.disabled = true;
        return;
    }
    select.disabled = false;
    select.innerHTML = '<option value="">Cargando...</option>';
    try {
        const departamentos = await fetch(`${API_URL}?path=departamentos&pais_id=${paisId}`).then(r => r.json());
        if (!Array.isArray(departamentos) || departamentos.length === 0) {
            select.innerHTML = '<option value="">Sin departamentos registrados</option>';
            return;
        }
        select.innerHTML = '<option value="">Selecciona...</option>' +
            departamentos.map(d => `<option value="${d.nombre}">${d.nombre}</option>`).join('');
        if (valorSeleccionado) select.value = valorSeleccionado;
    } catch (error) {
        select.innerHTML = '<option value="">Error al cargar departamentos</option>';
    }
}

function initPaisAutocomplete() {
    const input = document.getElementById('input-pais');
    const lista = document.getElementById('pais-dropdown-list');
    let indiceActivo = -1;

    // Sin tildes ni mayúsculas, para que "peru" encuentre "Perú" igual que "perú".
    const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    function renderOpciones(filtro) {
        const termino = normalizar(filtro.trim());
        const nombres = paisesData.map(p => p.nombre);
        const coincidencias = termino
            ? nombres.filter(p => normalizar(p).includes(termino))
            : nombres;
        indiceActivo = -1;
        if (coincidencias.length === 0) {
            lista.innerHTML = '<li class="sin-resultados">Sin coincidencias</li>';
        } else {
            lista.innerHTML = coincidencias.map(p => `<li data-pais="${p}">${p}</li>`).join('');
        }
        lista.classList.remove('hidden');
    }

    function cerrarLista() {
        lista.classList.add('hidden');
        indiceActivo = -1;
    }

    function elegir(pais) {
        input.value = pais;
        cerrarLista();
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const paisEncontrado = paisesData.find(p => p.nombre === pais);
        if (paisEncontrado) {
            document.querySelector('input[name="cod_pais"]').value = paisEncontrado.codigo_telefono;
            llenarDepartamentosSelect(paisEncontrado.id, null);
        } else {
            llenarDepartamentosSelect(null, null);
        }
    }

    input.addEventListener('focus', () => renderOpciones(input.value));
    input.addEventListener('input', () => renderOpciones(input.value));

    lista.addEventListener('mousedown', (e) => {
        // mousedown (no click) para que dispare antes que el 'blur' del input.
        const li = e.target.closest('li[data-pais]');
        if (li) elegir(li.dataset.pais);
    });

    input.addEventListener('keydown', (e) => {
        const opciones = Array.from(lista.querySelectorAll('li[data-pais]'));
        if (lista.classList.contains('hidden') || opciones.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            indiceActivo = Math.min(indiceActivo + 1, opciones.length - 1);
            opciones.forEach((li, i) => li.classList.toggle('activa', i === indiceActivo));
            opciones[indiceActivo]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            indiceActivo = Math.max(indiceActivo - 1, 0);
            opciones.forEach((li, i) => li.classList.toggle('activa', i === indiceActivo));
            opciones[indiceActivo]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            if (indiceActivo >= 0) {
                e.preventDefault();
                elegir(opciones[indiceActivo].dataset.pais);
            }
        } else if (e.key === 'Escape') {
            cerrarLista();
        }
    });

    input.addEventListener('blur', () => setTimeout(cerrarLista, 100));
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
        let html = `<p>${previo.error}</p>`;
        if (previo.errores?.length) {
            html += `<ul class="text-xs text-left mt-2" style="max-height:10rem;overflow-y:auto">` +
                previo.errores.slice(0, 15).map(e => `<li>Fila ${e.fila}: ${e.motivo}</li>`).join('') +
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

document.addEventListener('DOMContentLoaded', init);
