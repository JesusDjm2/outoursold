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

// Los vínculos se editan en las dos monedas a la vez: el catálogo de la página es toursData;
// el de la otra moneda se pide a su API una vez (las categorías y destinos son compartidos).
const MONEDAS_ACTIVIDADES = ['usd', 'pen'];
const toursOtraMoneda = {};      // moneda -> lista de tours (ya cargada)
const toursOtraMonedaPedido = {}; // moneda -> promesa en curso
function toursDeMoneda(moneda) {
    if (moneda === monedaActividades() && typeof toursData !== 'undefined') return toursData;
    return toursOtraMoneda[moneda] || [];
}
async function asegurarToursMonedas() {
    await Promise.all(MONEDAS_ACTIVIDADES.filter(m => m !== monedaActividades() && !toursOtraMoneda[m]).map(m => {
        const base = typeof ITINERARIO_API_BASE !== 'undefined' ? ITINERARIO_API_BASE : '../itinerario/';
        toursOtraMonedaPedido[m] = toursOtraMonedaPedido[m] || fetch(`${base}../${m}/api.php?path=tours`)
            .then(r => r.ok ? r.json() : []).catch(() => [])
            .then(lista => { toursOtraMoneda[m] = Array.isArray(lista) ? lista : []; });
        return toursOtraMonedaPedido[m];
    }));
}
const helpersToursPorMoneda = {};
function helpersToursMoneda(moneda) {
    if (moneda === monedaActividades()) return toursHelpers;
    if (!helpersToursPorMoneda[moneda]) {
        helpersToursPorMoneda[moneda] = crearHelpersClasificacion(() => toursDeMoneda(moneda), () => categoriasData, 'tour', destinosActividadesHoteles);
    }
    return helpersToursPorMoneda[moneda];
}
function toursVinculadosDeModulo(modulo, moneda = monedaActividades()) {
    const ids = moneda && modulo ? (modulo[`tours_${moneda}`] || []) : [];
    if (!ids.length) return [];
    const catalogo = toursDeMoneda(moneda);
    return ids.map(id => catalogo.find(t => Number(t.id) === Number(id))).filter(Boolean);
}

// Lista de actividades (chips con su X), sugerencias de un clic y un selector para sumar otra.
// onChange(tours[], { agregado | quitado }). Opciones:
//  - moneda: catálogo del que se elige (por defecto, el de la página).
//  - sugerir(lista): [{ tour, motivo }] a proponer (las ya elegidas no se muestran).
//  - ocupadaEn(tour): título del otro itinerario que ya la tiene, o null. Si la tiene, se
//    pregunta antes de agregarla (al guardar pasa a este: cada actividad va con uno solo).
function construirCampoActividades(toursIniciales, onChange, { textoAgregar = 'Agregar actividad...', tituloQuitar = 'Quitar', moneda = monedaActividades(), sugerir = null, ocupadaEn = null } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'campo-actividades';
    let lista = [...toursIniciales];
    const agregar = async (elegido) => {
        if (!elegido || lista.some(t => t.tour === elegido.tour)) { pintar(); return; }
        const otro = ocupadaEn ? ocupadaEn(elegido) : null;
        if (otro && !await confirmAction(`«${elegido.tour}» ya está vinculada a «${otro}». ¿Pasarla a este itinerario? Al guardar, deja de estar en «${otro}» (cada actividad va con un solo itinerario).`, 'Sí, pasarla aquí')) { pintar(); return; }
        lista.push(elegido);
        pintar();
        onChange([...lista], { agregado: elegido });
    };
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
        const propuestas = sugerir ? sugerir(lista).filter(x => !lista.some(t => t.tour === x.tour.tour)) : [];
        if (propuestas.length) {
            const sug = document.createElement('div');
            sug.className = 'campo-actividades-sugeridas';
            sug.innerHTML = '<span class="campo-actividades-sug-titulo"><i class="fas fa-wand-magic-sparkles"></i>Sugeridas</span>';
            propuestas.forEach(({ tour, motivo }) => {
                const otro = ocupadaEn ? ocupadaEn(tour) : null;
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'campo-actividades-sug' + (otro ? ' is-ocupada' : '');
                b.title = `${motivo}${otro ? ` · Ya está en «${otro}»` : ''}. Clic para agregarla.`;
                b.innerHTML = '<i class="fas fa-plus"></i><span></span>' + (otro ? '<em>en otro</em>' : '');
                b.querySelector('span').textContent = tour.tour;
                b.addEventListener('click', () => agregar(tour));
                sug.appendChild(b);
            });
            wrap.appendChild(sug);
        }
        wrap.appendChild(buildClasificacionSelector(helpersToursMoneda(moneda), textoAgregar, '', (nombre, item) => {
            agregar(item || toursDeMoneda(moneda).find(t => t.tour === nombre));
        }));
    };
    pintar();
    return wrap;
}
