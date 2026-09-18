// ===== Estado por idioma (Español / Inglés / Portugués) =====
// Cada idioma tiene su propio catálogo de módulos PDF, páginas fijas y paquetes —
// idiomaCache[idioma] es null hasta que se pide por primera vez (se cachea, y se
// refresca puntualmente tras cada mutación exitosa).

// Prefijo hacia itinerario/api.php e itinerario/upload.php: vacío en la página standalone
// (itinerario/index.php, donde este archivo vive junto a esos endpoints), y
// '../itinerario/' cuando este mismo archivo se incluye embebido dentro de Cotizador
// (shared/cotizador.php, servido desde pen/ o usd/) — ahí window.ITINERARIO_API_BASE se
// define ANTES de este <script>, ver shared/cotizador.php.
const ITINERARIO_API_BASE = window.ITINERARIO_API_BASE || '';

let idiomaActivo = 'en';
let idiomaCache = { es: null, en: null, pt: null }; // {modules, fixedStartFiles, fixedEndFiles, paquetes, paginasFijas, generados}

let charlotteFontBytes = null;
let janoFontBytes = null;

// ===== Clasificación por Destino/Categoría =====
// Destinos es el catálogo compartido con Tours/Hoteles (../usd/api.php?path=destinos).
// Categorías NO: Itinerarios tiene su propio catálogo (categorias_itinerarios, vía
// api.php?path=categorias-itinerarios), igual que Hoteles tiene el suyo separado del de
// Tours. Se usa para clasificar cada módulo (select Destino/Categoría en la tabla) y para
// el selector en cascada del armador — no genera pestañas de navegación por destino (eso
// tampoco pasa en Cotizaciones, donde Destino/Categoría es solo un dato de clasificación).
// Nombres con prefijo itin* (en vez de destinosData/categoriasData) para no colisionar con
// las variables del mismo nombre en shared/cotizador.js cuando ambos scripts conviven en
// la misma página (Cotizador embebe este archivo) — un `let` repetido en dos <script>
// clásicos de la misma página revienta con SyntaxError al parsear el segundo.
let itinDestinosData = [];
let itinCategoriasData = [];
let modulosFiltro = '';
let itinerarioPaqueteEditandoId = null;
let historialFiltro = { texto: '', agencia: '', desde: '', hasta: '' };

function datosIdioma() { return idiomaCache[idiomaActivo]; }
function modulosActivos() { return datosIdioma()?.modules || []; }
function fixedStartFilesActivos() { return datosIdioma()?.fixedStartFiles || []; }
function fixedEndFilesActivos() { return datosIdioma()?.fixedEndFiles || []; }
function paquetesActivos() { return datosIdioma()?.paquetes || []; }
function paginasFijasActivas() { return datosIdioma()?.paginasFijas || []; }
function historialGeneradosActivo() { return datosIdioma()?.generados || []; }

// Helper del selector en cascada (shared/cascade-select.js), solo para el armador principal
// y los itinerarios predeterminados: ahí sí aplica clasificar por Destino → Categoría →
// Módulo. Las páginas fijas (start/end) no se clasifican así — usan un <select> plano
// (ver buildPaginaFijaSelect), porque nunca tienen destino/categoría.
const itinerarioHelpersModulos = crearHelpersClasificacion(
    () => modulosActivos(), () => itinCategoriasData, { labelKey: 'titulo', valueKey: 'filename' },
    () => itinDestinosData
);

function nombreDestino(id) { return itinDestinosData.find(d => d.id === id)?.nombre || null; }
function nombreCategoria(id) { return itinCategoriasData.find(c => c.id === id)?.nombre || null; }

// Embebido en Cotizador, Destinos ya está cargado por cotizador.js (mismo catálogo
// compartido) — se reusa esa referencia en vez de volver a pedirlo, evitando además la
// ruta relativa '../usd/api.php' (que en modo standalone solo es correcta porque
// itinerario/ y usd/ son carpetas hermanas). En la página standalone se sigue pidiendo
// por su cuenta, como hasta ahora. `typeof destinosData` (no `window.destinosData`): un
// `let`/`const` de otro <script> clásico en la misma página es visible como identificador
// suelto compartiendo el scope léxico global, pero NUNCA se vuelve propiedad de `window`.
async function cargarDestinosYCategorias() {
    try {
        const categoriasPromise = fetch(`${ITINERARIO_API_BASE}api.php?path=categorias-itinerarios`).then(r => r.json());
        if (typeof destinosData !== 'undefined' && Array.isArray(destinosData)) {
            itinDestinosData = destinosData;
            itinCategoriasData = await categoriasPromise;
        } else {
            const [destinos, categorias] = await Promise.all([
                fetch(`${ITINERARIO_API_BASE}../usd/api.php?path=destinos`).then(r => r.json()),
                categoriasPromise
            ]);
            itinDestinosData = destinos;
            itinCategoriasData = categorias;
        }
    } catch (error) {
        console.error('Error al cargar destinos/categorías:', error);
        itinDestinosData = [];
        itinCategoriasData = [];
    }
}

// Crea una nueva categoría de itinerario (propia, separada de las de Tours) para el
// destino indicado, la agrega a itinCategoriasData y devuelve su id. null si se cancela.
async function crearCategoriaItinerario(destinoId) {
    const { value: nombre } = await Swal.fire({
        title: 'Nueva categoría',
        input: 'text',
        inputLabel: `Destino: ${nombreDestino(Number(destinoId)) || ''}`,
        inputPlaceholder: 'Nombre de la categoría',
        showCancelButton: true,
        confirmButtonText: 'Crear',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => !value?.trim() ? 'El nombre es obligatorio' : undefined,
    });
    if (!nombre) return null;
    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-categoria-itinerario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destino_id: destinoId, nombre: nombre.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear la categoría');
        itinCategoriasData.push({ id: Number(data.id), destino_id: Number(destinoId), nombre: nombre.trim() });
        return Number(data.id);
    } catch (error) {
        Swal.fire('Error', error.message || 'No se pudo crear la categoría', 'error');
        return null;
    }
}

const CATEGORIA_ITINERARIO_NUEVA = '__nueva__';

// Llena el <select> de categorías de acuerdo al destino elegido en ese mismo formulario.
function llenarCategoriasSelect(categoriaSelect, destinoId, selectedId = null) {
    if (!destinoId) {
        categoriaSelect.innerHTML = '<option value="">—</option>';
        categoriaSelect.disabled = true;
        return;
    }
    const opciones = itinCategoriasData.filter(c => c.destino_id === Number(destinoId));
    categoriaSelect.innerHTML = '<option value="">Sin categoría</option>' +
        opciones.map(c => `<option value="${c.id}" ${selectedId != null && c.id === Number(selectedId) ? 'selected' : ''}>${c.nombre}</option>`).join('') +
        `<option value="${CATEGORIA_ITINERARIO_NUEVA}">+ Crear nueva categoría...</option>`;
    categoriaSelect.disabled = false;
    // Recuerda el último valor válido (no el sentinel) para poder restaurarlo si se
    // cancela la creación de una categoría nueva.
    categoriaSelect.dataset.prevValue = categoriaSelect.value;
}

