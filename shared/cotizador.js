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
let cotizaciones = {};
let currentCotizacionId = null;
let toursFilter = '';
let hotelsFilter = '';
let paquetesData = [];
let paqueteEditandoId = null;
let pdfPreviewUrl = null;
let pdfPreviewFilename = '';

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

// ===== CARGA DE DATOS =====
async function cargarDatosIniciales() {
    try {
        const [toursRes, hotelesRes, paquetesRes] = await Promise.all([
            fetch(`${API_URL}?path=tours`).then(r => r.json()),
            fetch(`${API_URL}?path=hoteles`).then(r => r.json()),
            fetch(`${API_URL}?path=paquetes-tours`).then(r => r.json())
        ]);
        toursData = toursRes;
        hotelsData = hotelesRes;
        paquetesData = paquetesRes;
        cotizaciones = {};
        updateDatalists();
        renderTours();
        renderHotels();
        renderPaquetesList();
        renderAplicarPaqueteSelect();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        notifyError('Error al conectar con el servidor. Revisa tu conexión.');
    }
}

// ===== ACTUALIZAR DATALISTS =====
function updateDatalists() {
    const listas = {
        'hotels-list': [...new Set(hotelsData.map(h => h.aloj))],
        'destinos-list': [...new Set(toursData.map(t => t.destino).filter(Boolean))],
        'categorias-list': [...new Set(toursData.map(t => t.categoria).filter(Boolean))]
    };
    Object.entries(listas).forEach(([id, items]) => {
        let list = document.getElementById(id);
        if (!list) {
            list = document.createElement('datalist');
            list.id = id;
            document.body.appendChild(list);
        }
        list.innerHTML = '';
        items.sort().forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            list.appendChild(opt);
        });
    });
}

// ===== SELECTOR EN CASCADA: Destino → Categoría → Actividad =====
// Reemplaza el antiguo autocompletado plano de "Tour/Actividad" en Data Tours y en
// el armador de Paquetes, para que elegir una actividad sea manejable aunque el
// catálogo crezca mucho.
const SIN_DESTINO = 'Sin clasificar';
const SIN_CATEGORIA = 'Sin categoría';

function destinoDe(t) { return t.destino || SIN_DESTINO; }
function categoriaDe(t) { return t.categoria || SIN_CATEGORIA; }

function getDestinos() {
    return [...new Set(toursData.map(destinoDe))].sort();
}
function getCategorias(destino) {
    return [...new Set(toursData.filter(t => destinoDe(t) === destino).map(categoriaDe))].sort();
}
function getActividades(destino, categoria) {
    return toursData
        .filter(t => destinoDe(t) === destino && categoriaDe(t) === categoria)
        .sort((a, b) => a.tour.localeCompare(b.tour));
}

