// shared/pdf-visor.js
// Ver y descargar PDFs en los popups de vista previa (Cotizador, Generador de Itinerarios y
// Gestión de Datos).
//
// Ver: en PC el PDF va en un <iframe> (visor del navegador). En celulares y tablets los
// navegadores no muestran un PDF dentro de un iframe (solo un texto o un botón "Abrir"),
// así que ahí se dibujan sus páginas con pdf.js, una debajo de la otra, al ancho del popup.
//
// Descargar: siempre baja el archivo sin abrir otra pestaña. En iPhone/iPad, donde Safari no
// descarga un PDF sino que lo abre, se usa la hoja de "Compartir" del sistema (Guardar en
// Archivos); si no está disponible, la descarga normal.

const PDF_VISOR_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfVisorCargaLib = null;

// Estilos del visor (van acá para que funcione en cualquier página que cargue este archivo).
(function () {
    const css = `
        .pdf-visor { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #e2e8f0; }
        .pdf-visor[hidden] { display: none; }
        #pdf-preview-modal .pdf-visor { height: 100%; }
        .pdf-visor-pagina { display: block; max-width: 100%; height: auto; background: #fff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18); }
        .pdf-visor-estado { margin: auto; display: flex; align-items: center; gap: 8px; padding: 24px;
            font-size: 0.85rem; color: #64748b; text-align: center; }
        .pdf-visor-estado.is-error { color: #b45309; }
        /* Celulares y tablets: el popup del PDF a pantalla completa. */
        @media (hover: none), (max-width: 1023px) {
            #pdf-preview-modal { padding: 0; }
            #pdf-preview-modal .modal-content { width: 100% !important; max-width: none !important; height: 100% !important;
                max-height: none !important; border-radius: 0; padding: 12px 12px calc(12px + env(safe-area-inset-bottom)); }
            #itinerario-pdf-preview-modal .pdf-preview-content { width: 100%; max-width: none; height: 100%; height: 100dvh;
                margin: 0; border-radius: 0; padding: 12px 12px calc(12px + env(safe-area-inset-bottom)); }
            .pdf-preview-ocultar-movil { display: none !important; }
            #pdf-preview-modal .modal-content > div:last-child, #itinerario-pdf-preview-modal .pdf-preview-footer { gap: 8px; }
            #pdf-preview-modal .modal-content > div:last-child .btn, #itinerario-pdf-preview-modal .pdf-preview-footer .btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; }
        }`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();

// Celulares y tablets (pantalla táctil sin mouse, o angosta).
function pdfVisorEsMovil() {
    return window.matchMedia('(hover: none), (max-width: 1023px)').matches;
}

function pdfVisorCargarLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfVisorCargaLib) {
        pdfVisorCargaLib = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = PDF_VISOR_PDFJS + 'pdf.min.js';
            s.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_VISOR_PDFJS + 'pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            s.onerror = () => { pdfVisorCargaLib = null; reject(new Error('No se pudo cargar el visor de PDF.')); };
            document.head.appendChild(s);
        });
    }
    return pdfVisorCargaLib;
}

// Contenedor de páginas que va junto al iframe (se crea la primera vez).
function pdfVisorContenedor(iframe) {
    let visor = iframe.parentElement.querySelector(':scope > .pdf-visor');
    if (!visor) {
        visor = document.createElement('div');
        visor.className = 'pdf-visor';
        visor.hidden = true;
        iframe.insertAdjacentElement('afterend', visor);
    }
    return visor;
}

let pdfVisorTurno = 0;
// Muestra el PDF de `url` (blob: o del servidor) en el lugar del iframe.
async function pdfVisorMostrar(iframe, url) {
    const visor = pdfVisorContenedor(iframe);
    const turno = ++pdfVisorTurno;
    if (!pdfVisorEsMovil()) {
        visor.hidden = true;
        visor.innerHTML = '';
        iframe.hidden = false;
        iframe.src = url;
        return;
    }
    iframe.hidden = true;
    iframe.src = 'about:blank';
    visor.hidden = false;
    visor.innerHTML = '<p class="pdf-visor-estado"><i class="fas fa-spinner fa-spin"></i>Cargando PDF...</p>';
    try {
        const lib = await pdfVisorCargarLib();
        const pdf = await lib.getDocument(url).promise;
        if (turno !== pdfVisorTurno) return; // ya se pidió otro PDF o se cerró
        visor.innerHTML = '';
        const ancho = Math.max(200, visor.clientWidth - 16);
        const ppp = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages; n++) {
            const pagina = await pdf.getPage(n);
            if (turno !== pdfVisorTurno) return;
            const base = pagina.getViewport({ scale: 1 });
            const vista = pagina.getViewport({ scale: (ancho / base.width) * ppp });
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-visor-pagina';
            canvas.width = Math.floor(vista.width);
            canvas.height = Math.floor(vista.height);
            canvas.style.width = ancho + 'px';
            canvas.setAttribute('aria-label', `Página ${n} de ${pdf.numPages}`);
            visor.appendChild(canvas);
            await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
        }
    } catch (e) {
        console.error('Visor de PDF:', e);
        if (turno === pdfVisorTurno) visor.innerHTML = '<p class="pdf-visor-estado is-error"><i class="fas fa-triangle-exclamation"></i>No se pudo mostrar el PDF. Puedes descargarlo.</p>';
    }
}

// Al cerrar el popup: deja de dibujar y libera las páginas.
function pdfVisorLimpiar(iframe) {
    pdfVisorTurno++;
    const visor = iframe?.parentElement?.querySelector(':scope > .pdf-visor');
    if (visor) { visor.innerHTML = ''; visor.hidden = true; }
    if (iframe) { iframe.hidden = false; iframe.src = 'about:blank'; }
}

function pdfVisorEsIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Descarga un PDF (Blob) sin abrir otra pestaña.
async function pdfDescargarBlob(blob, nombre) {
    const nombreArchivo = /\.pdf$/i.test(nombre) ? nombre : nombre + '.pdf';
    if (pdfVisorEsIOS() && navigator.canShare) {
        const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });
        if (navigator.canShare({ files: [archivo] })) {
            try {
                await navigator.share({ files: [archivo], title: nombreArchivo });
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // cerró la hoja de Compartir
            }
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Igual, para un PDF del servidor (se baja primero como Blob).
async function pdfDescargarUrl(url, nombre) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        await pdfDescargarBlob(await res.blob(), nombre);
    } catch (e) {
        if (typeof notifyError === 'function') notifyError('No se pudo descargar el PDF: ' + e.message);
    }
}