// Engancha en un <select> de categorías ya llenado el manejo de "+ Crear nueva categoría...":
// crea la categoría, la selecciona, y deja que el resto de listeners 'change' del select
// corran normalmente para ese nuevo valor (marcar pendiente, etc). Si se cancela, vuelve a
// dejar seleccionado lo que había antes.
function habilitarCreacionCategoria(categoriaSelect, destinoSelect) {
    categoriaSelect.addEventListener('change', async (e) => {
        if (e.target.value !== CATEGORIA_ITINERARIO_NUEVA) {
            categoriaSelect.dataset.prevValue = e.target.value;
            return;
        }
        const anterior = categoriaSelect.dataset.prevValue || '';
        const destinoId = destinoSelect.value;
        const nuevoId = destinoId ? await crearCategoriaItinerario(destinoId) : null;
        if (nuevoId) {
            llenarCategoriasSelect(categoriaSelect, destinoId, nuevoId);
        } else {
            categoriaSelect.value = anterior;
            categoriaSelect.dataset.prevValue = anterior;
        }
        categoriaSelect.dispatchEvent(new Event('change'));
    });
}

function llenarDestinosSelect(destinoSelect, selectedId = null) {
    destinoSelect.innerHTML = '<option value="">Sin clasificar</option>' +
        itinDestinosData.map(d => `<option value="${d.id}" ${selectedId != null && d.id === Number(selectedId) ? 'selected' : ''}>${d.nombre}</option>`).join('');
}

function showLoadingModal() { document.getElementById('loading-modal').style.display = 'block'; }
function hideLoadingModal() { document.getElementById('loading-modal').style.display = 'none'; }
function updateProgress(percent, status) {
    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('loading-status').textContent = status;
}

// ===== Vista previa de PDF (generación en vivo y descargas del historial) =====
// src puede ser un blob: URL (recién generado, hay que revocarlo al cerrar para no
// filtrar memoria) o una URL normal del servidor (un PDF ya guardado en el historial).
// El botón "Seguir editando" solo tiene sentido para una generación en vivo (cierra sin
// guardar nada, para corregir y volver a generar) — se oculta al previsualizar algo que
// ya está en el historial, donde no hay nada que "seguir editando".
// Ids con prefijo itinerario-pdf-preview-* (no pdf-preview-*): Cotizador ya tiene su
// propio modal #pdf-preview-modal para la vista previa del PDF de la cotización — sin
// este prefijo, embeber ambos en la misma página colisionaría.
let pdfPreviewObjectUrl = null;
function abrirVistaPreviaPDF(src, onDescargar, titulo = 'Vista previa', { seguirEditando = false } = {}) {
    document.getElementById('itinerario-pdf-preview-title').textContent = titulo;
    document.getElementById('itinerario-pdf-preview-frame').src = src;
    document.getElementById('itinerario-pdf-preview-download').onclick = onDescargar;
    document.getElementById('itinerario-pdf-preview-seguir-editando').classList.toggle('hidden', !seguirEditando);
    document.getElementById('itinerario-pdf-preview-modal').style.display = 'block';
    if (src.startsWith('blob:')) pdfPreviewObjectUrl = src;
}
function cerrarVistaPreviaPDF() {
    document.getElementById('itinerario-pdf-preview-modal').style.display = 'none';
    document.getElementById('itinerario-pdf-preview-frame').src = '';
    if (pdfPreviewObjectUrl) {
        URL.revokeObjectURL(pdfPreviewObjectUrl);
        pdfPreviewObjectUrl = null;
    }
}
document.getElementById('itinerario-pdf-preview-close').addEventListener('click', cerrarVistaPreviaPDF);
document.getElementById('itinerario-pdf-preview-seguir-editando').addEventListener('click', cerrarVistaPreviaPDF);

function loadFonts(showModal = false) {
    return new Promise(async (resolve) => {
        if (showModal) {
            showLoadingModal();
            updateProgress(10, 'Cargando fuentes...');
        }
        try {
            await loadFontWithXHR(`${ITINERARIO_API_BASE}./charlotte.ttf`, 'charlotte');
            if (showModal) updateProgress(50, 'Fuente Charlotte cargada');
            await loadFontWithXHR(`${ITINERARIO_API_BASE}./jano.ttf`, 'jano');
            if (showModal) updateProgress(100, 'Fuentes cargadas correctamente');
            if (showModal) await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error cargando fuentes:', error);
        } finally {
            if (showModal) hideLoadingModal();
            resolve();
        }
    });
}

function loadFontWithXHR(url, fontName) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (xhr.status === 200) {
                if (fontName === 'charlotte') charlotteFontBytes = xhr.response;
                else if (fontName === 'jano') janoFontBytes = xhr.response;
                resolve(xhr.response);
            } else {
                console.warn(`No se pudo cargar ${url}, status: ${xhr.status}`);
                resolve(null);
            }
        };
        xhr.onerror = function() {
            console.warn(`Error de red al cargar ${url}`);
            resolve(null);
        };
        xhr.send();
    });
}

// ===== Carga / cambio de idioma =====
async function cargarIdioma(idioma) {
    const [modules, config, paquetes, paginasFijas, generados] = await Promise.all([
        fetch(`${ITINERARIO_API_BASE}api.php?path=modulos&idioma=${idioma}`).then(r => r.json()),
        fetch(`${ITINERARIO_API_BASE}api.php?path=config&idioma=${idioma}`).then(r => r.json()),
        fetch(`${ITINERARIO_API_BASE}api.php?path=paquetes&idioma=${idioma}`).then(r => r.json()),
        fetch(`${ITINERARIO_API_BASE}api.php?path=paginas-fijas&idioma=${idioma}`).then(r => r.json()),
        fetch(`${ITINERARIO_API_BASE}api.php?path=historial-generados&idioma=${idioma}`).then(r => r.json())
    ]);
    idiomaCache[idioma] = {
        modules,
        fixedStartFiles: config.startFiles || [],
        fixedEndFiles: config.endFiles || [],
        paquetes,
        paginasFijas,
        generados
    };
}

async function activarIdioma(idioma) {
    idiomaActivo = idioma;
    if (!idiomaCache[idioma]) {
        try {
            await cargarIdioma(idioma);
        } catch (error) {
            console.error('Error al cargar datos del idioma:', error);
            notifyError('Error al cargar los datos guardados.');
            idiomaCache[idioma] = { modules: [], fixedStartFiles: [], fixedEndFiles: [], paquetes: [], paginasFijas: [], generados: [] };
        }
    }
    renderTodoIdioma();
}

// El armador "Itinerario Principal" se resetea a una fila vacía en cada cambio de idioma,
// deliberadamente: es estado efímero que hoy tampoco sobrevive a un refresh de página, y
// mezclar módulos de dos idiomas en el mismo PDF no tiene sentido de negocio.
function renderTodoIdioma() {
    renderModulosTable();
    renderPaginasFijasTable();
    renderHistorialGeneradosTable();
    loadFixedSections();
    renderPaquetesListItinerario();
    renderAplicarPaqueteSelectItinerario();
    document.getElementById('itinerary-builder-body').innerHTML = '';
    addItineraryBuilderRow('itinerary-builder-body', true);
}

// ===== Tabla de Módulos Existentes =====
// Clasificación de varios módulos a la vez: cambiar el select de Destino/Categoría de una
// fila NO guarda al toque — solo lo marca como pendiente acá. Un botón flotante (fijo en la
// pantalla, visible aunque haya muchas filas y estés scrolleado) guarda todos los pendientes
// en un solo viaje al servidor, que solo toca esos IDs puntuales (no recorre el catálogo).
let modulosCambiosPendientes = new Map();

