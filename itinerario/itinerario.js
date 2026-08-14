// ===== Estado por idioma (Español / Inglés / Portugués) =====
// Cada idioma tiene su propio catálogo de módulos PDF, páginas fijas y paquetes —
// idiomaCache[idioma] es null hasta que se pide por primera vez (se cachea, y se
// refresca puntualmente tras cada mutación exitosa).
let idiomaActivo = 'es';
let idiomaCache = { es: null, en: null, pt: null }; // {modules, fixedStartFiles, fixedEndFiles, paquetes}

let charlotteFontBytes = null;
let janoFontBytes = null;

// ===== Clasificación por Destino/Categoría (mismo catálogo compartido que el Cotizador) =====
// Se usa para clasificar cada módulo (select Destino/Categoría en la tabla) y para el
// selector en cascada del armador — no genera pestañas de navegación por destino (eso
// tampoco pasa en Cotizaciones, donde Destino/Categoría es solo un dato de clasificación).
let destinosData = [];
let categoriasData = [];
let modulosFiltro = '';
let itinerarioPaqueteEditandoId = null;

function datosIdioma() { return idiomaCache[idiomaActivo]; }
function modulosActivos() { return datosIdioma()?.modules || []; }
function fixedStartFilesActivos() { return datosIdioma()?.fixedStartFiles || []; }
function fixedEndFilesActivos() { return datosIdioma()?.fixedEndFiles || []; }
function paquetesActivos() { return datosIdioma()?.paquetes || []; }

// Helpers del selector en cascada (shared/cascade-select.js): "Todos" para páginas fijas
// (puede repetirse un módulo en start/end sin problema), "Body" excluye lo ya usado en
// páginas fijas — mismo filtro que antes hacía refreshAllSelects() a mano. getItems() lee
// siempre el idioma activo en el momento de abrir el panel, no hace falta reconstruir
// estos helpers al cambiar de pestaña de idioma.
const itinerarioHelpersTodos = crearHelpersClasificacion(
    () => modulosActivos(), () => categoriasData, { labelKey: 'titulo', valueKey: 'filename' }
);
const itinerarioHelpersBody = crearHelpersClasificacion(
    () => {
        const usados = new Set([...fixedStartFilesActivos(), ...fixedEndFilesActivos()]);
        return modulosActivos().filter(m => !usados.has(m.filename));
    },
    () => categoriasData,
    { labelKey: 'titulo', valueKey: 'filename' }
);

function nombreDestino(id) { return destinosData.find(d => d.id === id)?.nombre || null; }
function nombreCategoria(id) { return categoriasData.find(c => c.id === id)?.nombre || null; }

async function cargarDestinosYCategorias() {
    try {
        const [destinos, categorias] = await Promise.all([
            fetch('../usd/api.php?path=destinos').then(r => r.json()),
            fetch('../usd/api.php?path=categorias').then(r => r.json())
        ]);
        destinosData = destinos;
        categoriasData = categorias;
    } catch (error) {
        console.error('Error al cargar destinos/categorías:', error);
        destinosData = [];
        categoriasData = [];
    }
}

// Llena el <select> de categorías de acuerdo al destino elegido en ese mismo formulario.
function llenarCategoriasSelect(categoriaSelect, destinoId, selectedId = null) {
    if (!destinoId) {
        categoriaSelect.innerHTML = '<option value="">—</option>';
        categoriaSelect.disabled = true;
        return;
    }
    const opciones = categoriasData.filter(c => c.destino_id === Number(destinoId));
    categoriaSelect.innerHTML = '<option value="">Sin categoría</option>' +
        opciones.map(c => `<option value="${c.id}" ${selectedId != null && c.id === Number(selectedId) ? 'selected' : ''}>${c.nombre}</option>`).join('');
    categoriaSelect.disabled = false;
}

function llenarDestinosSelect(destinoSelect, selectedId = null) {
    destinoSelect.innerHTML = '<option value="">Sin clasificar</option>' +
        destinosData.map(d => `<option value="${d.id}" ${selectedId != null && d.id === Number(selectedId) ? 'selected' : ''}>${d.nombre}</option>`).join('');
}

function showLoadingModal() { document.getElementById('loading-modal').style.display = 'block'; }
function hideLoadingModal() { document.getElementById('loading-modal').style.display = 'none'; }
function updateProgress(percent, status) {
    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('loading-status').textContent = status;
}

