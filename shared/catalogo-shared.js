// shared/catalogo-shared.js
// Utilidades mínimas que necesitan TANTO Cotizador (cotizador.js) como Gestión de Datos
// (gestion-datos.js) — ambas páginas lo cargan antes de su propio script. Asume que
// toursData/hotelsData/categoriasData/categoriasHotelesData (declaradas en cada página)
// ya existen en el scope global antes de llamar a buildTourSelector/buildHotelSelector.

// Cualquier dato que haya escrito un usuario (nombre de pasajero, tour, hotel, etc.) se
// interpola en innerHTML al armar filas de tablas — sin esto, alguien podía guardar algo
// como <img src=x onerror=...> en "Nombre PAX" y ejecutarlo en el navegador de quien
// abriera esa cotización después (el admin ve las de todas las agencias).
const ESCAPE_HTML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (ch) => ESCAPE_HTML_MAP[ch]);
}

// ===== SELECTOR EN CASCADA: Destino → Categoría → Ítem =====
// crearHelpersClasificacion / buildClasificacionSelector viven en shared/cascade-select.js.
// Usado por las filas de Actividades/Hoteles de Cotizador (createTourRow/createHotelRow) y
// por el armador de paquetes de Gestión de Datos (agregarFilaPaquete/agregarFilaPaqueteHotel).
// Actividades y Hoteles usan solo los destinos SIN grupo: los de Con / Sin pernocte son de
// Itinerarios (ver itinerario.js) y pueden repetir nombre ("Cusco" en cada uno).
const destinosActividadesHoteles = () => destinosData.filter(d => d.grupo_id == null);
const toursHelpers = crearHelpersClasificacion(() => toursData, () => categoriasData, 'tour', destinosActividadesHoteles);
const hotelesHelpers = crearHelpersClasificacion(() => hotelsData, () => categoriasHotelesData, 'aloj', destinosActividadesHoteles);

function buildTourSelector(initialTourName, onResolved) {
    return buildClasificacionSelector(toursHelpers, 'Actividad...', initialTourName, onResolved);
}
function buildHotelSelector(initialHotelName, onResolved) {
    return buildClasificacionSelector(hotelesHelpers, 'Alojamiento...', initialHotelName, onResolved);
}

// ===== Actividades vinculadas a un itinerario (migración 042) =====
// Cada itinerario tiene, por moneda, una lista de actividades por defecto (tours_usd /
// tours_pen, en orden). La moneda sale de la página (Cotizador o Gestión de Datos de
// USD/PEN); la página standalone de Itinerario no tiene moneda, así que ahí no se muestra.
function monedaActividades() {
    const m = window.APP_CONFIG?.monedaCodigo;
    return m === 'usd' || m === 'pen' ? m : null;
}
function toursVinculadosDeModulo(modulo) {
    const moneda = monedaActividades();
    const ids = moneda && modulo ? (modulo[`tours_${moneda}`] || []) : [];
    if (!ids.length || typeof toursData === 'undefined') return [];
    return ids.map(id => toursData.find(t => Number(t.id) === Number(id))).filter(Boolean);
}
// Lista de actividades (chips con su X) y un selector para sumar otra. onChange(tours[]).
// opciones.onQuitar(tour) / onAgregar(tour): si vienen, se usan en lugar de onChange.
function construirCampoActividades(toursIniciales, onChange, { textoAgregar = 'Agregar actividad...', tituloQuitar = 'Quitar' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'campo-actividades';
    let lista = [...toursIniciales];
    const pintar = () => {
        wrap.innerHTML = '';
        if (lista.length) {
            const chips = document.createElement('div');
            chips.className = 'campo-actividades-lista';
            lista.forEach((tour, i) => {
                const chip = document.createElement('span');
                chip.className = 'campo-actividades-chip';
                chip.innerHTML = `<i class="fas fa-link"></i><span></span><button type="button" title="${escapeHtml(tituloQuitar)}" aria-label="${escapeHtml(tituloQuitar)}"><i class="fas fa-xmark"></i></button>`;
                chip.querySelector('span').textContent = tour.tour;
                chip.querySelector('button').addEventListener('click', () => {
                    lista.splice(i, 1);
                    pintar();
                    onChange([...lista], { quitado: tour });
                });
                chips.appendChild(chip);
            });
            wrap.appendChild(chips);
        }
        wrap.appendChild(buildClasificacionSelector(toursHelpers, textoAgregar, '', (nombre, item) => {
            const elegido = item || toursData.find(t => t.tour === nombre);
            if (!elegido || lista.some(t => t.tour === elegido.tour)) { pintar(); return; }
            lista.push(elegido);
            pintar();
            onChange([...lista], { agregado: elegido });
        }));
    };
    pintar();
    return wrap;
}
