// shared/itinerario-selector.js
// Armado del itinerario en el Cotizador, todo dentro de su contenedor:
//  - Grilla de tarjetas cuadradas (imagen + día/fecha) con los itinerarios elegidos, agrupadas
//    por día. Entre días aparecen los días libres (− / + para cambiar cuántos) y al final una
//    tarjeta "+ Día N".
//  - Panel desplegable (debajo de la grilla) para elegir: Con / Sin hotel, buscador, chips de
//    destino y tarjetas con imagen. Cada tarjeta se suma al día elegido en "Agregando al".
//  - Popup de detalles de un itinerario (imagen, lugares, incluye, PDF) con sus acciones
//    (cambiar, mover de fecha, día libre antes, quitar) y modo "Editar" que guarda en el
//    catálogo (guardarItinerarioCatalogo, itinerario.js).
//
// La tabla #itinerary-builder-body sigue existiendo, oculta, como almacén: una fila por
// itinerario con su filename (.module-filename) y su día (tr.dataset.dia). Así guardar la
// cotización, paquetes, historial y el PDF (itinerario.js / cotizador.js) no cambian.

// Grupos de destino (Con hotel / Sin hotel y los propios de la agencia), los que carga
// itinerario.js en itinGruposData.
function iselGrupos() {
    return itinGruposData.map(g => ({ valor: String(g.id), nombre: g.nombre, icono: iconoGrupoDestino(g) }));
}
const ISEL_SIN_CLASIFICAR = 'sin-clasificar';
const ISEL_GRUPO_STORAGE = 'cotizador.iselGrupo';

// Estado de la interfaz (los datos viven en la tabla oculta).
const armadoUI = {
    panelAbierto: false,
    destino: null,       // día al que se suman las tarjetas; null = un día nuevo al final
    saltos: 0,           // días libres pedidos antes del próximo día nuevo
    reemplazar: null,    // uid de la fila que se está cambiando desde el popup ("Cambiar")
    grupo: null,
    busqueda: '',
    filtroDestino: ''
};
let armadoUid = 0;

