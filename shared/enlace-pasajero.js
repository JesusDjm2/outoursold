// shared/enlace-pasajero.js
// Popup "Enlace para el pasajero": crea, copia, envía por WhatsApp o desactiva el enlace
// público del itinerario de una cotización (página viaje/?t=TOKEN, migración 046). Lo usan el
// Cotizador y el Historial. La página siempre muestra la versión guardada de la cotización.
//
// abrirEnlacePasajero({ id, apiBase, pasajero, contacto, codPais, idioma })
//   apiBase: la API de la moneda de la cotización ('api.php' desde usd/pen, o '../usd/api.php').

const EP_TEXTOS_WA = {
    es: (n, url) => `Hola${n ? ' ' + n : ''}, aquí tienes tu itinerario de viaje, con todos los detalles día a día: ${url}`,
    en: (n, url) => `Hi${n ? ' ' + n : ''}, here is your travel itinerary with all the day-by-day details: ${url}`,
    pt: (n, url) => `Olá${n ? ' ' + n : ''}, aqui está o seu roteiro de viagem, com todos os detalhes dia a dia: ${url}`
};

function epEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function epUrlPagina(token) {
    return new URL(`../viaje/?t=${token}`, location.href).href;
}
// Número del pasajero para wa.me (código de país + contacto), o '' si el contacto no es un teléfono.
function epTelefonoWa(contacto, codPais) {
    const tel = String(contacto || '').replace(/\D/g, '');
    if (tel.length < 7 || /@/.test(contacto || '')) return '';
    const cod = String(codPais || '').replace(/\D/g, '');
    return cod && !tel.startsWith(cod) && tel.length <= 10 ? cod + tel : tel;
}
function epHace(fechaSql) {
    if (!fechaSql) return '';
    const f = new Date(fechaSql.replace(' ', 'T'));
    const min = Math.round((Date.now() - f.getTime()) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
}

async function abrirEnlacePasajero({ id, apiBase, pasajero = '', contacto = '', codPais = '', idioma = 'es' }) {
    const api = async (path, cuerpo) => {
        const opciones = cuerpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) } : {};
        const url = `${apiBase}?path=${path}${cuerpo ? '' : `&id=${encodeURIComponent(id)}`}`;
        const r = await fetch(url, opciones);
        const datos = await r.json().catch(() => ({}));
        if (!r.ok || datos.error) throw new Error(datos.error || 'No se pudo completar la acción.');
        return datos;
    };
    let enlace = null;
    try {
        enlace = (await api('enlace-pasajero')).enlace;
    } catch (e) {
        notifyError('No se pudo consultar el enlace: ' + e.message);
        return;
    }
    const nombre = String(pasajero || '').trim().split(/\s+/)[0] || '';
    const telWa = epTelefonoWa(contacto, codPais);

    const pintar = (caja) => {
        if (!enlace) {
            caja.innerHTML = `
                <div class="ep-vacio">
                    <div class="ep-ilustra"><i class="fas fa-route"></i></div>
                    <p>Una página para <b>${epEsc(pasajero || 'el pasajero')}</b> con su itinerario día a día, fotos, hoteles y tu contacto. No necesita cuenta: se abre desde el celular con un enlace.</p>
                    <ul class="ep-ventajas">
                        <li><i class="fas fa-hourglass-half"></i>Cuenta regresiva y, durante el viaje, el día de hoy resaltado</li>
                        <li><i class="fas fa-calendar-plus"></i>Agregar el viaje a su calendario</li>
                        <li><i class="fab fa-whatsapp"></i>Escribirte por WhatsApp con un toque</li>
                        <li><i class="fas fa-rotate"></i>Siempre al día: muestra lo último que guardes</li>
                    </ul>
                    <label class="ep-check"><input type="checkbox" class="ep-precios" checked><span>Mostrar el precio total y la reserva</span></label>
                    <button type="button" class="ep-btn is-primario" data-ep="crear"><i class="fas fa-link"></i>Crear enlace</button>
                </div>`;
            return;
        }
        const url = epUrlPagina(enlace.token);
        const waTexto = (EP_TEXTOS_WA[idioma] || EP_TEXTOS_WA.es)(nombre, url);
        const waUrl = `https://wa.me/${telWa}?text=${encodeURIComponent(waTexto)}`;
        caja.innerHTML = `
            <div class="ep-enlace">
                <input type="text" class="ep-url" value="${epEsc(url)}" readonly aria-label="Enlace del pasajero">
                <button type="button" class="ep-btn" data-ep="copiar"><i class="fas fa-copy"></i>Copiar</button>
            </div>
            <div class="ep-acciones">
                <a class="ep-btn is-wa" href="${epEsc(waUrl)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i>${telWa ? 'Enviar al pasajero' : 'Enviar por WhatsApp'}</a>
                <a class="ep-btn" href="${epEsc(url)}&vista=agente" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i>Ver como el pasajero</a>
            </div>
            <div class="ep-info">
                <span><i class="fas fa-eye"></i>${enlace.vistas ? `Abierto ${enlace.vistas} ${enlace.vistas === 1 ? 'vez' : 'veces'} · ${epHace(enlace.ultima_vista)}` : 'Aún no lo abre'}</span>
                ${telWa ? '' : '<span class="ep-tenue"><i class="fas fa-circle-info"></i>Sin teléfono del pasajero: WhatsApp te pedirá elegir el chat.</span>'}
            </div>
            <label class="ep-check"><input type="checkbox" class="ep-precios" ${enlace.mostrar_precios ? 'checked' : ''}><span>Mostrar el precio total y la reserva</span></label>
            <div class="ep-pie">
                <button type="button" class="ep-btn is-peligro" data-ep="revocar"><i class="fas fa-link-slash"></i>Desactivar enlace</button>
            </div>`;
    };

    await Swal.fire({
        title: 'Enlace para el pasajero',
        html: '<div id="ep-caja" class="ep-caja"></div>',
        width: 560,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: { popup: 'ep-popup' },
        didOpen: () => {
            const caja = document.getElementById('ep-caja');
            pintar(caja);
            caja.addEventListener('change', async (ev) => {
                if (!ev.target.classList.contains('ep-precios') || !enlace) return;
                try {
                    enlace = (await api('crear-enlace-pasajero', { id, mostrar_precios: ev.target.checked })).enlace;
                    epAviso(ev.target.checked ? 'El enlace muestra el precio' : 'El enlace ya no muestra el precio');
                } catch (e) { notifyError(e.message); }
            });
            caja.addEventListener('click', async (ev) => {
                const accion = ev.target.closest('[data-ep]')?.dataset.ep;
                if (accion === 'crear') {
                    const b = ev.target.closest('button');
                    b.disabled = true;
                    try {
                        enlace = (await api('crear-enlace-pasajero', { id, mostrar_precios: caja.querySelector('.ep-precios').checked })).enlace;
                        pintar(caja);
                        await epCopiar(epUrlPagina(enlace.token), caja.querySelector('.ep-url'));
                    } catch (e) { notifyError(e.message); b.disabled = false; }
                }
                if (accion === 'copiar') epCopiar(epUrlPagina(enlace.token), caja.querySelector('.ep-url'));
                if (accion === 'revocar') {
                    const seguro = await Swal.fire({
                        icon: 'warning', title: '¿Desactivar el enlace?',
                        text: 'Dejará de abrir para quien lo tenga. Si después creas otro, será un enlace distinto.',
                        showCancelButton: true, confirmButtonText: 'Sí, desactivar', cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#dc2626', cancelButtonColor: '#94a3b8'
                    });
                    if (!seguro.isConfirmed) return abrirEnlacePasajero({ id, apiBase, pasajero, contacto, codPais, idioma });
                    try {
                        await api('revocar-enlace-pasajero', { id });
                        epAviso('Enlace desactivado');
                    } catch (e) { notifyError(e.message); }
                }
            });
        }
    });
}
async function epCopiar(texto, input) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (e) {
        input?.select();
        document.execCommand && document.execCommand('copy');
    }
    epAviso('Enlace copiado');
}
function epAviso(texto) {
    let el = document.getElementById('ep-aviso');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ep-aviso';
        el.className = 'ep-aviso';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.add('is-visible');
    clearTimeout(epAviso.t);
    epAviso.t = setTimeout(() => el.classList.remove('is-visible'), 2000);
}

