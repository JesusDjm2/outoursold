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
// Destinos de Itinerarios: solo los de Con / Sin pernocte (con grupo; los sin grupo son
// de Actividades / Hoteles). Como cada grupo puede tener su propio "Cusco", el nombre lleva
// el grupo ("Cusco · Con pernocte") para distinguirlos en selects y en el desplegable del
// armador. Copias nuevas: no se toca el destinosData compartido con la página.
const GRUPOS_DESTINO_NOMBRE = { 1: 'Con pernocte', 2: 'Sin pernocte' }; // ids fijos (migración 032)
function destinosDeItinerarios(lista) {
    return (Array.isArray(lista) ? lista : [])
        .filter(d => d.grupo_id != null)
        .map(d => ({ ...d, nombre: `${d.nombre} · ${GRUPOS_DESTINO_NOMBRE[d.grupo_id] || 'Grupo ' + d.grupo_id}` }));
}

async function cargarDestinosYCategorias() {
    try {
        const categoriasPromise = fetch(`${ITINERARIO_API_BASE}api.php?path=categorias-itinerarios`).then(r => r.json());
        // Itinerarios usa solo los destinos de Con / Sin pernocte (con grupo); los sin grupo
        // son de Actividades / Hoteles.
        if (typeof destinosData !== 'undefined' && Array.isArray(destinosData)) {
            itinDestinosData = destinosDeItinerarios(destinosData);
            itinCategoriasData = await categoriasPromise;
        } else {
            const [destinos, categorias] = await Promise.all([
                fetch(`${ITINERARIO_API_BASE}../usd/api.php?path=destinos`).then(r => r.json()),
                categoriasPromise
            ]);
            itinDestinosData = destinosDeItinerarios(destinos);
            itinCategoriasData = categorias;
        }
    } catch (error) {
        console.error('Error al cargar destinos/categorías:', error);
        itinDestinosData = [];
        itinCategoriasData = [];
    }
}

