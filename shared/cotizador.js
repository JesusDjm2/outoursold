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
        const [toursRes, hotelesRes, cotizacionesRes] = await Promise.all([
            fetch(`${API_URL}?path=tours`).then(r => r.json()),
            fetch(`${API_URL}?path=hoteles`).then(r => r.json()),
            fetch(`${API_URL}?path=cotizaciones`).then(r => r.json())
        ]);
        toursData = toursRes;
        hotelsData = hotelesRes;
        cotizaciones = {};
        cotizacionesRes.forEach(c => {
            cotizaciones[c.id] = c.data;
        });
        updateDatalists();
        renderTours();
        renderHotels();
        actualizarUltimasCotizaciones();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        notifyError('Error al conectar con el servidor. Revisa tu conexión.');
    }
}

// ===== ACTUALIZAR DATALISTS =====
function updateDatalists() {
    ['tours', 'hotels'].forEach(type => {
        let list = document.getElementById(type + '-list');
        if (!list) {
            list = document.createElement('datalist');
            list.id = type + '-list';
            document.body.appendChild(list);
        }
        list.innerHTML = '';
        const items = type === 'tours'
            ? [...new Set(toursData.map(t => t.tour))]
            : [...new Set(hotelsData.map(h => h.aloj))];
        items.sort().forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            list.appendChild(opt);
        });
    });
}

// ===== RENDER TABLAS (gestión) =====
function renderTours() {
    const tbody = document.getElementById('tours-table-body');
    tbody.innerHTML = '';
    toursData.sort((a,b) => a.tour.localeCompare(b.tour)).forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-3 font-medium">${t.tour}</td>
            <td class="p-3">${t.distr}</td>
            <td class="p-3">${fmt(t.preg)}</td>
            <td class="p-3">${fmt(t.ppromo)}</td>
        `;
        tbody.appendChild(row);
    });
    updateDatalists();
}

function renderHotels() {
    const tbody = document.getElementById('hotels-table-body');
    tbody.innerHTML = '';
    hotelsData.sort((a,b) => a.aloj.localeCompare(b.aloj)).forEach(h => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-3 font-medium">${h.aloj}</td>
            <td class="p-3">${h.distr}</td>
            <td class="p-3">${fmt(h.preg)}</td>
            <td class="p-3">${fmt(h.ppromo)}</td>
        `;
        tbody.appendChild(row);
    });
    updateDatalists();
}

// ===== FILAS =====
function createTourRow(data = {}) {
    const tr = document.createElement('tr');
    tr.className = 'draggable';
    tr.draggable = true;

    const initialCant = Number(data.cant) || 0;
    const initialPpromo = Number(data.ppromo) || 0;
    const initialTotal = initialCant * initialPpromo;

    tr.innerHTML = `
        <td class="pl-2"><div class="handle">≡</div></td>
        <td><input class="input w-full rounded px-2 py-1 border" type="date" value="${data.fecha || ''}"></td>
        <td><input class="input w-full rounded px-2 py-1 border tour-name" type="text" value="${data.tour || ''}" list="tours-list"></td>
        <td><input class="input w-full rounded px-2 py-1 border text-right cant" type="number" min="0" value="${initialCant}"></td>
        <td><input class="input w-full rounded px-2 py-1 border distr" type="text" value="${data.distr || ''}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right preg" type="number" step="0.01" value="${data.preg || 0}" readonly></td>
        <td hidden><input class="input w-full rounded px-2 py-1 border text-right ppromo" type="number" step="0.01" value="${initialPpromo}" readonly></td>
        <td class="text-right total-line">${fmt(initialTotal)}</td>
        <td class="pr-2 text-right"><button class="text-red-500 small"><i class="fas fa-trash"></i></button></td>
    `;
    tr.querySelector('button').onclick = () => { tr.remove(); calcularResumen(); };
    tr.querySelector('input.cant').addEventListener('input', () => {
        const cant = parseFloat(tr.querySelector('.cant').value) || 0;
        const ppromo = parseFloat(tr.querySelector('.ppromo').value) || 0;
        tr.querySelector('.total-line').textContent = fmt(cant * ppromo);
        calcularResumen();
    });

    const tourInput = tr.querySelector('.tour-name');

    let originalValue = data.tour || '';
    tourInput.addEventListener('mousedown', function() {
        originalValue = this.value;
        this.value = '';
    });
    tourInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = originalValue;
        }
    });

    tourInput.addEventListener('input', function() {
        const tour = toursData.find(t => t.tour === this.value);
        if (tour) {
            tr.querySelector('.preg').value = tour.preg;
            tr.querySelector('.ppromo').value = tour.ppromo;
            tr.querySelector('.distr').value = tour.distr;
            const cant = parseFloat(tr.querySelector('.cant').value) || 0;
            tr.querySelector('.total-line').textContent = fmt(cant * tour.ppromo);
            calcularResumen();
            originalValue = this.value;
        }
    });
    addDragHandlers(tr);
    return tr;
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
            actualizarUltimasCotizaciones();
            notifySuccess(`Cotización guardada con ID: ${id}`);
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
        currentCotizacionId = id;
        document.getElementById('current-cot-id-display').textContent = id;
        actualizarUltimasCotizaciones();
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