function loadFonts(showModal = false) {
    return new Promise(async (resolve) => {
        if (showModal) {
            showLoadingModal();
            updateProgress(10, 'Cargando fuentes...');
        }
        try {
            await loadFontWithXHR('./charlotte.ttf', 'charlotte');
            if (showModal) updateProgress(50, 'Fuente Charlotte cargada');
            await loadFontWithXHR('./jano.ttf', 'jano');
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
    const [modules, config, paquetes] = await Promise.all([
        fetch(`api.php?path=modulos&idioma=${idioma}`).then(r => r.json()),
        fetch(`api.php?path=config&idioma=${idioma}`).then(r => r.json()),
        fetch(`api.php?path=paquetes&idioma=${idioma}`).then(r => r.json())
    ]);
    idiomaCache[idioma] = {
        modules,
        fixedStartFiles: config.startFiles || [],
        fixedEndFiles: config.endFiles || [],
        paquetes
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
            idiomaCache[idioma] = { modules: [], fixedStartFiles: [], fixedEndFiles: [], paquetes: [] };
        }
    }
    renderTodoIdioma();
}

// El armador "Itinerario Principal" se resetea a una fila vacía en cada cambio de idioma,
// deliberadamente: es estado efímero que hoy tampoco sobrevive a un refresh de página, y
// mezclar módulos de dos idiomas en el mismo PDF no tiene sentido de negocio.
function renderTodoIdioma() {
    renderModulosTable();
    loadFixedSections();
    renderPaquetesListItinerario();
    renderAplicarPaqueteSelectItinerario();
    document.getElementById('itinerary-builder-body').innerHTML = '';
    addItineraryBuilderRow('itinerary-builder-body', true);
}

// ===== Tabla de Módulos Existentes =====
function renderModulosTable() {
    const tbody = document.getElementById('itinerario-modulos-table-body');
    const term = modulosFiltro.trim().toLowerCase();
    const visibles = modulosActivos().filter(it => {
        if (term && !it.titulo.toLowerCase().includes(term)) return false;
        return true;
    });
    tbody.innerHTML = '';
    if (visibles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400 text-sm">No hay módulos en esta vista.</td></tr>';
        return;
    }
    visibles.forEach(it => tbody.appendChild(buildModuloRow(it)));
}

function buildModuloRow(it) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
        <td class="p-2 font-medium text-slate-700">${it.titulo}</td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-destino-select"></select></td>
        <td class="p-2"><select class="w-full border rounded p-1 text-xs module-categoria-select" disabled></select></td>
        <td class="p-2 text-slate-500 text-xs">${it.creado_por_nombre || '—'}</td>
        <td class="p-2 text-right"><button class="text-red-500 hover:text-red-700 text-sm" title="Eliminar"><i class="fas fa-trash"></i></button></td>
    `;
    const destinoSel = tr.querySelector('.module-destino-select');
    const categoriaSel = tr.querySelector('.module-categoria-select');
    llenarDestinosSelect(destinoSel, it.destino_id);
    llenarCategoriasSelect(categoriaSel, it.destino_id, it.categoria_id);

    destinoSel.addEventListener('change', () => {
        llenarCategoriasSelect(categoriaSel, destinoSel.value, null);
        actualizarClasificacionModulo(it, destinoSel.value, '');
    });
    categoriaSel.addEventListener('change', () => {
        actualizarClasificacionModulo(it, destinoSel.value, categoriaSel.value);
    });
    tr.querySelector('button').addEventListener('click', () => handleItineraryDelete(it.id));
    return tr;
}

async function actualizarClasificacionModulo(it, destinoId, categoriaId) {
    try {
        const res = await fetch(`api.php?path=actualizar-modulo&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.id, destino_id: destinoId || null, categoria_id: categoriaId || null })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        await cargarIdioma(idiomaActivo);
        renderModulosTable();
    } catch (error) {
        notifyError('No se pudo actualizar la clasificación: ' + error.message);
    }
}

