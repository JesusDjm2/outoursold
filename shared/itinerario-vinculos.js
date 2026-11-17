// shared/itinerario-vinculos.js
// Vínculo entre un itinerario armado (tarjeta del día) y sus filas de Actividades, solo en el
// Cotizador. Un itinerario puede tener varias actividades; cada fila de actividad va con un
// solo itinerario.
//  - Por defecto salen del catálogo: cada itinerario tiene una lista de actividades por
//    moneda (tours_usd / tours_pen, migración 042; ver toursVinculadosDeModulo en
//    catalogo-shared.js).
//  - Al agregar el itinerario se agregan sus actividades en el mismo día; al moverlo de día se
//    mueven; al quitarlo se quitan; al reemplazarlo pasan a ser las del nuevo.
//  - La fecha de una actividad vinculada no se edita: siempre es la del día de su itinerario.
//  - En la cotización se pueden agregar, quitar o desvincular (popup del itinerario o el ícono
//    de la fila). Eso vale solo para esta cotización: se guarda en su JSON (tours[i].vinculo =
//    índice del itinerario en itinerarioArmado.modulos), nunca en el catálogo.
//
// Estado en el DOM:
//  - fila de itinerario (#itinerary-builder-body tr): data-uid, y data-vinc-file = archivo
//    para el que ya se resolvieron sus actividades (si cambia, fue reemplazado).
//  - fila de actividad (#tours-body tr): data-vinculo = uid del itinerario.

// > 0 mientras se arma la vista desde algo guardado (cotización, paquete, historial): las
// filas de itinerario que llegan no agregan sus actividades (ya vienen las guardadas).
let vincPausa = 0;

function vinculosActivos() {
    return !!monedaActividades() && !!document.getElementById('tours-body');
}
function filasActividades() {
    return [...document.querySelectorAll('#tours-body tr')];
}
function nombreActividadDeFila(row) {
    return row.querySelector('.tour-name')?.value || '';
}
function filasActividadDe(uid) {
    return filasActividades().filter(tr => tr.dataset.vinculo === String(uid));
}
function itinerarioDeActividad(row) {
    return row.dataset.vinculo ? filaPorUid(row.dataset.vinculo) : null;
}
function moduloDeFilaItin(itr) {
    const filename = filenameDeFila(itr);
    return modulosActivos().find(m => m.filename === filename) || null;
}
function tituloFilaItin(itr) {
    return moduloDeFilaItin(itr)?.titulo || filenameDeFila(itr);
}
function inputFechaActividad(row) {
    return row.querySelector('td:nth-child(2) input');
}

// ===== Día de una actividad =====
function ponerDiaEnActividad(row, dia) {
    const fecha = iselFechaDia(dia);
    inputFechaActividad(row).value = fecha;
    // Sin F. Llegada queda sin fecha y con su día (como las de un paquete).
    if (fecha) delete row.dataset.dia;
    else row.dataset.dia = String(dia);
}
function actividadEnSuDia(row, dia) {
    const fecha = iselFechaDia(dia);
    return fecha ? inputFechaActividad(row).value === fecha && !row.dataset.dia : !inputFechaActividad(row).value && row.dataset.dia === String(dia);
}
// Día del viaje de una fila (1 = F. Llegada), o null si no tiene fecha ni día.
function diaDeActividad(row) {
    const fecha = inputFechaActividad(row).value;
    const llegada = iselLlegada();
    if (fecha && llegada) return diasEntreISO(llegada, fecha) + 1;
    const dia = Number(row.dataset.dia);
    return dia >= 1 ? dia : null;
}
// La fila va después de las de su día y antes de la primera de un día posterior.
function ubicarActividad(row, dia) {
    const siguiente = filasActividades().find(tr => tr !== row && nombreActividadDeFila(tr) && (diaDeActividad(tr) ?? -Infinity) > dia);
    document.getElementById('tours-body').insertBefore(row, siguiente || null);
}