function showSearchModal(term) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    const modal = document.getElementById('search-modal');
    fetch(`${API_URL}?path=cotizaciones&q=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(results => {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="text-slate-500">No se encontraron cotizaciones.</p>';
            } else {
                results.forEach(cot => {
                    const resultEl = document.createElement('div');
                    resultEl.className = 'p-3 border rounded-lg cursor-pointer hover:bg-slate-50';
                    resultEl.innerHTML = `
                        <p class="font-semibold">${cot.data.pax.nombre_pax || 'Sin Nombre'}</p>
                        <p class="text-sm text-slate-600">${cot.id} - ${cot.data.pax.contacto || 'Sin contacto'}</p>
                    `;
                    resultEl.addEventListener('click', () => {
                        cargarCotizacion(cot.id);
                        modal.classList.add('hidden');
                    });
                    resultsContainer.appendChild(resultEl);
                });
            }
        })
        .catch(() => {
            resultsContainer.innerHTML = '<p class="text-red-500">Error al buscar.</p>';
        });
    modal.classList.remove('hidden');
}

function actualizarUltimasCotizaciones() {
    fetch(`${API_URL}?path=cotizaciones`)
        .then(r => r.json())
        .then(cots => {
            const container = document.getElementById('ultimas-cotizaciones');
            container.innerHTML = '';
            const ultimas = cots.slice(0, 5);
            if (ultimas.length === 0) {
                container.innerHTML = '<span class="text-slate-400">Ninguna</span>';
                return;
            }
            ultimas.forEach(cot => {
                const badge = document.createElement('span');
                badge.className = 'px-2 py-1 rounded bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200';
                badge.textContent = cot.id;
                badge.title = `${cot.data.pax.nombre_pax || 'Sin nombre'} - ${cot.data.pax.contacto || ''}`;
                badge.addEventListener('click', () => cargarCotizacion(cot.id));
                container.appendChild(badge);
            });
        })
        .catch(() => {
            document.getElementById('ultimas-cotizaciones').innerHTML = '<span class="text-red-500">Error</span>';
        });
}

async function generarCotizacionPdf() {
    if (!validarFechas()) return;

    const generateBtn = document.getElementById('generar-cotizacion-html');
    const originalButtonText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generando...';
    generateBtn.disabled = true;

    if (!currentCotizacionId) {
        await guardarCotizacion();
        if (!currentCotizacionId) {
            notifyError("No se pudo guardar la cotización antes de generar el PDF.");
            generateBtn.innerHTML = originalButtonText;
            generateBtn.disabled = false;
            return;
        }
    }

    const cotizacionActual = cotizaciones[currentCotizacionId];
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    try {
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

        const finalPdfBytes = await finalPdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `Cotizacion_${cotizacionActual.id}_${cotizacionActual.pax.nombre_pax || 'cliente'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (error) {
        console.error('Error al generar PDF:', error);
        notifyError('Hubo un error al generar el PDF. Revisa la consola para más detalles.');
    } finally {
        generateBtn.innerHTML = originalButtonText;
        generateBtn.disabled = false;
    }
}

// ===== BOTONES SUPERIORES =====
document.getElementById('switch-moneda').addEventListener('click', () => {
    window.location.href = window.APP_CONFIG.switchTarget;
});

document.getElementById('cerrar-sesion').addEventListener('click', async () => {
    if (await confirmAction('¿Cerrar sesión?')) {
        window.location.href = '../shared/logout.php';
    }
});

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
        });
    });

    document.getElementById('generar-cotizacion-html').addEventListener('click', generarCotizacionPdf);
    document.getElementById('guardar-cotizacion').addEventListener('click', guardarCotizacion);
    document.getElementById('nueva-cotizacion').addEventListener('click', () => nuevaCotizacion());
    document.getElementById('buscar-cotizacion-input').addEventListener('keyup', e => {
        if (e.key === 'Enter') showSearchModal(e.target.value);
    });
    document.getElementById('btn-buscar').addEventListener('click', () => {
        const term = document.getElementById('buscar-cotizacion-input').value.trim();
        if (term) showSearchModal(term);
    });
    document.getElementById('search-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('search-modal')) {
            document.getElementById('search-modal').classList.add('hidden');
        }
    });
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('search-modal').classList.add('hidden');
    });
    document.getElementById('add-tour').addEventListener('click', () => document.getElementById('tours-body').appendChild(createTourRow()));
    document.getElementById('add-hotel').addEventListener('click', () => document.getElementById('hotels-body').appendChild(createHotelRow()));
    document.getElementById('clear-tours').addEventListener('click', () => { document.getElementById('tours-body').innerHTML = ''; calcularResumen(); });
    document.getElementById('clear-hotels').addEventListener('click', () => { document.getElementById('hotels-body').innerHTML = ''; calcularResumen(); });
    document.getElementById('calcular').addEventListener('click', calcularResumen);
    document.getElementById('precio-adicional').addEventListener('input', calcularResumen);
    document.getElementById('descuento-especial').addEventListener('input', calcularResumen);
    document.getElementById('tour-csv-input').addEventListener('change', handleTourCsvUpload);
    document.getElementById('hotel-csv-input').addEventListener('change', handleHotelCsvUpload);
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