// ===== Utilidades =====
function iselNormalizar(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function iselToast(texto, icon = 'success') {
    Swal.fire({ toast: true, position: 'bottom', icon, title: texto, showConfirmButton: false, timer: 2200 });
}
function iselLista(texto) {
    return String(texto || '').split(/\r?\n/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

// Destinos de Itinerarios (Con / Sin hotel), con su nombre real.
function iselDestinos() {
    const lista = (typeof destinosData !== 'undefined' && Array.isArray(destinosData)) ? destinosData : [];
    return lista.filter(d => d.grupo_id != null);
}
// Orden propio del usuario (arrastrando los chips de destino); a igual orden, por nombre.
function iselCompararDestinos(a, b) {
    return (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.nombre.localeCompare(b.nombre);
}

// Catálogo del idioma activo con su clasificación resuelta (sin el módulo "día libre": un
// día sin itinerario ya es libre).
function iselCatalogo() {
    const destinoPorId = new Map(iselDestinos().map(d => [Number(d.id), d]));
    const categoriaPorId = new Map(itinCategoriasData.map(c => [Number(c.id), c]));
    return modulosActivos().filter(m => !esModuloDiaLibre(m)).map(m => {
        const destino = m.destino_id != null ? destinoPorId.get(Number(m.destino_id)) || null : null;
        let categoria = destino && m.categoria_id != null ? categoriaPorId.get(Number(m.categoria_id)) || null : null;
        if (categoria && Number(categoria.destino_id) !== Number(destino.id)) categoria = null;
        return {
            m, destino, categoria,
            grupo: destino ? String(destino.grupo_id) : ISEL_SIN_CLASIFICAR,
            texto: iselNormalizar([m.titulo, m.lugares_visitar, destino?.nombre, categoria?.nombre].filter(Boolean).join(' '))
        };
    });
}
function iselEntradaDe(filename) {
    return iselCatalogo().find(e => e.m.filename === filename) || null;
}
function iselNombreGrupo(valor) {
    return iselGrupos().find(g => g.valor === valor)?.nombre || 'Sin clasificar';
}
function iselRuta(e) {
    if (!e.destino) return 'Sin clasificar';
    return [e.destino.nombre, e.categoria?.nombre, iselNombreGrupo(e.grupo)].filter(Boolean).join(' · ');
}

// Imagen del itinerario o, si no tiene, un degradado con la inicial del destino/título.
function iselTono(texto) {
    let h = 0;
    for (const ch of String(texto)) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
}
function iselMediaHtml(e) {
    if (e.m.imagen && e.m.imagen_existe !== false) {
        return `<img src="${urlImagenItinerario(e.m.imagen)}" alt="" loading="lazy" decoding="async" class="isel-img">`;
    }
    const base = e.destino?.nombre || e.m.titulo;
    return `<span class="isel-img-vacia" style="--isel-tono:${iselTono(base)}" aria-hidden="true">${escapeHtml((base.trim()[0] || '?').toUpperCase())}</span>`;
}

// ===== Fechas (Día 1 = F. Llegada de Datos Pax) =====
function iselLlegada() {
    return document.querySelector('input[name="f_llegada"]')?.value || '';
}
function iselFechaDia(dia) {
    const f = iselLlegada();
    return f ? sumarDiasFechaISO(f, dia - 1) : '';
}
function iselFechaCorta(dia) {
    return fechaCortaDia(iselLlegada(), dia, 'es');
}
function iselRangoFechas(desde, hasta) {
    const a = iselFechaCorta(desde);
    if (!a) return '';
    return desde === hasta ? a : `${a} – ${iselFechaCorta(hasta)}`;
}
// "Día N" es el día del viaje (Día 1 = F. Llegada) y los días libres cuentan: Día 3,
// [Días 4–5 libres], Día 6.
function iselTextoDiasRango(desde, hasta) {
    return desde === hasta ? `Día ${desde}` : `Días ${desde}–${hasta}`;
}

// ===== Enganches con itinerario.js (addItineraryBuilderRow / recalculateDayNumbers) =====
// Su existencia activa el armado por días; las filas no tienen interfaz propia.
function construirCeldaItinerarioVisual(tr) {
    tr.dataset.uid = String(++armadoUid);
    return document.createElement('span');
}
function prepararFilaItinerarioConDia(tr) {
    if (!tr.dataset.uid) tr.dataset.uid = String(++armadoUid);
}
function refrescarFilasItinerarioVisual() {
    refrescarArmadoItinerario();
}

function filaPorUid(uid) {
    return filasArmado().find(tr => tr.dataset.uid === String(uid)) || null;
}
function filenameDeFila(tr) {
    return tr?.querySelector('.module-filename')?.value || '';
}
// [{ tr, uid, filename, dia }] ordenado por día (estable).
function itemsArmado() {
    return filasArmado()
        .map((tr, i) => ({ tr, uid: tr.dataset.uid, filename: filenameDeFila(tr), dia: Number(tr.dataset.dia) || i + 1, i }))
        .filter(x => x.filename)
        .sort((a, b) => a.dia - b.dia || a.i - b.i);
}
function diaNuevo() {
    return maxDiaArmado() + 1 + armadoUI.saltos;
}
function diaDestino() {
    return armadoUI.destino ?? diaNuevo();
}

// Corre `delta` días todos los itinerarios desde el día `desde` (inclusive): agrega o quita
// un día libre sin tocar lo anterior.
function iselDesplazarDiasDesde(desde, delta) {
    filasArmado().forEach(tr => {
        const dia = Number(tr.dataset.dia);
        if (dia >= desde) tr.dataset.dia = String(Math.max(1, dia + delta));
    });
    if (armadoUI.destino !== null && armadoUI.destino >= desde) armadoUI.destino = Math.max(1, armadoUI.destino + delta);
    refrescarArmadoItinerario();
    iselToast(delta > 0 ? 'Día libre agregado: los días siguientes se corrieron' : 'Día libre quitado: los días siguientes se adelantaron');
}

// Se llama tras cualquier cambio del armado (vía recalculateDayNumbers en itinerario.js).
function refrescarArmadoItinerario() {
    const body = document.getElementById('itinerary-builder-body');
    if (!body) return;
    // Las filas vacías ya no tienen uso: cada itinerario entra con su archivo.
    filasArmado().forEach(tr => { if (!filenameDeFila(tr)) tr.remove(); });
    itemsArmado().forEach(x => { x.tr.dataset.dia = String(x.dia); body.appendChild(x.tr); });
    if (armadoUI.destino !== null && armadoUI.destino > maxDiaArmado()) armadoUI.destino = null;
    renderGrilla();
    if (armadoUI.panelAbierto) renderPanelCabecera(), pintarEstadoTarjetasPanel();
}

// ===== Grilla de elegidos =====
function renderGrilla() {
    const cont = document.getElementById('itin-grilla');
    if (!cont) return;
    const items = itemsArmado();
    const porDia = new Map();
    items.forEach(x => { if (!porDia.has(x.dia)) porDia.set(x.dia, []); porDia.get(x.dia).push(x); });
    const dias = [...porDia.keys()];
    const resumen = document.getElementById('itin-resumen');
    if (resumen) {
        const rango = dias.length ? iselRangoFechas(dias[0], dias[dias.length - 1]) : '';
        resumen.innerHTML = items.length
            ? `<strong>${dias.length} día${dias.length === 1 ? '' : 's'}</strong> · ${items.length} itinerario${items.length === 1 ? '' : 's'}${rango ? ` · <span class="itin-resumen-fechas">${escapeHtml(rango)}</span>` : ''}`
            : '';
        if (items.length && !iselLlegada()) resumen.innerHTML += ' <span class="itin-resumen-aviso" title="Completa la F. Llegada en Datos Pax"><i class="fas fa-circle-info"></i>Sin fechas: falta la F. Llegada</span>';
    }

    if (!items.length && !armadoUI.saltos) {
        cont.innerHTML = `
            <button type="button" class="itin-vacio" data-accion="abrir-nuevo">
                <span class="itin-vacio-icono"><i class="fas fa-images"></i></span>
                <span><strong>Arma el itinerario día por día</strong><small>Elige los itinerarios con sus imágenes; las fechas salen de la F. Llegada.</small></span>
                <span class="itin-vacio-cta"><i class="fas fa-plus"></i>Agregar itinerarios</span>
            </button>`;
        return;
    }

    const esDestino = (d) => armadoUI.panelAbierto && !armadoUI.reemplazar && d === diaDestino();
    let html = '';
    let anterior = null;
    let bloques = 0;
    dias.forEach(dia => {
        if (anterior !== null && dia - anterior > 1) html += tarjetaLibreHtml(anterior + 1, dia - 1, esDestino(anterior + 1), bloques++);
        const grupo = porDia.get(dia);
        html += `<div class="itin-dia-grupo${grupo.length > 1 ? ' is-varios' : ''}${esDestino(dia) ? ' is-destino' : ''}" data-dia="${dia}">
            ${grupo.map(x => tarjetaElegidaHtml(x)).join('')}
        </div>`;
        anterior = dia;
    });
    const max = maxDiaArmado();
    for (let s = 1; s <= armadoUI.saltos; s++) {
        const fecha = iselFechaCorta(max + s);
        html += `<div class="itin-libre-card is-pendiente">
            <span class="itin-libre-card-icono"><i class="fas fa-mug-hot"></i></span>
            <strong>Día libre</strong><small>${iselTextoDiasRango(max + s, max + s)}${fecha ? ` · ${escapeHtml(fecha)}` : ''}</small>
            <button type="button" class="itin-libre-card-quitar" data-accion="quitar-salto" aria-label="Quitar este día libre"><i class="fas fa-xmark"></i></button>
        </div>`;
    }
    const nuevo = diaNuevo();
    const fechaNuevo = iselFechaCorta(nuevo);
    html += `<button type="button" class="itin-card-nuevo${armadoUI.panelAbierto && !armadoUI.reemplazar && armadoUI.destino === null ? ' is-destino' : ''}" data-accion="abrir-nuevo">
        <i class="fas fa-plus"></i><strong>Día ${nuevo}</strong>${fechaNuevo ? `<small>${escapeHtml(fechaNuevo)}</small>` : ''}
    </button>`;
    cont.innerHTML = html;
}

function tarjetaElegidaHtml(x) {
    const n = x.dia;
    const e = iselEntradaDe(x.filename);
    const titulo = e ? e.m.titulo : x.filename;
    const fecha = iselFechaCorta(x.dia);
    const reemplazando = armadoUI.reemplazar === x.uid;
    return `<div class="itin-card${e ? '' : ' is-fuera'}${reemplazando ? ' is-reemplazando' : ''}" data-uid="${x.uid}">
        <button type="button" class="itin-card-main" data-accion="detalle" aria-label="Día ${n}${fecha ? ` (${escapeHtml(fecha)})` : ''}: ${escapeHtml(titulo)}. Ver detalles. Mantén presionado para moverlo">
            ${e ? iselMediaHtml(e) : '<span class="isel-img-vacia is-fuera"><i class="fas fa-triangle-exclamation"></i></span>'}
            <span class="itin-card-fecha">
                <b class="itin-card-badge-dia">Día ${n}</b>
                ${fecha ? `<span class="itin-card-badge-fecha">${escapeHtml(fecha)}</span>` : ''}
            </span>
            <span class="itin-card-titulo">${escapeHtml(titulo)}</span>
        </button>
        <button type="button" class="itin-card-editar" data-accion="editar" title="Editar itinerario" aria-label="Editar ${escapeHtml(titulo)}"><i class="fas fa-pen"></i></button>
        <button type="button" class="itin-card-quitar" data-accion="quitar" title="Quitar" aria-label="Quitar ${escapeHtml(titulo)} del Día ${n}"><i class="fas fa-xmark"></i></button>
    </div>`;
}

// Bloque de días libres: cuántos, qué días del viaje ocupan y sus fechas.
// indice: posición del bloque entre los bloques libres (ver moverDiasLibres).
function tarjetaLibreHtml(desde, hasta, esDestino, indice) {
    const n = hasta - desde + 1;
    const fechas = iselRangoFechas(desde, hasta);
    return `<div class="itin-libre-card is-movible${esDestino ? ' is-destino' : ''}" data-desde="${desde}" data-hasta="${hasta}" data-bloque="${indice}" title="Arrastra para mover ${n === 1 ? 'el día libre' : 'los días libres'}">
        <span class="itin-libre-card-icono"><i class="fas fa-mug-hot"></i></span>
        <strong>${n === 1 ? 'Día libre' : `${n} días libres`}</strong>
        <small>${iselTextoDiasRango(desde, hasta)}${fechas ? `<span class="itin-libre-card-fechas">${escapeHtml(fechas)}</span>` : ''}</small>
        <span class="itin-libre-card-ctrl" role="group" aria-label="Cantidad de días libres">
            <button type="button" data-accion="libre-menos" data-correr="${hasta + 1}" title="${n === 1 ? 'Quitar el día libre' : 'Un día libre menos'}" aria-label="${n === 1 ? 'Quitar el día libre' : 'Un día libre menos'}"><i class="fas fa-minus"></i></button>
            <button type="button" data-accion="libre-mas" data-correr="${hasta + 1}" title="Un día libre más" aria-label="Un día libre más"><i class="fas fa-plus"></i></button>
        </span>
        <button type="button" class="itin-libre-card-agregar" data-accion="agregar-en" data-dia="${desde}" title="Agregar un itinerario en este día"><i class="fas fa-plus"></i>Itinerario</button>
    </div>`;
}

document.getElementById('itin-grilla')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-accion]');
    if (!btn) return;
    const card = btn.closest('.itin-card');
    switch (btn.dataset.accion) {
        case 'detalle': abrirDetalleItinerario({ uid: card.dataset.uid }); break;
        case 'editar': abrirDetalleItinerario({ uid: card.dataset.uid, editar: true }); break;
        case 'quitar': quitarFila(card.dataset.uid); break;
        case 'agregar-en': abrirPanelItinerarios({ destino: Number(btn.dataset.dia) }); break;
        case 'abrir-nuevo': abrirPanelItinerarios({ destino: null }); break;
        case 'libre-menos': iselDesplazarDiasDesde(Number(btn.dataset.correr), -1); break;
        case 'libre-mas': iselDesplazarDiasDesde(Number(btn.dataset.correr), 1); break;
        case 'quitar-salto': armadoUI.saltos = Math.max(0, armadoUI.saltos - 1); refrescarArmadoItinerario(); break;
    }
});

// ===== Arrastrar para reordenar (mouse, y dedo en tablets/celulares) =====
// El itinerario se ve como una línea de tiempo: días con itinerario y bloques de días
// libres, uno tras otro. Arrastrar mueve un itinerario (o un bloque de libres) a otro lugar
// de esa línea y los días se recalculan recorriéndola desde el Día 1, contando los libres.
// Con mouse arranca al mover unos px; con el dedo, tras mantener presionada la tarjeta un
// instante, así deslizar sobre las tarjetas sigue haciendo scroll.

// [{ tipo: 'dia', filas: [tr, ...] } | { tipo: 'libre', n }] en orden.
function iselLineaDeTiempo() {
    const linea = [];
    let anterior = null;
    itemsArmado().forEach(x => {
        if (anterior === x.dia) { linea[linea.length - 1].filas.push(x.tr); return; }
        if (anterior !== null && x.dia - anterior > 1) linea.push({ tipo: 'libre', n: x.dia - anterior - 1 });
        linea.push({ tipo: 'dia', filas: [x.tr] });
        anterior = x.dia;
    });
    return linea;
}
// Vuelve a numerar los días recorriendo la línea desde `inicio`. Antes se limpia: sin días
// vacíos, libres seguidos juntos en un bloque y sin libres al principio ni al final (el Día
// 1 es la llegada y un libre siempre va entre dos días).
function iselAplicarLineaDeTiempo(linea, inicio) {
    const limpia = [];
    linea.forEach(u => {
        if (u.tipo === 'dia' && !u.filas.length) return;
        if (u.tipo === 'libre' && u.n < 1) return;
        const ultimo = limpia[limpia.length - 1];
        if (u.tipo === 'libre' && ultimo?.tipo === 'libre') ultimo.n += u.n;
        else limpia.push(u);
    });
    while (limpia[0]?.tipo === 'libre') limpia.shift();
    while (limpia[limpia.length - 1]?.tipo === 'libre') limpia.pop();
    const body = document.getElementById('itinerary-builder-body');
    let dia = inicio;
    limpia.forEach(u => {
        if (u.tipo === 'libre') { dia += u.n; return; }
        u.filas.forEach(tr => { tr.dataset.dia = String(dia); body.appendChild(tr); });
        dia++;
    });
    refrescarArmadoItinerario();
}
function iselIndiceDeFila(linea, tr) {
    return linea.findIndex(u => u.tipo === 'dia' && u.filas.includes(tr));
}

// Suelto junto a una tarjeta: el itinerario pasa a su propio día justo antes o después del
// día de esa tarjeta, y los días siguientes se corren (los libres se mantienen).
// Suelto sobre un bloque de días libres: el itinerario pasa a ese día libre (el primero del
// bloque si se suelta en su mitad izquierda, el último si en la derecha) y los demás no se
// mueven; si su día queda vacío, pasa a ser libre. Si era el único del Día 1, todo se
// adelanta para que el viaje siga empezando el día de llegada.
function moverItinerario(uid, destino, antes) {
    const tr = filaPorUid(uid);
    if (!tr) return;
    const inicio = itemsArmado()[0]?.dia ?? 1;
    if (destino.tipo === 'libre') {
        tr.dataset.dia = String(antes ? destino.desde : destino.hasta);
        const primero = Math.min(...filasArmado().map(f => Number(f.dataset.dia)));
        if (primero > inicio) filasArmado().forEach(f => { f.dataset.dia = String(Number(f.dataset.dia) - (primero - inicio)); });
        refrescarArmadoItinerario();
    } else {
        const linea = iselLineaDeTiempo();
        const origen = linea[iselIndiceDeFila(linea, tr)];
        origen.filas = origen.filas.filter(f => f !== tr);
        const i = iselIndiceDeFila(linea, filaPorUid(destino.uid));
        if (i < 0) return;
        linea.splice(antes ? i : i + 1, 0, { tipo: 'dia', filas: [tr] });
        iselAplicarLineaDeTiempo(linea, inicio);
    }
    resaltarTarjeta(uid);
    const titulo = iselEntradaDe(filenameDeFila(tr))?.m.titulo || filenameDeFila(tr);
    iselToast(`${titulo} ahora es el Día ${tr.dataset.dia}`);
}

// Cambio de fecha (o de número de día) desde el detalle. Los días siguen correlativos:
// - Único itinerario del primer día: sigue siendo el Día 1. Su nueva fecha pasa a ser la
//   F. Llegada y todo el viaje se corre con él (Actividades y Hoteles también).
// - Fecha de otro día con itinerario: lo reemplaza en la línea de tiempo y los de en medio
//   ceden su día (se corren uno), en vez de juntarse los dos en el mismo día.
// - Fecha de un día libre o posterior al último: va a ese día tal cual.
function iselCambiarDiaDeFila(tr, dia) {
    const actual = Number(tr.dataset.dia);
    if (dia === actual) return;
    const items = itemsArmado();
    const inicio = items[0]?.dia ?? 1;
    const llegadaInput = document.querySelector('input[name="f_llegada"]');
    const soloEnPrimerDia = actual === inicio && items.filter(x => x.dia === inicio).length === 1;
    if (soloEnPrimerDia && llegadaInput?.value) {
        if (inicio > 1) filasArmado().forEach(f => { f.dataset.dia = String(Number(f.dataset.dia) - (inicio - 1)); });
        llegadaInput.value = sumarDiasFechaISO(llegadaInput.value, dia - 1 - (inicio - 1));
        llegadaInput.dispatchEvent(new Event('change', { bubbles: true }));
        iselToast('Sigue siendo el Día 1: la F. Llegada y los demás días se corrieron');
        return;
    }
    if (dia < 1) { notifyWarning('La fecha no puede ser anterior a la Fecha de llegada.'); return; }
    if (!items.some(x => x.dia === dia && x.tr !== tr)) {
        tr.dataset.dia = String(dia);
        refrescarArmadoItinerario();
        return;
    }
    const linea = iselLineaDeTiempo();
    const origen = linea[iselIndiceDeFila(linea, tr)];
    origen.filas = origen.filas.filter(f => f !== tr);
    const destino = items.find(x => x.dia === dia && x.tr !== tr).tr;
    const i = iselIndiceDeFila(linea, destino);
    // Hacia adelante, si su día queda vacío los de en medio se adelantan uno y el destino
    // cede su lugar yendo antes; si no, el destino se corre después.
    const despues = dia > actual && !origen.filas.length;
    linea.splice(despues ? i + 1 : i, 0, { tipo: 'dia', filas: [tr] });
    iselAplicarLineaDeTiempo(linea, Math.min(inicio, dia));
}

// Mueve un bloque de días libres para que quede antes o después del día de la tarjeta
// destino. Un día libre siempre va entre dos días con itinerario: no antes del primero ni
// después del último.
function moverDiasLibres(indiceBloque, destinoUid, antes) {
    const inicio = itemsArmado()[0]?.dia ?? 1;
    const linea = iselLineaDeTiempo();
    const bloque = linea.filter(u => u.tipo === 'libre')[indiceBloque];
    const trDestino = filaPorUid(destinoUid);
    if (!bloque || !trDestino) return;
    linea.splice(linea.indexOf(bloque), 1);
    const i = iselIndiceDeFila(linea, trDestino);
    const pos = antes ? i : i + 1;
    if (pos <= 0 || pos >= linea.length) {
        iselToast(bloque.n === 1 ? 'El día libre debe quedar entre dos días' : 'Los días libres deben quedar entre dos días', 'info');
        return;
    }
    linea.splice(pos, 0, bloque);
    iselAplicarLineaDeTiempo(linea, inicio);
    iselToast(bloque.n === 1 ? 'Día libre movido: los días y fechas se actualizaron' : `${bloque.n} días libres movidos: los días y fechas se actualizaron`);
}

(function activarArrastreGrilla() {
    const grilla = document.getElementById('itin-grilla');
    if (!grilla) return;
    let a = null; // { card, uid, id, x0, y0, x, y, tactil, activo, timer, fantasma, destino, antes, raf }
    let sinClickHasta = 0;

    // El click que sigue a soltar un arrastre no debe abrir los detalles.
    grilla.addEventListener('click', (ev) => {
        if (performance.now() < sinClickHasta) { ev.stopPropagation(); ev.preventDefault(); }
    }, true);
    grilla.addEventListener('dragstart', (ev) => ev.preventDefault()); // sin el arrastre nativo de la imagen
    grilla.addEventListener('contextmenu', (ev) => { if (a) ev.preventDefault(); });

    // Se arrastran las tarjetas de itinerario y los bloques de días libres entre días (no sus
    // botones − / + / "+ Itinerario").
    grilla.addEventListener('pointerdown', (ev) => {
        const card = ev.target.closest('.itin-card, .itin-libre-card.is-movible');
        if (!card || ev.target.closest('.itin-card-quitar, .itin-card-editar, .itin-libre-card button') || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        const libre = card.classList.contains('itin-libre-card');
        if (!libre && itemsArmado().length < 2) return;
        a = { card, uid: card.dataset.uid, libre, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, tactil: ev.pointerType !== 'mouse', activo: false };
        if (a.tactil) a.timer = setTimeout(iniciar, 380);
    });
    document.addEventListener('pointermove', (ev) => {
        if (!a || ev.pointerId !== a.id) return;
        a.x = ev.clientX; a.y = ev.clientY;
        if (!a.activo) {
            const d = Math.hypot(a.x - a.x0, a.y - a.y0);
            if (a.tactil) { if (d > 10) cancelar(); return; } // se movió antes de tiempo: es scroll
            if (d < 6) return;
            iniciar();
        }
        ubicar();
    });
    // Con el dedo, mientras se arrastra, la página no se desplaza.
    document.addEventListener('touchmove', (ev) => { if (a?.activo) ev.preventDefault(); }, { passive: false });
    document.addEventListener('pointerup', (ev) => terminar(ev, true));
    document.addEventListener('pointercancel', (ev) => terminar(ev, false));

    function iniciar() {
        if (!a || a.activo) return;
        a.activo = true;
        clearTimeout(a.timer);
        const r = a.card.getBoundingClientRect();
        const f = a.card.cloneNode(true);
        f.classList.add('itin-card-fantasma');
        f.removeAttribute('data-uid');
        f.style.width = `${r.width}px`;
        f.style.height = `${r.height}px`;
        // En <body> (position: fixed sin depender de los contenedores), con el color de marca.
        f.style.setProperty('--ia-accent', getComputedStyle(grilla).getPropertyValue('--ia-accent'));
        document.body.appendChild(f);
        a.fantasma = f;
        a.card.classList.add('is-arrastrando');
        grilla.classList.add('is-ordenando');
        if (a.tactil) navigator.vibrate?.(15);
        ubicar();
        a.raf = requestAnimationFrame(autoScroll);
    }

    // Mueve el fantasma bajo el puntero y marca dónde caería: antes o después de la
    // tarjeta más cercana.
    function ubicar() {
        if (!a?.activo) return;
        const w = a.fantasma.offsetWidth, h = a.fantasma.offsetHeight;
        a.fantasma.style.transform = `translate(${a.x - w / 2}px, ${a.y - h / 2}px) rotate(-3deg) scale(1.04)`;
        let mejor = null, distMejor = Infinity;
        grilla.querySelectorAll(a.libre ? '.itin-card' : '.itin-card, .itin-libre-card.is-movible').forEach(c => {
            if (c === a.card) return;
            const r = c.getBoundingClientRect();
            const dist = Math.hypot(a.x - (r.left + r.width / 2), a.y - (r.top + r.height / 2));
            if (dist < distMejor) { distMejor = dist; mejor = { c, r }; }
        });
        grilla.querySelectorAll('.is-drop-antes, .is-drop-despues').forEach(c => c.classList.remove('is-drop-antes', 'is-drop-despues'));
        a.destino = null;
        if (!mejor || distMejor > mejor.r.width * 1.3) return;
        a.destino = mejor.c.classList.contains('itin-libre-card')
            ? { tipo: 'libre', desde: Number(mejor.c.dataset.desde), hasta: Number(mejor.c.dataset.hasta) }
            : { tipo: 'card', uid: mejor.c.dataset.uid };
        a.antes = a.x < mejor.r.left + mejor.r.width / 2;
        mejor.c.classList.add(a.antes ? 'is-drop-antes' : 'is-drop-despues');
    }

    // Cerca del borde de la pantalla, la página se desplaza sola (para listas largas en celular).
    function autoScroll() {
        if (!a?.activo) return;
        const borde = 70;
        const vel = a.y < borde ? -(borde - a.y) / 5 : a.y > innerHeight - borde ? (a.y - (innerHeight - borde)) / 5 : 0;
        if (vel) { scrollBy(0, vel); ubicar(); }
        a.raf = requestAnimationFrame(autoScroll);
    }

    function limpiar() {
        clearTimeout(a.timer);
        cancelAnimationFrame(a.raf);
        a.fantasma?.remove();
        a.card.classList.remove('is-arrastrando');
        grilla.classList.remove('is-ordenando');
        grilla.querySelectorAll('.is-drop-antes, .is-drop-despues').forEach(c => c.classList.remove('is-drop-antes', 'is-drop-despues'));
    }
    function cancelar() {
        if (!a) return;
        limpiar();
        a = null;
    }
    function terminar(ev, soltar) {
        if (!a || ev.pointerId !== a.id) return;
        const { activo, uid, libre, card, destino, antes } = a;
        limpiar();
        a = null;
        if (!activo) return;
        sinClickHasta = performance.now() + 400;
        if (!soltar || !destino) return;
        if (libre) {
            if (destino.tipo === 'card') moverDiasLibres(Number(card.dataset.bloque), destino.uid, antes);
        } else {
            moverItinerario(uid, destino, antes);
        }
    }
})();

function quitarFila(uid) {
    const tr = filaPorUid(uid);
    if (!tr) return;
    const titulo = iselEntradaDe(filenameDeFila(tr))?.m.titulo || filenameDeFila(tr);
    const dia = tr.dataset.dia;
    tr.remove();
    if (armadoUI.reemplazar === uid) armadoUI.reemplazar = null;
    refrescarArmadoItinerario();
    iselToast(`Se quitó ${titulo} del Día ${dia}`);
}

// ===== Panel desplegable para elegir =====
function abrirPanelItinerarios({ destino = null, reemplazar = null } = {}) {
    const panel = document.getElementById('itin-panel');
    if (!panel) return;
    armadoUI.reemplazar = reemplazar;
    if (!reemplazar) armadoUI.destino = destino;
    if (!armadoUI.grupo) armadoUI.grupo = grupoInicialPanel(reemplazar ? filenameDeFila(filaPorUid(reemplazar)) : null);
    else if (reemplazar) armadoUI.grupo = grupoInicialPanel(filenameDeFila(filaPorUid(reemplazar)));
    armadoUI.panelAbierto = true;
    // Se arma una sola vez: volver a enlazar sus eventos al reabrirlo haría que cada clic
    // se procese dos veces.
    if (!panel.dataset.construido) {
        construirPanel(panel);
        panel.dataset.construido = '1';
    }
    panel.hidden = false;
    renderPanelCabecera();
    renderPanelGrupos();
    renderPanelCatalogo();
    renderGrilla();
    requestAnimationFrame(() => {
        const r = panel.getBoundingClientRect();
        if (r.top > window.innerHeight - 160 || r.top < 0) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function cerrarPanelItinerarios() {
    const panel = document.getElementById('itin-panel');
    if (!panel) return;
    armadoUI.panelAbierto = false;
    armadoUI.reemplazar = null;
    armadoUI.saltos = 0;
    panel.hidden = true;
    renderGrilla();
}

function grupoInicialPanel(filenameActual) {
    const catalogo = iselCatalogo();
    if (filenameActual) {
        const g = catalogo.find(e => e.m.filename === filenameActual)?.grupo;
        if (g) return g;
    }
    let g = null;
    try { g = localStorage.getItem(ISEL_GRUPO_STORAGE); } catch (_) { g = null; }
    const conItems = (v) => catalogo.some(e => e.grupo === v);
    if (g && conItems(g)) return g;
    return [...iselGrupos().map(x => x.valor), ISEL_SIN_CLASIFICAR].find(conItems) || iselGrupos()[0]?.valor || ISEL_SIN_CLASIFICAR;
}

function construirPanel(panel) {
    panel.innerHTML = `
        <div class="itin-panel-cab"></div>
        <div class="itin-panel-filtros">
            <div class="itin-panel-grupos" role="tablist" aria-label="Tipo de itinerario"></div>
            <label class="itin-panel-buscar">
                <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input type="search" placeholder="Buscar itinerario, lugar o destino..." autocomplete="off" aria-label="Buscar itinerarios">
            </label>
        </div>
        <div class="itin-panel-destinos" role="group" aria-label="Filtrar por destino"></div>
        <div class="itin-panel-grid" aria-live="polite"></div>`;
    activarOrdenDestinos(panel.querySelector('.itin-panel-destinos'));
    let debounce;
    panel.querySelector('.itin-panel-buscar input').addEventListener('input', (ev) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            armadoUI.busqueda = iselNormalizar(ev.target.value.trim());
            renderPanelGrupos();
            renderPanelCatalogo();
        }, 120);
    });
    panel.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-accion], [data-grupo], [data-filtro-destino]');
        if (!btn) return;
        if (btn.dataset.grupo) {
            armadoUI.grupo = btn.dataset.grupo;
            armadoUI.filtroDestino = '';
            if (armadoUI.grupo !== ISEL_SIN_CLASIFICAR) { try { localStorage.setItem(ISEL_GRUPO_STORAGE, armadoUI.grupo); } catch (_) { /* sin almacenamiento */ } }
            renderPanelGrupos();
            renderPanelCatalogo();
            return;
        }
        if (btn.dataset.filtroDestino !== undefined) {
            armadoUI.filtroDestino = btn.dataset.filtroDestino;
            renderPanelCatalogo();
            return;
        }
        const filename = btn.closest('.ipc')?.dataset.filename;
        switch (btn.dataset.accion) {
            case 'elegir': elegirDesdePanel(filename); break;
            case 'info':
                // Queda pintado del color de la agencia mientras su popup está abierto.
                btn.classList.add('is-abierto');
                abrirDetalleItinerario({ filename });
                break;
            case 'dia-libre':
                armadoUI.destino = null;
                armadoUI.saltos++;
                refrescarArmadoItinerario();
                break;
            case 'cancelar-cambio': armadoUI.reemplazar = null; renderPanelCabecera(); pintarEstadoTarjetasPanel(); renderGrilla(); break;
            case 'cerrar-panel': cerrarPanelItinerarios(); break;
            case 'ver-grupo': armadoUI.grupo = btn.dataset.verGrupo; renderPanelGrupos(); renderPanelCatalogo(); break;
        }
    });
    panel.addEventListener('change', (ev) => {
        if (!ev.target.matches('.itin-panel-dia')) return;
        const v = ev.target.value;
        armadoUI.destino = v === 'nuevo' ? null : Number(v);
        renderPanelCabecera();
        pintarEstadoTarjetasPanel();
        renderGrilla();
    });
}