function actualizarBotonGuardarModulos() {
    const btn = document.getElementById('modulos-guardar-flotante');
    const n = modulosCambiosPendientes.size;
    btn.classList.toggle('hidden', n === 0);
    document.getElementById('modulos-guardar-count').textContent = n;
}

function renderModulosTable() {
    const tbody = document.getElementById('itinerario-modulos-table-body');
    const term = modulosFiltro.trim().toLowerCase();
    const visibles = modulosActivos().filter(it => {
        if (term && !it.titulo.toLowerCase().includes(term)) return false;
        return true;
    });
    tbody.innerHTML = '';
    modulosCambiosPendientes.clear();
    actualizarBotonGuardarModulos();
    if (visibles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400 text-sm">No hay módulos en esta vista.</td></tr>';
        return;
    }
    visibles.forEach(it => tbody.appendChild(buildModuloRow(it)));
}

function buildModuloRow(it) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-slate-50';
    tr.innerHTML = `
        <td class="p-2 font-medium text-slate-700">${it.titulo}</td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-destino-select"></select></td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-categoria-select" disabled></select></td>
        <td class="p-2 text-slate-500 text-xs">${it.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <div class="inline-flex flex-col items-center align-middle mr-2">
                <a href="${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(it.filename)}" target="_blank" rel="noopener" class="text-cyan-600 hover:text-cyan-800 modulo-ver-btn" title="Ver PDF"><i class="fas fa-eye"></i></a>
                ${it.archivo_existe === false ? '<span class="text-[10px] leading-none text-red-500 mt-0.5" title="El archivo no existe en el servidor">roto</span>' : ''}
            </div>
            <button class="text-slate-500 hover:text-slate-700 mr-2 modulo-editar-btn" title="Editar título"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700 modulo-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    const destinoSel = tr.querySelector('.module-destino-select');
    const categoriaSel = tr.querySelector('.module-categoria-select');
    llenarDestinosSelect(destinoSel, it.destino_id);
    llenarCategoriasSelect(categoriaSel, it.destino_id, it.categoria_id);

    const marcarPendiente = () => {
        modulosCambiosPendientes.set(it.id, { destino_id: destinoSel.value || null, categoria_id: categoriaSel.value || null });
        actualizarBotonGuardarModulos();
    };
    destinoSel.addEventListener('change', () => {
        llenarCategoriasSelect(categoriaSel, destinoSel.value, null);
        marcarPendiente();
    });
    categoriaSel.addEventListener('change', marcarPendiente);
    habilitarCreacionCategoria(categoriaSel, destinoSel);
    tr.querySelector('.modulo-editar-btn').addEventListener('click', () => tr.replaceWith(buildModuloEditRow(it)));
    tr.querySelector('.modulo-eliminar-btn').addEventListener('click', () => handleItineraryDelete(it.id));
    return tr;
}

function buildModuloEditRow(it) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-slate-50';
    tr.innerHTML = `
        <td class="p-2"><input type="text" class="w-full border rounded p-1 text-sm modulo-titulo-input" value="${it.titulo}"></td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-destino-select"></select></td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-categoria-select" disabled></select></td>
        <td class="p-2 text-slate-500 text-xs">${it.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2 modulo-guardar-btn" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600 modulo-cancelar-btn" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const tituloInput = tr.querySelector('.modulo-titulo-input');
    const destinoSel = tr.querySelector('.module-destino-select');
    const categoriaSel = tr.querySelector('.module-categoria-select');
    llenarDestinosSelect(destinoSel, it.destino_id);
    llenarCategoriasSelect(categoriaSel, it.destino_id, it.categoria_id);
    destinoSel.addEventListener('change', () => llenarCategoriasSelect(categoriaSel, destinoSel.value, null));
    habilitarCreacionCategoria(categoriaSel, destinoSel);

    tr.querySelector('.modulo-guardar-btn').addEventListener('click', () =>
        guardarModulo(it, tituloInput.value, destinoSel.value, categoriaSel.value));
    tr.querySelector('.modulo-cancelar-btn').addEventListener('click', () => tr.replaceWith(buildModuloRow(it)));
    return tr;
}

async function guardarModulo(it, titulo, destinoId, categoriaId) {
    titulo = titulo.trim();
    if (!titulo) { notifyError('El título es obligatorio.'); return; }
    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=actualizar-modulo&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.id, titulo, destino_id: destinoId || null, categoria_id: categoriaId || null })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        notifySuccess('Módulo actualizado.');
        await cargarIdioma(idiomaActivo);
        renderModulosTable();
    } catch (error) {
        notifyError('No se pudo actualizar el módulo: ' + error.message);
    }
}

document.getElementById('itinerary-module-destino').addEventListener('change', (e) => {
    llenarCategoriasSelect(document.getElementById('itinerary-module-categoria'), e.target.value, null);
});
habilitarCreacionCategoria(
    document.getElementById('itinerary-module-categoria'),
    document.getElementById('itinerary-module-destino')
);

document.getElementById('itinerario-modulos-search').addEventListener('input', (e) => {
    modulosFiltro = e.target.value;
    renderModulosTable();
});