// Para Gestión de Datos > Destinos y Categorías (shared/cotizador.js), que cuenta cuántos
// módulos hay por destino/categoría en los 3 idiomas: usa el catálogo ya cacheado del
// idioma si lo hay, o si no pide solo los módulos (sin cargar el resto del idioma).
async function obtenerModulosIdioma(idioma) {
    if (idiomaCache[idioma]) return idiomaCache[idioma].modules;
    return fetch(`${ITINERARIO_API_BASE}api.php?path=modulos&idioma=${idioma}`).then(r => r.json());
}
// Tras reasignar módulos desde Destinos y Categorías: si ese idioma ya estaba cargado se
// refresca su catálogo (armador, tablas de módulos) para que no muestre la clasificación vieja.
async function recargarModulosIdioma(idioma) {
    if (!idiomaCache[idioma]) return;
    await cargarIdioma(idioma);
    if (idioma === idiomaActivo) renderModulosTable();
}
async function refrescarCategoriasItinerario() {
    itinCategoriasData = await fetch(`${ITINERARIO_API_BASE}api.php?path=categorias-itinerarios`).then(r => r.json());
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
// Vista previa del PDF generado: solo existe donde hay armador (Cotizador y standalone),
// no en Gestión de Datos.
document.getElementById('itinerario-pdf-preview-close')?.addEventListener('click', cerrarVistaPreviaPDF);
document.getElementById('itinerario-pdf-preview-seguir-editando')?.addEventListener('click', cerrarVistaPreviaPDF);

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
    // No existe en Gestión de Datos — el armador día-a-día vive solo en Cotizador (y en la
    // página standalone).
    if (document.getElementById('itinerary-builder-body')) {
        document.getElementById('itinerary-builder-body').innerHTML = '';
        addItineraryBuilderRow('itinerary-builder-body', true);
    }
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
    if (!tbody) return; // no existe en Cotizador — la gestión de módulos vive en Gestión de Datos
    const term = modulosFiltro.trim().toLowerCase();
    const visibles = modulosActivos().filter(it => {
        if (term && !it.titulo.toLowerCase().includes(term)) return false;
        return true;
    });
    tbody.innerHTML = '';
    modulosCambiosPendientes.clear();
    actualizarBotonGuardarModulos();
    const contador = document.getElementById('itinerario-modulos-count');
    if (contador) contador.textContent = modulosActivos().length;
    if (visibles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="cat-empty">${term ? 'Sin resultados para tu búsqueda.' : 'Aún no tienes itinerarios en este idioma. Usa «Nuevo itinerario» para subir el primero.'}</td></tr>`;
        return;
    }
    visibles.forEach(it => tbody.appendChild(buildModuloRow(it)));
}

function buildModuloRow(it) {
    const tr = document.createElement('tr');
    // Mismo componente que las tablas de Tours/Hoteles de Gestión de Datos (shared/catalogo.css).
    const roto = it.archivo_existe === false;
    tr.innerHTML = `
        <td class="cat-col-name">
            <div class="itin-fila-nombre">
                ${miniaturaItinerario(it)}
                <div class="min-w-0">
                    <div class="cat-name">${escapeHtml(it.titulo)}</div>
                    <div class="cat-meta"><i class="fas fa-file-pdf mr-1"></i>${escapeHtml(it.filename)}${roto ? ' <span class="cat-badge is-danger ml-1" title="El archivo no existe en el servidor">PDF no encontrado</span>' : ''}</div>
                    <div class="itin-detalles">${indicadoresDetalleItinerario(it)}</div>
                </div>
            </div>
        </td>
        <td class="cat-col-clasif">
            <div class="cat-clasif">
                <select class="module-destino-select" title="Destino"></select>
                <select class="module-categoria-select" title="Categoría" disabled></select>
            </div>
        </td>
        <td class="cat-actions">
            <div class="cat-actions-inner">
                <a href="${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(it.filename)}" target="_blank" rel="noopener" class="cat-icon-btn is-view modulo-ver-btn${roto ? ' is-disabled' : ''}" title="Ver PDF"><i class="fas fa-eye"></i></a>
                <button type="button" class="cat-icon-btn modulo-editar-btn" title="Editar"><i class="fas fa-pen"></i></button>
                <button type="button" class="cat-icon-btn is-danger modulo-eliminar-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
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
    tr.querySelector('.modulo-editar-btn').addEventListener('click', () => abrirEditorItinerario(it));
    tr.querySelector('.modulo-eliminar-btn').addEventListener('click', () => handleItineraryDelete(it.id));
    return tr;
}

// ===== Detalle de un itinerario: imagen, Lugares a visitar, Incluye, No incluye (migración 036) =====
function urlImagenItinerario(imagen) {
    return `${ITINERARIO_API_BASE}uploads/${idiomaActivo}/imagenes/${encodeURIComponent(imagen)}`;
}

function miniaturaItinerario(it) {
    if (it.imagen && it.imagen_existe !== false) {
        return `<img src="${urlImagenItinerario(it.imagen)}" alt="" class="itin-miniatura" loading="lazy">`;
    }
    return `<div class="itin-miniatura is-vacia" title="${it.imagen ? 'La imagen no existe en el servidor' : 'Sin imagen'}"><i class="fas fa-image"></i></div>`;
}

// Chips de qué campos del detalle ya están cargados (los vacíos van atenuados).
function indicadoresDetalleItinerario(it) {
    const campos = [
        ['lugares_visitar', 'fa-location-dot', 'Lugares a visitar'],
        ['incluye', 'fa-circle-check', 'Incluye'],
        ['no_incluye', 'fa-circle-xmark', 'No incluye']
    ];
    return campos.map(([clave, icono, label]) => {
        const lleno = !!(it[clave] && it[clave].trim());
        return `<span class="itin-detalle-chip${lleno ? '' : ' is-vacio'}" title="${label}: ${lleno ? 'cargado' : 'vacío'}"><i class="fas ${icono}"></i>${label}</span>`;
    }).join('');
}

// Formulario completo de un itinerario (el lápiz de la fila). Se arma en el momento, así
// que sirve igual en Gestión de Datos y en la página standalone de Itinerario.
function abrirEditorItinerario(it) {
    document.getElementById('itin-editor')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'itin-editor';
    overlay.className = 'itin-editor-overlay';
    overlay.innerHTML = `
        <div class="itin-editor" role="dialog" aria-modal="true" aria-labelledby="itin-editor-titulo">
            <div class="itin-editor-head">
                <h3 id="itin-editor-titulo">Editar itinerario <span class="text-slate-400 font-normal">· ${({ es: 'Español', en: 'English', pt: 'Português' })[idiomaActivo] || idiomaActivo}</span></h3>
                <button type="button" class="cat-icon-btn ie-cerrar" title="Cerrar"><i class="fas fa-times"></i></button>
            </div>
            <div class="itin-editor-body">
                <div class="cat-form-grid">
                    <div class="cat-field cat-span-8">
                        <label for="ie-titulo">Título</label>
                        <input type="text" id="ie-titulo">
                    </div>
                    <div class="cat-field cat-span-4">
                        <label>PDF</label>
                        <a class="ie-pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf mr-1"></i><span></span></a>
                    </div>
                    <div class="cat-field cat-span-6">
                        <label for="ie-destino">Destino</label>
                        <select id="ie-destino"></select>
                    </div>
                    <div class="cat-field cat-span-6">
                        <label for="ie-categoria">Categoría</label>
                        <select id="ie-categoria" disabled></select>
                    </div>
                    <div class="cat-field">
                        <label>Imagen</label>
                        <div class="ie-imagen">
                            <div class="ie-imagen-preview"></div>
                            <div class="ie-imagen-acciones">
                                <label class="btn border small cursor-pointer"><i class="fas fa-image mr-1"></i><span class="ie-imagen-elegir-texto">Elegir imagen</span><input type="file" id="ie-imagen-input" accept="image/jpeg,image/png,image/webp" class="hidden"></label>
                                <button type="button" class="btn border small ie-imagen-quitar"><i class="fas fa-trash mr-1"></i>Quitar</button>
                                <small class="text-slate-400">JPG, PNG o WebP, hasta 5 MB.</small>
                            </div>
                        </div>
                    </div>
                    <div class="cat-field">
                        <label for="ie-lugares">Lugares a visitar</label>
                        <textarea id="ie-lugares" rows="4" placeholder="Ej.: Plaza de Armas, Qorikancha, Sacsayhuamán..."></textarea>
                    </div>
                    <div class="cat-field cat-span-6">
                        <label for="ie-incluye">Incluye</label>
                        <textarea id="ie-incluye" rows="5" placeholder="Uno por línea. Ej.:&#10;Transporte turístico&#10;Guía profesional"></textarea>
                    </div>
                    <div class="cat-field cat-span-6">
                        <label for="ie-no-incluye">No incluye</label>
                        <textarea id="ie-no-incluye" rows="5" placeholder="Uno por línea. Ej.:&#10;Alimentación&#10;Propinas"></textarea>
                    </div>
                </div>
            </div>
            <div class="itin-editor-foot">
                <button type="button" class="btn border small ie-cerrar">Cancelar</button>
                <button type="button" class="btn btn-primary small ie-guardar"><i class="fas fa-save mr-1"></i>Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const $ = (sel) => overlay.querySelector(sel);

    $('#ie-titulo').value = it.titulo || '';
    $('#ie-lugares').value = it.lugares_visitar || '';
    $('#ie-incluye').value = it.incluye || '';
    $('#ie-no-incluye').value = it.no_incluye || '';
    $('.ie-pdf').href = `${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(it.filename)}`;
    $('.ie-pdf span').textContent = it.filename;
    const destinoSel = $('#ie-destino');
    const categoriaSel = $('#ie-categoria');
    llenarDestinosSelect(destinoSel, it.destino_id);
    llenarCategoriasSelect(categoriaSel, destinoSel.value, it.categoria_id);
    destinoSel.addEventListener('change', () => llenarCategoriasSelect(categoriaSel, destinoSel.value, null));
    habilitarCreacionCategoria(categoriaSel, destinoSel);

    // Imagen: 'actual' (sin cambios), un File nuevo, o null (quitada).
    let imagenElegida = 'actual';
    const preview = $('.ie-imagen-preview');
    const pintarImagen = () => {
        let src = null;
        if (imagenElegida instanceof File) src = URL.createObjectURL(imagenElegida);
        else if (imagenElegida === 'actual' && it.imagen && it.imagen_existe !== false) src = urlImagenItinerario(it.imagen);
        preview.innerHTML = src ? `<img src="${src}" alt="">` : '<div class="ie-imagen-vacia"><i class="fas fa-image"></i><span>Sin imagen</span></div>';
        const hay = !!src;
        $('.ie-imagen-quitar').classList.toggle('hidden', !hay);
        $('.ie-imagen-elegir-texto').textContent = hay ? 'Cambiar imagen' : 'Elegir imagen';
    };
    $('#ie-imagen-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { notifyWarning('Solo se permiten imágenes JPG, PNG o WebP.'); return; }
        if (file.size > 5 * 1024 * 1024) { notifyWarning('La imagen pesa más de 5 MB.'); return; }
        imagenElegida = file;
        pintarImagen();
    });
    $('.ie-imagen-quitar').addEventListener('click', () => { imagenElegida = null; pintarImagen(); });
    pintarImagen();

    const cerrar = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', onEsc);
    overlay.querySelectorAll('.ie-cerrar').forEach(b => b.addEventListener('click', cerrar));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) cerrar(); });

    $('.ie-guardar').addEventListener('click', async () => {
        const titulo = $('#ie-titulo').value.trim();
        if (!titulo) { notifyError('El título es obligatorio.'); return; }
        const boton = $('.ie-guardar');
        boton.disabled = true;
        boton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Guardando...';
        try {
            const payload = {
                id: it.id,
                titulo,
                destino_id: destinoSel.value || null,
                categoria_id: categoriaSel.value || null,
                lugares_visitar: $('#ie-lugares').value,
                incluye: $('#ie-incluye').value,
                no_incluye: $('#ie-no-incluye').value
            };
            if (imagenElegida instanceof File) {
                const formData = new FormData();
                formData.append('imagen', imagenElegida);
                formData.append('idioma', idiomaActivo);
                const subida = await fetch(`${ITINERARIO_API_BASE}upload-imagen.php`, { method: 'POST', body: formData }).then(r => r.json());
                if (!subida.success) throw new Error(subida.error || 'Error al subir la imagen.');
                payload.imagen = subida.imagen;
            } else if (imagenElegida === null) {
                payload.imagen = null;
            }
            const data = await fetch(`${ITINERARIO_API_BASE}api.php?path=actualizar-modulo&idioma=${idiomaActivo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json());
            if (!data.success) throw new Error(data.error || 'Error desconocido');
            cerrar();
            notifySuccess('Itinerario actualizado.');
            await cargarIdioma(idiomaActivo);
            renderModulosTable();
        } catch (error) {
            notifyError('No se pudo guardar el itinerario: ' + error.message);
            boton.disabled = false;
            boton.innerHTML = '<i class="fas fa-save mr-1"></i>Guardar';
        }
    });
    setTimeout(() => $('#ie-titulo').focus(), 0);
}


