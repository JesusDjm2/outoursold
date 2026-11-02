// shared/historial-paquetes.js
// Historial de paquetes: junta los paquetes de USD y PEN (cada moneda tiene su API y su
// catálogo), con resumen, buscador, filtros y orden. Los filtros quedan en la URL, así que
// recargar o volver desde el Cotizador no los pierde. Acá no se crea ni se edita: "Usar" y
// "Editar" llevan al Cotizador de su moneda.

const HP_MONEDAS = ['usd', 'pen'];
const HP_IDIOMAS = { es: 'Español', en: 'English', pt: 'Português' };
const hp = {
    paquetes: [],
    catalogos: { usd: { tours: new Set(), hoteles: new Set() }, pen: { tours: new Set(), hoteles: new Set() } },
    monedasConError: [],
    abiertos: new Set(),
    q: '',
    moneda: 'todas',
    contenido: 'todos',
    orden: 'recientes'
};
const hpTitulosPorIdioma = {}; // idioma → Promise<Map<filename, titulo>>

// Cualquier dato escrito por un usuario pasa por acá antes de ir a innerHTML.
function hpEsc(texto) {
    const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(texto ?? '').replace(/[&<>"']/g, (c) => mapa[c]);
}
function hpNormalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function hpPlural(n, uno, varios) {
    return `${n} ${n === 1 ? uno : varios}`;
}
function hpFecha(valor) {
    const d = valor ? new Date(String(valor).replace(' ', 'T')) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
}
function hpMayuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Días que ocupa el itinerario, contando los libres de en medio.
function hpDiasItinerario(itinerario) {
    const modulos = itinerario?.modulos || [];
    if (!modulos.length) return 0;
    const dias = (itinerario.dias || []).map(Number).filter(Boolean);
    return dias.length ? Math.max(...dias) - Math.min(...dias) + 1 : modulos.length;
}

function hpPreparar(p, moneda) {
    const itinerario = p.itinerario?.modulos?.length ? p.itinerario : null;
    return {
        ...p,
        moneda,
        clave: `${moneda}-${p.id}`,
        itinerario,
        fecha: hpFecha(p.creado_en),
        diasItinerario: hpDiasItinerario(itinerario),
        texto: hpNormalizar([
            p.nombre,
            moneda,
            ...p.tours.map(t => t.tour),
            ...p.hoteles.map(h => h.aloj),
            ...(itinerario?.modulos || [])
        ].join(' '))
    };
}

async function hpPedirJson(url) {
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
        window.location.href = 'login.php';
        throw new Error('Sesión vencida');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function hpCargar() {
    hpPintarCargando();
    hp.monedasConError = [];
    const porMoneda = await Promise.all(HP_MONEDAS.map(async (moneda) => {
        const api = `../${moneda}/api.php`;
        try {
            const [paquetes, tours, hoteles] = await Promise.all([
                hpPedirJson(`${api}?path=paquetes-tours`),
                hpPedirJson(`${api}?path=tours`),
                hpPedirJson(`${api}?path=hoteles`)
            ]);
            hp.catalogos[moneda] = { tours: new Set(tours.map(t => t.tour)), hoteles: new Set(hoteles.map(h => h.aloj)) };
            return paquetes.map(p => hpPreparar(p, moneda));
        } catch (e) {
            console.error(`Error al cargar los paquetes en ${moneda}:`, e);
            hp.monedasConError.push(moneda.toUpperCase());
            return [];
        }
    }));
    hp.paquetes = porMoneda.flat();
    hpPintar();
}

// Filtro de moneda aparte: sus conteos muestran cuánto hay en cada una con los demás filtros.
function hpFiltrarSinMoneda() {
    const q = hpNormalizar(hp.q.trim());
    return hp.paquetes.filter(p => {
        if (q && !p.texto.includes(q)) return false;
        if (hp.contenido === 'itinerario' && !p.itinerario) return false;
        if (hp.contenido === 'actividades' && !p.tours.length) return false;
        if (hp.contenido === 'hoteles' && !p.hoteles.length) return false;
        return true;
    });
}

function hpOrdenar(lista) {
    const porFecha = (a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0) || Number(a.id) - Number(b.id);
    const comparadores = {
        recientes: (a, b) => porFecha(b, a),
        antiguos: porFecha,
        nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        dias: (a, b) => b.diasItinerario - a.diasItinerario || a.nombre.localeCompare(b.nombre, 'es')
    };
    return [...lista].sort(comparadores[hp.orden]);
}

function hpPintarKpis() {
    const total = hp.paquetes.length;
    const cuenta = (fn) => hp.paquetes.filter(fn).length;
    const ultimo = hp.paquetes.reduce((max, p) => (p.fecha && (!max || p.fecha > max.fecha) ? p : max), null);
    const tile = (etiqueta, valor, detalle = '') => `
        <div class="hp-kpi">
            <span class="hp-kpi-etiqueta">${etiqueta}</span>
            <strong class="hp-kpi-valor">${valor}</strong>
            ${detalle ? `<span class="hp-kpi-detalle">${detalle}</span>` : ''}
        </div>`;
    document.getElementById('hp-kpis').innerHTML =
        tile('Paquetes guardados', total, `${cuenta(p => p.moneda === 'usd')} USD · ${cuenta(p => p.moneda === 'pen')} PEN`) +
        tile('Con itinerario', cuenta(p => p.itinerario), total ? `de ${hpPlural(total, 'paquete', 'paquetes')}` : '') +
        tile('Con hoteles', cuenta(p => p.hoteles.length), total ? `de ${hpPlural(total, 'paquete', 'paquetes')}` : '') +
        tile('Último guardado',
            ultimo ? hpMayuscula(ultimo.fecha.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })).replace('.', '') : '—',
            ultimo ? hpEsc(ultimo.nombre) : '');
}

function hpPintarMonedas(base) {
    const opciones = [
        ['todas', 'Todas', base.length],
        ...HP_MONEDAS.map(m => [m, m.toUpperCase(), base.filter(p => p.moneda === m).length])
    ];
    document.getElementById('hp-monedas').innerHTML = opciones.map(([valor, texto, n]) => `
        <button type="button" data-moneda="${valor}" class="hp-segmento-btn${hp.moneda === valor ? ' is-activo' : ''}" aria-pressed="${hp.moneda === valor}">${texto}<span>${n}</span></button>`).join('');
}

function hpFilaHtml(p) {
    const chip = (icono, texto) => `<span class="hp-chip"><i class="fas ${icono}" aria-hidden="true"></i>${texto}</span>`;
    const chips = [];
    if (p.itinerario) chips.push(chip('fa-route', `${hpPlural(p.diasItinerario, 'día', 'días')} · ${HP_IDIOMAS[p.itinerario.idioma] || p.itinerario.idioma}`));
    if (p.tours.length) chips.push(chip('fa-person-hiking', hpPlural(p.tours.length, 'actividad', 'actividades')));
    if (p.hoteles.length) chips.push(chip('fa-hotel', hpPlural(p.hoteles.length, 'hotel', 'hoteles')));
    // Tours u hoteles que se borraron del catálogo (o se renombraron) después de guardarlo.
    const { tours, hoteles } = hp.catalogos[p.moneda];
    const faltan = p.tours.filter(t => !tours.has(t.tour)).length + p.hoteles.filter(h => !hoteles.has(h.aloj)).length;
    if (faltan) chips.push(`<span class="hp-chip is-aviso" title="Al aplicar el paquete esas filas no se encontrarán"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i>${faltan} ya no ${faltan === 1 ? 'está' : 'están'} en el catálogo</span>`);
    const abierto = hp.abiertos.has(p.clave);
    const dia = p.fecha ? p.fecha.getDate() : '—';
    const mes = p.fecha ? p.fecha.toLocaleDateString('es', { month: 'short' }).replace('.', '') : '';
    const fechaLarga = p.fecha ? p.fecha.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha';
    return `
        <article class="hp-fila${abierto ? ' is-abierta' : ''}" data-clave="${p.clave}">
            <div class="hp-fila-cab">
                <button type="button" class="hp-fila-resumen" data-accion="alternar" aria-expanded="${abierto}" aria-controls="hp-detalle-${p.clave}">
                    <time class="hp-fecha" title="Guardado el ${fechaLarga}"${p.fecha ? ` datetime="${p.fecha.toISOString()}"` : ''}><b>${dia}</b><small>${mes}</small></time>
                    <span class="hp-fila-info">
                        <strong>${hpEsc(p.nombre)}</strong>
                        <span class="hp-chips">${chips.join('') || '<span class="hp-chip">Paquete vacío</span>'}</span>
                    </span>
                    <span class="hp-moneda">${p.moneda.toUpperCase()}</span>
                    <i class="fas fa-chevron-down hp-fila-flecha" aria-hidden="true"></i>
                </button>
                <div class="hp-fila-acciones">
                    <a class="hp-btn is-primario" href="../${p.moneda}/index.php?usarPaquete=${encodeURIComponent(p.id)}" title="Aplicar este paquete a una cotización nueva"><i class="fas fa-file-circle-plus" aria-hidden="true"></i>Usar</a>
                    <a class="hp-btn-icono" href="../${p.moneda}/index.php?editarPaquete=${encodeURIComponent(p.id)}" title="Editar en el Cotizador ${p.moneda.toUpperCase()}" aria-label="Editar ${hpEsc(p.nombre)}"><i class="fas fa-pen" aria-hidden="true"></i></a>
                    <button type="button" class="hp-btn-icono is-peligro" data-accion="eliminar" title="Eliminar" aria-label="Eliminar ${hpEsc(p.nombre)}"><i class="fas fa-trash" aria-hidden="true"></i></button>
                </div>
            </div>
            <div id="hp-detalle-${p.clave}" class="hp-detalle"${abierto ? '' : ' hidden'}></div>
        </article>`;
}

function hpPintarLista() {
    const lista = document.getElementById('hp-lista');
    const conteo = document.getElementById('hp-conteo');
    const base = hpFiltrarSinMoneda();
    hpPintarMonedas(base);
    const visibles = hpOrdenar(base.filter(p => hp.moneda === 'todas' || p.moneda === hp.moneda));
    const hayFiltros = Boolean(hp.q.trim()) || hp.moneda !== 'todas' || hp.contenido !== 'todos';
    conteo.textContent = hp.paquetes.length
        ? (hayFiltros ? `${visibles.length} de ${hpPlural(hp.paquetes.length, 'paquete', 'paquetes')}` : hpPlural(visibles.length, 'paquete', 'paquetes'))
        : '';

    let aviso = '';
    if (hp.monedasConError.length) {
        aviso = `<div class="hp-aviso" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><span>No se pudieron cargar los paquetes en ${hp.monedasConError.join(' y ')}.</span><button type="button" class="hp-btn" data-accion="reintentar">Reintentar</button></div>`;
    }
    if (!hp.paquetes.length) {
        lista.innerHTML = aviso + (hp.monedasConError.length === HP_MONEDAS.length ? '' : `
            <div class="hp-vacio">
                <i class="fas fa-box-open" aria-hidden="true"></i>
                <h2>Todavía no hay paquetes guardados</h2>
                <p>Arma una cotización y usa «Guardar como paquete»: aparecerá aquí.</p>
                <a class="hp-btn is-primario" href="../usd/">Ir al Cotizador</a>
            </div>`);
        return;
    }
    if (!visibles.length) {
        lista.innerHTML = aviso + `
            <div class="hp-vacio">
                <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                <h2>Ningún paquete coincide</h2>
                <p>Prueba con otra búsqueda o quita los filtros.</p>
                <button type="button" class="hp-btn" data-accion="limpiar">Quitar filtros</button>
            </div>`;
        return;
    }
    // Ordenado por fecha se agrupa por mes, como una línea de tiempo.
    let html = aviso;
    if (hp.orden === 'recientes' || hp.orden === 'antiguos') {
        let mesActual = null;
        visibles.forEach(p => {
            const mes = p.fecha ? hpMayuscula(p.fecha.toLocaleDateString('es', { month: 'long', year: 'numeric' })) : 'Sin fecha';
            if (mes !== mesActual) {
                if (mesActual !== null) html += '</div>';
                html += `<h2 class="hp-mes">${mes}</h2><div class="hp-grupo">`;
                mesActual = mes;
            }
            html += hpFilaHtml(p);
        });
        html += '</div>';
    } else {
        html += `<div class="hp-grupo">${visibles.map(hpFilaHtml).join('')}</div>`;
    }
    lista.innerHTML = html;
    lista.querySelectorAll('.hp-fila.is-abierta').forEach(fila => hpLlenarDetalle(fila));
}

function hpPintar() {
    hpPintarKpis();
    hpPintarLista();
}

function hpPintarCargando() {
    document.getElementById('hp-kpis').innerHTML = '<div class="hp-kpi is-cargando"></div>'.repeat(4);
    document.getElementById('hp-lista').innerHTML = '<div class="hp-grupo">' + '<div class="hp-fila is-cargando"></div>'.repeat(4) + '</div>';
}

// Títulos de los itinerarios, bajo demanda: el catálogo de cada idioma solo se pide al abrir
// un paquete que lo usa.
function hpTitulosDeIdioma(idioma) {
    if (!hpTitulosPorIdioma[idioma]) {
        hpTitulosPorIdioma[idioma] = hpPedirJson(`../itinerario/api.php?path=modulos&idioma=${encodeURIComponent(idioma)}`)
            .then(modulos => new Map(modulos.map(m => [m.filename, m.titulo])))
            .catch((e) => {
                delete hpTitulosPorIdioma[idioma];
                throw e;
            });
    }
    return hpTitulosPorIdioma[idioma];
}

async function hpLlenarDetalle(fila) {
    const p = hp.paquetes.find(x => x.clave === fila.dataset.clave);
    const detalle = fila.querySelector('.hp-detalle');
    if (!p || detalle.dataset.listo) return;
    const faltante = ' <em>(ya no está en el catálogo)</em>';
    const columna = (icono, titulo, items) => `
        <section class="hp-det-col">
            <h3><i class="fas ${icono}" aria-hidden="true"></i>${titulo}</h3>
            <ul>${items}</ul>
        </section>`;
    const { tours, hoteles } = hp.catalogos[p.moneda];
    const armar = (itinerarioHtml) => {
        const partes = [itinerarioHtml];
        if (p.tours.length) partes.push(columna('fa-person-hiking', `Actividades (${p.tours.length})`, p.tours.map(t => `<li>${hpEsc(t.tour)} <span>x${hpEsc(t.cant)}</span>${tours.has(t.tour) ? '' : faltante}</li>`).join('')));
        if (p.hoteles.length) partes.push(columna('fa-hotel', `Hoteles (${p.hoteles.length})`, p.hoteles.map(h => `<li>${hpEsc(h.aloj)} <span>· ${hpPlural(Number(h.nhab) || 0, 'hab.', 'hab.')} · ${hpPlural(Number(h.noches) || 0, 'noche', 'noches')}</span>${hoteles.has(h.aloj) ? '' : faltante}</li>`).join('')));
        return partes.filter(Boolean).join('') || '<p class="hp-det-vacio">Este paquete no tiene contenido.</p>';
    };
    if (!p.itinerario) {
        detalle.innerHTML = armar('');
        detalle.dataset.listo = '1';
        return;
    }
    detalle.innerHTML = '<p class="hp-det-vacio">Cargando...</p>';
    const { idioma, modulos, dias } = p.itinerario;
    const tituloCol = `Itinerario · ${HP_IDIOMAS[idioma] || hpEsc(idioma)} (${hpPlural(p.diasItinerario, 'día', 'días')})`;
    let titulos = null;
    try {
        titulos = await hpTitulosDeIdioma(idioma);
    } catch (e) {
        console.error('Error al cargar los títulos del itinerario:', e);
    }
    const items = modulos.map((archivo, i) => {
        const titulo = titulos?.get(archivo);
        return `<li><span>Día ${hpEsc(dias?.[i] ?? i + 1)}:</span> ${hpEsc(titulo || archivo)}${titulos && !titulo ? faltante : ''}</li>`;
    }).join('');
    // La lista pudo volver a pintarse mientras llegaban los títulos.
    if (!document.contains(detalle)) return;
    detalle.innerHTML = armar(columna('fa-route', tituloCol, items));
    if (titulos) detalle.dataset.listo = '1';
}

async function hpEliminar(p) {
    if (!await confirmAction(`¿Eliminar el paquete "${p.nombre}" (${p.moneda.toUpperCase()})? Esta acción no se puede deshacer.`, 'Sí, eliminar')) return;
    try {
        const res = await fetch(`../${p.moneda}/api.php?path=eliminar-paquete-tour`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id })
        });
        const resultado = await res.json();
        if (!resultado.success) throw new Error(resultado.error || 'Error desconocido');
        hp.paquetes = hp.paquetes.filter(x => x.clave !== p.clave);
        hp.abiertos.delete(p.clave);
        hpPintar();
        Swal.fire({ toast: true, position: 'bottom', icon: 'success', title: 'Paquete eliminado', showConfirmButton: false, timer: 2200 });
    } catch (e) {
        notifyError('Error al eliminar el paquete: ' + e.message);
    }
}

