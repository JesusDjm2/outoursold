let itineraryModules = [];
let fixedStartFiles = [];
let fixedEndFiles = [];
let charlotteFontBytes = null;
let janoFontBytes = null;

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

async function loadItineraryModules() {
    try {
        const responseModules = await fetch('save_config.php?mode=modules');
        const textModules = await responseModules.text();
        itineraryModules = textModules ? JSON.parse(textModules) : [];

        const responseConfig = await fetch('save_config.php?mode=config');
        const textConfig = await responseConfig.text();
        const config = textConfig ? JSON.parse(textConfig) : {};

        fixedStartFiles = config.startFiles || [];
        fixedEndFiles = config.endFiles || [];

        renderItineraryList();
        loadFixedSections();
        addItineraryBuilderRow('itinerary-builder-body', true);
    } catch (error) {
        console.error('Error al cargar datos del servidor:', error);
        notifyError('Error al cargar los datos guardados.');
        itineraryModules = [];
        renderItineraryList();
    }
}

function renderItineraryList() {
    const listContainer = document.getElementById('itinerary-list');
    listContainer.innerHTML = itineraryModules.length ? '' : '<p class="text-slate-500 text-sm">No hay módulos subidos.</p>';
    itineraryModules.forEach((it, index) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-slate-50 p-2 rounded-lg';
        div.innerHTML = `<span class="text-sm font-medium text-slate-700">${it.title}</span>
                         <button class="text-red-500 hover:text-red-700 text-sm" onclick="handleItineraryDelete(${index})"><i class="fas fa-trash"></i></button>`;
        listContainer.appendChild(div);
    });
    refreshAllSelects();
}

document.getElementById('upload-local-module').addEventListener('click', () => {
    const titleInput = document.getElementById('itinerary-module-title');
    const fileInput = document.getElementById('itinerary-module-pdf');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!title || !file) return notifyWarning('Completa el título y selecciona un PDF.');
    if (file.type !== 'application/pdf') return notifyWarning('Solo se permiten archivos PDF.');

    const formData = new FormData();
    formData.append('pdf', file);

    fetch('upload.php', { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const newModule = { id: Date.now(), title: title, filename: data.filename };
            itineraryModules.push(newModule);
            return fetch('save_config.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itineraryModules)
            });
        } else {
            throw new Error(data.error || 'Error desconocido al subir el archivo.');
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderItineraryList();
            titleInput.value = '';
            fileInput.value = '';
        } else {
            notifyError('Error al guardar la configuración: ' + (data.error || 'Desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        notifyError('Hubo un error: ' + error.message);
    });
});

async function handleItineraryDelete(index) {
    if (!(await confirmAction(`¿Eliminar "${itineraryModules[index].title}"?`))) return;
    const filename = itineraryModules[index].filename;

    fixedStartFiles = fixedStartFiles.filter(f => f !== filename);
    fixedEndFiles = fixedEndFiles.filter(f => f !== filename);

    itineraryModules.splice(index, 1);

    fetch('save_config.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itineraryModules)
    })
    .then(response => response.json())
    .then(data => { if (!data.success) console.warn('No se pudo guardar la configuración actualizada:', data.error); })
    .catch(error => console.error('Error al guardar la configuración:', error));

    renderItineraryList();
    loadFixedSections();
}

function loadFixedSections() {
    const startBody = document.getElementById('start-builder-body');
    const endBody = document.getElementById('end-builder-body');
    startBody.innerHTML = '';
    endBody.innerHTML = '';
    fixedStartFiles.forEach(file => addItineraryBuilderRow('start-builder-body', false, file));
    fixedEndFiles.forEach(file => addItineraryBuilderRow('end-builder-body', false, file));
    refreshAllSelects();
}