// Arrastrar un chip de destino cambia el orden de los destinos (chips y secciones del panel)
// y se guarda en la BD (destinos.orden), así la próxima cotización ya lo trae. Con puntero
// (mouse o dedo); un toque sin mover sigue siendo el filtro.
function activarOrdenDestinos(cont) {
    let arrastre = null;
    let sinClickHasta = 0;
    // El click que sigue al soltar un arrastre no debe filtrar.
    cont.addEventListener('click', (ev) => {
        if (performance.now() < sinClickHasta) { ev.stopPropagation(); ev.preventDefault(); }
    }, true);
    cont.addEventListener('pointerdown', (ev) => {
        const chip = ev.target.closest('.itin-panel-chip.is-ordenable');
        if (!chip || ev.button !== 0) return;
        arrastre = { chip, x0: ev.clientX, activo: false, id: ev.pointerId, antes: idsChips() };
    });
    cont.addEventListener('pointermove', (ev) => {
        if (!arrastre || ev.pointerId !== arrastre.id) return;
        if (!arrastre.activo) {
            if (Math.abs(ev.clientX - arrastre.x0) < 6) return;
            arrastre.activo = true;
            arrastre.chip.setPointerCapture(ev.pointerId);
            arrastre.chip.classList.add('is-arrastrando');
            cont.classList.add('is-ordenando');
        }
        ev.preventDefault();
        // Desplaza la fila de chips si el puntero llega a un borde.
        const caja = cont.getBoundingClientRect();
        if (ev.clientX < caja.left + 30) cont.scrollLeft -= 12;
        else if (ev.clientX > caja.right - 30) cont.scrollLeft += 12;
        const otros = [...cont.querySelectorAll('.itin-panel-chip.is-ordenable')].filter(c => c !== arrastre.chip);
        const siguiente = otros.find(c => { const r = c.getBoundingClientRect(); return ev.clientX < r.left + r.width / 2; });
        if (siguiente) { if (arrastre.chip.nextElementSibling !== siguiente) cont.insertBefore(arrastre.chip, siguiente); }
        else if (otros.length && otros[otros.length - 1].nextElementSibling !== arrastre.chip) otros[otros.length - 1].after(arrastre.chip);
    });
    const terminar = (ev) => {
        if (!arrastre || ev.pointerId !== arrastre.id) return;
        const { chip, activo, antes } = arrastre;
        arrastre = null;
        if (!activo) return;
        chip.classList.remove('is-arrastrando');
        cont.classList.remove('is-ordenando');
        sinClickHasta = performance.now() + 400;
        const despues = idsChips();
        if (despues.join() !== antes.join()) guardarOrdenDestinos(despues);
    };
    cont.addEventListener('pointerup', terminar);
    cont.addEventListener('pointercancel', terminar);
    function idsChips() {
        return [...cont.querySelectorAll('.itin-panel-chip.is-ordenable')].map(c => Number(c.dataset.filtroDestino));
    }
}