// ===== Crear, vincular, quitar =====
function crearActividadVinculada(itr, tour) {
    const dia = Number(itr.dataset.dia);
    const row = createTourRow({ tour: tour.tour });
    row.querySelector('.tour-name').dispatchEvent(new Event('input')); // precios del catálogo
    row.dataset.vinculo = itr.dataset.uid;
    ponerDiaEnActividad(row, dia);
    // Ocupa la fila en blanco (la de una cotización nueva), como agregarFilasTours.
    filasActividades().find(tr => !nombreActividadDeFila(tr))?.remove();
    document.getElementById('tours-body').appendChild(row);
    ubicarActividad(row, dia);
    return row;
}
function vincularFila(row, itr) {
    row.dataset.vinculo = itr.dataset.uid;
    ponerDiaEnActividad(row, Number(itr.dataset.dia));
    ubicarActividad(row, Number(itr.dataset.dia));
}
function desvincularFila(row) {
    delete row.dataset.vinculo;
}
// Una fila de esa actividad, sin vínculo y en el mismo día del itinerario. Solo para
// cotizaciones y paquetes guardados antes de los vínculos (vincularPorCoincidencia).
function actividadSueltaPara(itr, tour) {
    const dia = Number(itr.dataset.dia);
    return filasActividades().find(row => !itinerarioDeActividad(row)
        && nombreActividadDeFila(row) === tour.tour && diaDeActividad(row) === dia) || null;
}
// La suma al itinerario (si no la tiene ya). Siempre en una fila nueva: una actividad
// agregada en Actividades es suelta y no se vincula sola, aunque sea la misma y del mismo día.
function sumarActividadAItinerario(itr, tour) {
    if (filasActividadDe(itr.dataset.uid).some(r => nombreActividadDeFila(r) === tour.tour)) return;
    crearActividadVinculada(itr, tour);
}
function eliminarFilaActividad(row) {
    const body = row.parentElement;
    row.remove();
    // Nunca deja la tabla vacía (ver createTourRow).
    if (body && !body.querySelector('tr')) body.appendChild(createTourRow({ fecha: sugerirSiguienteFechaTour() }));
}

// Al quitar un itinerario del armado (itinerario-selector.js): se va con sus actividades.
function quitarActividadVinculada(itr) {
    if (!itr || !vinculosActivos()) return;
    const filas = filasActividadDe(itr.dataset.uid);
    if (!filas.length) return;
    filas.forEach(eliminarFilaActividad);
    calcularResumen();
}

// Cambios hechos en esta cotización desde el popup del itinerario.
function agregarActividadVinculada(itr, tour) {
    sumarActividadAItinerario(itr, tour);
    calcularResumen();
    refrescarArmadoItinerario();
}
// quitarFila: true la borra de Actividades; false la deja ahí, sin vínculo (y con su fecha editable).
function soltarActividadVinculada(row, quitarFila) {
    if (quitarFila) eliminarFilaActividad(row);
    else desvincularFila(row);
    calcularResumen();
    refrescarArmadoItinerario();
}