// Estilos del popup (van acá para que funcione en cualquier página que cargue este archivo).
(function () {
    const css = `
        .ep-popup { border-radius: 18px !important; padding-bottom: 18px !important; }
        .ep-caja { text-align: left; font-size: .9rem; color: #334155; }
        .ep-vacio p { margin: 0 0 12px; line-height: 1.5; }
        .ep-ilustra { width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 18px; display: grid; place-items: center;
            background: color-mix(in srgb, var(--accent-1, #e80c13) 12%, white); color: var(--accent-1, #e80c13); font-size: 1.4rem; }
        .ep-ventajas { margin: 0 0 14px; padding: 12px 14px; list-style: none; display: grid; gap: 7px; border-radius: 12px; background: #f8fafc; font-size: .82rem; }
        .ep-ventajas i { width: 18px; text-align: center; margin-right: 6px; color: var(--accent-1, #e80c13); }
        .ep-check { display: flex; align-items: center; gap: 8px; margin: 12px 0; font-size: .84rem; cursor: pointer; }
        .ep-check input { width: 16px; height: 16px; accent-color: var(--accent-1, #e80c13); }
        .ep-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 14px; border-radius: 10px;
            border: 1px solid #e2e8f0; background: #fff; color: #1e293b; font-size: .82rem; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; }
        .ep-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .ep-btn:disabled { opacity: .6; cursor: wait; }
        .ep-btn i { font-size: .8rem; }
        .ep-btn.is-primario { width: 100%; height: 44px; border-color: var(--accent-1, #e80c13); background: var(--accent-1, #e80c13); color: #fff; }
        .ep-btn.is-wa { border-color: #1faa59; background: #1faa59; color: #fff; }
        .ep-btn.is-wa:hover { background: #18914b; }
        .ep-btn.is-peligro { border-color: transparent; color: #dc2626; }
        .ep-btn.is-peligro:hover { background: #fef2f2; }
        .ep-enlace { display: flex; gap: 6px; }
        .ep-url { flex: 1; min-width: 0; height: 38px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; font-size: .8rem; color: #0f172a; }
        .ep-acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
        .ep-info { display: grid; gap: 4px; margin-top: 12px; font-size: .8rem; color: #475569; }
        .ep-info i { width: 16px; margin-right: 4px; color: #94a3b8; }
        .ep-tenue { color: #94a3b8; }
        .ep-pie { display: flex; justify-content: flex-start; padding-top: 10px; border-top: 1px solid #f1f5f9; }
        .ep-aviso { position: fixed; left: 50%; bottom: 28px; z-index: 99999; transform: translate(-50%, 16px); opacity: 0; padding: 9px 16px; border-radius: 10px;
            background: #0f172a; color: #fff; font-size: .84rem; transition: all .2s; pointer-events: none; }
        .ep-aviso.is-visible { opacity: 1; transform: translate(-50%, 0); }
        @media (max-width: 520px) { .ep-acciones { grid-template-columns: 1fr; } }`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();