// Los chips pueden ser solo una parte de los destinos del grupo (búsqueda activa, o destinos
// sin itinerarios en este idioma): los movidos se reacomodan dentro de los lugares que ya
// ocupaban y el resto queda donde estaba. Se guarda el grupo completo.
async function guardarOrdenDestinos(idsMovidos) {
    const movidos = new Set(idsMovidos);
    const grupo = iselDestinos().filter(d => String(d.grupo_id) === armadoUI.grupo).sort(iselCompararDestinos);
    const cola = [...idsMovidos];
    const ids = grupo.map(d => movidos.has(Number(d.id)) ? cola.shift() : Number(d.id));
    const porId = new Map(destinosData.map(d => [Number(d.id), d]));
    ids.forEach((id, i) => { const d = porId.get(id); if (d) d.orden = i + 1; });
    renderPanelCatalogo();
    try {
        const res = await fetch(`${API_URL}?path=ordenar-destinos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el orden');
        iselToast('Orden de destinos guardado');
    } catch (error) {
        console.error('Error al guardar el orden de destinos:', error);
        iselToast(error.message || 'No se pudo guardar el orden', 'error');
    }
}

// "Agregando al: [Día 5 · vie 14 nov ▾]" (o, en modo Cambiar, qué se está reemplazando).
function renderPanelCabecera() {
    const cab = document.querySelector('#itin-panel .itin-panel-cab');
    if (!cab) return;
    if (armadoUI.reemplazar) {
        const tr = filaPorUid(armadoUI.reemplazar);
        const e = iselEntradaDe(filenameDeFila(tr));
        const dia = Number(tr?.dataset.dia);
        cab.innerHTML = `
            <div class="itin-panel-destino is-cambio">
                <i class="fas fa-arrows-rotate"></i>
                <span>Cambiando el <strong>Día ${dia}</strong>${iselFechaCorta(dia) ? ` · ${escapeHtml(iselFechaCorta(dia))}` : ''}: ${escapeHtml(e?.m.titulo || filenameDeFila(tr))}. Toca el itinerario nuevo.</span>
            </div>
            <div class="itin-panel-acciones">
                <button type="button" class="itin-panel-btn" data-accion="cancelar-cambio">Cancelar cambio</button>
                <button type="button" class="itin-panel-btn is-primario" data-accion="cerrar-panel"><i class="fas fa-check"></i>Listo</button>
            </div>`;
        return;
    }
    const items = itemsArmado();
    const dias = [...new Set(items.map(x => x.dia))];
    const conteo = (d) => items.filter(x => x.dia === d).length;
    const opciones = [];
    let anterior = null;
    dias.forEach(d => {
        for (let l = (anterior ?? d) + 1; anterior !== null && l < d; l++) opciones.push({ v: l, t: `Día ${l}${iselFechaCorta(l) ? ` · ${iselFechaCorta(l)}` : ''} (libre)` });
        opciones.push({ v: d, t: `Día ${d}${iselFechaCorta(d) ? ` · ${iselFechaCorta(d)}` : ''} (${conteo(d)})` });
        anterior = d;
    });
    const nuevo = diaNuevo();
    opciones.push({ v: 'nuevo', t: `Nuevo: Día ${nuevo}${iselFechaCorta(nuevo) ? ` · ${iselFechaCorta(nuevo)}` : ''}` });
    const actual = armadoUI.destino ?? 'nuevo';
    cab.innerHTML = `
        <label class="itin-panel-destino">
            <span>Agregando al</span>
            <select class="itin-panel-dia" aria-label="Día al que se agregan los itinerarios">
                ${opciones.map(o => `<option value="${o.v}"${String(o.v) === String(actual) ? ' selected' : ''}>${escapeHtml(o.t)}</option>`).join('')}
            </select>
        </label>
        <div class="itin-panel-acciones">
            <button type="button" class="itin-panel-btn" data-accion="dia-libre" title="Deja un día libre antes del próximo día nuevo"><i class="fas fa-mug-hot"></i><span>Día libre</span></button>
            <button type="button" class="itin-panel-btn is-primario" data-accion="cerrar-panel"><i class="fas fa-check"></i>Listo</button>
        </div>`;
}

function iselEntradasFiltradas(grupo) {
    return iselCatalogo().filter(e => e.grupo === grupo && (!armadoUI.busqueda || e.texto.includes(armadoUI.busqueda)));
}

function renderPanelGrupos() {
    const cont = document.querySelector('#itin-panel .itin-panel-grupos');
    if (!cont) return;
    const grupos = iselGrupos();
    if (iselCatalogo().some(e => e.grupo === ISEL_SIN_CLASIFICAR)) grupos.push({ valor: ISEL_SIN_CLASIFICAR, nombre: 'Sin clasificar', icono: 'fa-folder-open' });
    cont.innerHTML = grupos.map(g => {
        const n = iselEntradasFiltradas(g.valor).length;
        const activo = g.valor === armadoUI.grupo;
        return `<button type="button" role="tab" class="itin-panel-grupo${activo ? ' is-activo' : ''}${n ? '' : ' is-vacio'}" data-grupo="${g.valor}" aria-selected="${activo}">
            <i class="fas ${g.icono}" aria-hidden="true"></i>${escapeHtml(g.nombre)}<span>${n}</span>
        </button>`;
    }).join('');
}

function renderPanelCatalogo() {
    const panel = document.getElementById('itin-panel');
    const grid = panel?.querySelector('.itin-panel-grid');
    if (!grid) return;
    const entradas = iselEntradasFiltradas(armadoUI.grupo);
    // Chips de destino del grupo (con conteo); si el elegido ya no tiene nada, vuelve a "Todos".
    const porDestino = new Map();
    entradas.forEach(e => {
        const k = e.destino ? String(e.destino.id) : '0';
        if (!porDestino.has(k)) porDestino.set(k, { destino: e.destino, nombre: e.destino?.nombre || 'Sin clasificar', n: 0 });
        porDestino.get(k).n++;
    });
    if (armadoUI.filtroDestino && !porDestino.has(armadoUI.filtroDestino)) armadoUI.filtroDestino = '';
    const chips = panel.querySelector('.itin-panel-destinos');
    chips.hidden = porDestino.size < 2;
    // Los chips de destino se arrastran para cambiar su orden (ver activarOrdenDestinos).
    chips.innerHTML = `<button type="button" class="itin-panel-chip${armadoUI.filtroDestino ? '' : ' is-activo'}" data-filtro-destino="">Todos<span>${entradas.length}</span></button>` +
        [...porDestino.entries()].sort((a, b) => (!a[1].destino - !b[1].destino) || (a[1].destino ? iselCompararDestinos(a[1].destino, b[1].destino) : 0))
            .map(([k, d]) => `<button type="button" class="itin-panel-chip${armadoUI.filtroDestino === k ? ' is-activo' : ''}${d.destino ? ' is-ordenable' : ''}" data-filtro-destino="${k}"${d.destino ? ' title="Arrastra para cambiar el orden"' : ''}>${d.destino ? '<i class="fas fa-grip-vertical" aria-hidden="true"></i>' : ''}${escapeHtml(d.nombre)}<span>${d.n}</span></button>`).join('');

    const visibles = entradas
        .filter(e => !armadoUI.filtroDestino || (e.destino ? String(e.destino.id) : '0') === armadoUI.filtroDestino)
        // Destino (en su orden) → categoría → título; "Sin clasificar" y "Sin categoría" siempre al final.
        .sort((a, b) => (!a.destino - !b.destino) || (a.destino && b.destino ? iselCompararDestinos(a.destino, b.destino) : 0)
            || (!a.categoria - !b.categoria) || (a.categoria?.nombre || '').localeCompare(b.categoria?.nombre || '')
            || a.m.titulo.localeCompare(b.m.titulo));

    if (!visibles.length) {
        const otros = [...iselGrupos().map(g => g.valor), ISEL_SIN_CLASIFICAR].filter(g => g !== armadoUI.grupo)
            .map(g => ({ g, n: iselEntradasFiltradas(g).length })).filter(x => x.n);
        grid.innerHTML = `<div class="itin-panel-vacio">
            <i class="fas ${armadoUI.busqueda ? 'fa-magnifying-glass' : 'fa-route'}"></i>
            <p>${armadoUI.busqueda ? `Sin resultados en ${iselNombreGrupo(armadoUI.grupo)}.` : `Aún no hay itinerarios ${iselNombreGrupo(armadoUI.grupo).toLowerCase()}. Asígnales destino en Gestión de Datos › Itinerarios.`}</p>
            ${otros.map(x => `<button type="button" class="itin-panel-btn" data-accion="ver-grupo" data-ver-grupo="${x.g}">Ver ${x.n} en ${iselNombreGrupo(x.g)}</button>`).join('')}
        </div>`;
        return;
    }
    // Encabezado de categoría cuando cambia (orientación sin ocupar mucho alto).
    let ultimo = null;
    grid.innerHTML = visibles.map(e => {
        const clave = `${e.destino?.nombre || ''}|${e.categoria?.nombre || ''}`;
        const cabecera = clave !== ultimo
            ? `<div class="itin-panel-seccion">${escapeHtml(e.destino ? [e.destino.nombre, e.categoria?.nombre || 'Sin categoría'].join(' › ') : 'Sin clasificar')}</div>`
            : '';
        ultimo = clave;
        return cabecera + `<div class="ipc" data-filename="${escapeHtml(e.m.filename)}">
            <button type="button" class="ipc-main" data-accion="elegir">
                ${iselMediaHtml(e)}
                <span class="ipc-badge" aria-hidden="true"></span>
                <span class="ipc-titulo">${escapeHtml(e.m.titulo)}</span>
            </button>
            <button type="button" class="ipc-info" data-accion="info" title="Ver detalles" aria-label="Ver detalles de ${escapeHtml(e.m.titulo)}"><i class="fas fa-info"></i></button>
        </div>`;
    }).join('');
    pintarEstadoTarjetasPanel();
}

// Insignia "Día 1, 3" en las tarjetas del panel que ya están en el itinerario.
function pintarEstadoTarjetasPanel() {
    const items = itemsArmado();
    const actual = armadoUI.reemplazar ? filenameDeFila(filaPorUid(armadoUI.reemplazar)) : null;
    const destino = diaDestino();
    document.querySelectorAll('#itin-panel .ipc').forEach(card => {
        const f = card.dataset.filename;
        const dias = [...new Set(items.filter(x => x.filename === f).map(x => x.dia))];
        const badge = card.querySelector('.ipc-badge');
        const main = card.querySelector('.ipc-main');
        const titulo = card.querySelector('.ipc-titulo').textContent;
        card.classList.toggle('is-elegida', dias.length > 0);
        card.classList.toggle('is-actual', f === actual);
        badge.innerHTML = f === actual
            ? '<i class="fas fa-check"></i>Actual'
            : dias.length ? `<i class="fas fa-check"></i>Día ${dias.join(', ')}` : '';
        main.setAttribute('aria-label', armadoUI.reemplazar
            ? `${titulo}: usar en lugar del actual`
            : `${titulo}${dias.length ? ` (ya en Día ${dias.join(', ')})` : ''}: agregar al Día ${destino}`);
    });
}

function elegirDesdePanel(filename) {
    const titulo = iselEntradaDe(filename)?.m.titulo || filename;
    if (armadoUI.reemplazar) {
        const tr = filaPorUid(armadoUI.reemplazar);
        if (tr) {
            tr.querySelector('.module-filename').value = filename;
            iselToast(`Día ${tr.dataset.dia}: ${titulo}`);
        }
        armadoUI.reemplazar = null;
        refrescarArmadoItinerario();
        renderPanelCabecera();
        resaltarTarjeta(tr?.dataset.uid);
        return;
    }
    const dia = diaDestino();
    if (itemsArmado().some(x => x.dia === dia && x.filename === filename)) {
        iselToast(`${titulo} ya está en el Día ${dia}`, 'info');
        return;
    }
    const esNuevo = armadoUI.destino === null;
    const tr = addItineraryBuilderRow('itinerary-builder-body', true, filename, dia);
    if (esNuevo) armadoUI.saltos = 0;
    refrescarArmadoItinerario();
    resaltarTarjeta(tr?.dataset.uid);
}

function resaltarTarjeta(uid) {
    if (!uid) return;
    const card = document.querySelector(`#itin-grilla .itin-card[data-uid="${uid}"]`);
    if (!card) return;
    card.classList.add('is-nueva');
    card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setTimeout(() => card.classList.remove('is-nueva'), 1200);
}

document.querySelector('input[name="f_llegada"]')?.addEventListener('change', refrescarArmadoItinerario);

// ===== Popup de detalles (y edición) =====
let detalleActual = null; // { uid?, filename, editando }

// editar: abre directo en modo edición (lápiz de la tarjeta); "Cancelar" vuelve a los detalles.
function abrirDetalleItinerario({ uid = null, filename = null, editar = false }) {
    if (uid) filename = filenameDeFila(filaPorUid(uid));
    if (!filename) return;
    document.getElementById('idet')?.remove();
    detalleActual = { uid, filename, editando: editar, focoPrevio: document.activeElement };
    const overlay = document.createElement('div');
    overlay.id = 'idet';
    overlay.className = 'idet-overlay';
    overlay.innerHTML = '<div class="idet" role="dialog" aria-modal="true" aria-labelledby="idet-titulo" tabindex="-1"></div>';
    document.body.appendChild(overlay);
    document.documentElement.classList.add('idet-abierto');
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && !detalleActual?.editando) cerrarDetalleItinerario(); });
    document.addEventListener('keydown', onKeydownDetalle, true);
    renderDetalle();
    requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        overlay.querySelector('.idet-cerrar')?.focus();
    });
}