// ===== Sincronización (tras cada cambio del armado, ver refrescarArmadoItinerario) =====
function sincronizarVinculosActividades() {
    if (!vinculosActivos()) return;
    const itins = filasArmado().filter(tr => filenameDeFila(tr));
    const uids = new Set(itins.map(tr => tr.dataset.uid));
    // Itinerario que ya no está sin pasar por "Quitar" (cambio de idioma, vaciado): las
    // actividades se quedan, sin vínculo.
    filasActividades().forEach(row => { if (row.dataset.vinculo && !uids.has(row.dataset.vinculo)) desvincularFila(row); });
    let cambio = false;
    itins.forEach(itr => {
        const filename = filenameDeFila(itr);
        if (itr.dataset.vincFile !== filename) {
            // Itinerario nuevo o reemplazado: sus actividades por defecto. Las del anterior
            // que el nuevo no tiene se quitan; las que comparten se quedan como están.
            itr.dataset.vincFile = filename;
            if (!vincPausa) {
                const tours = toursVinculadosDeModulo(moduloDeFilaItin(itr));
                const nombres = new Set(tours.map(t => t.tour));
                filasActividadDe(itr.dataset.uid).forEach(row => { if (!nombres.has(nombreActividadDeFila(row))) eliminarFilaActividad(row); });
                tours.forEach(tour => sumarActividadAItinerario(itr, tour));
                cambio = true;
            }
        }
        // El día del itinerario (o la F. Llegada) cambió: sus actividades lo siguen.
        const dia = Number(itr.dataset.dia);
        filasActividadDe(itr.dataset.uid).forEach(act => {
            if (actividadEnSuDia(act, dia)) return;
            ponerDiaEnActividad(act, dia);
            ubicarActividad(act, dia);
            cambio = true;
        });
    });
    pintarMarcasVinculo();
    if (cambio) calcularResumen();
}

// Diferenciador de cada fila de Actividades:
//  - vinculada (vino con un itinerario): franja verde, ícono 🔗 (clic: desvincular) y fecha
//    bloqueada, la del día del itinerario.
//  - suelta (agregada en Actividades o desvinculada): ícono de mano, fecha manual; se arrastra
//    y no sigue a ningún itinerario aunque sea del mismo día.
function pintarMarcasVinculo() {
    let hayVinculadas = false;
    filasActividades().forEach(row => {
        const itr = itinerarioDeActividad(row);
        const suelta = !itr && !!nombreActividadDeFila(row);
        const input = inputFechaActividad(row);
        let marca = row.querySelector('.vinc-marca');
        row.classList.toggle('is-vinculada', !!itr);
        row.classList.toggle('is-suelta', suelta);
        input.readOnly = !!itr;
        if (itr) hayVinculadas = true;
        if (!itr && !suelta) {
            marca?.remove();
            input.removeAttribute('title');
            return;
        }
        const tipo = itr ? 'button' : 'span';
        if (marca && marca.tagName.toLowerCase() !== tipo) { marca.remove(); marca = null; }
        if (!marca) {
            marca = document.createElement(tipo);
            if (itr) marca.type = 'button';
            marca.className = 'vinc-marca';
            row.querySelector('td').appendChild(marca);
        }
        marca.classList.toggle('is-suelta', suelta);
        marca.innerHTML = itr ? '<i class="fas fa-link"></i>' : '<i class="fas fa-hand-pointer"></i>';
        const texto = itr
            ? `Del itinerario «${tituloFilaItin(itr)}» (Día ${itr.dataset.dia}): su fecha es la del itinerario, se mueve y se quita con él. Clic para desvincular.`
            : 'Agregada en Actividades: suelta, con fecha manual. No se mueve ni se quita con ningún itinerario.';
        marca.title = texto;
        marca.setAttribute('aria-label', texto);
        if (itr) input.title = `La fecha la pone el itinerario «${tituloFilaItin(itr)}». Para cambiarla, mueve el itinerario de día.`;
        else input.removeAttribute('title');
    });
    // Leyenda bajo la tabla, solo cuando hay de los dos tipos posibles (alguna vinculada).
    const leyenda = document.getElementById('leyenda-vinculos');
    if (leyenda) leyenda.hidden = !hayVinculadas;
}
document.getElementById('tours-body')?.addEventListener('click', async (ev) => {
    const marca = ev.target.closest('.vinc-marca');
    if (!marca) return;
    const row = marca.closest('tr');
    const itr = itinerarioDeActividad(row);
    if (!itr) return;
    if (!await confirmAction(`¿Desvincular esta actividad del itinerario «${tituloFilaItin(itr)}»? Sigue en la cotización con su fecha editable, pero ya no se moverá ni se quitará con el itinerario. Solo cambia en esta cotización.`, 'Sí, desvincular')) return;
    soltarActividadVinculada(row, false);
    if (typeof iselToast === 'function') iselToast('Actividad desvinculada en esta cotización');
});

