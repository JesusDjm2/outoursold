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
const toursHelpers = crearHelpersClasificacion(() => toursData, () => categoriasData, 'tour');
const hotelesHelpers = crearHelpersClasificacion(() => hotelsData, () => categoriasHotelesData, 'aloj');

function buildTourSelector(initialTourName, onResolved) {
    return buildClasificacionSelector(toursHelpers, 'Actividad...', initialTourName, onResolved);
}
function buildHotelSelector(initialHotelName, onResolved) {
    return buildClasificacionSelector(hotelesHelpers, 'Alojamiento...', initialHotelName, onResolved);
}