function hpGuardarFiltrosEnUrl() {
    const params = new URLSearchParams();
    if (hp.q.trim()) params.set('q', hp.q.trim());
    if (hp.moneda !== 'todas') params.set('moneda', hp.moneda);
    if (hp.contenido !== 'todos') params.set('contenido', hp.contenido);
    if (hp.orden !== 'recientes') params.set('orden', hp.orden);
    const consulta = params.toString();
    history.replaceState(null, '', consulta ? `?${consulta}` : window.location.pathname);
}

function hpLeerFiltrosDeUrl() {
    const params = new URLSearchParams(window.location.search);
    const elegir = (valor, validos, porDefecto) => (validos.includes(valor) ? valor : porDefecto);
    hp.q = params.get('q') || '';
    hp.moneda = elegir(params.get('moneda'), ['todas', ...HP_MONEDAS], 'todas');
    hp.contenido = elegir(params.get('contenido'), ['todos', 'itinerario', 'actividades', 'hoteles'], 'todos');
    hp.orden = elegir(params.get('orden'), ['recientes', 'antiguos', 'nombre', 'dias'], 'recientes');
    document.getElementById('hp-q').value = hp.q;
    document.getElementById('hp-contenido').value = hp.contenido;
    document.getElementById('hp-orden').value = hp.orden;
}