// initialTourName: nombre de tour ya elegido (al cargar una cotización o aplicar un paquete).
// onResolved(tourName): se llama cada vez que la cascada termina en una actividad concreta,
// o con '' mientras el usuario todavía está eligiendo destino/categoría.
function buildTourSelector(initialTourName, onResolved) {
    const wrap = document.createElement('div');
    wrap.className = 'grid grid-cols-3 gap-1';
    wrap.innerHTML = `
        <select class="input rounded px-1 py-1 border sel-destino" style="font-size:0.72rem"><option value="">Destino...</option></select>
        <select class="input rounded px-1 py-1 border sel-categoria" style="font-size:0.72rem" disabled><option value="">Categoría...</option></select>
        <select class="input rounded px-1 py-1 border sel-actividad" style="font-size:0.72rem" disabled><option value="">Actividad...</option></select>
    `;
    const destinoSel = wrap.querySelector('.sel-destino');
    const categoriaSel = wrap.querySelector('.sel-categoria');
    const actividadSel = wrap.querySelector('.sel-actividad');

    function llenarDestinos() {
        destinoSel.innerHTML = '<option value="">Destino...</option>' +
            getDestinos().map(d => `<option value="${d}">${d}</option>`).join('');
    }
    function llenarCategorias(destino) {
        categoriaSel.innerHTML = '<option value="">Categoría...</option>' +
            getCategorias(destino).map(c => `<option value="${c}">${c}</option>`).join('');
        categoriaSel.disabled = !destino;
    }
    function llenarActividades(destino, categoria) {
        actividadSel.innerHTML = '<option value="">Actividad...</option>' +
            getActividades(destino, categoria).map(t => `<option value="${t.tour}">${t.tour}</option>`).join('');
        actividadSel.disabled = !destino || !categoria;
    }

    llenarDestinos();
    llenarCategorias('');
    llenarActividades('', '');

    destinoSel.addEventListener('change', () => {
        llenarCategorias(destinoSel.value);
        llenarActividades('', '');
        onResolved('');
    });
    categoriaSel.addEventListener('change', () => {
        llenarActividades(destinoSel.value, categoriaSel.value);
        onResolved('');
    });
    actividadSel.addEventListener('change', () => onResolved(actividadSel.value));

    if (initialTourName) {
        const match = toursData.find(t => t.tour === initialTourName);
        if (match) {
            const destino = destinoDe(match);
            const categoria = categoriaDe(match);
            destinoSel.value = destino;
            llenarCategorias(destino);
            categoriaSel.value = categoria;
            llenarActividades(destino, categoria);
            actividadSel.value = initialTourName;
        } else {
            // El tour ya no está en el catálogo (borrado/renombrado) — se preserva el nombre igual.
            actividadSel.innerHTML = `<option value="${initialTourName}" selected>${initialTourName} (fuera de catálogo)</option>`;
            actividadSel.disabled = false;
        }
    }

    return wrap;
}

// ===== RENDER TABLAS (gestión) — CRUD de tours y hoteles =====
function renderTours() {
    const tbody = document.getElementById('tours-table-body');
    tbody.innerHTML = '';
    const visibles = toursData
        .filter(t => t.tour.toLowerCase().includes(toursFilter))
        .sort((a, b) => a.tour.localeCompare(b.tour));
    if (visibles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-3 text-center text-slate-400">${toursFilter ? 'Sin resultados.' : 'Sin tours registrados.'}</td></tr>`;
    } else {
        visibles.forEach(t => tbody.appendChild(buildTourRow(t)));
    }
    updateDatalists();
}

function buildTourRow(t) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-3 font-medium">${t.tour}</td>
        <td class="p-3">${t.destino || '<span class="text-slate-400">—</span>'}</td>
        <td class="p-3">${t.categoria || '<span class="text-slate-400">—</span>'}</td>
        <td class="p-3">${t.distr || ''}</td>
        <td class="p-3">${fmt(t.preg)}</td>
        <td class="p-3">${fmt(t.ppromo)}</td>
        <td class="p-3 text-slate-500">${t.creado_por_nombre || '—'}</td>
        <td class="p-3 text-right whitespace-nowrap">
            <button class="text-slate-500 hover:text-slate-700 mr-2" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    const [editBtn, delBtn] = tr.querySelectorAll('button');
    editBtn.addEventListener('click', () => tr.replaceWith(buildTourEditRow(t)));
    delBtn.addEventListener('click', () => eliminarTour(t));
    return tr;
}