document.getElementById('upload-local-module').addEventListener('click', () => {
    const titleInput = document.getElementById('itinerary-module-title');
    const fileInput = document.getElementById('itinerary-module-pdf');
    const destinoSel = document.getElementById('itinerary-module-destino');
    const categoriaSel = document.getElementById('itinerary-module-categoria');
    const titulo = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!titulo || !file) return notifyWarning('Completa el título y selecciona un PDF.');
    if (file.type !== 'application/pdf') return notifyWarning('Solo se permiten archivos PDF.');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('idioma', idiomaActivo);

    // El archivo se sube primero (upload.php); el registro en el catálogo se agrega
    // después con una operación atómica en el servidor (api.php?path=crear-modulo).
    fetch(`${ITINERARIO_API_BASE}upload.php`, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.error || 'Error desconocido al subir el archivo.');
        return fetch(`${ITINERARIO_API_BASE}api.php?path=crear-modulo&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                filename: data.filename,
                destino_id: destinoSel.value || null,
                categoria_id: categoriaSel.value || null
            })
        });
    })
    .then(response => response.json())
    .then(async (data) => {
        if (data.success) {
            await cargarIdioma(idiomaActivo);
            renderModulosTable();
            titleInput.value = '';
            fileInput.value = '';
            destinoSel.value = '';
            llenarCategoriasSelect(categoriaSel, '', null);
        } else {
            notifyError('Error al guardar la configuración: ' + (data.error || 'Desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        notifyError('Hubo un error: ' + error.message);
    });
});

async function handleItineraryDelete(id) {
    const modulo = modulosActivos().find(m => m.id === id);
    if (!modulo) return;
    if (!(await confirmAction(`¿Eliminar "${modulo.titulo}"?`))) return;

    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=eliminar-modulo&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        await cargarIdioma(idiomaActivo);
    } catch (error) {
        notifyError('No se pudo eliminar el módulo: ' + error.message);
        return;
    }

    renderModulosTable();
    loadFixedSections();
    renderPaquetesListItinerario();
    renderAplicarPaqueteSelectItinerario();
    marcarModulosFueraDeCatalogo();
}

// ===== Catálogo de Páginas Fijas (portada, legalidad, cierre...) =====
// Independiente del catálogo de Módulos: no se clasifican por destino/categoría, tienen
// su propio CRUD, y son la fuente de la que eligen los selectores de inicio/cierre más abajo.
function renderPaginasFijasTable() {
    const tbody = document.getElementById('paginas-fijas-table-body');
    const visibles = paginasFijasActivas();
    tbody.innerHTML = '';
    if (visibles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-3 text-center text-slate-400 text-sm">No hay páginas fijas todavía.</td></tr>';
        return;
    }
    visibles.forEach(p => tbody.appendChild(buildPaginaFijaRow(p)));
}

function buildPaginaFijaRow(p) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
        <td class="p-2 font-medium text-slate-700">${p.titulo}</td>
        <td class="p-2 text-slate-500 text-xs">${p.filename}</td>
        <td class="p-2 text-slate-500 text-xs">${p.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <div class="inline-flex flex-col items-center align-middle mr-2">
                <a href="${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(p.filename)}" target="_blank" rel="noopener" class="text-cyan-600 hover:text-cyan-800 pagina-fija-ver-btn" title="Ver PDF"><i class="fas fa-eye"></i></a>
                ${p.archivo_existe === false ? '<span class="text-[10px] leading-none text-red-500 mt-0.5" title="El archivo no existe en el servidor">roto</span>' : ''}
            </div>
            <button class="text-slate-500 hover:text-slate-700 mr-2 pagina-fija-editar-btn" title="Editar título"><i class="fas fa-pen"></i></button>
            <button class="text-red-500 hover:text-red-700 pagina-fija-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tr.querySelector('.pagina-fija-editar-btn').addEventListener('click', () => tr.replaceWith(buildPaginaFijaEditRow(p)));
    tr.querySelector('.pagina-fija-eliminar-btn').addEventListener('click', () => handlePaginaFijaDelete(p));
    return tr;
}

function buildPaginaFijaEditRow(p) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
        <td class="p-2"><input type="text" class="w-full border rounded p-1 text-sm pagina-fija-titulo-input" value="${p.titulo}"></td>
        <td class="p-2">
            <input type="file" accept=".pdf" class="w-full text-xs pagina-fija-pdf-input">
            <div class="text-slate-400" style="font-size:10px" title="Se mantiene si no eliges otro PDF">${p.filename}</div>
        </td>
        <td class="p-2 text-slate-500 text-xs">${p.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-emerald-600 hover:text-emerald-800 mr-2 pagina-fija-guardar-btn" title="Guardar"><i class="fas fa-check"></i></button>
            <button class="text-slate-400 hover:text-slate-600 pagina-fija-cancelar-btn" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    const tituloInput = tr.querySelector('.pagina-fija-titulo-input');
    const pdfInput = tr.querySelector('.pagina-fija-pdf-input');
    tr.querySelector('.pagina-fija-guardar-btn').addEventListener('click', () =>
        guardarPaginaFija(p, tituloInput.value, pdfInput.files[0] || null));
    tr.querySelector('.pagina-fija-cancelar-btn').addEventListener('click', () => tr.replaceWith(buildPaginaFijaRow(p)));
    return tr;
}

async function guardarPaginaFija(p, titulo, nuevoArchivo) {
    titulo = titulo.trim();
    if (!titulo) { notifyError('El título es obligatorio.'); return; }
    if (nuevoArchivo && nuevoArchivo.type !== 'application/pdf') {
        notifyWarning('Solo se permiten archivos PDF.');
        return;
    }
    try {
        let filename = null;
        if (nuevoArchivo) {
            const formData = new FormData();
            formData.append('pdf', nuevoArchivo);
            formData.append('idioma', idiomaActivo);
            const uploadRes = await fetch(`${ITINERARIO_API_BASE}upload.php`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error(uploadData.error || 'Error al subir el nuevo PDF.');
            filename = uploadData.filename;
        }

        const payload = { id: p.id, titulo };
        if (filename) payload.filename = filename;

        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=actualizar-pagina-fija&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        notifySuccess('Página fija actualizada.');
        await cargarIdioma(idiomaActivo);
        renderPaginasFijasTable();
        loadFixedSections();
    } catch (error) {
        notifyError('No se pudo actualizar la página fija: ' + error.message);
    }
}

document.getElementById('upload-pagina-fija').addEventListener('click', () => {
    const titleInput = document.getElementById('pagina-fija-titulo');
    const fileInput = document.getElementById('pagina-fija-pdf');
    const titulo = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!titulo || !file) return notifyWarning('Completa el título y selecciona un PDF.');
    if (file.type !== 'application/pdf') return notifyWarning('Solo se permiten archivos PDF.');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('idioma', idiomaActivo);

    fetch(`${ITINERARIO_API_BASE}upload.php`, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.error || 'Error desconocido al subir el archivo.');
        return fetch(`${ITINERARIO_API_BASE}api.php?path=crear-pagina-fija&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, filename: data.filename })
        });
    })
    .then(response => response.json())
    .then(async (data) => {
        if (data.success) {
            await cargarIdioma(idiomaActivo);
            renderPaginasFijasTable();
            titleInput.value = '';
            fileInput.value = '';
        } else {
            notifyError('Error al guardar la página fija: ' + (data.error || 'Desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        notifyError('Hubo un error: ' + error.message);
    });
});

async function handlePaginaFijaDelete(p) {
    if (!(await confirmAction(`¿Eliminar "${p.titulo}"?`))) return;

    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=eliminar-pagina-fija&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        await cargarIdioma(idiomaActivo);
    } catch (error) {
        notifyError('No se pudo eliminar la página fija: ' + error.message);
        return;
    }

    renderPaginasFijasTable();
    loadFixedSections();
}

// ===== Páginas Fijas: config de inicio/cierre (Presentación / Cierre) =====
function loadFixedSections() {
    const startBody = document.getElementById('start-builder-body');
    const endBody = document.getElementById('end-builder-body');
    startBody.innerHTML = '';
    endBody.innerHTML = '';
    fixedStartFilesActivos().forEach(file => addItineraryBuilderRow('start-builder-body', false, file));
    fixedEndFilesActivos().forEach(file => addItineraryBuilderRow('end-builder-body', false, file));
}

document.getElementById('save-default-config').addEventListener('click', async () => {
    const startFiles = Array.from(document.querySelectorAll('#start-builder-body .module-filename')).map(s => s.value).filter(Boolean);
    const endFiles = Array.from(document.querySelectorAll('#end-builder-body .module-filename')).map(s => s.value).filter(Boolean);

    try {
        const response = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-config&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startFiles, endFiles })
        });
        const result = await response.json();
        if (result.success) {
            notifySuccess('Configuración guardada como predeterminada.');
            if (idiomaCache[idiomaActivo]) {
                idiomaCache[idiomaActivo].fixedStartFiles = startFiles;
                idiomaCache[idiomaActivo].fixedEndFiles = endFiles;
            }
            marcarModulosFueraDeCatalogo();
        } else {
            notifyError('Error al guardar la configuración: ' + (result.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error:', error);
        notifyError('Hubo un error al guardar la configuración.');
    }
});