// Este bloque (alta/subida de módulos) solo existe en Gestión de Datos — no en Cotizador.
if (document.getElementById('itinerary-module-destino')) {
    document.getElementById('itinerary-module-destino').addEventListener('change', (e) => {
        llenarCategoriasSelect(document.getElementById('itinerary-module-categoria'), e.target.value, null);
    });
    habilitarCreacionCategoria(
        document.getElementById('itinerary-module-categoria'),
        document.getElementById('itinerary-module-destino')
    );
}

document.getElementById('itinerario-modulos-search')?.addEventListener('input', (e) => {
    modulosFiltro = e.target.value;
    renderModulosTable();
});

// Alta de a uno: solo en la página standalone de Itinerario — Gestión de Datos usa la subida
// en lote (initSubidaMasiva, más abajo).
if (!document.getElementById('itinerarios-subida-lista')) document.getElementById('upload-local-module')?.addEventListener('click', () => {
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
    if (!(await confirmAction(`¿Eliminar "${modulo.titulo}"? Esta acción no se puede deshacer.`, 'Sí, eliminar'))) return;

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
    renderTableroPaginasFijas();
    const tbody = document.getElementById('paginas-fijas-table-body');
    if (!tbody) return; // no existe en Cotizador — Páginas Fijas vive en Gestión de Datos
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

document.getElementById('upload-pagina-fija')?.addEventListener('click', () => {
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
    if (!(await confirmAction(`¿Eliminar "${p.titulo}"? Esta acción no se puede deshacer.`, 'Sí, eliminar'))) return;

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

// ===== Subida en lote de PDFs (Gestión de Datos > Itinerarios > Páginas Fijas / Itinerarios) =====
// Se eligen (o arrastran) varios PDF a la vez; cada uno aparece en una lista con su título
// ya propuesto a partir del nombre del archivo (editable antes de subir) y se suben uno por
// uno al idioma activo. Si alguno falla, los demás siguen y al final se avisa cuáles.

// Título a partir del nombre del archivo: sin la extensión .pdf y con cada guion (o guion
// bajo) convertido en un espacio. Todo lo demás se respeta tal cual: espacios existentes,
// mayúsculas/minúsculas, tildes y caracteres especiales.
function tituloDesdeArchivo(nombreArchivo) {
    return nombreArchivo.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
}

function initSubidaMasiva({ inputId, listaId, botonId, cancelarId, sustantivo, alSubir }) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    const boton = document.getElementById(botonId);
    if (!input || !lista || !boton) return;
    const dropZone = input.closest('.pdf-drop');
    let pendientes = []; // [{ file, titulo }]

    const actualizarBoton = () => {
        boton.disabled = pendientes.length === 0;
        boton.innerHTML = `<i class="fas fa-upload mr-1"></i>Subir${pendientes.length ? ` ${pendientes.length} ${sustantivo[pendientes.length === 1 ? 0 : 1]}` : ''}`;
    };
    const render = () => {
        lista.innerHTML = '';
        pendientes.forEach((item, i) => {
            const fila = document.createElement('div');
            fila.className = 'subida-item';
            fila.innerHTML = `
                <i class="fas fa-file-pdf text-red-500"></i>
                <input type="text" class="subida-titulo" title="Título (puedes corregirlo antes de subir)">
                <span class="subida-archivo"></span>
                <button type="button" class="cat-icon-btn is-danger" title="Quitar de la lista"><i class="fas fa-times"></i></button>
            `;
            const tituloInput = fila.querySelector('.subida-titulo');
            tituloInput.value = item.titulo;
            tituloInput.addEventListener('input', () => { item.titulo = tituloInput.value; });
            fila.querySelector('.subida-archivo').textContent = item.file.name;
            fila.querySelector('button').addEventListener('click', () => { pendientes.splice(i, 1); render(); });
            lista.appendChild(fila);
        });
        actualizarBoton();
    };
    const agregar = (files) => {
        const pdfs = Array.from(files).filter(f => /\.pdf$/i.test(f.name));
        const descartados = files.length - pdfs.length;
        pdfs.forEach(file => {
            if (pendientes.some(p => p.file.name === file.name && p.file.size === file.size)) return;
            pendientes.push({ file, titulo: tituloDesdeArchivo(file.name) });
        });
        if (descartados) notifyWarning(`${descartados} archivo${descartados === 1 ? '' : 's'} no ${descartados === 1 ? 'es' : 'son'} PDF y no se agregó.`);
        render();
    };
    const reset = () => { pendientes = []; input.value = ''; render(); };

    input.addEventListener('change', () => { agregar(input.files); input.value = ''; });
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('is-over'); }));
        ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('is-over')));
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); agregar(e.dataTransfer.files); });
    }
    document.getElementById(cancelarId)?.addEventListener('click', reset);

    boton.addEventListener('click', async () => {
        const vacios = pendientes.filter(p => !p.titulo.trim());
        if (vacios.length) { notifyWarning('Todos los archivos necesitan un título.'); return; }
        const total = pendientes.length;
        const fallidos = [];
        boton.disabled = true;
        for (let i = 0; i < total; i++) {
            const item = pendientes[i];
            boton.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>Subiendo ${i + 1} de ${total}...`;
            try {
                const formData = new FormData();
                formData.append('pdf', item.file);
                formData.append('idioma', idiomaActivo);
                const subida = await fetch(`${ITINERARIO_API_BASE}upload.php`, { method: 'POST', body: formData }).then(r => r.json());
                if (!subida.success) throw new Error(subida.error || 'Error al subir el archivo.');
                const registro = await alSubir(item.titulo.trim(), subida.filename);
                if (!registro.success) throw new Error(registro.error || 'Error al registrar el archivo.');
            } catch (e) {
                fallidos.push({ item, error: e.message });
            }
        }
        await cargarIdioma(idiomaActivo);
        renderTodoIdioma();
        const ok = total - fallidos.length;
        // Quedan en la lista solo los que fallaron, para reintentar.
        pendientes = fallidos.map(f => f.item);
        render();
        if (fallidos.length) {
            notifyError(`Se subieron ${ok} de ${total}. Fallaron: ${fallidos.map(f => `${f.item.file.name} (${f.error})`).join('; ')}`);
        } else {
            notifySuccess(`Se ${ok === 1 ? 'subió' : 'subieron'} ${ok} ${sustantivo[ok === 1 ? 0 : 1]}.`);
        }
    });
    render();
}

if (document.getElementById('itinerarios-subida-lista')) {
    initSubidaMasiva({
        inputId: 'itinerary-module-pdf',
        listaId: 'itinerarios-subida-lista',
        botonId: 'upload-local-module',
        cancelarId: 'itinerarios-nuevo-cancelar',
        sustantivo: ['itinerario', 'itinerarios'],
        alSubir: (titulo, filename) => fetch(`${ITINERARIO_API_BASE}api.php?path=crear-modulo&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo, filename,
                destino_id: document.getElementById('itinerary-module-destino').value || null,
                categoria_id: document.getElementById('itinerary-module-categoria').value || null
            })
        }).then(r => r.json())
    });
}
if (document.getElementById('paginas-subida-lista')) {
    initSubidaMasiva({
        inputId: 'paginas-pdf-input',
        listaId: 'paginas-subida-lista',
        botonId: 'paginas-subir-btn',
        cancelarId: 'paginas-nuevo-cancelar',
        sustantivo: ['página', 'páginas'],
        alSubir: (titulo, filename) => fetch(`${ITINERARIO_API_BASE}api.php?path=crear-pagina-fija&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, filename })
        }).then(r => r.json())
    });
}

// ===== Tablero de Páginas Fijas: Sin asignar / Presentación / Cierre =====
// Cada página fija se arrastra a la zona donde va; dentro de Presentación y Cierre el
// orden de arriba a abajo es el orden en el PDF. Se guarda al soltar, en la misma config
// por idioma de siempre (startFiles / endFiles, ver guardar-config en api.php). En
// pantallas táctiles, el selector de cada tarjeta hace lo mismo sin arrastrar.
const PF_ZONAS = ['sin', 'start', 'end'];
let pfArrastrando = null;

function renderTableroPaginasFijas() {
    const zonas = Object.fromEntries(PF_ZONAS.map(z => [z, document.getElementById(`pf-zona-${z}`)]));
    if (!zonas.sin) return;
    const paginas = paginasFijasActivas();
    const porArchivo = new Map(paginas.map(p => [p.filename, p]));
    // La config de Presentación/Cierre es una sola por idioma, pero cada usuario solo ve
    // SUS páginas fijas: lo que la config trae y no está en este catálogo (de otro usuario,
    // o ya borrado) se muestra igual, marcado, para que guardar no lo pierda sin querer.
    [...fixedStartFilesActivos(), ...fixedEndFilesActivos()].forEach(f => {
        if (!porArchivo.has(f)) porArchivo.set(f, { filename: f, titulo: f.replace(/.pdf$/i, ''), fueraDeCatalogo: true });
    });
    const start = fixedStartFilesActivos().filter(f => porArchivo.has(f));
    const end = fixedEndFilesActivos().filter(f => porArchivo.has(f) && !start.includes(f));
    const asignadas = new Set([...start, ...end]);
    const sin = paginas.filter(p => !asignadas.has(p.filename)).map(p => p.filename).sort((a, b) => porArchivo.get(a).titulo.localeCompare(porArchivo.get(b).titulo));
    const contenido = { sin, start, end };

    PF_ZONAS.forEach(z => {
        zonas[z].innerHTML = '';
        contenido[z].forEach(f => zonas[z].appendChild(buildTarjetaPaginaFija(porArchivo.get(f), z)));
        if (!contenido[z].length) {
            zonas[z].innerHTML = `<div class="pf-vacio">${z === 'sin' ? 'Nada pendiente' : 'Arrastra páginas aquí'}</div>`;
        }
        document.querySelector(`.pf-zona [data-conteo="${z}"]`).textContent = contenido[z].length;
    });
    const n = paginas.length;
    const contador = document.getElementById('paginas-fijas-count');
    if (contador) contador.textContent = `${n} página${n === 1 ? '' : 's'}`;
}

function buildTarjetaPaginaFija(p, zona) {
    const card = document.createElement('div');
    card.className = 'pf-card';
    card.draggable = true;
    card.dataset.filename = p.filename;
    const roto = p.archivo_existe === false;
    card.classList.toggle('is-fuera', !!p.fueraDeCatalogo);
    card.innerHTML = `
        <i class="fas fa-grip-vertical pf-grip"></i>
        <div class="min-w-0 flex-1">
            <div class="pf-titulo"></div>
            <div class="pf-archivo"><i class="fas fa-file-pdf mr-1"></i><span></span>${roto ? ' <span class="cat-badge is-danger ml-1">PDF no encontrado</span>' : ''}${p.fueraDeCatalogo ? ' <span class="cat-badge pf-badge-fuera ml-1" title="Está en la configuración de este idioma pero no en tu catálogo de páginas fijas (de otro usuario o ya eliminada). Se conserva al guardar; pásala a Sin asignar para quitarla.">fuera de tu catálogo</span>' : ''}</div>
        </div>
        <div class="pf-acciones">
            <select class="pf-mover" title="Mover a">
                <option value="sin">Sin asignar</option>
                <option value="start">Presentación</option>
                <option value="end">Cierre</option>
            </select>
            <a class="cat-icon-btn is-view${roto ? ' is-disabled' : ''}" target="_blank" rel="noopener" title="Ver PDF"><i class="fas fa-eye"></i></a>
            <button type="button" class="cat-icon-btn pf-renombrar" title="Cambiar título"><i class="fas fa-pen"></i></button>
            <label class="cat-icon-btn" title="Reemplazar el PDF"><i class="fas fa-arrows-rotate"></i><input type="file" accept=".pdf,application/pdf" class="hidden"></label>
            <button type="button" class="cat-icon-btn is-danger pf-eliminar" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
    `;
    card.querySelector('.pf-titulo').textContent = p.titulo;
    card.querySelector('.pf-archivo span').textContent = p.filename;
    card.querySelector('a').href = `${ITINERARIO_API_BASE}uploads/${idiomaActivo}/${encodeURIComponent(p.filename)}`;
    const mover = card.querySelector('.pf-mover');
    mover.value = zona;
    mover.addEventListener('change', () => {
        const destino = document.getElementById(`pf-zona-${mover.value}`);
        destino.querySelector('.pf-vacio')?.remove();
        destino.appendChild(card);
        guardarTableroPaginasFijas();
    });
    // Las de fuera del catálogo solo se pueden mover (o quitar pasándolas a Sin asignar).
    if (p.fueraDeCatalogo) {
        card.querySelectorAll('.pf-renombrar, label.cat-icon-btn, .pf-eliminar').forEach(el => el.remove());
        card.querySelector('.pf-mover option[value="sin"]').textContent = 'Quitar';
    }
    card.querySelector('.pf-renombrar')?.addEventListener('click', async () => {
        const nuevo = (await promptText('Título de la página fija', '', p.titulo))?.trim();
        if (nuevo && nuevo !== p.titulo) guardarPaginaFija(p, nuevo, null);
    });
    card.querySelector('label input')?.addEventListener('change', (e) => {
        if (e.target.files[0]) guardarPaginaFija(p, p.titulo, e.target.files[0]);
    });
    card.querySelector('.pf-eliminar')?.addEventListener('click', () => handlePaginaFijaDelete(p));
    card.addEventListener('dragstart', (e) => {
        pfArrastrando = card;
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', p.filename);
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        document.querySelectorAll('.pf-lista.is-over').forEach(l => l.classList.remove('is-over'));
        pfArrastrando = null;
    });
    return card;
}

// Tarjeta antes de la cual soltar, según la altura del puntero dentro de la zona.
function pfTarjetaSiguiente(lista, y) {
    const tarjetas = [...lista.querySelectorAll('.pf-card:not(.is-dragging)')];
    return tarjetas.find(t => {
        const r = t.getBoundingClientRect();
        return y < r.top + r.height / 2;
    }) || null;
}

function initTableroPaginasFijas() {
    PF_ZONAS.forEach(z => {
        const lista = document.getElementById(`pf-zona-${z}`);
        if (!lista) return;
        lista.addEventListener('dragover', (e) => {
            if (!pfArrastrando) return;
            e.preventDefault();
            lista.classList.add('is-over');
            lista.querySelector('.pf-vacio')?.remove();
            const siguiente = pfTarjetaSiguiente(lista, e.clientY);
            if (siguiente) lista.insertBefore(pfArrastrando, siguiente); else lista.appendChild(pfArrastrando);
        });
        lista.addEventListener('dragleave', (e) => {
            if (!lista.contains(e.relatedTarget)) lista.classList.remove('is-over');
        });
        lista.addEventListener('drop', (e) => {
            e.preventDefault();
            lista.classList.remove('is-over');
            guardarTableroPaginasFijas();
        });
    });
}
initTableroPaginasFijas();

async function guardarTableroPaginasFijas() {
    const leer = (z) => [...document.querySelectorAll(`#pf-zona-${z} .pf-card`)].map(c => c.dataset.filename);
    const startFiles = leer('start');
    const endFiles = leer('end');
    try {
        const res = await fetch(`${ITINERARIO_API_BASE}api.php?path=guardar-config&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startFiles, endFiles })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        if (idiomaCache[idiomaActivo]) {
            idiomaCache[idiomaActivo].fixedStartFiles = startFiles;
            idiomaCache[idiomaActivo].fixedEndFiles = endFiles;
        }
    } catch (e) {
        notifyError('No se pudo guardar el orden de las páginas fijas: ' + e.message);
    }
    renderTableroPaginasFijas();
}

// ===== Páginas Fijas: config de inicio/cierre (Presentación / Cierre) =====
function loadFixedSections() {
    const startBody = document.getElementById('start-builder-body');
    const endBody = document.getElementById('end-builder-body');
    if (!startBody || !endBody) return; // no existen en Cotizador — Páginas Fijas vive en Gestión de Datos
    startBody.innerHTML = '';
    endBody.innerHTML = '';
    fixedStartFilesActivos().forEach(file => addItineraryBuilderRow('start-builder-body', false, file));
    fixedEndFilesActivos().forEach(file => addItineraryBuilderRow('end-builder-body', false, file));
}

document.getElementById('save-default-config')?.addEventListener('click', async () => {
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

    // Mismo ícono de arrastre que usan Actividades/Hoteles en el Cotizador (.handle, ver
    // shared/cotizador.css) — antes este armador usaba un ícono de FontAwesome distinto.
    let cellsHtml = `<td class="p-2"><div class="handle">≡</div></td>`;
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

// ===== Itinerario dentro de un Paquete del Cotizador (idioma propio del paquete) =====
// Los paquetes del Cotizador (shared/cotizador.js) combinan Actividades + Hoteles +
// Itinerario, y su itinerario tiene un idioma fijo elegido al crear el paquete — que no
// tiene por qué ser el idioma activo del armador. Estos helpers arman el selector de
// módulos contra el catálogo de ESE idioma (cargándolo si hace falta) sin tocar idiomaActivo.
const itinHelpersModulosPorIdioma = {};
function helpersModulosDeIdioma(idioma) {
    if (!itinHelpersModulosPorIdioma[idioma]) {
        itinHelpersModulosPorIdioma[idioma] = crearHelpersClasificacion(
            () => idiomaCache[idioma]?.modules || [], () => itinCategoriasData, { labelKey: 'titulo', valueKey: 'filename' },
            () => itinDestinosData
        );
    }
    return itinHelpersModulosPorIdioma[idioma];
}
async function asegurarIdiomaCargado(idioma) {
    if (idiomaCache[idioma]) return;
    try {
        await cargarIdioma(idioma);
    } catch (error) {
        console.error('Error al cargar datos del idioma:', error);
        idiomaCache[idioma] = { modules: [], fixedStartFiles: [], fixedEndFiles: [], paquetes: [], paginasFijas: [], generados: [] };
    }
}
function buildSelectorModuloIdioma(idioma, filename, onResolved) {
    return buildClasificacionSelector(helpersModulosDeIdioma(idioma), 'Selecciona un módulo...', filename || '', onResolved);
}
function tituloModuloDeIdioma(idioma, filename) {
    return (idiomaCache[idioma]?.modules || []).find(m => m.filename === filename)?.titulo || filename;
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
    // Panel "Itinerarios Predeterminados": solo existe en la página standalone (en
    // Cotizador se quitó, cubierto por el Paquete unificado de Actividades/Hoteles/
    // Itinerario) — sin esta guarda, activarIdioma()/initItinerario() reventaban al
    // buscar un elemento que ahí no existe.
    if (!document.getElementById('itinerario-paquete-nombre')) return;
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
    if (!await confirmAction(`¿Eliminar el itinerario predeterminado "${paquete.nombre}"? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
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
    if (!container) return; // no existe en Cotizador — ver resetItinerarioPaqueteBuilder
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
    if (!select) return; // no existe en Cotizador — ver resetItinerarioPaqueteBuilder
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

// "Itinerarios Predeterminados" (solo itinerario, sin actividades/hoteles) se quitó de
// Cotizador — cubierto por el Paquete unificado (ver aplicarPaquete/guardarComoPaquete en
// cotizador.js). Sigue existiendo en la vista standalone de Itinerario, de ahí el `?.`.
document.getElementById('itinerario-paquete-add-row')?.addEventListener('click', () => agregarFilaPaqueteItinerario());
document.getElementById('itinerario-paquete-guardar')?.addEventListener('click', guardarPaqueteItinerario);
document.getElementById('itinerario-paquete-cancelar-edicion')?.addEventListener('click', resetItinerarioPaqueteBuilder);
document.getElementById('itinerario-aplicar-paquete-select')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const paquete = paquetesActivos().find(p => p.id == e.target.value);
    if (paquete) aplicarPaqueteItinerario(paquete);
    e.target.value = '';
});

// En Cotizador (embebido) este botón se quitó — "Limpiar todo" (junto a Guardar) ya
// limpia el armador de itinerario junto con el resto. Sigue existiendo en la vista
// standalone de Itinerario.
document.getElementById('itinerario-limpiar-builder')?.addEventListener('click', () => {
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
// "Reusar un itinerario ya generado": solo existe donde hay armador (Cotizador y
// standalone), no en Gestión de Datos.
document.getElementById('itinerario-historial-btn')?.addEventListener('click', abrirHistorialReusar);
document.getElementById('itinerario-historial-close')?.addEventListener('click', cerrarHistorialReusar);
document.getElementById('itinerario-historial-search')?.addEventListener('input', (e) => {
    itinerarioHistorialReusarState.term = e.target.value;
    itinerarioHistorialReusarState.offset = 0;
    renderHistorialReusarList();
});
document.getElementById('itinerario-historial-prev')?.addEventListener('click', () => {
    itinerarioHistorialReusarState.offset = Math.max(0, itinerarioHistorialReusarState.offset - ITINERARIO_HISTORIAL_PAGE_SIZE);
    renderHistorialReusarList();
});
document.getElementById('itinerario-historial-next')?.addEventListener('click', () => {
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
    const tbody = document.getElementById('historial-generados-table-body');
    if (!tbody) return; // no existe en Cotizador — Itinerarios Generados vive en Gestión de Datos
    actualizarFiltroAgenciaHistorial();
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

// Filtros de "Itinerarios Generados": solo existen en Gestión de Datos.
document.getElementById('historial-filtro-texto')?.addEventListener('input', (e) => {
    historialFiltro.texto = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-agencia')?.addEventListener('change', (e) => {
    historialFiltro.agencia = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-desde')?.addEventListener('change', (e) => {
    historialFiltro.desde = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-hasta')?.addEventListener('change', (e) => {
    historialFiltro.hasta = e.target.value;
    renderHistorialGeneradosTable();
});
document.getElementById('historial-filtro-limpiar')?.addEventListener('click', () => {
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
        // Presentación / Cierre: del armador de esas secciones si está en la página
        // (standalone); si no (Cotizador), de la config guardada para este idioma
        // (Gestión de Datos > Itinerarios > Páginas Fijas). Antes se leían solo del DOM, así
        // que desde el Cotizador nunca se incluían.
        const startFiles = document.getElementById('start-builder-body')
            ? getFiles('#start-builder-body .module-filename')
            : fixedStartFilesActivos().slice();
        const bodyFiles = getFiles('#itinerary-builder-body .module-filename');
        const endFiles = document.getElementById('end-builder-body')
            ? getFiles('#end-builder-body .module-filename')
            : fixedEndFilesActivos().slice();

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
        // .itin-panel (no ".subtab-content" a secas): en Cotizador este grupo de
        // sub-pestañas vive ANIDADO dentro de #gestion-section ("Gestión de Datos"),
        // que tiene sus propios .subtab-content — con la clase genérica, un clic acá
        // también los ocultaba a ellos (y viceversa, ver irASubtabGestion en cotizador.js).
        document.querySelectorAll('.itin-panel').forEach(c => c.classList.add('hidden'));
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
// Los 3 "?." son necesarios ahora que este script sirve 3 contextos (standalone: los 3
// botones existen; Cotizador: solo add-itinerary-row, el armador; Gestión de Datos: solo
// add-start-row/add-end-row, Páginas Fijas — sin armador propio).
document.getElementById('add-start-row')?.addEventListener('click', () => addItineraryBuilderRow('start-builder-body'));
document.getElementById('add-itinerary-row')?.addEventListener('click', () => addItineraryBuilderRow('itinerary-builder-body', true));
document.getElementById('add-end-row')?.addEventListener('click', () => addItineraryBuilderRow('end-builder-body'));
// En Cotizador (embebido) ya no existe este botón — "Guardar" genera el itinerario junto
// con la cotización (ver guardarCotizacion() en cotizador.js). Sigue existiendo en la
// vista standalone de Itinerario.
document.getElementById('generate-itinerary')?.addEventListener('click', handleGenerateItinerary);
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
    // El select de Destino del formulario "Subir Nuevo Itinerario" existe en la standalone
    // y en Gestión de Datos, pero no en Cotizador (ahí no hay gestión de módulos, solo el
    // armador día-a-día).
    const selectDestinoModulo = document.getElementById('itinerary-module-destino');
    if (selectDestinoModulo) llenarDestinosSelect(selectDestinoModulo);
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
document.getElementById('modulos-guardar-flotante')?.addEventListener('click', async () => {
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