document.getElementById('itinerary-module-destino').addEventListener('change', (e) => {
    llenarCategoriasSelect(document.getElementById('itinerary-module-categoria'), e.target.value, null);
});

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
    fetch('upload.php', { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.error || 'Error desconocido al subir el archivo.');
        return fetch(`api.php?path=crear-modulo&idioma=${idiomaActivo}`, {
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
        const res = await fetch(`api.php?path=eliminar-modulo&idioma=${idiomaActivo}`, {
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

// ===== Páginas Fijas (Presentación / Cierre) =====
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
        const response = await fetch(`api.php?path=guardar-config&idioma=${idiomaActivo}`, {
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

// Arma una fila con el selector en cascada Destino → Categoría → Módulo (en vez del
// <select> plano de antes) + un input oculto con el filename resuelto, que es lo que
// leen el resto de las funciones (guardar config, armar paquete, generar PDF).
function addItineraryBuilderRow(targetBodyId, isMainItinerary = false, selectedFile = null) {
    const tbody = document.getElementById(targetBodyId);
    const tr = document.createElement('tr');
    tr.className = 'draggable border-b';

    const helpers = (targetBodyId === 'start-builder-body' || targetBodyId === 'end-builder-body')
        ? itinerarioHelpersTodos
        : itinerarioHelpersBody;

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.className = 'module-filename';
    hiddenInput.value = selectedFile || '';

    const selector = buildClasificacionSelector(helpers, 'Selecciona un módulo...', selectedFile, (filename) => {
        hiddenInput.value = filename;
    });

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
    moduleCell.appendChild(selector);
    moduleCell.appendChild(hiddenInput);
    tr.querySelector('.remove-row-btn').addEventListener('click', () => {
        tr.remove();
        recalculateDayNumbers();
    });

    tbody.appendChild(tr);
    if (isMainItinerary) recalculateDayNumbers();
    addDragHandlers(tr);
}

// Tras eliminar un módulo del catálogo, actualiza la etiqueta de cualquier fila (en
// páginas fijas, armador o paquete en edición) que todavía lo tuviera seleccionado.
function marcarModulosFueraDeCatalogo() {
    const filenamesVigentes = new Set(modulosActivos().map(m => m.filename));
    document.querySelectorAll('.module-filename, .itinerario-paquete-row-filename').forEach(hidden => {
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

function addDragHandlers(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', () => { row.classList.add('opacity-60'); window._dragging = row; });
    row.addEventListener('dragend', () => { row.classList.remove('opacity-60'); if (row.closest('tbody').id === 'itinerary-builder-body') recalculateDayNumbers(); });
}

function setupDragDrop() {
    document.querySelectorAll('tbody').forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const draggable = window._dragging;
            if (draggable && container.id === draggable.closest('tbody').id) {
                afterElement ? container.insertBefore(draggable, afterElement) : container.appendChild(draggable);
            }
        });
    });
}

function getDragAfterElement(container, y) {
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

    const selector = buildClasificacionSelector(itinerarioHelpersTodos, 'Selecciona un módulo...', filename || '', (fn) => {
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
    if (!nombre) { notifyError('El nombre del paquete es obligatorio.'); return; }
    const modulos = Array.from(document.querySelectorAll('.itinerario-paquete-row-filename')).map(i => i.value).filter(Boolean);
    if (modulos.length === 0) { notifyError('Agrega al menos un módulo al paquete.'); return; }
    try {
        const payload = { nombre, modulos };
        if (itinerarioPaqueteEditandoId) payload.id = itinerarioPaqueteEditandoId;
        const res = await fetch(`api.php?path=guardar-paquete&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess(itinerarioPaqueteEditandoId ? 'Paquete actualizado.' : 'Paquete guardado.');
        resetItinerarioPaqueteBuilder();
        await cargarIdioma(idiomaActivo);
        renderPaquetesListItinerario();
        renderAplicarPaqueteSelectItinerario();
    } catch (e) {
        notifyError('Error al guardar el paquete: ' + e.message);
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
    if (!await confirmAction(`¿Eliminar el paquete "${paquete.nombre}"?`)) return;
    try {
        const res = await fetch(`api.php?path=eliminar-paquete&idioma=${idiomaActivo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: paquete.id })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        notifySuccess('Paquete eliminado.');
        if (itinerarioPaqueteEditandoId === paquete.id) resetItinerarioPaqueteBuilder();
        await cargarIdioma(idiomaActivo);
        renderPaquetesListItinerario();
        renderAplicarPaqueteSelectItinerario();
    } catch (e) {
        notifyError('Error al eliminar el paquete: ' + e.message);
    }
}

function renderPaquetesListItinerario() {
    const container = document.getElementById('itinerario-paquetes-list');
    container.innerHTML = '';
    const paquetes = paquetesActivos();
    if (paquetes.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm">Sin paquetes guardados.</p>';
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
    select.innerHTML = '<option value="">Aplicar paquete de itinerario...</option>';
    paquetesActivos().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        select.appendChild(opt);
    });
}

function aplicarPaqueteItinerario(paquete) {
    paquete.modulos.forEach(filename => addItineraryBuilderRow('itinerary-builder-body', true, filename));
    recalculateDayNumbers();
    notifySuccess(`Se agregaron ${paquete.modulos.length} módulo(s) del paquete "${paquete.nombre}".`);
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

// ===================================================================
// FUNCIÓN handleGenerateItinerary (VERSIÓN ROBUSTA Y SECUENCIAL)
// ===================================================================
async function handleGenerateItinerary() {
    const passengerName = document.getElementById('itinerary-passenger').value || 'Viajero';
    const packageTitle = document.getElementById('itinerary-title').value;
    if (!packageTitle) return notifyWarning('Por favor, introduce un Título del Paquete.');

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

            const pdfUrl = `./uploads/${idiomaPdf}/${encodeURIComponent(filename)}`;
            const bytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
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
        saveAs(blob, `Itinerario - ${passengerName}.pdf`);
        updateProgress(100, 'PDF generado con éxito');
        await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
        console.error('Error al generar PDF:', error);
        notifyError('Error al generar PDF: ' + error.message);
    } finally {
        hideLoadingModal();
    }
}

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
setupDragDrop();

window.addEventListener('load', async () => {
    await cargarDestinosYCategorias();
    llenarDestinosSelect(document.getElementById('itinerary-module-destino'));
    resetItinerarioPaqueteBuilder();
    await activarIdioma('es');
    loadFonts(false);
});