// <select> plano de páginas fijas: a diferencia de los módulos, una página fija nunca se
// clasifica por destino/categoría, así que no tiene sentido obligar a navegar un árbol
// Destino → Categoría para elegirla — solo importa en qué orden queda en la lista.
function buildPaginaFijaSelect(selectedFile) {
    const select = document.createElement('select');
    select.className = 'module-filename w-full border rounded p-2 bg-white';
    const opciones = paginasFijasActivas().slice().sort((a, b) => a.titulo.localeCompare(b.titulo));
    let optionsHtml = '<option value="">Selecciona una página fija...</option>' +
        opciones.map(p => `<option value="${p.filename}" ${p.filename === selectedFile ? 'selected' : ''}>${p.titulo}</option>`).join('');
    if (selectedFile && !opciones.some(p => p.filename === selectedFile)) {
        optionsHtml += `<option value="${selectedFile}" selected>${selectedFile} (fuera de catálogo)</option>`;
    }
    select.innerHTML = optionsHtml;
    return select;
}

// Arma una fila del armador. Para módulos usa el selector en cascada Destino → Categoría →
// Módulo + un input oculto con el filename resuelto; para páginas fijas (start/end) usa el
// <select> plano de arriba directamente, sin input oculto — ambos casos exponen la clase
// .module-filename con el filename como .value, que es lo que leen el resto de las
// funciones (guardar config, armar paquete, generar PDF).
function addItineraryBuilderRow(targetBodyId, isMainItinerary = false, selectedFile = null) {
    const tbody = document.getElementById(targetBodyId);
    const tr = document.createElement('tr');
    tr.className = 'draggable border-b';

    const esPaginaFija = targetBodyId === 'start-builder-body' || targetBodyId === 'end-builder-body';
    let selectorEl, hiddenInput = null;
    if (esPaginaFija) {
        selectorEl = buildPaginaFijaSelect(selectedFile);
    } else {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.className = 'module-filename';
        hiddenInput.value = selectedFile || '';
        selectorEl = buildClasificacionSelector(itinerarioHelpersModulos, 'Selecciona un módulo...', selectedFile, (filename) => {
            hiddenInput.value = filename;
        });
    }

    let cellsHtml = `<td class="p-2"><span class="cursor-grab text-slate-400"><i class="fas fa-grip-vertical"></i></span></td>`;
    if (isMainItinerary) {
        cellsHtml += `<td class="p-2"><input type="text" class="w-full text-center day-number bg-slate-100 rounded p-1" readonly></td>`;
    }
    cellsHtml += `<td class="p-2 module-cell"></td>
                 <td class="p-2 text-center">
                    <button class="text-red-500 remove-row-btn"><i class="fas fa-trash-alt"></i></button>
                 </td>`;

    tr.innerHTML = cellsHtml;
    const moduleCell = tr.querySelector('.module-cell');
    moduleCell.appendChild(selectorEl);
    if (hiddenInput) moduleCell.appendChild(hiddenInput);
    tr.querySelector('.remove-row-btn').addEventListener('click', () => {
        tr.remove();
        recalculateDayNumbers();
    });

    tbody.appendChild(tr);
    if (isMainItinerary) recalculateDayNumbers();
    itinAddDragHandlers(tr);
}

// Tras eliminar un módulo del catálogo, actualiza la etiqueta de cualquier fila (armador
// principal o paquete en edición) que todavía lo tuviera seleccionado. Las filas de
// inicio/cierre eligen de otro catálogo (páginas fijas) y no pasan por aquí: su propio
// handlePaginaFijaDelete ya recarga loadFixedSections() con la config depurada.
function marcarModulosFueraDeCatalogo() {
    const filenamesVigentes = new Set(modulosActivos().map(m => m.filename));
    document.querySelectorAll('.module-filename, .itinerario-paquete-row-filename').forEach(hidden => {
        if (hidden.closest('#start-builder-body, #end-builder-body')) return;
        if (!hidden.value || filenamesVigentes.has(hidden.value)) return;
        const cascadeLabel = hidden.parentElement?.querySelector('.cascade-select-label');
        if (cascadeLabel && !cascadeLabel.textContent.includes('(fuera de catálogo)')) {
            cascadeLabel.textContent = hidden.value + ' (fuera de catálogo)';
        }
    });
}

function recalculateDayNumbers() {
    const rows = document.querySelectorAll('#itinerary-builder-body tr');
    rows.forEach((row, index) => {
        const dayInput = row.querySelector('.day-number');
        if (dayInput) dayInput.value = `Día ${index + 1}`;
    });
}

function itinAddDragHandlers(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', () => { row.classList.add('opacity-60'); window._dragging = row; });
    row.addEventListener('dragend', () => { row.classList.remove('opacity-60'); if (row.closest('tbody').id === 'itinerary-builder-body') recalculateDayNumbers(); });
}

function itinSetupDragDrop() {
    document.querySelectorAll('tbody').forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = itinGetDragAfterElement(container, e.clientY);
            const draggable = window._dragging;
            if (draggable && container.id === draggable.closest('tbody').id) {
                afterElement ? container.insertBefore(draggable, afterElement) : container.appendChild(draggable);
            }
        });
    });
}

function itinGetDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('tr.draggable:not(.opacity-60)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ===== Paquetes de Itinerario (combos reutilizables para el armador) =====
function agregarFilaPaqueteItinerario(filename) {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center itinerario-paquete-builder-row';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.className = 'itinerario-paquete-row-filename';
    hiddenInput.value = filename || '';

    const selector = buildClasificacionSelector(itinerarioHelpersModulos, 'Selecciona un módulo...', filename || '', (fn) => {
        hiddenInput.value = fn;
    });
    selector.classList.add('flex-1');

    const delBtn = document.createElement('button');
    delBtn.className = 'text-red-500 small';
    delBtn.title = 'Quitar';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', () => row.remove());

    row.append(selector, hiddenInput, delBtn);
    document.getElementById('itinerario-paquete-builder-rows').appendChild(row);
}

function resetItinerarioPaqueteBuilder() {
    document.getElementById('itinerario-paquete-nombre').value = '';
    document.getElementById('itinerario-paquete-builder-rows').innerHTML = '';
    agregarFilaPaqueteItinerario();
    itinerarioPaqueteEditandoId = null;
    document.getElementById('itinerario-paquete-cancelar-edicion').classList.add('hidden');
}

async function guardarPaqueteItinerario() {
    const nombre = document.getElementById('itinerario-paquete-nombre').value.trim();
    if (!nombre) { notifyError('El nombre del itinerario predeterminado es obligatorio.'); return; }
    const modulos = Array.from(document.querySelectorAll('.itinerario-paquete-row-filename')).map(i => i.value).filter(Boolean);
    if (modulos.length === 0) { notifyError('Agrega al menos un módulo al itinerario predeterminado.'); return; }
    try {
        const payload = { nombre, modulos };
        if (itinerarioPaqueteEditandoId) payload.id = itinerarioPaqueteEditandoId;
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-paquete&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(itinerarioPaqueteEditandoId ? 'Itinerario predeterminado actualizado.' : 'Itinerario predeterminado guardado.');
        resetItinerarioPaqueteBuilder();
        await cargarIdioma(idiomaActivo);
        renderPaquetesListItinerario();
        renderAplicarPaqueteSelectItinerario();
    } catch (e) {
        notifyError('Error al guardar el itinerario predeterminado: ' + e.message);
    }
}

function editarPaqueteItinerario(paquete) {
    document.getElementById('itinerario-paquete-nombre').value = paquete.nombre;
    document.getElementById('itinerario-paquete-builder-rows').innerHTML = '';
    paquete.modulos.forEach(filename => agregarFilaPaqueteItinerario(filename));
    itinerarioPaqueteEditandoId = paquete.id;
    document.getElementById('itinerario-paquete-cancelar-edicion').classList.remove('hidden');
}

async function eliminarPaqueteItinerario(paquete) {
    if (!await confirmAction(`¿Eliminar el itinerario predeterminado "${paquete.nombre}"?`)) return;
    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=eliminar-paquete&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: paquete.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Itinerario predeterminado eliminado.');
        if (itinerarioPaqueteEditandoId === paquete.id) resetItinerarioPaqueteBuilder();
        await cargarIdioma(idiomaActivo);
        renderPaquetesListItinerario();
        renderAplicarPaqueteSelectItinerario();
    } catch (e) {
        notifyError('Error al eliminar el itinerario predeterminado: ' + e.message);
    }
}

