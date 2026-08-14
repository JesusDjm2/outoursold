// shared/cascade-select.js
// Selector en cascada Destino → Categoría → Ítem en un solo control desplegable
// (un árbol expandible dentro de un panel, en vez de 3 <select> separados).
// Compartido por el Cotizador (Tours/Hoteles/Paquetes de Tours) y el Generador de
// Itinerarios (módulos clasificados por Destino/Categoría).
//
// Contrato con la página que lo incluye: espera que existan las variables globales
// `destinosData`/`categoriasData` (arrays `{id, nombre}` / `{id, destino_id, nombre}`),
// que cada página ya carga por su cuenta desde el mismo catálogo compartido.

const SIN_DESTINO_VAL = '__sin_destino__';
const SIN_CATEGORIA_VAL = '__sin_categoria__';
const SIN_DESTINO_LABEL = 'Sin clasificar';
const SIN_CATEGORIA_LABEL = 'Sin categoría';

// `keys` puede ser un string simple (p.ej. 'tour') cuando el texto a mostrar y el valor a
// resolver son el mismo campo — equivale a {labelKey: 'tour', valueKey: 'tour'}. O un
// objeto {labelKey, valueKey} cuando son campos distintos (p.ej. título a mostrar, filename
// a resolver, como en los módulos de Itinerarios).
function normalizarClasificacionKeys(keys) {
    return typeof keys === 'string' ? { labelKey: keys, valueKey: keys } : keys;
}

// Helpers de cascada para un tipo de ítem clasificable (Tours, Hoteles, Módulos de
// Itinerario...): dado dónde viven sus ítems y su catálogo de categorías propio, arma las
// funciones que necesita el selector. Los catálogos mandan sobre las opciones — un destino
// o categoría recién creado debe aparecer aunque todavía no tenga ningún ítem asociado.
function crearHelpersClasificacion(getItems, getCategorias, keys) {
    const { labelKey, valueKey } = normalizarClasificacionKeys(keys);
    const destinoValDe = (item) => item.destino_id != null ? String(item.destino_id) : SIN_DESTINO_VAL;
    const categoriaValDe = (item) => item.categoria_id != null ? String(item.categoria_id) : SIN_CATEGORIA_VAL;
    const getDestinoOpciones = () => {
        const opciones = destinosData.map(d => ({ value: String(d.id), label: d.nombre }));
        if (getItems().some(item => item.destino_id == null)) opciones.push({ value: SIN_DESTINO_VAL, label: SIN_DESTINO_LABEL });
        return opciones.sort((a, b) => a.label.localeCompare(b.label));
    };
    const getCategoriaOpciones = (destinoVal) => {
        if (!destinoVal) return [];
        if (destinoVal === SIN_DESTINO_VAL) {
            return getItems().some(item => item.destino_id == null && item.categoria_id == null)
                ? [{ value: SIN_CATEGORIA_VAL, label: SIN_CATEGORIA_LABEL }] : [];
        }
        const destinoId = Number(destinoVal);
        const opciones = getCategorias()
            .filter(c => c.destino_id === destinoId)
            .map(c => ({ value: String(c.id), label: c.nombre }));
        if (getItems().some(item => item.destino_id === destinoId && item.categoria_id == null)) {
            opciones.push({ value: SIN_CATEGORIA_VAL, label: SIN_CATEGORIA_LABEL });
        }
        return opciones.sort((a, b) => a.label.localeCompare(b.label));
    };
    const getItemsFiltrados = (destinoVal, categoriaVal) => getItems()
        .filter(item => destinoValDe(item) === destinoVal && categoriaValDe(item) === categoriaVal)
        .sort((a, b) => a[labelKey].localeCompare(b[labelKey]));
    return { getItems, labelKey, valueKey, destinoValDe, categoriaValDe, getDestinoOpciones, getCategoriaOpciones, getItemsFiltrados };
}

// Único desplegable abierto a la vez (entre todas las filas de la tabla/formulario).
let cascadeSelectAbierto = null;
function cerrarCascadeSelectAbierto() {
    if (cascadeSelectAbierto) cascadeSelectAbierto();
}