function buildTourEditRow(t) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.tour}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.destino || ''}" list="destinos-list"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.categoria || ''}" list="categorias-list"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${t.distr || ''}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${t.ppromo}"></td>
        <td class="p-2 text-slate-500">${t.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const [tourI, destinoI, categoriaI, distrI, pregI, ppromoI] = tr.querySelectorAll('input');
    const [saveBtn, cancelBtn] = tr.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarTour({
        id: t.id, tour: tourI.value.trim(), destino: destinoI.value.trim(), categoria: categoriaI.value.trim(),
        distr: distrI.value.trim(), preg: pregI.value, ppromo: ppromoI.value
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

function renderHotels() {
    const tbody = document.getElementById('hotels-table-body');
    tbody.innerHTML = '';
    const visibles = hotelsData
        .filter(h => h.aloj.toLowerCase().includes(hotelsFilter))
        .sort((a, b) => a.aloj.localeCompare(b.aloj));
    if (visibles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-3 text-center text-slate-400">${hotelsFilter ? 'Sin resultados.' : 'Sin hoteles registrados.'}</td></tr>`;
    } else {
        visibles.forEach(h => tbody.appendChild(buildHotelRow(h)));
    }
    updateDatalists();
}

function buildHotelRow(h) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-3 font-medium">${h.aloj}</td>
        <td class="p-3">${h.distr || ''}</td>
        <td class="p-3">${fmt(h.preg)}</td>
        <td class="p-3">${fmt(h.ppromo)}</td>
        <td class="p-3 text-slate-500">${h.creado_por_nombre || '—'}</td>
        <td class="p-3 text-right whitespace-nowrap">
            <button class="text-slate-500 hover:text-slate-700 mr-2" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    const [editBtn, delBtn] = tr.querySelectorAll('button');
    editBtn.addEventListener('click', () => tr.replaceWith(buildHotelEditRow(h)));
    delBtn.addEventListener('click', () => eliminarHotel(h));
    return tr;
}

function buildHotelEditRow(h) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${h.aloj}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border" type="text" value="${h.distr || ''}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.preg}"></td>
        <td class="p-2"><input class="input w-full rounded px-2 py-1 border text-right" type="number" step="0.01" value="${h.ppromo}"></td>
        <td class="p-2 text-slate-500">${h.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const [alojI, distrI, pregI, ppromoI] = tr.querySelectorAll('input');
    const [saveBtn, cancelBtn] = tr.querySelectorAll('button');
    saveBtn.addEventListener('click', () => guardarHotel({
        id: h.id, aloj: alojI.value.trim(), distr: distrI.value.trim(), preg: pregI.value, ppromo: ppromoI.value
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
        return;
    }
    paquetesData.forEach(p => {
        const preview = p.tours.map(t => `${t.tour} x${t.cant}`).join(', ');
        const div = document.createElement('div');
        div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap';
        div.innerHTML = `
            <div class="min-w-0">
                <div class="font-medium">${p.nombre}</div>
                <div class="text-xs text-slate-500 truncate">${preview}</div>
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

function aplicarPaquete(paquete) {
    const toursBody = document.getElementById('tours-body');
    paquete.tours.forEach(item => {
        const tr = createTourRow({ tour: item.tour, cant: item.cant });
        toursBody.appendChild(tr);
        tr.querySelector('.tour-name').dispatchEvent(new Event('input'));
    });
    calcularResumen();
    notifySuccess(`Se agregaron ${paquete.tours.length} tour(s) del paquete "${paquete.nombre}".`);
    irATabCotizador();
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
        <td><input class="input w-full rounded px-2 py-1 border text-right cant" type="number" min="0" value="${initialCant}"></td>
        <td><input class="input w-full rounded px-2 py-1 border distr" type="text" value="${data.distr || ''}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
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
        <td><input class="input w-full rounded px-2 py-1 border hotel-name" type="text" value="${data.aloj || ''}" list="hotels-list"></td>
        <td><input class="input w-full rounded px-2 py-1 border text-right nhab" type="number" min="0" value="${initialNhab}"></td>
        <td><input class="input w-full rounded px-2 py-1 border text-right noches" type="number" min="1" value="${initialNoches}"></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
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

    const hotelInput = tr.querySelector('.hotel-name');

    let originalValue = data.aloj || '';
    hotelInput.addEventListener('mousedown', function() {
        originalValue = this.value;
        this.value = '';
    });
    hotelInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = originalValue;
        }
    });

    hotelInput.addEventListener('input', function() {
        const hotel = hotelsData.find(h => h.aloj === this.value);
        if (hotel) {
            tr.querySelector('.preg').value = hotel.preg;
            tr.querySelector('.ppromo').value = hotel.ppromo;
            const nhab = parseFloat(tr.querySelector('.nhab').value) || 0;
            const noches = parseFloat(tr.querySelector('.noches').value) || 0;
            tr.querySelector('.total-line').textContent = fmt(nhab * noches * hotel.ppromo);
            calcularResumen();
            originalValue = this.value;
        }
    });
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
        ppromo: tr.querySelector('.ppromo').value
    }));
    const hotels = Array.from(document.getElementById('hotels-body').querySelectorAll('tr')).map(tr => ({
        cin: tr.querySelector('td:nth-child(2) input').value,
        cout: tr.querySelector('td:nth-child(3) input').value,
        aloj: tr.querySelector('.hotel-name').value,
        nhab: tr.querySelector('.nhab').value,
        noches: tr.querySelector('.noches').value,
        preg: tr.querySelector('.preg').value,
        ppromo: tr.querySelector('.ppromo').value
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
        notas: document.getElementById('notas_cotizacion').value,
        porcentaje_reserva: document.getElementById('porcentaje_reserva').value
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
        const toursBody = document.getElementById('tours-body');
        toursBody.innerHTML = '';
        data.tours.forEach(t => toursBody.appendChild(createTourRow(t)));
        const hotelsBody = document.getElementById('hotels-body');
        hotelsBody.innerHTML = '';
        data.hotels.forEach(h => hotelsBody.appendChild(createHotelRow(h)));
        document.getElementById('precio-adicional').value = data.precios.precioAdicional || 0;
        document.getElementById('descuento-especial').value = data.precios.descuentoEspecial || 0;
        document.getElementById('notas_cotizacion').value = data.notas || '';
        document.getElementById('porcentaje_reserva').value = data.porcentaje_reserva || 30;
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
    document.getElementById('notas_cotizacion').value = '';
    document.getElementById('porcentaje_reserva').value = 30;
    currentCotizacionId = null;
    document.getElementById('current-cot-id-display').textContent = 'Nueva';
    document.querySelector('input[name="fecha_cot"]').value = new Date().toISOString().split('T')[0];
    document.getElementById('tours-body').appendChild(createTourRow());
    document.getElementById('hotels-body').appendChild(createHotelRow());
    calcularResumen();
    if(showAlert) notifySuccess('Formulario limpiado para una nueva cotización.');
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

// Arma los bytes del PDF a partir de una cotización ya guardada (pax/tours/hotels/precios).
// No descarga nada ni toca el DOM del formulario: es puro "datos adentro, PDF afuera".
async function construirPdfBytes(cotizacionActual) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    {
        const [
            templateHtml,
            templateCss,
            logoPng,
            plantillaPdfBytes
        ] = await Promise.all([
            fetch('../shared/pdf-template.html').then(res => res.text()),
            fetch('../shared/pdf-styles.css').then(res => res.text()),
            fetch('../shared/logo.png').then(res => res.blob()),
            fetch('../shared/plantilla.pdf').then(res => res.arrayBuffer())
        ]);

        const logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(logoPng);
        });

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
                <td class="left" colspan="2">${t.tour || 'Actividad no especificada'}</td>
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
                    <th class="left col-hotel-cin hotel-header"><div>Check in</div></th>
                    <th class="left col-hotel-cout hotel-header"><div>Check out</div></th>
                    <th class="left col-hotel-desc hotel-header"><div>Alojamiento</div></th>
                    <th class="center col-qty compact-cell hotel-header"><div>N° hab.</div></th>
                    <th class="center col-qty compact-cell hotel-header"><div>N° noches</div></th>
                    <th class="center col-price compact-cell hotel-header"><div>P. reg. x noche</div></th>
                    <th class="center col-price compact-cell hotel-header"><div>P. promo x noche</div></th>
                    <th class="right col-line-total compact-cell hotel-header"><div>Total l&iacute;nea</div></th>
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

        let finalHtml = templateHtml
            .replace('{{cotizacionId}}', cotizacionActual.id)
            .replace('{{fechaCotizacion}}', fechaCot.toLocaleDateString('es-ES'))
            .replace('{{agente}}', cotizacionActual.pax.agente || 'N/A')
            .replace('{{nombrePax}}', cotizacionActual.pax.nombre_pax || '')
            .replace('{{contactoPax}}', cotizacionActual.pax.contacto || '')
            .replace('{{porcentajeReserva}}', `${porcentajeReserva}`)
            .replace('{{montoReserva}}', fmtCurrency(montoReserva))
            .replace('{{fechaLlegada}}', fLlegada ? fLlegada.toLocaleDateString('es-ES', dateOptions) : 'N/A')
            .replace('{{horaLlegada}}', cotizacionActual.pax.h_llegada || '')
            .replace('{{fechaSalida}}', fSalida ? fSalida.toLocaleDateString('es-ES', dateOptions) : 'N/A')
            .replace('{{horaSalida}}', cotizacionActual.pax.h_salida || '')
            .replace('{{tableRows}}', tableRows)
            .replace('{{notas}}', cotizacionActual.notas || 'Sin notas adicionales.')
            .replace('{{totalRegular}}', fmtCurrency(pvReg))
            .replace('{{descuentoTotal}}', fmtCurrency(totalDesc))
            .replace('{{precioAdicional}}', fmtCurrency(precioAd))
            .replace('{{totalFinal}}', fmtCurrency(pvFinal))
            .replace('<link rel="stylesheet" href="pdf-styles.css">', `<style>${templateCss}</style>`)
            .replace('src="logo.png"', `src="${logoBase64}"`);

        const container = document.createElement('div');
        container.innerHTML = finalHtml;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const canvas = await html2canvas(container.querySelector('.pdf-page'), { scale: 1.5, useCORS: true });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const canvasWidth = canvas.width * ratio;
        const canvasHeight = canvas.height * ratio;

        pdf.addImage(imgData, 'PNG', 0, 0, canvasWidth, canvasHeight);
        document.body.removeChild(container);

        const { PDFDocument } = PDFLib;
        const finalPdfDoc = await PDFDocument.create();
        const generatedPdfDoc = await PDFDocument.load(pdf.output('arraybuffer'));
        const [generatedPage] = await finalPdfDoc.copyPages(generatedPdfDoc, [0]);
        finalPdfDoc.addPage(generatedPage);

        const plantillaDoc = await PDFDocument.load(plantillaPdfBytes);
        if (plantillaDoc.getPageCount() > 1) {
            const [terminosPage] = await finalPdfDoc.copyPages(plantillaDoc, [1]);
            finalPdfDoc.addPage(terminosPage);
        }

        return finalPdfDoc.save();
    }
}

// Genera el PDF de una cotización ya guardada y lo muestra en el modal de vista previa
// (nunca descarga directo — el usuario decide si descargar desde ahí, con el PDF ya a la vista).
async function mostrarVistaPreviaPdf(id) {
    const cotizacionActual = cotizaciones[id];
    if (!cotizacionActual) {
        notifyError('No se encontró la cotización.');
        return;
    }
    abrirModalPdfCargando();
    try {
        const bytes = await construirPdfBytes(cotizacionActual);
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

// ===== INICIALIZACIÓN =====
async function init() {
    await cargarDatosIniciales();
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

    document.querySelectorAll('.subnav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.subnav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`gestion-${tab.dataset.subtab}`).classList.remove('hidden');
        });
    });

    document.getElementById('tours-search').addEventListener('input', (e) => {
        toursFilter = e.target.value.trim().toLowerCase();
        renderTours();
    });
    document.getElementById('hoteles-search').addEventListener('input', (e) => {
        hotelsFilter = e.target.value.trim().toLowerCase();
        renderHotels();
    });

    document.getElementById('guardar-cotizacion').addEventListener('click', guardarCotizacion);
    document.querySelector('input[name="n_pax"]').addEventListener('input', sincronizarCantidadTours);

    document.getElementById('close-pdf-preview-btn').addEventListener('click', cerrarModalPdf);
    document.getElementById('pdf-preview-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('pdf-preview-modal')) cerrarModalPdf();
    });
    document.getElementById('pdf-preview-descargar').addEventListener('click', descargarPdfPreview);

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

    document.getElementById('add-tour').addEventListener('click', () => document.getElementById('tours-body').appendChild(createTourRow()));
    document.getElementById('add-hotel').addEventListener('click', () => document.getElementById('hotels-body').appendChild(createHotelRow()));
    document.getElementById('clear-tours').addEventListener('click', () => { document.getElementById('tours-body').innerHTML = ''; calcularResumen(); });
    document.getElementById('clear-hotels').addEventListener('click', () => { document.getElementById('hotels-body').innerHTML = ''; calcularResumen(); });
    document.getElementById('precio-adicional').addEventListener('input', calcularResumen);
    document.getElementById('descuento-especial').addEventListener('input', calcularResumen);
    document.getElementById('tour-csv-input').addEventListener('change', handleTourCsvUpload);
    document.getElementById('hotel-csv-input').addEventListener('change', handleHotelCsvUpload);
    document.getElementById('tour-new-add').addEventListener('click', async () => {
        const ok = await guardarTour({
            tour: document.getElementById('tour-new-nombre').value.trim(),
            destino: document.getElementById('tour-new-destino').value.trim(),
            categoria: document.getElementById('tour-new-categoria').value.trim(),
            distr: document.getElementById('tour-new-distr').value.trim(),
            preg: document.getElementById('tour-new-preg').value,
            ppromo: document.getElementById('tour-new-ppromo').value
        });
        if (ok) ['tour-new-nombre', 'tour-new-destino', 'tour-new-categoria', 'tour-new-distr', 'tour-new-preg', 'tour-new-ppromo'].forEach(id => document.getElementById(id).value = '');
    });
    document.getElementById('hotel-new-add').addEventListener('click', async () => {
        const ok = await guardarHotel({
            aloj: document.getElementById('hotel-new-nombre').value.trim(),
            distr: document.getElementById('hotel-new-distr').value.trim(),
            preg: document.getElementById('hotel-new-preg').value,
            ppromo: document.getElementById('hotel-new-ppromo').value
        });
        if (ok) ['hotel-new-nombre', 'hotel-new-distr', 'hotel-new-preg', 'hotel-new-ppromo'].forEach(id => document.getElementById(id).value = '');
    });
    setupDragDrop();
}

// ===== CSV =====
function processCSV(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.trim().split(/\r\n|\n/).filter(row => row.trim().length > 0);
        const data = rows.map(row => {
            const result = [];
            let inQuotes = false;
            let field = '';
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(field.trim());
                    field = '';
                } else {
                    field += char;
                }
            }
            result.push(field.trim());
            return result;
        });
        callback(data);
    };
    reader.readAsText(file);
}

async function handleTourCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    processCSV(file, async (parsedData) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}?path=upload-tours`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                notifySuccess(`Se han actualizado ${result.count} tours.`);
                cargarDatosIniciales();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            notifyError("Error al subir tours: " + error.message);
        }
    });
    event.target.value = '';
}

async function handleHotelCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    processCSV(file, async (parsedData) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}?path=upload-hoteles`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                notifySuccess(`Se han actualizado ${result.count} hoteles.`);
                cargarDatosIniciales();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            notifyError("Error al subir hoteles: " + error.message);
        }
    });
    event.target.value = '';
}

document.addEventListener('DOMContentLoaded', init);