function renderPaquetesListItinerario() {
    const container = document.getElementById('itinerario-paquetes-list');
    container.innerHTML = '';
    const paquetes = paquetesActivos();
    if (paquetes.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm">Sin itinerarios predeterminados guardados.</p>';
        return;
    }
    paquetes.forEach(p => {
        const preview = p.modulos.map(filename => {
            const m = modulosActivos().find(x => x.filename === filename);
            return m ? m.titulo : filename;
        }).join(' → ');
        const div = document.createElement('div');
        div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap';
        div.innerHTML = `
            <div class="min-w-0">
                <div class="font-medium">${p.nombre}</div>
                <div class="text-xs text-slate-500 truncate">${preview}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button class="btn btn-primary small itinerario-paquete-aplicar-btn"><i class="fas fa-check mr-1"></i>Aplicar</button>
                <button class="text-slate-500 hover:text-slate-700 itinerario-paquete-editar-btn" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="text-red-500 hover:text-red-700 itinerario-paquete-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        `;
        div.querySelector('.itinerario-paquete-aplicar-btn').addEventListener('click', () => aplicarPaqueteItinerario(p));
        div.querySelector('.itinerario-paquete-editar-btn').addEventListener('click', () => editarPaqueteItinerario(p));
        div.querySelector('.itinerario-paquete-eliminar-btn').addEventListener('click', () => eliminarPaqueteItinerario(p));
        container.appendChild(div);
    });
}

function renderAplicarPaqueteSelectItinerario() {
    const select = document.getElementById('itinerario-aplicar-paquete-select');
    select.innerHTML = '<option value="">Aplicar itinerario predeterminado...</option>';
    paquetesActivos().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        select.appendChild(opt);
    });
}

// Si el armador solo tiene la fila vacía inicial (sin nada elegido), se descarta antes de
// agregar el itinerario predeterminado o del historial — si no, esa fila en blanco cuenta
// como "Día 1" y todo lo demás se corre un día. Si el usuario ya venía armando algo a mano,
// no se le borra nada: se agrega a continuación, igual que antes.
function descartarFilaVaciaInicial() {
    const body = document.getElementById('itinerary-builder-body');
    const filasVacias = [...body.querySelectorAll('.module-filename')].every(el => !el.value);
    if (filasVacias) body.innerHTML = '';
}

function aplicarPaqueteItinerario(paquete) {
    descartarFilaVaciaInicial();
    paquete.modulos.forEach(filename => addItineraryBuilderRow('itinerary-builder-body', true, filename));
    recalculateDayNumbers();
}

document.getElementById('itinerario-paquete-add-row').addEventListener('click', () => agregarFilaPaqueteItinerario());
document.getElementById('itinerario-paquete-guardar').addEventListener('click', guardarPaqueteItinerario);
document.getElementById('itinerario-paquete-cancelar-edicion').addEventListener('click', resetItinerarioPaqueteBuilder);
document.getElementById('itinerario-aplicar-paquete-select').addEventListener('change', (e) => {
    if (!e.target.value) return;
    const paquete = paquetesActivos().find(p => p.id == e.target.value);
    if (paquete) aplicarPaqueteItinerario(paquete);
    e.target.value = '';
});

document.getElementById('itinerario-limpiar-builder').addEventListener('click', () => {
    document.getElementById('itinerary-builder-body').innerHTML = '';
    addItineraryBuilderRow('itinerary-builder-body', true);
});

// ===== "Historial" junto al select de Itinerario Predeterminado: reusa la lista de
// módulos (día a día) de un itinerario ya generado antes, igual que "Aplicar" con un
// itinerario predeterminado pero sacando la lista del historial en vez de un paquete
// guardado a mano. Mismo patrón que el historial de Tours del Cotizador. =====
const ITINERARIO_HISTORIAL_PAGE_SIZE = 10;
// Paginación y búsqueda 100% client-side sobre lo ya cargado en historialGeneradosActivo()
// (hasta 500 registros por idioma, ver 'historial-generados' en api.php) — mismo criterio
// que el resto del historial de Itinerarios: no vale la pena un viaje al servidor por esto.
let itinerarioHistorialReusarState = { term: '', offset: 0 };

function abrirHistorialReusar() {
    document.getElementById('itinerario-historial-modal').style.display = 'block';
    itinerarioHistorialReusarState = { term: '', offset: 0 };
    document.getElementById('itinerario-historial-search').value = '';
    renderHistorialReusarList();
}
function cerrarHistorialReusar() {
    document.getElementById('itinerario-historial-modal').style.display = 'none';
}
function renderHistorialReusarList() {
    const container = document.getElementById('itinerario-historial-reusar-list');
    const term = itinerarioHistorialReusarState.term.trim().toLowerCase();
    const conModulos = historialGeneradosActivo()
        .filter(g => Array.isArray(g.modulos) && g.modulos.length > 0)
        .filter(g => !term || `${g.pasajero} ${g.titulo}`.toLowerCase().includes(term));
    const total = conModulos.length;
    const pagina = conModulos.slice(itinerarioHistorialReusarState.offset, itinerarioHistorialReusarState.offset + ITINERARIO_HISTORIAL_PAGE_SIZE);
    container.innerHTML = '';
    if (total === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm text-center py-6">${term ? 'Sin resultados.' : 'Todavía no hay itinerarios generados con días para reusar.'}</p>`;
    } else {
        pagina.forEach(g => {
            const preview = g.modulos.map(filename => {
                const m = modulosActivos().find(x => x.filename === filename);
                return m ? m.titulo : filename;
            }).join(' → ');
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3';
            div.innerHTML = `
                <div class="min-w-0">
                    <div class="font-medium truncate">${g.pasajero} — ${g.titulo}</div>
                    <div class="text-xs text-slate-500 truncate">${g.modulos.length} día(s): ${preview}</div>
                </div>
                <button class="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 hover:border-cyan-600 hover:text-cyan-700 transition flex-shrink-0">Reusar</button>
            `;
            div.querySelector('button').addEventListener('click', () => reusarHistorialGenerado(g));
            container.appendChild(div);
        });
    }
    const shown = itinerarioHistorialReusarState.offset + pagina.length;
    document.getElementById('itinerario-historial-page-info').textContent = total === 0 ? '' : `${itinerarioHistorialReusarState.offset + 1}-${shown} de ${total}`;
    document.getElementById('itinerario-historial-prev').disabled = itinerarioHistorialReusarState.offset === 0;
    document.getElementById('itinerario-historial-next').disabled = shown >= total;
}
function reusarHistorialGenerado(g) {
    descartarFilaVaciaInicial();
    g.modulos.forEach(filename => addItineraryBuilderRow('itinerary-builder-body', true, filename));
    recalculateDayNumbers();
    cerrarHistorialReusar();
    notifySuccess(`Se agregaron ${g.modulos.length} día(s) de "${g.pasajero} — ${g.titulo}".`);
}
document.getElementById('itinerario-historial-btn').addEventListener('click', abrirHistorialReusar);
document.getElementById('itinerario-historial-close').addEventListener('click', cerrarHistorialReusar);
document.getElementById('itinerario-historial-search').addEventListener('input', (e) => {
    itinerarioHistorialReusarState.term = e.target.value;
    itinerarioHistorialReusarState.offset = 0;
    renderHistorialReusarList();
});
document.getElementById('itinerario-historial-prev').addEventListener('click', () => {
    itinerarioHistorialReusarState.offset = Math.max(0, itinerarioHistorialReusarState.offset - ITINERARIO_HISTORIAL_PAGE_SIZE);
    renderHistorialReusarList();
});
document.getElementById('itinerario-historial-next').addEventListener('click', () => {
    itinerarioHistorialReusarState.offset += ITINERARIO_HISTORIAL_PAGE_SIZE;
    renderHistorialReusarList();
});

