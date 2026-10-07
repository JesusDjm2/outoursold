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

// Acordeones de Datos Pax / Actividades / Hoteles / Itinerario: colapsan/expanden y
// recuerdan el estado por sección en localStorage, para que la vista siga compacta en la
// próxima carga si el usuario así la dejó (ej. Datos Pax, que tiene muchos campos).
function inicializarAcordeones() {
    document.querySelectorAll('.accordion-section[data-accordion-key]').forEach(section => {
        const key = section.dataset.accordionKey;
        const toggle = section.querySelector('.accordion-toggle');
        if (!toggle) return;
        let colapsado = false;
        try { colapsado = localStorage.getItem(`acc-${key}`) === '1'; } catch (e) {}
        section.classList.toggle('is-collapsed', colapsado);
        toggle.setAttribute('aria-expanded', String(!colapsado));

        toggle.addEventListener('click', () => {
            const ahoraColapsado = section.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!ahoraColapsado));
            try { localStorage.setItem(`acc-${key}`, ahoraColapsado ? '1' : '0'); } catch (e) {}
        });
    });
}

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
let cotizaciones = {};
let currentCotizacionId = null;
let paquetesData = [];
// Modo paquete (ver activarModoEdicionPaquete): true mientras se arma un paquete nuevo
// ("Nuevo paquete" / ?nuevoPaquete=1) o se edita uno (?editarPaquete=ID, con
// paqueteEditandoId = su id). Oculta Datos Pax / "Guardar" (cotización), que no aplican a
// un paquete, y el nombre se escribe en el aviso de arriba (#paquete-edit-nombre).
let modoPaquete = false;
let paqueteEditandoId = null;
// Nombre del paquete aplicado a la cotización en pantalla (chip #paquete-aplicado).
let paqueteAplicadoNombre = '';
let pdfPreviewUrl = null;
let pdfPreviewFilename = '';
let pdfPreviewCotizacionId = null;
// Si guardarCotizacion() encadena la generación del PDF de Itinerario después del de la
// cotización, queda acá y se dispara al cerrar la vista previa de la cotización (ver
// cerrarModalPdf()) — así el usuario ve un PDF a la vez, no los dos modales superpuestos.
let onPdfPreviewClosed = null;

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

// escapeHtml ahora vive en shared/catalogo-shared.js (compartida con Gestión de Datos).
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
        // Tours/Hoteles/Destinos/Categorías solo se usan acá como catálogo de lectura para
        // los selectores de Actividades/Hoteles y "Aplicar paquete..." — su gestión (crear/
        // editar/eliminar, tablas, CSV) vive en Gestión de Datos (shared/gestion-datos.js).
        renderAplicarPaqueteSelect();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        notifyError('Error al conectar con el servidor. Revisa tu conexión.');
    }
}

// buildTourSelector/buildHotelSelector (y sus helpers de cascade-select.js) ahora viven en
// shared/catalogo-shared.js (compartidos con Gestión de Datos).

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