function cerrarDetalleItinerario() {
    const overlay = document.getElementById('idet');
    const foco = detalleActual?.focoPrevio;
    detalleActual = null;
    document.querySelectorAll('#itin-panel .ipc-info.is-abierto').forEach(b => b.classList.remove('is-abierto'));
    document.removeEventListener('keydown', onKeydownDetalle, true);
    document.documentElement.classList.remove('idet-abierto');
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    setTimeout(() => overlay.remove(), 160);
    if (foco && document.contains(foco)) foco.focus({ preventScroll: true });
}

function onKeydownDetalle(ev) {
    if (!detalleActual) return;
    if (Swal.isVisible() && !Swal.getPopup()?.classList.contains('swal2-toast')) return;
    if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        if (detalleActual.editando) { detalleActual.editando = false; renderDetalle(); }
        else cerrarDetalleItinerario();
        return;
    }
    if (ev.key === 'Tab') {
        const cont = document.querySelector('#idet .idet');
        const focoables = [...cont.querySelectorAll('button:not([disabled]), [href], input, textarea, select')].filter(el => el.offsetParent !== null);
        if (!focoables.length) return;
        const primero = focoables[0], ultimo = focoables[focoables.length - 1];
        if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
        else if (!cont.contains(document.activeElement)) { ev.preventDefault(); primero.focus(); }
    }
}