// ===== Historial de Itinerarios Generados =====
// Cada PDF armado en "Generar Itinerario" queda registrado aquí (ver handleGenerateItinerary
// más abajo, que sube el PDF y llama a guardar-generado tras armarlo). Los filtros son
// client-side sobre lo ya cargado para este idioma — no hay razón para ida y vuelta al
// servidor por cada tecleo, el volumen esperado no lo justifica.
function actualizarFiltroAgenciaHistorial() {
    const select = document.getElementById('historial-filtro-agencia');
    const seleccionActual = select.value;
    const nombres = [...new Set(historialGeneradosActivo().map(g => g.generado_por_nombre).filter(Boolean))].sort();
    select.innerHTML = '<option value="">Todos</option>' +
        nombres.map(n => `<option value="${n}">${n}</option>`).join('');
    if (nombres.includes(seleccionActual)) select.value = seleccionActual;
}

function renderHistorialGeneradosTable() {
    actualizarFiltroAgenciaHistorial();
    const tbody = document.getElementById('historial-generados-table-body');
    const texto = historialFiltro.texto.trim().toLowerCase();
    const visibles = historialGeneradosActivo().filter(g => {
        if (texto && !g.pasajero.toLowerCase().includes(texto) && !g.titulo.toLowerCase().includes(texto)) return false;
        if (historialFiltro.agencia && g.generado_por_nombre !== historialFiltro.agencia) return false;
        const fecha = g.generado_en.slice(0, 10);
        if (historialFiltro.desde && fecha < historialFiltro.desde) return false;
        if (historialFiltro.hasta && fecha > historialFiltro.hasta) return false;
        return true;
    });
    tbody.innerHTML = '';
    if (visibles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400 text-sm">No hay itinerarios generados con estos filtros.</td></tr>';
        return;
    }
    visibles.forEach(g => tbody.appendChild(buildHistorialGeneradoRow(g)));
}

function buildHistorialGeneradoRow(g) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    const fecha = new Date(g.generado_en.replace(' ', 'T')).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    const url = `${ITINERARIO_API_BASE}./uploads/${idiomaActivo}/generados/${encodeURIComponent(g.filename)}`;
    tr.innerHTML = `
        <td class="p-2 font-medium text-slate-700">${g.pasajero}</td>
        <td class="p-2">${g.titulo}</td>
        <td class="p-2 text-slate-500 text-xs">${g.generado_por_nombre || '—'}</td>
        <td class="p-2 text-slate-500 text-xs">${fecha}</td>
        <td class="p-2 text-right whitespace-nowrap">
            <button class="text-slate-500 hover:text-slate-700 mr-2 historial-preview-btn" title="Vista previa"><i class="fas fa-eye"></i></button>
            <a href="${url}" target="_blank" rel="noopener" class="text-cyan-600 hover:text-cyan-800" title="Descargar"><i class="fas fa-download"></i></a>
        </td>
    `;
    tr.querySelector('.historial-preview-btn').addEventListener('click', () => {
        abrirVistaPreviaPDF(url, () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `Itinerario - ${g.pasajero}.pdf`;
            a.click();
        }, `${g.pasajero} — ${g.titulo}`);
    });
    return tr;
}

document.getElementById('historial-filtro-texto').addEventListener('input', (e) => {
    historialFiltro.texto = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-agencia').addEventListener('change', (e) => {
    historialFiltro.agencia = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-desde').addEventListener('change', (e) => {
    historialFiltro.desde = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-hasta').addEventListener('change', (e) => {
    historialFiltro.hasta = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-limpiar').addEventListener('click', () => {
    historialFiltro = { texto: '', agencia: '', desde: '', hasta: '' };
    document.getElementById('historial-filtro-texto').value = '';
    document.getElementById('historial-filtro-agencia').value = '';
    document.getElementById('historial-filtro-desde').value = '';
    document.getElementById('historial-filtro-hasta').value = '';
    renderHistorialGeneradosTable();
});