// helpers: de crearHelpersClasificacion (ya trae labelKey/valueKey).
// initialValue: valor ya elegido (al cargar una cotización, aplicar un paquete, etc.).
// onResolved(valor, item): se llama cuando el usuario elige una hoja del árbol.
//
// Un solo control desplegable con Destino → Categoría → Ítem anidados y expandibles
// dentro del mismo panel (en vez de 3 selects separados), para que el catálogo se
// navegue como un árbol: se despliega un destino, dentro se despliega una categoría,
// y ahí aparecen los ítems para elegir.
function buildClasificacionSelector(helpers, itemPlaceholder, initialValue, onResolved) {
    const { labelKey, valueKey } = helpers;
    const wrap = document.createElement('div');
    wrap.className = 'cascade-select';
    wrap.innerHTML = `
        <button type="button" class="cascade-select-trigger">
            <span class="cascade-select-label"></span>
            <i class="fas fa-chevron-down cascade-select-caret"></i>
        </button>
    `;
    const trigger = wrap.querySelector('.cascade-select-trigger');
    const label = wrap.querySelector('.cascade-select-label');

    let currentValue = '';
    function setLabel(text) {
        label.textContent = text || itemPlaceholder;
        label.classList.toggle('is-placeholder', !text);
    }
    if (initialValue) {
        currentValue = initialValue;
        const match = helpers.getItems().find(item => item[valueKey] === initialValue);
        setLabel(match ? match[labelKey] : (initialValue + ' (fuera de catálogo)'));
    } else {
        setLabel('');
    }

    function elegir(item) {
        currentValue = item[valueKey];
        setLabel(item[labelKey]);
        onResolved(item[valueKey], item);
    }

    // Crea una fila del árbol. Si es hoja (leaf), es seleccionable; si no, expande/colapsa
    // sus hijos (y colapsa a sus hermanos, para que el árbol no crezca sin control).
    function crearNodo(texto, opts) {
        const node = document.createElement('div');
        node.className = opts.leaf ? 'cascade-leaf' : 'cascade-node';
        const row = document.createElement('div');
        row.className = 'cascade-node-row';
        row.innerHTML = opts.leaf
            ? `<span>${texto}</span>`
            : `<i class="fas fa-chevron-right cascade-caret"></i><span>${texto}</span>`;
        node.appendChild(row);
        if (opts.leaf) {
            row.addEventListener('click', opts.onSelect);
        } else {
            const children = document.createElement('div');
            children.className = 'cascade-children hidden';
            node.appendChild(children);
            row.addEventListener('click', () => {
                const parent = node.parentElement;
                const yaAbierto = node.classList.contains('is-open');
                [...parent.children].forEach(sib => {
                    sib.classList.remove('is-open');
                    sib.querySelector(':scope > .cascade-children')?.classList.add('hidden');
                });
                if (!yaAbierto) {
                    node.classList.add('is-open');
                    children.classList.remove('hidden');
                    opts.onOpen(children);
                }
            });
        }
        return node;
    }

    function llenarItems(children, destinoVal, categoriaVal) {
        const items = helpers.getItemsFiltrados(destinoVal, categoriaVal);
        children.innerHTML = items.length
            ? ''
            : `<div class="cascade-empty">Sin resultados.</div>`;
        items.forEach(item => {
            const leaf = crearNodo(item[labelKey], {
                leaf: true,
                onSelect: () => { elegir(item); cerrarCascadeSelectAbierto(); }
            });
            if (item[valueKey] === currentValue) leaf.classList.add('is-selected');
            children.appendChild(leaf);
        });
    }

    function llenarCategorias(children, destinoVal) {
        const opciones = helpers.getCategoriaOpciones(destinoVal);
        children.innerHTML = opciones.length
            ? ''
            : `<div class="cascade-empty">Sin categorías.</div>`;
        opciones.forEach(o => {
            children.appendChild(crearNodo(o.label, {
                onOpen: (itemChildren) => llenarItems(itemChildren, destinoVal, o.value)
            }));
        });
    }

    function construirPanel() {
        const panel = document.createElement('div');
        panel.className = 'cascade-select-panel';
        const destinos = helpers.getDestinoOpciones();
        if (destinos.length === 0) {
            panel.innerHTML = `<div class="cascade-empty">No hay destinos en el catálogo.</div>`;
            return panel;
        }
        destinos.forEach(d => {
            panel.appendChild(crearNodo(d.label, {
                onOpen: (children) => llenarCategorias(children, d.value)
            }));
        });
        return panel;
    }

    let panelEl = null;
    let outsideHandler = null;

    function posicionarPanel() {
        const rect = trigger.getBoundingClientRect();
        const width = Math.max(rect.width, 240);
        panelEl.style.width = width + 'px';
        panelEl.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
        const espacioAbajo = window.innerHeight - rect.bottom;
        const espacioArriba = rect.top;
        const abrirHaciaArriba = espacioAbajo < 200 && espacioArriba > espacioAbajo;
        panelEl.style.maxHeight = Math.max(160, (abrirHaciaArriba ? espacioArriba : espacioAbajo) - 16) + 'px';
        if (abrirHaciaArriba) {
            panelEl.style.top = '';
            panelEl.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            panelEl.style.bottom = '';
            panelEl.style.top = (rect.bottom + 4) + 'px';
        }
    }

    function cerrarPanel() {
        if (!panelEl) return;
        panelEl.remove();
        panelEl = null;
        trigger.classList.remove('is-open');
        document.removeEventListener('mousedown', outsideHandler, true);
        document.removeEventListener('keydown', onKeydown, true);
        window.removeEventListener('scroll', onWindowScroll, true);
        window.removeEventListener('resize', cerrarPanel);
        if (cascadeSelectAbierto === cerrarPanel) cascadeSelectAbierto = null;
    }
    function onKeydown(e) {
        if (e.key === 'Escape') cerrarPanel();
    }
    // Si el scroll ocurre dentro del propio panel (o al abrir una rama del árbol
    // que lo hace crecer) no hay que cerrarlo — solo cuando se mueve algo detrás,
    // que dejaría al panel apuntando a un lugar equivocado de la pantalla.
    function onWindowScroll(e) {
        if (panelEl && panelEl.contains(e.target)) return;
        cerrarPanel();
    }

    function abrirPanel() {
        cerrarCascadeSelectAbierto();
        panelEl = construirPanel();
        document.body.appendChild(panelEl);
        posicionarPanel();
        trigger.classList.add('is-open');
        outsideHandler = (e) => {
            if (!panelEl.contains(e.target) && !trigger.contains(e.target)) cerrarPanel();
        };
        document.addEventListener('mousedown', outsideHandler, true);
        document.addEventListener('keydown', onKeydown, true);
        window.addEventListener('scroll', onWindowScroll, true);
        window.addEventListener('resize', cerrarPanel);
        cascadeSelectAbierto = cerrarPanel;
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panelEl) cerrarPanel(); else abrirPanel();
    });

    return wrap;
}