function sumarDiasISO(fechaISO, dias) {
    const d = new Date(fechaISO + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
}

// Aplica un paquete a la cotización. Uno solo a la vez: REEMPLAZA Itinerario, Actividades y
// Hoteles (lo que hubiera, de otro paquete o agregado a mano) y los arma desde el día 1
// (Fecha de Llegada de Datos Pax). Después se pueden seguir agregando filas a mano con
// "+ Fila"; elegir otro paquete vuelve a reemplazar todo.
async function aplicarPaquete(paquete) {
    const hayAlgoArmado =
        Array.from(document.querySelectorAll('#tours-body .tour-name')).some(el => el.value) ||
        Array.from(document.querySelectorAll('#hotels-body .hotel-name')).some(el => el.value) ||
        Array.from(document.querySelectorAll('#itinerary-builder-body .module-filename')).some(el => el.value);
    if (hayAlgoArmado && !await confirmAction(
        `Se reemplazarán el Itinerario, las Actividades y los Hoteles actuales por los del paquete "${paquete.nombre}". ¿Continuar?`,
        'Sí, reemplazar'
    )) {
        return;
    }

    const fLlegada = document.querySelector('input[name="f_llegada"]').value || '';

    // Itinerario primero: si el paquete está en otro idioma, la cotización pasa a ese
    // idioma (los módulos son de SU idioma). activarIdioma ya resetea el armador.
    const nombresIdioma = { es: 'Español', en: 'English', pt: 'Português' };
    const selectIdioma = document.querySelector('select[name="idioma"]');
    const idiomaPaquete = paquete.itinerario?.modulos?.length ? paquete.itinerario.idioma : null;
    let cambioIdioma = false;
    if (idiomaPaquete && selectIdioma.value !== idiomaPaquete) {
        selectIdioma.value = idiomaPaquete;
        sincronizarTabsIdioma();
        await activarIdioma(idiomaPaquete);
        cambioIdioma = true;
    }
    document.getElementById('itinerary-builder-body').innerHTML = '';
    if (idiomaPaquete) {
        aplicarPaqueteItinerario({ modulos: paquete.itinerario.modulos });
    } else {
        addItineraryBuilderRow('itinerary-builder-body', true);
    }

    // Actividades: un día por tour desde la Fecha de Llegada. Sin "cant" explícito cada fila
    // nace en modo "auto" y sigue a N° PAX, igual que una fila agregada a mano.
    const toursBody = document.getElementById('tours-body');
    toursBody.innerHTML = '';
    if (paquete.tours?.length) {
        let fecha = fLlegada;
        agregarFilasTours(paquete.tours.map(item => {
            const fila = { tour: item.tour, fecha };
            if (fecha) fecha = sumarDiasISO(fecha, 1);
            return fila;
        }), true);
    } else {
        toursBody.appendChild(createTourRow({ fecha: fLlegada }));
    }

    // Hoteles encadenados desde la Fecha de Llegada: el check-in de cada uno es el
    // check-out del anterior, y su check-out es check-in + noches del paquete.
    const hotelsBody = document.getElementById('hotels-body');
    hotelsBody.innerHTML = '';
    if (paquete.hoteles?.length) {
        let cin = fLlegada;
        agregarFilasHoteles(paquete.hoteles.map(h => {
            const cout = cin ? sumarDiasISO(cin, h.noches) : '';
            const fila = { aloj: h.aloj, nhab: h.nhab, noches: h.noches, cin, cout };
            cin = cout;
            return fila;
        }), true);
    } else {
        hotelsBody.appendChild(createHotelRow({ cin: fLlegada }));
    }

    calcularResumen();
    paqueteAplicadoNombre = paquete.nombre;
    renderPaqueteAplicado();
    if (cambioIdioma) {
        notifyWarning(`El itinerario de este paquete está en ${nombresIdioma[idiomaPaquete]}: el idioma de la cotización se cambió a ${nombresIdioma[idiomaPaquete]}.`);
    }
}

// Chip junto a "Aplicar paquete..." con el nombre del paquete aplicado, para saber de qué
// paquete salió lo que hay armado. Se vacía con nuevaCotizacion().
function renderPaqueteAplicado() {
    const chip = document.getElementById('paquete-aplicado');
    document.getElementById('paquete-aplicado-nombre').textContent = paqueteAplicadoNombre;
    chip.classList.toggle('hidden', !paqueteAplicadoNombre);
    chip.classList.toggle('inline-flex', !!paqueteAplicadoNombre);
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

// Resumen de lo que trae una cotización histórica, para el preview de la lista y para
// decidir si aparece en ella — ya no exige que tenga actividades: una cotización con
// solo hoteles o solo itinerario también es reusable.
function resumenHistorialCotizacion(c) {
    const tours = (c.data?.tours || []).filter(t => t.tour);
    const hoteles = (c.data?.hotels || []).filter(h => h.aloj);
    const modulos = c.data?.itinerarioArmado?.modulos?.filter(Boolean) || [];
    const partes = [];
    if (tours.length) partes.push(`${tours.length} actividad${tours.length === 1 ? '' : 'es'}`);
    if (hoteles.length) partes.push(`${hoteles.length} hotel${hoteles.length === 1 ? '' : 'es'}`);
    if (modulos.length) partes.push(`${modulos.length} módulo${modulos.length === 1 ? '' : 's'} de itinerario`);
    return { tours, hoteles, modulos, resumen: partes.join(' · ') };
}

function renderHistorialTours(cotizacionesGuardadas, total) {
    const container = document.getElementById('historial-tours-list');
    // No la que se está editando ahora mismo, y que traiga algo de las 3 secciones.
    const conContenido = cotizacionesGuardadas
        .filter(c => c.id !== currentCotizacionId)
        .map(c => ({ c, r: resumenHistorialCotizacion(c) }))
        .filter(({ r }) => r.tours.length || r.hoteles.length || r.modulos.length);
    container.innerHTML = '';
    if (!conContenido.length) {
        container.innerHTML = `<p class="text-slate-400 text-sm text-center py-6">${histState.term ? 'Sin resultados.' : 'Todavía no hay cotizaciones guardadas con actividades, hoteles o itinerario.'}</p>`;
    } else {
        conContenido.forEach(({ c, r }) => {
            const nombre = c.data.pax?.nombre_pax || 'Sin nombre';
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex items-center justify-between gap-3';
            div.innerHTML = `
                <div class="min-w-0">
                    <div class="font-medium truncate">${escapeHtml(c.id)} — ${escapeHtml(nombre)}</div>
                    <div class="text-xs text-slate-500 truncate">${escapeHtml(r.resumen)}</div>
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

// Trae TODAS las actividades, hoteles e itinerario de esa cotización guardada a la vista
// actual, tal cual quedaron (misma fecha/cant/precio/distribuidor). Reutiliza primero las
// filas vacías que ya haya en las tablas (ver agregarFilasTours/agregarFilasHoteles) y
// recién luego agrega al final; el itinerario siempre se agrega al final (mismo criterio
// que aplicarPaquete, vía aplicarPaqueteItinerario).
async function reusarHistorialCotizacion(c) {
    // Sin "cant" explícito, cada fila nace en modo "auto" (igual que una fila agregada a
    // mano o un paquete aplicado) y sigue a N° PAX hasta que el usuario la edite — antes
    // se fijaba con la cantidad de la cotización histórica y quedaba sorda a N° PAX.
    const filasTours = (c.data.tours || []).filter(t => t.tour).map(t => ({
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

    // El itinerario no guarda su propio idioma (es el de Datos Pax de esa cotización,
    // vía c.data.pax.idioma) — si difiere del idioma activo ahora, se pide confirmar el
    // cambio, igual que al aplicar un paquete con itinerario en otro idioma.
    const modulos = (c.data.itinerarioArmado?.modulos || []).filter(Boolean);
    if (modulos.length) {
        const idiomaOrigen = c.data.pax?.idioma;
        const selectIdioma = document.querySelector('select[name="idioma"]');
        const nombresIdioma = { es: 'Español', en: 'English', pt: 'Português' };
        let cambioIdioma = false;
        if (idiomaOrigen && selectIdioma.value !== idiomaOrigen) {
            const armadorTieneModulos = Array.from(document.querySelectorAll('#itinerary-builder-body .module-filename')).some(el => el.value);
            if (armadorTieneModulos && !await confirmAction(
                `El itinerario de esta cotización está en ${nombresIdioma[idiomaOrigen] || idiomaOrigen}. Se cambiará el idioma de la cotización y se reiniciará el itinerario que ya armaste. ¿Continuar?`,
                'Sí, cambiar idioma'
            )) {
                cerrarHistorialTours();
                return;
            }
            selectIdioma.value = idiomaOrigen;
            sincronizarTabsIdioma();
            await activarIdioma(idiomaOrigen);
            cambioIdioma = true;
        }
        aplicarPaqueteItinerario({ modulos });
        if (cambioIdioma) {
            notifyWarning(`El itinerario de esta cotización está en ${nombresIdioma[idiomaOrigen] || idiomaOrigen}: el idioma de la cotización se cambió a ${nombresIdioma[idiomaOrigen] || idiomaOrigen}.`);
        }
    }

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
// Se dispara en cada cambio de Fecha de Llegada (ver el listener 'change' más abajo) para
// que Actividades y Hoteles SIEMPRE queden correlativos a ella — no solo la primera vez
// (antes solo llenaba fechas vacías; si una fila ya traía fecha de un cambio anterior, se
// respetaba tal cual y quedaba "sorda" a la nueva Fecha de Llegada).
function resincronizarFechasConLlegada() {
    const fLlegada = document.querySelector('input[name="f_llegada"]').value;
    if (!fLlegada) return;

    // Actividades: día 1 = Fecha de Llegada, cada fila siguiente un día más, en el orden
    // en que están las filas (se recalculan todas, tengan tour elegido o no).
    let fecha = fLlegada;
    document.querySelectorAll('#tours-body tr').forEach(tr => {
        tr.querySelector('td:nth-child(2) input').value = fecha;
        fecha = sumarDiasISO(fecha, 1);
    });

    // Hoteles: encadenados desde la Fecha de Llegada — el check-in del primero es la
    // Fecha de Llegada, el check-out respeta las noches que ya tenía cada fila, y el
    // check-in del siguiente hotel es el check-out del anterior.
    let cin = fLlegada;
    document.querySelectorAll('#hotels-body tr').forEach(tr => {
        const noches = parseFloat(tr.querySelector('.noches')?.value) || 1;
        tr.querySelector('td:nth-child(2) input').value = cin;
        const cout = sumarDiasISO(cin, noches);
        tr.querySelector('td:nth-child(3) input').value = cout;
        cin = cout;
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
        <td><input class="input w-14 rounded px-2 py-1 border text-right cant" type="number" min="0" value="${initialCant}"></td>
        <td><input class="input w-20 rounded px-2 py-1 border distr" type="text" value="${data.distr || ''}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
        <td class="col-confidencial"><input class="input w-20 rounded px-2 py-1 border text-right pconf" type="number" step="0.01" min="0" value="${data.pconf || 0}"></td>
        <td class="col-confidencial"><input class="input w-20 rounded px-2 py-1 border text-right pctotal" type="number" step="0.01" min="0" value="${data.pctotal || 0}"></td>
        <td class="text-right total-line col-costo">${fmt(initialTotal)}</td>
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
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pconf" type="number" step="0.01" min="0" value="${data.pconf || 0}"></td>
        <td class="col-confidencial"><input class="input w-full max-w-28 rounded px-2 py-1 border text-right pctotal" type="number" step="0.01" min="0" value="${data.pctotal || 0}"></td>
        <td class="text-right total-line col-costo">${fmt(initialTotal)}</td>
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

// Guarda el Itinerario/Actividades/Hoteles que ya tiene armados la vista como un paquete
// predefinido reutilizable (único lugar donde se crean/editan paquetes: Gestión de Datos >
// Paquetes solo los lista). Sin fechas/cin-cout/precios ni datos de pasajero: un paquete es
// una plantilla reutilizable, no una cotización concreta. En modo paquete el nombre sale
// del aviso de arriba (#paquete-edit-nombre); desde una cotización normal se pide aparte.
async function guardarComoPaquete() {
    const tours = Array.from(document.getElementById('tours-body').querySelectorAll('tr'))
        .map(tr => ({ tour: tr.querySelector('.tour-name').value, cant: tr.querySelector('.cant').value }))
        .filter(t => t.tour);
    const hoteles = Array.from(document.getElementById('hotels-body').querySelectorAll('tr'))
        .map(tr => ({ aloj: tr.querySelector('.hotel-name').value, nhab: tr.querySelector('.nhab').value, noches: tr.querySelector('.noches').value }))
        .filter(h => h.aloj);
    const modulos = Array.from(document.querySelectorAll('#itinerary-builder-body .module-filename')).map(el => el.value).filter(Boolean);
    let nombre;
    if (modoPaquete) {
        const nombreInput = document.getElementById('paquete-edit-nombre');
        nombre = nombreInput.value.trim();
        if (!nombre) {
            notifyWarning('Escribe el nombre del paquete antes de guardarlo.');
            nombreInput.focus();
            return;
        }
    }
    if (!tours.length && !hoteles.length && !modulos.length) {
        notifyWarning('Agrega al menos un itinerario, una actividad o un hotel antes de guardar el paquete.');
        return;
    }
    if (!modoPaquete) {
        nombre = (await promptText('Nombre del paquete', 'ej. Cusco Clásico 3D/2N', ''))?.trim();
        if (!nombre) return;
    }
    try {
        const payload = {
            nombre, tours, hoteles,
            itinerario: modulos.length ? { idioma: document.querySelector('select[name="idioma"]').value, modulos } : null
        };
        if (paqueteEditandoId) payload.id = paqueteEditandoId;
        const res = await fetch(`${API_URL}?path=guardar-paquete-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        const eraEdicion = !!paqueteEditandoId;
        if (modoPaquete) {
            salirModoEdicionPaquete();
            nuevaCotizacion(false);
        }
        await notifySuccess(eraEdicion
            ? `Paquete "${nombre}" actualizado.`
            : `Paquete "${nombre}" guardado. Ya está disponible en "Aplicar paquete" y en Gestión de Datos > Paquetes.`);
        await refrescarPaquetesData();
    } catch (e) {
        notifyError('Error al guardar el paquete: ' + e.message);
    }
}

// ===== Editar un paquete predefinido en esta misma vista (reusa el drag-and-drop de
// Itinerario/Actividades/Hoteles) — entra vía ?editarPaquete=ID, ver init() más abajo. =====
async function cargarPaqueteParaEditar(id) {
    const paquete = paquetesData.find(p => String(p.id) === String(id));
    if (!paquete) {
        notifyError('No se encontró el paquete. Puede que ya no exista.');
        return;
    }
    nuevaCotizacion(false);

    const toursBody = document.getElementById('tours-body');
    toursBody.innerHTML = '';
    (paquete.tours.length ? paquete.tours : [{}]).forEach(t => toursBody.appendChild(createTourRow(t)));

    const hotelsBody = document.getElementById('hotels-body');
    hotelsBody.innerHTML = '';
    (paquete.hoteles.length ? paquete.hoteles : [{}]).forEach(h => hotelsBody.appendChild(createHotelRow(h)));

    const idioma = paquete.itinerario?.idioma || 'es';
    document.querySelector('select[name="idioma"]').value = idioma;
    sincronizarTabsIdioma();
    await activarIdioma(idioma);
    if (paquete.itinerario?.modulos?.length) {
        aplicarPaqueteItinerario({ modulos: paquete.itinerario.modulos });
    }

    calcularResumen();
    activarModoEdicionPaquete(paquete);
}

// Entra en modo paquete: con `paquete` edita ese (nombre precargado, "Actualizar
// paquete"); sin él arma uno nuevo a partir de lo que ya haya en pantalla.
function activarModoEdicionPaquete(paquete = null) {
    modoPaquete = true;
    paqueteEditandoId = paquete ? paquete.id : null;
    document.getElementById('paquete-edit-modo').textContent = paquete ? 'Editando el paquete' : 'Nuevo paquete';
    const nombreInput = document.getElementById('paquete-edit-nombre');
    nombreInput.value = paquete ? paquete.nombre : '';
    document.getElementById('paquete-edit-banner').classList.remove('hidden');
    document.body.classList.add('modo-paquete');
    document.getElementById('datos-pax-section').classList.add('hidden');
    const mainCol = document.getElementById('cotizador-main-col');
    mainCol.classList.remove('lg:col-span-3');
    mainCol.classList.add('lg:col-span-4');
    document.getElementById('guardar-cotizacion').classList.add('hidden');
    document.getElementById('guardar-como-paquete').innerHTML = paquete
        ? '<i class="fas fa-box-archive mr-2"></i>Actualizar paquete'
        : '<i class="fas fa-box-archive mr-2"></i>Guardar paquete';
    if (!paquete) nombreInput.focus();
}

function salirModoEdicionPaquete() {
    modoPaquete = false;
    paqueteEditandoId = null;
    document.getElementById('paquete-edit-nombre').value = '';
    document.getElementById('paquete-edit-banner').classList.add('hidden');
    document.body.classList.remove('modo-paquete');
    document.getElementById('datos-pax-section').classList.remove('hidden');
    const mainCol = document.getElementById('cotizador-main-col');
    mainCol.classList.remove('lg:col-span-4');
    mainCol.classList.add('lg:col-span-3');
    document.getElementById('guardar-cotizacion').classList.remove('hidden');
    document.getElementById('guardar-como-paquete').innerHTML = '<i class="fas fa-box-archive mr-2"></i>Guardar como paquete';
}

// Refresca paquetesData y el selector "Aplicar paquete..." tras guardar uno nuevo desde
// acá (la gestión completa — crear/editar/eliminar, listado — vive en Gestión de Datos).
async function refrescarPaquetesData() {
    try {
        paquetesData = await fetch(`${API_URL}?path=paquetes-tours`).then(r => r.json());
        renderAplicarPaqueteSelect();
    } catch (e) {
        console.error('Error al refrescar paquetes:', e);
    }
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
    // Antes se podía guardar el formulario vacío (un clic accidental en "Guardar" dejaba
    // una cotización basura, ID "-", nombre "-") — se exige al menos el nombre del
    // pasajero y una actividad u hotel antes de mandarla al servidor.
    if (!(data.pax.nombre_pax || '').trim()) {
        notifyWarning('Ingresa el nombre del pasajero antes de guardar.');
        return;
    }
    if (!tours.some(t => t.tour.trim()) && !hotels.some(h => h.aloj.trim())) {
        notifyWarning('Agrega al menos una actividad o un hotel antes de guardar.');
        return;
    }
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
            // Guardar ya genera los PDF (antes había que pedirlo aparte con un aviso de
            // "¿Generar PDF?", y el de Itinerario tenía su propio botón "Generar Itinerario"
            // — ver handleGenerateItinerary en itinerario.js). Sin aviso previo: el propio
            // PDF abriéndose ya confirma que se guardó bien (un Swal.fire() bloqueante acá
            // tapaba la vista previa hasta cerrarlo aparte). Primero el de la cotización; si
            // además hay módulos armados en "4. Itinerario", al cerrar esa vista previa se
            // encadena la del itinerario.
            const hayItinerarioArmado = data.itinerarioArmado.modulos.length > 0;
            if (hayItinerarioArmado) onPdfPreviewClosed = () => handleGenerateItinerary();
            await mostrarVistaPreviaPdf(id);
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
        sincronizarTabsIdioma();
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
    sincronizarTabsIdioma();
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
    paqueteAplicadoNombre = '';
    renderPaqueteAplicado();
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

// Título por defecto del itinerario, ligado al pasajero de la cotización (ya no se
// escribe a mano — ver el listener de nombre_pax más abajo). Si una cotización guardada
// antes de este cambio ya trae un título propio (armado.titulo), ese se respeta.
function tituloItinerarioPara(nombrePax) {
    return nombrePax ? `Itinerario de ${nombrePax}` : '';
}

function restaurarItinerarioArmado(armado) {
    const nombrePax = document.querySelector('input[name="nombre_pax"]').value || '';
    document.getElementById('itinerary-passenger').value = armado?.pasajero || nombrePax;
    document.getElementById('itinerary-title').value = armado?.titulo || tituloItinerarioPara(nombrePax);
    const body = document.getElementById('itinerary-builder-body');
    body.innerHTML = '';
    const modulos = armado?.modulos || [];
    if (modulos.length === 0) {
        addItineraryBuilderRow('itinerary-builder-body', true);
    } else {
        modulos.forEach(filename => addItineraryBuilderRow('itinerary-builder-body', true, filename));
    }
}

// "Cotizaciones Guardadas" (tabla, búsqueda, paginación, abrir/duplicar/ver PDF/eliminar)
// vive ahora en Gestión de Datos (ver shared/gestion-datos.js) — Abrir/Duplicar/Ver PDF
// llegan hasta acá por el deep-link ?cotizacion=ID[&ver=pdf] que ya maneja init() más abajo.

// Las 3 pestañas de arriba (#idioma-tabs) son una capa visual sobre select[name="idioma"],
// que sigue siendo la única fuente de verdad (lo lee/escribe el resto de este archivo:
// guardarCotizacion, aplicarPaquete, reusarHistorialCotizacion, cargarCotizacion...).
// Se llama después de cualquier cambio de su .value hecho a mano, para que la pestaña
// activa no quede desincronizada.
function sincronizarTabsIdioma() {
    const idioma = document.querySelector('select[name="idioma"]').value;
    document.querySelectorAll('#idioma-tabs .subnav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.idioma === idioma);
    });
}

// Hay algo que se perdería si se pisa el formulario ahora mismo (nombre de pasajero, o
// alguna actividad/hotel ya escritos) — mismo criterio que usan "Nueva cotización" y
// "Limpiar todo", que sí confirman antes de descartar.
function formularioTieneDatosSinGuardar() {
    const nombrePax = document.querySelector('input[name="nombre_pax"]')?.value.trim();
    if (nombrePax) return true;
    const hayTour = Array.from(document.querySelectorAll('#tours-body .tour-name')).some(el => el.value.trim());
    const hayHotel = Array.from(document.querySelectorAll('#hotels-body .hotel-name')).some(el => el.value.trim());
    return hayTour || hayHotel;
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
    if (onPdfPreviewClosed) {
        const callback = onPdfPreviewClosed;
        onPdfPreviewClosed = null;
        callback();
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

    document.querySelectorAll('#idioma-tabs .subnav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const selectIdioma = document.querySelector('select[name="idioma"]');
            if (selectIdioma.value === tab.dataset.idioma) return;
            selectIdioma.value = tab.dataset.idioma;
            selectIdioma.dispatchEvent(new Event('change'));
            sincronizarTabsIdioma();
        });
    });

    inicializarAcordeones();
    document.getElementById('guardar-cotizacion').addEventListener('click', guardarCotizacion);
    document.getElementById('guardar-como-paquete').addEventListener('click', guardarComoPaquete);
    document.querySelector('input[name="n_pax"]').addEventListener('input', sincronizarCantidadTours);
    document.querySelectorAll('.field-overlay input').forEach(input => {
        input.addEventListener('input', () => actualizarEstadoCampoFecha(input));
    });
    actualizarEstadosCamposFecha();

    document.getElementById('historial-tours-btn').addEventListener('click', abrirHistorialTours);
    document.getElementById('close-historial-tours-btn').addEventListener('click', cerrarHistorialTours);
    // Itinerario embebido: sigue el idioma de Datos Pax en vez de sus propias pestañas
    // (que no se renderizan acá), y el Nombre PAX precompleta el pasajero y el título del
    // armador (ver tituloItinerarioPara) — ya no se escriben a mano.
    document.querySelector('select[name="idioma"]').addEventListener('change', (e) => activarIdioma(e.target.value));
    document.querySelector('input[name="nombre_pax"]').addEventListener('input', (e) => {
        document.getElementById('itinerary-passenger').value = e.target.value;
        document.getElementById('itinerary-title').value = tituloItinerarioPara(e.target.value);
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

    // Único botón que limpia las 4 secciones a la vez (Datos Pax, Actividades, Hoteles e
    // Itinerario). "Nueva Cotización" (antes acá, junto a Cotizaciones Guardadas) ahora es
    // simplemente navegar a esta misma página sin ?cotizacion= (ver botón homónimo en
    // Gestión de Datos, shared/gestion-datos.js).
    document.getElementById('limpiar-todo').addEventListener('click', async () => {
        if (!await confirmAction('¿Limpiar todo el formulario? Se borrarán los datos de Pasajero, Actividades, Hoteles e Itinerario de esta cotización.', 'Sí, limpiar todo')) return;
        nuevaCotizacion(false);
        notifySuccess('Formulario limpiado.');
    });
    document.getElementById('aplicar-paquete-select').addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        const paquete = paquetesData.find(p => String(p.id) === id);
        if (paquete) aplicarPaquete(paquete);
        e.target.value = '';
    });

    document.getElementById('add-tour').addEventListener('click', () => document.getElementById('tours-body').appendChild(createTourRow({ fecha: sugerirSiguienteFechaTour() })));
    document.getElementById('add-hotel').addEventListener('click', () => document.getElementById('hotels-body').appendChild(createHotelRow({ cin: sugerirSiguienteCheckinHotel() })));
    // Los "Limpiar" sueltos de Actividades/Hoteles/Itinerario se quitaron: "Limpiar todo"
    // (junto a Guardar) ya cubre las 4 secciones desde un solo lugar, con confirmación.
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
    setupDragDrop();
    initPaisAutocomplete();

    // Deep link desde fuera del cotizador (Gestión de Datos > Cotizaciones Guardadas, o el
    // detalle de una agencia en Usuarios): ?cotizacion=ID la abre directo; con &ver=pdf de
    // paso abre la vista previa del PDF (mismo criterio que antes el botón "Ver PDF" de
    // Cotizaciones Guardadas, ahora en otra página).
    const paramsUrl = new URLSearchParams(window.location.search);
    const cotizacionUrlId = paramsUrl.get('cotizacion');
    if (cotizacionUrlId) {
        await cargarCotizacion(cotizacionUrlId);
        if (paramsUrl.get('ver') === 'pdf') await mostrarVistaPreviaPdf(cotizacionUrlId);
        history.replaceState(null, '', window.location.pathname);
    }

    // Deep link desde Gestión de Datos > Paquetes ("Editar"): ?editarPaquete=ID carga ese
    // paquete en Actividades/Hoteles/Itinerario para editarlo con drag-and-drop (ver
    // cargarPaqueteParaEditar más arriba).
    const paqueteEditarId = paramsUrl.get('editarPaquete');
    if (paqueteEditarId) {
        await cargarPaqueteParaEditar(paqueteEditarId);
        history.replaceState(null, '', window.location.pathname);
    }
    // "Crear paquete en el Cotizador" (Gestión de Datos > Paquetes): ?nuevoPaquete=1.
    if (paramsUrl.get('nuevoPaquete')) {
        activarModoEdicionPaquete();
        history.replaceState(null, '', window.location.pathname);
    }
    document.getElementById('paquete-nuevo-btn').addEventListener('click', () => activarModoEdicionPaquete());
    // Cancelar una edición descarta lo cargado del paquete; cancelar uno nuevo solo sale
    // del modo y deja lo armado en pantalla (puede venir de una cotización en curso).
    document.getElementById('paquete-edit-cancelar').addEventListener('click', () => {
        const eraEdicion = !!paqueteEditandoId;
        salirModoEdicionPaquete();
        if (eraEdicion) nuevaCotizacion(false);
    });

    // Mismo criterio que formularioTieneDatosSinGuardar(): si hay algo escrito que no se
    // guardó, avisa también al cerrar/recargar la pestaña, no solo al navegar dentro de la app.
    window.addEventListener('beforeunload', (e) => {
        if (!formularioTieneDatosSinGuardar()) return;
        e.preventDefault();
        e.returnValue = '';
    });
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

document.addEventListener('DOMContentLoaded', init);
