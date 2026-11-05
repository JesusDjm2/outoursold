// shared/historial-cotizaciones.js
// Historial de cotizaciones: tabla de las cotizaciones creadas (USD y PEN juntas), de la más
// reciente a la más antigua, con buscador, filtro de moneda y páginas. El servidor ya las
// devuelve resumidas y paginadas (historial-cotizaciones-api.php). La búsqueda, la moneda y
// la página quedan en la URL, así que recargar o volver desde el Cotizador no las pierde.
// Abrir, PDF e Itinerario llevan al Cotizador de su moneda (ver el deep link ?cotizacion=ID
// en cotizador.js); Eliminar usa la API de su moneda.

const HC_API = 'historial-cotizaciones-api.php';
const HC_MONEDAS = { usd: { codigo: 'USD', simbolo: '$' }, pen: { codigo: 'PEN', simbolo: 'S/' } };
const HC_IDIOMAS = { es: 'Español', en: 'English', pt: 'Português' };
const hc = { q: '', moneda: 'todas', pagina: 1, total: 0, porPagina: 25, filas: [], pedido: 0 };

// Cualquier dato escrito por un usuario pasa por acá antes de ir a innerHTML.
function hcEsc(texto) {
    const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(texto ?? '').replace(/[&<>"']/g, (c) => mapa[c]);
}
function hcFecha(valor) {
    if (!valor) return null;
    const texto = String(valor);
    // "2026-10-24" es una fecha sin hora: se lee como local, no como UTC.
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto + 'T00:00:00' : texto.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
}
function hcDia(d, conAnio = true) {
    return d.toLocaleDateString('es-PE', conAnio ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).replace('.', '');
}
function hcHora(d) {
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}
function hcDinero(monto, moneda) {
    const m = HC_MONEDAS[moneda] || HC_MONEDAS.usd;
    return `${m.simbolo} ${Number(monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function hcPlural(n, uno, varios) {
    return `${n} ${n === 1 ? uno : varios}`;
}

// ===== URL =====
function hcLeerUrl() {
    const p = new URLSearchParams(location.search);
    hc.q = p.get('q') || '';
    hc.moneda = ['usd', 'pen'].includes(p.get('moneda')) ? p.get('moneda') : 'todas';
    hc.pagina = Math.max(1, parseInt(p.get('pagina'), 10) || 1);
}
function hcEscribirUrl() {
    const p = new URLSearchParams();
    if (hc.q) p.set('q', hc.q);
    if (hc.moneda !== 'todas') p.set('moneda', hc.moneda);
    if (hc.pagina > 1) p.set('pagina', hc.pagina);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
}

// ===== Carga =====
async function hcCargar() {
    const pedido = ++hc.pedido;
    hcEscribirUrl();
    hcPintarSegmento();
    document.getElementById('hc-cuerpo').innerHTML = '<tr class="hc-fila-cargando"><td colspan="8"></td></tr>'.repeat(6);
    try {
        const params = new URLSearchParams({ q: hc.q, moneda: hc.moneda, pagina: hc.pagina });
        const res = await fetch(`${HC_API}?${params}`);
        const datos = await res.json();
        if (!res.ok || datos.error) throw new Error(datos.error || `Error ${res.status}`);
        if (pedido !== hc.pedido) return; // llegó tarde: ya se pidió otra búsqueda
        Object.assign(hc, { filas: datos.filas, total: datos.total, pagina: datos.pagina, porPagina: datos.por_pagina });
        hcEscribirUrl();
        hcPintarResumen(datos.resumen);
        hcPintarTabla();
    } catch (e) {
        if (pedido !== hc.pedido) return;
        document.getElementById('hc-cuerpo').innerHTML = `<tr><td colspan="8" class="hc-vacio is-error"><i class="fas fa-triangle-exclamation"></i>No se pudo cargar el historial. <button type="button" class="hc-enlace" data-accion="reintentar">Reintentar</button></td></tr>`;
        document.getElementById('hc-conteo').textContent = '';
        hcPintarPaginas();
    }
}

// ===== Pintado =====
function hcPintarResumen(r) {
    const kpi = (etiqueta, valor, detalle) => `
        <div class="hc-kpi">
            <span class="hc-kpi-etiqueta">${etiqueta}</span>
            <span class="hc-kpi-valor">${valor.toLocaleString('es-PE')}</span>
            ${detalle ? `<span class="hc-kpi-detalle">${detalle}</span>` : ''}
        </div>`;
    const mes = new Date().toLocaleDateString('es-PE', { month: 'long' });
    document.getElementById('hc-kpis').innerHTML =
        kpi('Cotizaciones', r.total, 'creadas en total') +
        kpi('Este mes', r.este_mes, mes.charAt(0).toUpperCase() + mes.slice(1)) +
        kpi('En USD', r.usd, 'dólares') +
        kpi('En PEN', r.pen, 'soles');
}

function hcPintarSegmento() {
    document.querySelectorAll('#hc-monedas .hc-segmento-btn').forEach(b => {
        const activo = b.dataset.moneda === hc.moneda;
        b.classList.toggle('is-activo', activo);
        b.setAttribute('aria-pressed', String(activo));
    });
}

function hcFilaHtml(c, i) {
    const creada = hcFecha(c.creada);
    const llegada = hcFecha(c.f_llegada);
    const salida = hcFecha(c.f_salida);
    const moneda = HC_MONEDAS[c.moneda] || HC_MONEDAS.usd;

    let viaje = '<span class="hc-tenue">—</span>';
    if (llegada && salida) {
        const mismoAnio = llegada.getFullYear() === salida.getFullYear();
        const noches = Math.round((salida - llegada) / 86400000);
        viaje = `<span class="hc-linea">${hcDia(llegada, !mismoAnio)} → ${hcDia(salida)}</span>
            ${noches > 0 ? `<span class="hc-sub">${hcPlural(noches, 'noche', 'noches')}</span>` : ''}`;
    } else if (llegada) {
        viaje = `<span class="hc-linea">Llega ${hcDia(llegada)}</span>`;
    }

    const chip = (icono, texto) => `<span class="hc-chip"><i class="fas ${icono}" aria-hidden="true"></i>${texto}</span>`;
    const chips = [
        c.actividades ? chip('fa-ticket', hcPlural(c.actividades, 'actividad', 'actividades')) : '',
        c.hoteles ? chip('fa-bed', hcPlural(c.hoteles, 'hotel', 'hoteles')) : '',
        c.modulos ? chip('fa-route', `Itinerario ${hcPlural(c.dias_itinerario, 'día', 'días')}`) : ''
    ].join('');
    const paquete = c.paquete ? `<span class="hc-paquete" title="Armada con el paquete ${hcEsc(c.paquete)}"><i class="fas fa-box-archive" aria-hidden="true"></i>${hcEsc(c.paquete)}</span>` : '';

    const nombre = c.nombre_pax
        ? `<a class="hc-nombre" href="${hcUrlCotizador(c)}">${hcEsc(c.nombre_pax)}</a>`
        : `<a class="hc-nombre is-sin-nombre" href="${hcUrlCotizador(c)}">Sin nombre</a>`;
    const subPasajero = [c.contacto, c.id].filter(Boolean).map(hcEsc).join(' · ');

    return `<tr data-i="${i}">
        <td data-etiqueta="Creada">
            <span class="hc-linea">${creada ? hcDia(creada) : '—'}</span>
            <span class="hc-sub">${creada ? hcHora(creada) : ''}${c.creado_por ? ` · ${hcEsc(c.creado_por)}` : ''}</span>
        </td>
        <td data-etiqueta="Pasajero" class="hc-col-pasajero">
            ${nombre}
            <span class="hc-sub hc-recortar" title="${subPasajero}">${subPasajero}</span>
        </td>
        <td data-etiqueta="País">${c.pais ? hcEsc(c.pais) : '<span class="hc-tenue">—</span>'}${c.idioma && HC_IDIOMAS[c.idioma] ? `<span class="hc-sub">${HC_IDIOMAS[c.idioma]}</span>` : ''}</td>
        <td data-etiqueta="Pax" class="is-num">${c.n_pax || '—'}</td>
        <td data-etiqueta="Viaje">${viaje}</td>
        <td data-etiqueta="Contenido"><div class="hc-chips">${chips || '<span class="hc-tenue">Vacía</span>'}${paquete}</div></td>
        <td data-etiqueta="Total" class="is-num">
            <span class="hc-total">${c.total ? hcDinero(c.total, c.moneda) : '<span class="hc-tenue">—</span>'}</span>
            <span class="hc-moneda">${moneda.codigo}</span>
        </td>
        <td class="hc-acciones">
            <a class="hc-btn-icono" href="${hcUrlCotizador(c)}" title="Abrir en el Cotizador" aria-label="Abrir ${hcEsc(c.id)} en el Cotizador"><i class="fas fa-folder-open"></i></a>
            <a class="hc-btn-icono" href="${hcUrlCotizador(c, 'pdf')}" title="PDF de la cotización" aria-label="PDF de la cotización ${hcEsc(c.id)}"><i class="fas fa-file-pdf"></i></a>
            ${c.modulos
                ? `<a class="hc-btn-icono" href="${hcUrlCotizador(c, 'itinerario')}" title="PDF del itinerario" aria-label="PDF del itinerario ${hcEsc(c.id)}"><i class="fas fa-route"></i></a>`
                : '<span class="hc-btn-icono is-apagado" title="Sin itinerario armado" aria-hidden="true"><i class="fas fa-route"></i></span>'}
            <button type="button" class="hc-btn-icono is-peligro" data-accion="eliminar" title="Eliminar" aria-label="Eliminar ${hcEsc(c.id)}"><i class="fas fa-trash"></i></button>
        </td>
    </tr>`;
}

function hcUrlCotizador(c, ver) {
    return `../${c.moneda}/index.php?cotizacion=${encodeURIComponent(c.id)}${ver ? `&ver=${ver}` : ''}`;
}

function hcPintarTabla() {
    const cuerpo = document.getElementById('hc-cuerpo');
    if (!hc.filas.length) {
        const filtrado = hc.q || hc.moneda !== 'todas';
        cuerpo.innerHTML = `<tr><td colspan="8" class="hc-vacio">
            <i class="fas ${filtrado ? 'fa-magnifying-glass' : 'fa-file-invoice'}"></i>
            ${filtrado ? 'Ninguna cotización coincide con la búsqueda.' : 'Todavía no hay cotizaciones guardadas.'}
            ${filtrado ? '<button type="button" class="hc-enlace" data-accion="limpiar">Quitar filtros</button>' : ''}
        </td></tr>`;
    } else {
        cuerpo.innerHTML = hc.filas.map(hcFilaHtml).join('');
    }
    const desde = hc.total ? (hc.pagina - 1) * hc.porPagina + 1 : 0;
    const hasta = (hc.pagina - 1) * hc.porPagina + hc.filas.length;
    document.getElementById('hc-conteo').textContent = hc.total
        ? `${desde}–${hasta} de ${hcPlural(hc.total, 'cotización', 'cotizaciones')}${hc.q ? ' encontradas' : ''}`
        : '';
    hcPintarPaginas();
}

function hcPintarPaginas() {
    const paginas = Math.max(1, Math.ceil(hc.total / hc.porPagina));
    document.getElementById('hc-pagina').textContent = `Página ${hc.pagina} de ${paginas}`;
    document.getElementById('hc-ant').disabled = hc.pagina <= 1;
    document.getElementById('hc-sig').disabled = hc.pagina >= paginas;
}

// ===== Acciones =====
async function hcEliminar(c) {
    const nombre = c.nombre_pax || 'Sin nombre';
    if (!await confirmAction(`¿Eliminar la cotización ${c.id} (${nombre}, ${HC_MONEDAS[c.moneda].codigo})? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`../${c.moneda}/api.php?path=eliminar-cotizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id })
        });
        const r = await res.json();
        if (!r.success) throw new Error(r.error || 'No se pudo eliminar');
        notifySuccess('Cotización eliminada');
        // Si era la última de la página, volver a la anterior.
        if (hc.filas.length === 1 && hc.pagina > 1) hc.pagina--;
        hcCargar();
    } catch (e) {
        notifyError('Error al eliminar la cotización: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    hcLeerUrl();
    const buscador = document.getElementById('hc-q');
    buscador.value = hc.q;

    let espera;
    buscador.addEventListener('input', () => {
        clearTimeout(espera);
        espera = setTimeout(() => {
            const q = buscador.value.trim();
            if (q === hc.q) return;
            hc.q = q;
            hc.pagina = 1;
            hcCargar();
        }, 300);
    });
    document.getElementById('hc-monedas').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-moneda]');
        if (!b || b.dataset.moneda === hc.moneda) return;
        hc.moneda = b.dataset.moneda;
        hc.pagina = 1;
        hcCargar();
    });
    const irA = (delta) => {
        hc.pagina += delta;
        hcCargar();
        document.querySelector('.hc-barra').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.getElementById('hc-ant').addEventListener('click', () => irA(-1));
    document.getElementById('hc-sig').addEventListener('click', () => irA(1));

    document.getElementById('hc-cuerpo').addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'reintentar') return hcCargar();
        if (btn.dataset.accion === 'limpiar') {
            hc.q = ''; hc.moneda = 'todas'; hc.pagina = 1;
            buscador.value = '';
            return hcCargar();
        }
        const c = hc.filas[Number(btn.closest('tr')?.dataset.i)];
        if (c && btn.dataset.accion === 'eliminar') hcEliminar(c);
    });

    hcCargar();
});