function renderDetalle() {
    const caja = document.querySelector('#idet .idet');
    if (!caja || !detalleActual) return;
    const e = iselEntradaDe(detalleActual.filename);
    if (!e) {
        caja.innerHTML = `<div class="idet-body"><button type="button" class="idet-icon-btn idet-cerrar" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
            <p class="idet-sin">Este itinerario ya no está en el catálogo de este idioma.</p></div>
            ${detalleActual.uid ? '<div class="idet-acciones"><button type="button" class="idet-btn is-peligro" data-accion="quitar"><i class="fas fa-trash"></i>Quitar del itinerario</button></div>' : ''}`;
        enlazarDetalle(caja, e);
        return;
    }
    if (detalleActual.editando) { renderDetalleEdicion(caja, e); return; }

    const m = e.m;
    const tr = detalleActual.uid ? filaPorUid(detalleActual.uid) : null;
    const dia = tr ? Number(tr.dataset.dia) : null;
    const lugares = iselLista(m.lugares_visitar);
    const incluye = iselLista(m.incluye);
    const noIncluye = iselLista(m.no_incluye);
    const llegada = iselLlegada();
    const diasDelItinerario = [...new Set(itemsArmado().map(x => x.dia))];
    const esPrimerDia = dia !== null && dia === diasDelItinerario[0];
    // Solo en el primer día puede ir antes de la llegada: su fecha pasa a ser la F. Llegada.
    const minFecha = esPrimerDia && itemsArmado().filter(x => x.dia === dia).length === 1 ? '' : ` min="${llegada}"`;
    caja.innerHTML = `
        <div class="idet-media">
            ${iselMediaHtml(e)}
            <button type="button" class="idet-icon-btn idet-cerrar" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="idet-body">
            <p class="idet-ruta">${escapeHtml(iselRuta(e))}</p>
            <h3 id="idet-titulo">${escapeHtml(m.titulo)}</h3>
            ${tr ? `
            <div class="idet-fecha">
                <label>
                    <span>${llegada ? 'Fecha' : 'Día'}</span>
                    ${llegada
                        ? `<input type="date" class="idet-fecha-input" value="${iselFechaDia(dia)}"${minFecha}>`
                        : `<input type="number" class="idet-dia-input" value="${dia}" min="1" max="366">`}
                </label>
                <span class="idet-fecha-dia">Día ${dia}${iselFechaCorta(dia) ? ` · ${escapeHtml(iselFechaCorta(dia))}` : ''}</span>
                <span class="idet-fecha-acciones">
                    <button type="button" class="idet-btn is-suave" data-accion="mismo-dia" title="Agregar otro itinerario a este mismo día"><i class="fas fa-plus"></i>Otro en este día</button>
                    ${!esPrimerDia ? '<button type="button" class="idet-btn is-suave" data-accion="libre-antes" title="Corre este día y los siguientes un día"><i class="fas fa-mug-hot"></i>Día libre antes</button>' : ''}
                </span>
            </div>` : ''}
            ${lugares.length ? `<section><h4><i class="fas fa-location-dot"></i>Lugares a visitar</h4>
                ${lugares.length > 1 ? `<ul class="idet-lugares">${lugares.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : `<p>${escapeHtml(lugares[0])}</p>`}</section>` : ''}
            ${incluye.length ? `<section><h4><i class="fas fa-circle-check"></i>Incluye</h4><ul class="idet-incluye">${incluye.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></section>` : ''}
            ${noIncluye.length ? `<section><h4><i class="fas fa-circle-xmark"></i>No incluye</h4><ul class="idet-no-incluye">${noIncluye.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></section>` : ''}
            ${!lugares.length && !incluye.length && !noIncluye.length ? '<p class="idet-sin">Todavía no tiene lugares a visitar ni lo que incluye. Puedes completarlos con «Editar».</p>' : ''}
            <a class="idet-pdf" href="${urlPdfModulo(m)}" target="_blank" rel="noopener"${m.archivo_existe === false ? ' aria-disabled="true"' : ''}>
                <i class="fas fa-file-pdf"></i><span>Ver el PDF del itinerario</span><i class="fas fa-arrow-up-right-from-square"></i>
            </a>
        </div>
        <div class="idet-acciones">
            <button type="button" class="idet-btn is-suave" data-accion="editar"><i class="fas fa-pen"></i>Editar</button>
            ${tr ? `
                <button type="button" class="idet-btn is-peligro" data-accion="quitar"><i class="fas fa-trash"></i>Quitar</button>
                <button type="button" class="idet-btn is-primario" data-accion="cambiar"><i class="fas fa-arrows-rotate"></i>Cambiar</button>`
            : `<button type="button" class="idet-btn is-primario" data-accion="agregar"><i class="fas fa-plus"></i>${armadoUI.reemplazar ? 'Usar en lugar del actual' : `Agregar al Día ${diaDestino()}`}</button>`}
        </div>`;
    enlazarDetalle(caja, e);
}

function enlazarDetalle(caja, e) {
    caja.querySelector('.idet-cerrar')?.addEventListener('click', cerrarDetalleItinerario);
    const tr = detalleActual.uid ? filaPorUid(detalleActual.uid) : null;
    // reenfocar: volver al campo tras aplicar (no cuando se aplicó porque el usuario salió de él).
    const cambiarDia = (dia, reenfocar = true) => {
        if (!tr || !Number.isFinite(dia) || !detalleActual) return;
        iselCambiarDiaDeFila(tr, dia);
        renderDetalle();
        if (reenfocar) caja.querySelector('.idet-fecha-input, .idet-dia-input')?.focus();
    };
    // Fecha: al escribirla, el navegador avisa un cambio por cada parte (día, mes y cada
    // dígito del año: 0002, 0020, 0202...), así que una fecha a medio escribir parece anterior
    // a la llegada. Lo escrito se aplica (y se valida) recién al terminar: Enter o al salir
    // del campo; Escape lo descarta. Lo elegido en el calendario, sin teclear, va al momento.
    const inputFecha = caja.querySelector('.idet-fecha-input');
    if (inputFecha) {
        let tecleando = false;
        const aplicarFecha = (reenfocar) => {
            tecleando = false;
            if (!detalleActual) return;
            if (!inputFecha.value) { renderDetalle(); return; } // incompleta: vuelve a la que tenía
            const dia = Math.round((Date.parse(inputFecha.value + 'T00:00:00Z') - Date.parse(iselLlegada() + 'T00:00:00Z')) / 86400000) + 1;
            if (dia !== Number(tr?.dataset.dia)) cambiarDia(dia, reenfocar);
        };
        inputFecha.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); aplicarFecha(true); return; }
            if (ev.key === 'Escape') { tecleando = false; return; }
            if (ev.key !== 'Tab' && ev.key !== 'Shift') tecleando = true;
        });
        inputFecha.addEventListener('change', () => { if (!tecleando) aplicarFecha(true); });
        inputFecha.addEventListener('blur', () => { if (tecleando) aplicarFecha(false); });
    }
    caja.querySelector('.idet-dia-input')?.addEventListener('change', (ev) => cambiarDia(Number(ev.target.value)));
    caja.querySelector('.idet-acciones')?.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-accion]');
        if (!btn) return;
        switch (btn.dataset.accion) {
            case 'editar': detalleActual.editando = true; renderDetalle(); break;
            case 'quitar': { const uid = detalleActual.uid; cerrarDetalleItinerario(); quitarFila(uid); break; }
            case 'cambiar': { const uid = detalleActual.uid; cerrarDetalleItinerario(); abrirPanelItinerarios({ reemplazar: uid }); break; }
            case 'agregar': { const f = detalleActual.filename; cerrarDetalleItinerario(); elegirDesdePanel(f); break; }
        }
    });
    caja.querySelector('[data-accion="libre-antes"]')?.addEventListener('click', () => {
        iselDesplazarDiasDesde(Number(tr.dataset.dia), 1);
        renderDetalle();
    });
    // Sumar otro itinerario al mismo día (es la forma de hacerlo: al tocar la tarjeta).
    caja.querySelector('[data-accion="mismo-dia"]')?.addEventListener('click', () => {
        const dia = Number(tr.dataset.dia);
        cerrarDetalleItinerario();
        abrirPanelItinerarios({ destino: dia });
    });
}

// Modo edición: guarda en el catálogo (afecta a todas las cotizaciones que lo usan).
function renderDetalleEdicion(caja, e) {
    const m = e.m;
    caja.innerHTML = `
        <div class="idet-edit-cab">
            <h3 id="idet-titulo">Editar itinerario</h3>
            <button type="button" class="idet-icon-btn idet-cerrar-edicion" aria-label="Volver a los detalles"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="idet-body idet-form">
            <p class="idet-aviso"><i class="fas fa-circle-info"></i>Los cambios se guardan en el catálogo: se verán en todas las cotizaciones y paquetes que usan este itinerario.</p>
            <label class="idet-campo"><span>Título</span><input type="text" class="if-titulo" value="${escapeHtml(m.titulo)}"></label>
            <fieldset class="if-clasif">
                <legend>Clasificación</legend>
                <div class="if-grupos"></div>
                <div class="idet-campos-2">
                    <label class="idet-campo"><span>Destino</span><select class="if-destino"></select></label>
                    <label class="idet-campo"><span>Categoría</span><select class="if-categoria" disabled></select></label>
                </div>
            </fieldset>
            <div class="idet-campo">
                <span>Imagen</span>
                <div class="if-imagen">
                    <div class="if-imagen-preview"></div>
                    <div class="if-imagen-acciones">
                        <label class="idet-btn is-suave"><i class="fas fa-image"></i><span class="if-imagen-texto">Elegir imagen</span><input type="file" class="if-imagen-input" accept="image/jpeg,image/png,image/webp" hidden></label>
                        <button type="button" class="idet-btn is-suave if-imagen-quitar"><i class="fas fa-trash"></i>Quitar</button>
                        <small>JPG, PNG o WebP, hasta 5 MB.</small>
                    </div>
                </div>
            </div>
            <label class="idet-campo"><span>Lugares a visitar</span><textarea class="if-lugares" rows="3" placeholder="Uno por línea">${escapeHtml(m.lugares_visitar || '')}</textarea></label>
            <div class="idet-campos-2">
                <label class="idet-campo"><span>Incluye</span><textarea class="if-incluye" rows="4" placeholder="Uno por línea">${escapeHtml(m.incluye || '')}</textarea></label>
                <label class="idet-campo"><span>No incluye</span><textarea class="if-no-incluye" rows="4" placeholder="Uno por línea">${escapeHtml(m.no_incluye || '')}</textarea></label>
            </div>
            <div class="idet-campo">
                <span>PDF</span>
                <div class="if-pdf">
                    <a href="${urlPdfModulo(m)}" target="_blank" rel="noopener" class="if-pdf-actual"><i class="fas fa-file-pdf"></i>${escapeHtml(m.filename)}</a>
                    <label class="idet-btn is-suave"><i class="fas fa-file-arrow-up"></i>Reemplazar PDF<input type="file" class="if-pdf-input" accept="application/pdf,.pdf" hidden></label>
                    <span class="if-pdf-nuevo"></span>
                </div>
            </div>
        </div>
        <div class="idet-acciones">
            <button type="button" class="idet-btn is-suave if-cancelar">Cancelar</button>
            <button type="button" class="idet-btn is-primario if-guardar"><i class="fas fa-save"></i>Guardar</button>
        </div>`;
    const $ = (s) => caja.querySelector(s);
    // Clasificación en cascada: grupo → destino de ese grupo → categoría (itinerario.js).
    const destinoSel = $('.if-destino');
    const categoriaSel = $('.if-categoria');
    enlazarClasificacionItinerario({
        contGrupos: $('.if-grupos'), destinoSel, categoriaSel,
        destinoId: m.destino_id, categoriaId: m.categoria_id, grupoPreferido: armadoUI.grupo
    });
    let imagen = 'actual';
    let pdf = null;
    const pintarImagen = () => {
        let src = null;
        if (imagen instanceof File) src = URL.createObjectURL(imagen);
        else if (imagen === 'actual' && m.imagen && m.imagen_existe !== false) src = urlImagenItinerario(m.imagen);
        $('.if-imagen-preview').innerHTML = src ? `<img src="${src}" alt="">` : '<span><i class="fas fa-image"></i>Sin imagen</span>';
        $('.if-imagen-quitar').hidden = !src;
        $('.if-imagen-texto').textContent = src ? 'Cambiar imagen' : 'Elegir imagen';
    };
    pintarImagen();
    $('.if-imagen-input').addEventListener('change', (ev) => {
        const f = ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { notifyWarning('Solo se permiten imágenes JPG, PNG o WebP.'); return; }
        if (f.size > 5 * 1024 * 1024) { notifyWarning('La imagen pesa más de 5 MB.'); return; }
        imagen = f;
        pintarImagen();
    });
    $('.if-imagen-quitar').addEventListener('click', () => { imagen = null; pintarImagen(); });
    $('.if-pdf-input').addEventListener('change', (ev) => {
        const f = ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        if (f.type && f.type !== 'application/pdf') { notifyWarning('Solo se permiten archivos PDF.'); return; }
        pdf = f;
        $('.if-pdf-nuevo').innerHTML = `<i class="fas fa-check"></i>${escapeHtml(f.name)} <em>· se reemplaza al guardar</em>`;
    });
    const volver = () => { detalleActual.editando = false; renderDetalle(); };
    $('.idet-cerrar-edicion').addEventListener('click', volver);
    $('.if-cancelar').addEventListener('click', volver);
    $('.if-guardar').addEventListener('click', async () => {
        const titulo = $('.if-titulo').value.trim();
        if (!titulo) { notifyWarning('El título es obligatorio.'); return; }
        const boton = $('.if-guardar');
        boton.disabled = true;
        boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Guardando...';
        try {
            const anterior = m.filename;
            const { filename, aviso } = await guardarItinerarioCatalogo(m, {
                titulo,
                destino_id: destinoSel.value || null,
                categoria_id: categoriaSel.value || null,
                lugares_visitar: $('.if-lugares').value,
                incluye: $('.if-incluye').value,
                no_incluye: $('.if-no-incluye').value,
                imagen, pdf
            });
            // Si el PDF era compartido y quedó con otro nombre, esta cotización pasa a usar el nuevo.
            if (filename !== anterior) {
                filasArmado().forEach(tr => { if (filenameDeFila(tr) === anterior) tr.querySelector('.module-filename').value = filename; });
            }
            if (!detalleActual) return;
            detalleActual.filename = filename;
            detalleActual.editando = false;
            refrescarArmadoItinerario();
            // Si cambió de destino puede haber pasado a otro grupo (Con / Sin hotel): conteos también.
            if (armadoUI.panelAbierto) { renderPanelGrupos(); renderPanelCatalogo(); }
            renderDetalle();
            iselToast('Itinerario actualizado');
            if (aviso) notifyWarning(aviso.trim());
        } catch (err) {
            notifyError('No se pudo guardar el itinerario: ' + err.message);
            boton.disabled = false;
            boton.innerHTML = '<i class="fas fa-save"></i>Guardar';
        }
    });
    setTimeout(() => $('.if-titulo').focus(), 0);
}