document.getElementById('save-default-config').addEventListener('click', async () => {
    fixedStartFiles = Array.from(document.querySelectorAll('#start-builder-body .module-select')).map(s => s.value).filter(Boolean);
    fixedEndFiles = Array.from(document.querySelectorAll('#end-builder-body .module-select')).map(s => s.value).filter(Boolean);

    const configToSave = { startFiles: fixedStartFiles, endFiles: fixedEndFiles };

    try {
        const response = await fetch('save_config.php?mode=config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configToSave)
        });
        const result = await response.json();
        if (result.success) {
            notifySuccess('Configuración guardada como predeterminada.');
            refreshAllSelects();
        } else {
            notifyError('Error al guardar la configuración: ' + (result.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error:', error);
        notifyError('Hubo un error al guardar la configuración.');
    }
});

function addItineraryBuilderRow(targetBodyId, isMainItinerary = false, selectedFile = null) {
    const tbody = document.getElementById(targetBodyId);
    const tr = document.createElement('tr');
    tr.className = 'draggable border-b';

    let optionsHtml;
    if (targetBodyId === 'start-builder-body' || targetBodyId === 'end-builder-body') {
        optionsHtml = itineraryModules.map(it => `<option value="${it.filename}" ${it.filename === selectedFile ? 'selected' : ''}>${it.title}</option>`).join('');
    } else {
        const usedFiles = new Set([...fixedStartFiles, ...fixedEndFiles]);
        optionsHtml = itineraryModules.filter(it => !usedFiles.has(it.filename)).map(it => `<option value="${it.filename}" ${it.filename === selectedFile ? 'selected' : ''}>${it.title}</option>`).join('');
    }

    let cellsHtml = `<td class="p-2"><span class="cursor-grab text-slate-400"><i class="fas fa-grip-vertical"></i></span></td>`;
    if (isMainItinerary) {
        cellsHtml += `<td class="p-2"><input type="text" class="w-full text-center day-number bg-slate-100 rounded p-1" readonly></td>`;
    }
    cellsHtml += `<td class="p-2">
                    <select class="w-full border rounded p-1 module-select">
                        <option value="">-- Selecciona un módulo --</option>${optionsHtml}
                    </select>
                 </td>
                 <td class="p-2 text-center">
                    <button class="text-red-500" onclick="this.closest('tr').remove(); recalculateDayNumbers(); refreshAllSelects();"><i class="fas fa-trash-alt"></i></button>
                 </td>`;

    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
    if (isMainItinerary) recalculateDayNumbers();
    addDragHandlers(tr);
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

function refreshAllSelects() {
    document.querySelectorAll('.module-select').forEach(select => {
        const tbodyId = select.closest('tbody').id;
        let optionsHtml;
        if (tbodyId === 'start-builder-body' || tbodyId === 'end-builder-body') {
            optionsHtml = itineraryModules.map(it => `<option value="${it.filename}" ${it.filename === select.value ? 'selected' : ''}>${it.title}</option>`).join('');
        } else {
            const usedFiles = new Set([...fixedStartFiles, ...fixedEndFiles]);
            optionsHtml = itineraryModules.filter(it => !usedFiles.has(it.filename)).map(it => `<option value="${it.filename}" ${it.filename === select.value ? 'selected' : ''}>${it.title}</option>`).join('');
        }
        select.innerHTML = `<option value="">-- Selecciona un módulo --</option>${optionsHtml}`;
    });
}

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

    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const getFiles = selector => Array.from(document.querySelectorAll(selector)).map(s => s.value).filter(Boolean);
        const startFiles = getFiles('#start-builder-body .module-select');
        const bodyFiles = getFiles('#itinerary-builder-body .module-select');
        const endFiles = getFiles('#end-builder-body .module-select');

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

            const pdfUrl = `./uploads/${encodeURIComponent(filename)}`;
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

// === Inicializar ===
document.getElementById('add-start-row').addEventListener('click', () => addItineraryBuilderRow('start-builder-body'));
document.getElementById('add-itinerary-row').addEventListener('click', () => addItineraryBuilderRow('itinerary-builder-body', true));
document.getElementById('add-end-row').addEventListener('click', () => addItineraryBuilderRow('end-builder-body'));
document.getElementById('generate-itinerary').addEventListener('click', handleGenerateItinerary);
setupDragDrop();

window.addEventListener('load', () => {
    loadItineraryModules();
    loadFonts(false);
});