// ===== Guardar y restaurar =====
// Índice del itinerario vinculado dentro de itinerarioArmado.modulos (mismo orden que
// leerArmadoItinerario), o null.
function indiceVinculoDeActividad(row) {
    if (!row.dataset.vinculo || !vinculosActivos()) return null;
    const i = itemsArmado().findIndex(x => x.uid === row.dataset.vinculo);
    return i >= 0 ? i : null;
}

// Foto de las filas antes de armar desde algo guardado, para saber cuáles llegaron.
function fotoFilasVinculo() {
    return { tours: new Set(filasActividades()), itins: new Set(filasArmado()) };
}
function filasNuevasDesde(foto) {
    return {
        tours: filasActividades().filter(r => !foto.tours.has(r)),
        // En el orden en que se crearon (el de `modulos`): el uid es creciente.
        itins: filasArmado().filter(r => !foto.itins.has(r) && filenameDeFila(r))
            .sort((a, b) => Number(a.dataset.uid) - Number(b.dataset.uid))
    };
}
async function conVinculosPausados(fn) {
    vincPausa++;
    try {
        return await fn();
    } finally {
        vincPausa--;
    }
}

// Vínculos guardados en la cotización. filasTour/toursGuardados van en paralelo;
// filasItin son las creadas desde `modulos` (puede faltar alguno: un "día libre" viejo no
// crea fila, por eso se alinean por archivo).
function restaurarVinculosGuardados({ filasTour, toursGuardados, filasItin, modulos }) {
    if (!vinculosActivos()) return;
    const porIndice = new Map();
    let k = 0;
    (modulos || []).forEach((filename, i) => {
        if (k < filasItin.length && filenameDeFila(filasItin[k]) === filename) porIndice.set(i, filasItin[k++]);
    });
    filasTour.forEach((row, j) => {
        const v = toursGuardados[j]?.vinculo;
        const itr = Number.isInteger(v) ? porIndice.get(v) : null;
        if (itr) vincularFila(row, itr);
    });
}

// Sin vínculos guardados (paquetes y cotizaciones de antes): cada itinerario se vincula con
// las filas de sus actividades por defecto que estén en su mismo día.
function vincularPorCoincidencia(filasItin) {
    if (!vinculosActivos()) return;
    filasItin.forEach(itr => {
        toursVinculadosDeModulo(moduloDeFilaItin(itr)).forEach(tour => {
            if (filasActividadDe(itr.dataset.uid).some(r => nombreActividadDeFila(r) === tour.tour)) return;
            const suelta = actividadSueltaPara(itr, tour);
            if (suelta) vincularFila(suelta, itr);
        });
    });
}

// Se cambiaron las actividades por defecto de un itinerario en el catálogo (popup "Editar"):
// en esta cotización también se suman las nuevas y se quitan las que salieron; lo que se
// había cambiado a mano en la cotización se respeta.
function aplicarVinculosPorDefectoNuevos(filename, toursAntes, toursAhora) {
    if (!vinculosActivos()) return;
    const antes = new Set(toursAntes.map(t => t.tour));
    const ahora = new Set(toursAhora.map(t => t.tour));
    filasArmado().filter(tr => filenameDeFila(tr) === filename).forEach(itr => {
        filasActividadDe(itr.dataset.uid).forEach(row => {
            const nombre = nombreActividadDeFila(row);
            if (antes.has(nombre) && !ahora.has(nombre)) eliminarFilaActividad(row);
        });
        toursAhora.filter(t => !antes.has(t.tour)).forEach(tour => sumarActividadAItinerario(itr, tour));
    });
    calcularResumen();
    refrescarArmadoItinerario();
}