// ===================================================================
// FUNCIÓN handleGenerateItinerary (VERSIÓN ROBUSTA Y SECUENCIAL)
// ===================================================================
async function handleGenerateItinerary() {
    const passengerName = document.getElementById('itinerary-passenger').value || 'Viajero';
    // Embebido en Cotizador, el título ya se autogenera a partir del Nombre PAX (el campo
    // queda oculto, ver cotizador.js) — el fallback acá es solo para el caso standalone si
    // alguien lo deja en blanco a mano, en vez de bloquear la generación con una advertencia.
    const packageTitle = document.getElementById('itinerary-title').value || `Itinerario de ${passengerName}`;

    showLoadingModal();
    updateProgress(10, 'Preparando PDF...');
    await loadFonts(true);

    const { PDFDocument, rgb } = PDFLib;
    // Capturado al inicio: si el usuario cambia de pestaña de idioma mientras se genera
    // (el armador ya se reseteó, pero por si acaso), el PDF sigue usando el idioma con el
    // que arrancó la generación, nunca una mezcla.
    const idiomaPdf = idiomaActivo;

    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const getFiles = selector => Array.from(document.querySelectorAll(selector)).map(s => s.value).filter(Boolean);
        const startFiles = getFiles('#start-builder-body .module-filename');
        const bodyFiles = getFiles('#itinerary-builder-body .module-filename');
        const endFiles = getFiles('#end-builder-body .module-filename');

        const allFilesToProcess = [
            ...startFiles.map(filename => ({ filename, type: 'start' })),
            ...bodyFiles.map(filename => ({ filename, type: 'body' })),
            ...endFiles.map(filename => ({ filename, type: 'end' }))
        ];

        if (allFilesToProcess.length === 0) {
            hideLoadingModal();
            return notifyWarning('Selecciona al menos un módulo.');
        }

        updateProgress(20, 'Cargando fuentes...');
        let charlotteFont = await pdfDoc.embedFont(charlotteFontBytes || 'Helvetica-Bold');
        let janoFont = await pdfDoc.embedFont(janoFontBytes || 'Helvetica-Bold');

        let dayCounterForPdf = 1;
        let isFirstPageOfAll = true;
        let totalFiles = allFilesToProcess.length;

        // Bucle único que procesa un archivo a la vez de forma garantizada
        for (let i = 0; i < totalFiles; i++) {
            const fileInfo = allFilesToProcess[i];
            const { filename, type } = fileInfo;
            const progress = 30 + (i / totalFiles * 65);
            updateProgress(progress, `Procesando ${i + 1} de ${totalFiles}: ${filename}`);

            const pdfUrl = `${ITINERARIO_API_BASE}./uploads/${idiomaPdf}/${encodeURIComponent(filename)}`;
            const res = await fetch(pdfUrl);
            if (!res.ok) {
                throw new Error(`Módulo no encontrado: "${filename}" (${res.status}). El archivo PDF no está subido en el servidor para el idioma "${idiomaPdf}".`);
            }
            const bytes = await res.arrayBuffer();
            const tempDoc = await PDFDocument.load(bytes);
            const copiedPages = await pdfDoc.copyPages(tempDoc, tempDoc.getPageIndices());

            for (const page of copiedPages) {
                if (type === 'start' && isFirstPageOfAll) {
                    const { width, height } = page.getSize();
                    const centerX = width / 2;
                    const centerY = height / 2;
                    page.drawText(passengerName, {
                        x: centerX - (charlotteFont.widthOfTextAtSize(passengerName, 49) / 2),
                        y: centerY + 330, size: 49, font: charlotteFont, color: rgb(1, 1, 1)
                    });
                    page.drawText(packageTitle, {
                        x: centerX - (janoFont.widthOfTextAtSize(packageTitle, 19) / 2),
                        y: centerY - 60, size: 19, font: janoFont, color: rgb(1, 1, 1)
                    });
                    isFirstPageOfAll = false;
                }

                if (type === 'body') {
                    const { width, height } = page.getSize();
                    page.drawText(`${dayCounterForPdf}`, {
                        x: 65, y: height - 96,
                        size: 28, font: janoFont, color: rgb(1, 1, 1)
                    });
                }

                pdfDoc.addPage(page);
            }

            if (type === 'body') {
                dayCounterForPdf++;
            }
        }

        updateProgress(95, 'Finalizando PDF...');
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const nombreArchivo = `Itinerario - ${passengerName}.pdf`;

        // Ya no se guarda nada todavía: primero se muestra la vista previa. Solo si el
        // usuario le da "Descargar PDF" (revisó el resultado y está conforme) se sube y
        // se registra en el historial — así un intento que se descarta con "Seguir
        // editando" no deja basura en el historial.
        let yaGuardadoEnHistorial = false;
        const descargarYGuardar = async () => {
            saveAs(blob, nombreArchivo);
            // Si le da "Descargar" varias veces en la misma vista previa (para bajarlo de
            // nuevo, por ejemplo), no hay que duplicar el registro en el historial.
            if (yaGuardadoEnHistorial) return;
            try {
                const historyForm = new FormData();
                historyForm.append('pdf', blob, nombreArchivo);
                historyForm.append('idioma', idiomaPdf);
                historyForm.append('carpeta', 'generados');
                const uploadRes = await fetch(`${ITINERARIO_API_BASE}upload.php`, { method: 'POST', body: historyForm });
                const uploadData = await uploadRes.json();
                if (!uploadData.success) throw new Error(uploadData.error || 'No se pudo subir el PDF al historial.');

                const guardarRes = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-generado&idioma=${idiomaPdf}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pasajero: passengerName, titulo: packageTitle, filename: uploadData.filename, modulos: bodyFiles })
                });
                const guardarData = await guardarRes.json();
                if (!guardarData.success) throw new Error(guardarData.error || 'No se pudo registrar en el historial.');
                yaGuardadoEnHistorial = true;

                if (idiomaCache[idiomaPdf]) {
                    idiomaCache[idiomaPdf].generados = [guardarData.registro, ...(idiomaCache[idiomaPdf].generados || [])];
                }
                if (idiomaPdf === idiomaActivo) renderHistorialGeneradosTable();
            } catch (historyError) {
                console.error('No se pudo guardar el itinerario en el historial:', historyError);
                notifyWarning('El PDF se descargó, pero no se pudo guardar en el historial: ' + historyError.message);
            }
        };

        updateProgress(100, 'PDF generado con éxito');
        await new Promise(resolve => setTimeout(resolve, 400));
        abrirVistaPreviaPDF(URL.createObjectURL(blob), descargarYGuardar, nombreArchivo, { seguirEditando: true });

    } catch (error) {
        console.error('Error al generar PDF:', error);
        notifyError('Error al generar PDF: ' + error.message);
    } finally {
        hideLoadingModal();
    }
}

// ===== Pestañas principales (Itinerario / Gestión de Módulos) =====
document.querySelectorAll('#itinerario-main-tabs .nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('#itinerario-main-tabs .nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-section`).classList.remove('hidden');
    });
});

document.querySelectorAll('#itinerario-gestion-subtabs .subnav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('#itinerario-gestion-subtabs .subnav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`itinerario-gestion-${tab.dataset.subtab}`).classList.remove('hidden');
    });
});

// ===== Pestañas de idioma =====
document.querySelectorAll('.idioma-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        if (tab.dataset.idioma === idiomaActivo) return;
        document.querySelectorAll('.idioma-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await activarIdioma(tab.dataset.idioma);
    });
});

// === Inicializar ===
document.getElementById('add-start-row').addEventListener('click', () => addItineraryBuilderRow('start-builder-body'));
document.getElementById('add-itinerary-row').addEventListener('click', () => addItineraryBuilderRow('itinerary-builder-body', true));
document.getElementById('add-end-row').addEventListener('click', () => addItineraryBuilderRow('end-builder-body'));
document.getElementById('generate-itinerary').addEventListener('click', handleGenerateItinerary);
itinSetupDragDrop();

// Envuelto en una función invocable (en vez de solo un listener de 'load') para que
// Cotizador pueda llamarla desde su propio init(), pasándole el idioma que ya eligió el
// usuario en Datos Pax en vez del 'en' fijo de la página standalone. Es segura de invocar
// una sola vez — no hay guarda de re-entrada porque nada más la llama más de una vez.
let itinerarioInicializado = false;
async function initItinerario(idiomaInicial) {
    if (itinerarioInicializado) return;
    itinerarioInicializado = true;
    await cargarDestinosYCategorias();
    llenarDestinosSelect(document.getElementById('itinerary-module-destino'));
    resetItinerarioPaqueteBuilder();
    await activarIdioma(idiomaInicial || 'en');
    loadFonts(false);
}

// En la página standalone (itinerario/index.php) arranca sola, igual que siempre. Cuando
// este archivo se embebe en Cotizador, window.ITINERARIO_API_BASE ya viene definido y es
// Cotizador quien llama a initItinerario() explícitamente desde su propio init().
if (!window.ITINERARIO_API_BASE) {
    window.addEventListener('load', () => initItinerario('en'));
}

// Guarda de una sola vez todas las clasificaciones Destino/Categoría de Módulos pendientes
// (marcadas al tocar los selects de cada fila) — un solo request al servidor.
document.getElementById('modulos-guardar-flotante').addEventListener('click', async () => {
    if (modulosCambiosPendientes.size === 0) return;
    const cambios = Array.from(modulosCambiosPendientes, ([id, v]) => ({ id, ...v }));
    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-clasificaciones-modulos&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cambios })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        notifySuccess(`${data.actualizados} módulo(s) actualizado(s).`);
        await cargarIdioma(idiomaActivo);
        renderModulosTable();
    } catch (error) {
        notifyError('No se pudo guardar la clasificación: ' + error.message);
    }
});