function hpAlCambiarFiltros() {
    hpGuardarFiltrosEnUrl();
    hpPintarLista();
}

let hpBusquedaTimer = null;
document.getElementById('hp-q').addEventListener('input', (ev) => {
    clearTimeout(hpBusquedaTimer);
    hpBusquedaTimer = setTimeout(() => {
        hp.q = ev.target.value;
        hpAlCambiarFiltros();
    }, 120);
});
document.getElementById('hp-contenido').addEventListener('change', (ev) => {
    hp.contenido = ev.target.value;
    hpAlCambiarFiltros();
});
document.getElementById('hp-orden').addEventListener('change', (ev) => {
    hp.orden = ev.target.value;
    hpAlCambiarFiltros();
});
document.getElementById('hp-monedas').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-moneda]');
    if (!btn) return;
    hp.moneda = btn.dataset.moneda;
    hpAlCambiarFiltros();
});
document.getElementById('hp-lista').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-accion]');
    if (!btn) return;
    const fila = btn.closest('.hp-fila');
    const p = fila ? hp.paquetes.find(x => x.clave === fila.dataset.clave) : null;
    switch (btn.dataset.accion) {
        case 'alternar': {
            const abrir = !hp.abiertos.has(p.clave);
            if (abrir) hp.abiertos.add(p.clave);
            else hp.abiertos.delete(p.clave);
            fila.classList.toggle('is-abierta', abrir);
            btn.setAttribute('aria-expanded', String(abrir));
            fila.querySelector('.hp-detalle').hidden = !abrir;
            if (abrir) hpLlenarDetalle(fila);
            break;
        }
        case 'eliminar': hpEliminar(p); break;
        case 'reintentar': hpCargar(); break;
        case 'limpiar':
            hp.q = '';
            hp.moneda = 'todas';
            hp.contenido = 'todos';
            document.getElementById('hp-q').value = '';
            document.getElementById('hp-contenido').value = 'todos';
            hpAlCambiarFiltros();
            break;
    }
});

hpLeerFiltrosDeUrl();
hpCargar();
