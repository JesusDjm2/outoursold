// itinerario/itinerario-paginas.js
// Páginas del PDF del itinerario que arma el sistema con la marca de cada agencia (migración
// 043), como alternativa a los PDF subidos: Portada, una página por día, días libres,
// Términos y condiciones y Cierre / contacto. Las usa handleGenerateItinerary (itinerario.js)
// según el modo de cada sección (modosPaginasPdf): el de la agencia (Gestión de Datos ›
// Itinerarios › Páginas fijas) o el elegido para esa cotización.
//
// Mismo lenguaje que las páginas de resumen (agregarPaginasResumenPdf): color principal de la
// agencia como protagonista, secundario como acento, logo en tarjeta blanca y el mismo pie.
// Todo se mide en puntos de un ancho de 595 (s = escala) y se acomoda al alto de la página,
// que es el de los PDF subidos (si los hay) para que todo el documento tenga el mismo tamaño.

const TAMANO_PAGINA_GENERADA = [595.2756, 1060.1575]; // el formato de los PDF de itinerario actuales

const TEXTOS_PAGINAS_PDF = {
    es: {
        vistazo: 'Tu viaje de un vistazo', siguiente: 'Siguiente', mas: n => `y ${n} más`,
        itinerario: 'Itinerario de viaje', preparado: 'Preparado para', fechas: 'Fechas', duracion: 'Duración',
        viajeros: 'Viajeros', ruta: 'Destinos', dia: 'Día', dias: 'días', noches: 'noches', noche: 'noche', unDia: 'día',
        pasajero: 'pasajero', pasajeros: 'pasajeros', lugares: 'Lugares a visitar', incluye: 'Incluye', noIncluye: 'No incluye',
        continua: 'continuación', libre: 'Día libre', libres: 'Días libres', libreAntes: 'libre',
        libreDetalle: 'Tiempo para descansar o explorar a tu ritmo. Consúltanos si quieres sumar alguna actividad.',
        terminosSup: 'Condiciones del servicio', terminos: 'Términos y condiciones',
        gracias: 'Gracias por elegirnos', buenViaje: 'Buen viaje',
        cierreTexto: 'Estamos contigo antes y durante todo tu viaje. Escríbenos ante cualquier duda: será un gusto ayudarte.',
        telefono: 'Teléfono', whatsapp: 'WhatsApp', direccion: 'Dirección', ruc: 'RUC'
    },
    en: {
        vistazo: 'Your trip at a glance', siguiente: 'Next', mas: n => `and ${n} more`,
        itinerario: 'Travel itinerary', preparado: 'Prepared for', fechas: 'Dates', duracion: 'Duration',
        viajeros: 'Travelers', ruta: 'Destinations', dia: 'Day', dias: 'days', noches: 'nights', noche: 'night', unDia: 'day',
        pasajero: 'traveler', pasajeros: 'travelers', lugares: 'Places to visit', incluye: 'Included', noIncluye: 'Not included',
        continua: 'continued', libre: 'Free day', libres: 'Free days', libreAntes: 'free',
        libreDetalle: 'Time to rest or explore at your own pace. Ask us if you would like to add an activity.',
        terminosSup: 'Service conditions', terminos: 'Terms and conditions',
        gracias: 'Thank you for choosing us', buenViaje: 'Have a great trip',
        cierreTexto: 'We are with you before and throughout your trip. Write to us with any question: we will be happy to help.',
        telefono: 'Phone', whatsapp: 'WhatsApp', direccion: 'Address', ruc: 'Tax ID'
    },
    pt: {
        vistazo: 'Sua viagem em resumo', siguiente: 'Próximo', mas: n => `e mais ${n}`,
        itinerario: 'Roteiro de viagem', preparado: 'Preparado para', fechas: 'Datas', duracion: 'Duração',
        viajeros: 'Viajantes', ruta: 'Destinos', dia: 'Dia', dias: 'dias', noches: 'noites', noche: 'noite', unDia: 'dia',
        pasajero: 'viajante', pasajeros: 'viajantes', lugares: 'Lugares a visitar', incluye: 'Inclui', noIncluye: 'Não inclui',
        continua: 'continuação', libre: 'Dia livre', libres: 'Dias livres', libreAntes: 'livre',
        libreDetalle: 'Tempo para descansar ou explorar no seu ritmo. Fale conosco se quiser incluir alguma atividade.',
        terminosSup: 'Condições do serviço', terminos: 'Termos e condições',
        gracias: 'Obrigado por nos escolher', buenViaje: 'Boa viagem',
        cierreTexto: 'Estamos com você antes e durante toda a sua viagem. Escreva-nos com qualquer dúvida: será um prazer ajudar.',
        telefono: 'Telefone', whatsapp: 'WhatsApp', direccion: 'Endereço', ruc: 'CNPJ / RUC'
    }
};

// ===== Imágenes =====
// La imagen recortada a la proporción del espacio (como object-fit: cover) y pasada a JPG en
// un canvas: pdf-lib solo incrusta JPG/PNG (las de los itinerarios pueden ser WebP).
const cacheImagenesPdf = new Map();
async function imagenCubrirPdf(pdfDoc, url, anchoPt, altoPt, focoY = 0.5) {
    if (!url) return null;
    const clave = `${url}|${Math.round(anchoPt)}x${Math.round(altoPt)}|${focoY}`;
    if (cacheImagenesPdf.has(clave)) return cacheImagenesPdf.get(clave);
    let resultado = null;
    try {
        const res = await fetch(url);
        if (res.ok) {
            const blobUrl = URL.createObjectURL(await res.blob());
            try {
                const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = blobUrl; });
                const pxPorPt = Math.min(2.4, 1700 / anchoPt);
                const cw = Math.round(anchoPt * pxPorPt), ch = Math.round(altoPt * pxPorPt);
                const canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                const k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
                const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
                canvas.getContext('2d').drawImage(img, (cw - dw) / 2, (ch - dh) * focoY, dw, dh);
                const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', 0.86));
                if (blob) resultado = await pdfDoc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
        }
    } catch (e) {
        console.warn('No se pudo usar la imagen en el PDF:', url, e);
    }
    cacheImagenesPdf.set(clave, resultado);
    return resultado;
}

// ===== Kit de marca: colores, fuentes, logo y piezas comunes =====
async function crearMarcaPdf(pdfDoc, { agencia, logoPng, fuenteTitulo, fuenteScript, idioma, tamano }) {
    const { rgb, StandardFonts, LineCapStyle } = PDFLib;
    const [helv, helvB, helvI] = await Promise.all([
        pdfDoc.embedFont(StandardFonts.Helvetica), pdfDoc.embedFont(StandardFonts.HelveticaBold), pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    ]);
    let logo = null;
    if (logoPng) {
        try { logo = await pdfDoc.embedPng(logoPng); } catch (e) { console.warn('Logo no incrustable en el PDF.', e); }
    }
    const BLANCO = [1, 1, 1], NEGRO = [0, 0, 0];
    const TINTA = [0.11, 0.13, 0.19], GRIS = [0.42, 0.45, 0.52], LINEA = [0.89, 0.9, 0.93];
    const prim = colorHexPdf(agencia?.color_principal, 'ff5432');
    const sec = colorHexPdf(agencia?.color_secundario, '0566cf');
    const legible = col => luminanciaPdf(col) > 0.6 ? mezclarColorPdf(col, NEGRO, 0.45) : col;
    const sobre = col => luminanciaPdf(col) > 0.62 ? TINTA : BLANCO;
    const c = arr => rgb(arr[0], arr[1], arr[2]);
    const [W, H] = tamano;
    const s = W / 595;
    const t = TEXTOS_PAGINAS_PDF[idioma] || TEXTOS_PAGINAS_PDF.es;
    const nombreAgencia = textoPdfSeguro(agencia?.nombre || '');
    const contactos = [agencia?.telefono2 || agencia?.telefono, agencia?.whatsapp && `WhatsApp ${agencia.whatsapp}`]
        .filter(v => v && String(v).replace(/\D/g, '').length >= 6).map(textoPdfSeguro).join('   ·   ');

    // Degradado negro con transparencia (suave, sin franjas): de opaco abajo a transparente arriba.
    const pngDegradado = async (invertido) => {
        const cv = document.createElement('canvas');
        cv.width = 4; cv.height = 512;
        const ctx = cv.getContext('2d');
        for (let y = 0; y < 512; y++) {
            const t = invertido ? y / 511 : 1 - y / 511; // 1 = opaco
            const a = t * t * (3 - 2 * t);               // smoothstep
            ctx.fillStyle = `rgba(0,0,0,${a.toFixed(4)})`;
            ctx.fillRect(0, y, 4, 1);
        }
        const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
        return pdfDoc.embedPng(new Uint8Array(await blob.arrayBuffer()));
    };
    const [degradadoAbajo, degradadoArriba] = await Promise.all([pngDegradado(true), pngDegradado(false)]);

    const k = {
        pdfDoc, W, H, s, M: 46 * s, t, idioma, agencia, c, rgb, LineCapStyle,
        BLANCO, NEGRO, TINTA, GRIS, LINEA, prim, sec,
        primTexto: legible(prim), secTexto: legible(sec), sobrePrim: sobre(prim), sobreSec: sobre(sec),
        mezclar: mezclarColorPdf, sobre,
        helv, helvB, helvI, titulo: fuenteTitulo, script: fuenteScript || fuenteTitulo, logo, nombreAgencia, contactos,
        // Pie común a todas las páginas generadas (igual al de las páginas de resumen).
        Y_PIE: 64 * s
    };

    k.texto = (page, texto, x, y, font, size, color, opacity = 1) => page.drawText(texto, { x, y, size, font, color: c(color), opacity });
    k.espaciado = (page, texto, x, y, font, size, esp, color, opacity = 1) => {
        for (const ch of texto) {
            page.drawText(ch, { x, y, size, font, color: c(color), opacity });
            x += font.widthOfTextAtSize(ch, size) + esp;
        }
        return x;
    };
    k.anchoEspaciado = (texto, font, size, esp) => Array.from(texto).reduce((a, ch) => a + font.widthOfTextAtSize(ch, size) + esp, 0);
    // Tamaño de letra que hace entrar `texto` en `ancho` (entre max y min).
    k.ajustar = (texto, font, max, min, ancho) => {
        let tam = max;
        while (tam > min && font.widthOfTextAtSize(texto, tam) > ancho) tam -= 0.5;
        return tam;
    };
    // Velo negro degradado: oscuro abajo (opAbajo) o arriba (opArriba); el otro extremo, transparente.
    k.degradado = (page, x, y, w, h, _color, opAbajo, opArriba) => {
        if (opAbajo > 0) page.drawImage(degradadoAbajo, { x, y, width: w, height: h, opacity: opAbajo });
        if (opArriba > 0) page.drawImage(degradadoArriba, { x, y, width: w, height: h, opacity: opArriba });
    };
    // Fondo de marca cuando no hay foto: principal con círculos del secundario y blancos.
    k.fondoMarca = (page, x, y, w, h) => {
        page.drawRectangle({ x, y, width: w, height: h, color: c(prim) });
        page.drawCircle({ x: x + w * 0.92, y: y + h * 0.95, size: Math.max(w, h) * 0.42, color: c(mezclarColorPdf(prim, BLANCO, 0.1)) });
        page.drawCircle({ x: x + w * 0.04, y: y + h * 0.55, size: Math.min(w, h) * 0.32, color: c(mezclarColorPdf(prim, NEGRO, 0.12)) });
        page.drawCircle({ x: x + w * 0.83, y: y + h * 0.62, size: 7 * s, color: c(sec) });
        [0.3, 0.42, 0.54].forEach((r, i) => page.drawCircle({
            x: x + w * 0.22, y: y + h * 0.78, size: Math.min(w, h) * r, borderColor: c(BLANCO), borderWidth: 0.8 * s, borderOpacity: 0.1 - i * 0.025
        }));
    };
    // Tarjeta blanca con el logo (o el nombre de la agencia si no tiene logo). (x, yTop) = esquina superior izquierda.
    k.tarjetaLogo = (page, x, yTop, w, h, { sombra = true } = {}) => {
        if (!logo && !nombreAgencia) return;
        if (sombra) rectRedondeadoPdf(page, x, yTop - 3 * s, w, h, 12 * s, { color: c(NEGRO), opacity: 0.12 });
        rectRedondeadoPdf(page, x, yTop, w, h, 12 * s, { color: c(BLANCO) });
        if (logo) {
            const pad = Math.min(14 * s, h * 0.16);
            const f = Math.min((w - 2 * pad) / logo.width, (h - 2 * pad) / logo.height);
            const lw = logo.width * f, lh = logo.height * f;
            page.drawImage(logo, { x: x + (w - lw) / 2, y: yTop - h + (h - lh) / 2, width: lw, height: lh });
        } else {
            const lineas = envolverTextoPdf(nombreAgencia, helvB, 10.5 * s, w - 20 * s).slice(0, 3);
            const alto = lineas.length * 13 * s;
            lineas.forEach((l, i) => page.drawText(l, {
                x: x + (w - helvB.widthOfTextAtSize(l, 10.5 * s)) / 2,
                y: yTop - (h - alto) / 2 - 10.5 * s - i * 13 * s, size: 10.5 * s, font: helvB, color: c(k.primTexto)
            }));
        }
    };
    // Pie: filete, nombre de la agencia y contactos; a la derecha, la etiqueta de la página.
    k.pie = (page, { claro = false } = {}) => {
        const colLinea = claro ? BLANCO : LINEA, opLinea = claro ? 0.25 : 1;
        page.drawLine({ start: { x: k.M, y: 46 * s }, end: { x: W - k.M, y: 46 * s }, thickness: 0.7 * s, color: c(colLinea), opacity: opLinea });
        if (nombreAgencia) k.texto(page, recortarTextoPdf(nombreAgencia, helvB, 8.5 * s, (W - 2 * k.M) / 2), k.M, 30 * s, helvB, 8.5 * s, claro ? BLANCO : k.primTexto);
        if (contactos) k.texto(page, contactos, W - k.M - helv.widthOfTextAtSize(contactos, 8 * s), 30 * s, helv, 8 * s, claro ? BLANCO : GRIS, claro ? 0.85 : 1);
    };
    // Marcas de lista: punto, check y equis (vectoriales, sin depender de fuentes).
    k.marca = (page, tipo, x, y, r, color) => {
        if (tipo === 'punto') { page.drawCircle({ x, y, size: r * 0.42, color: c(color) }); return; }
        const o = { x, y, borderColor: c(color), borderWidth: r * 0.26, borderLineCap: LineCapStyle.Round };
        if (tipo === 'check') page.drawSvgPath(`M ${-0.42 * r} ${0.02 * r} L ${-0.12 * r} ${0.34 * r} L ${0.44 * r} ${-0.3 * r}`, o);
        else page.drawSvgPath(`M ${-0.3 * r} ${-0.3 * r} L ${0.3 * r} ${0.3 * r} M ${0.3 * r} ${-0.3 * r} L ${-0.3 * r} ${0.3 * r}`, o);
    };
    return k;
}

// Párrafos de un texto largo (una línea en blanco o un salto separan párrafos).
function parrafosPdf(texto) {
    return String(texto || '').split(/\r?\n/).map(p => textoPdfSeguro(p)).filter(Boolean);
}
function fechaLargaPdf(fechaISO, idioma, conAnio) {
    const loc = (TEXTOS_DIAS_LIBRES[idioma] || TEXTOS_DIAS_LIBRES.es).locale;
    const opciones = { day: 'numeric', month: 'short', timeZone: 'UTC', ...(conAnio ? { year: 'numeric' } : {}) };
    return new Date(fechaISO + 'T00:00:00Z').toLocaleDateString(loc, opciones).replace(/\./g, '').replace(/\bde\b/g, '').replace(/\s+/g, ' ').trim();
}

// ===== Portada =====
// Foto a sangre en los dos tercios de arriba (la del primer día, si no la de la agencia, si
// no un fondo de marca), con el logo, "Preparado para" y el nombre del pasajero en script.
// Abajo, en blanco: nombre del viaje, fechas / duración / viajeros y la ruta de destinos.
async function generarPortadaPdf(k, datos) {
    const { W, H, s, M, t, c } = k;
    const page = k.pdfDoc.addPage([W, H]);
    const FOTO_H = Math.round(H * 0.58);
    const FOTO_Y = H - FOTO_H;
    const imagen = await imagenCubrirPdf(k.pdfDoc, datos.imagenUrl, W, FOTO_H, 0.45);
    if (imagen) {
        page.drawImage(imagen, { x: 0, y: FOTO_Y, width: W, height: FOTO_H });
        k.degradado(page, 0, FOTO_Y, W, FOTO_H * 0.55, k.NEGRO, 0.72, 0);
        k.degradado(page, 0, H - FOTO_H * 0.22, W, FOTO_H * 0.22, k.NEGRO, 0, 0.38);
    } else {
        k.fondoMarca(page, 0, FOTO_Y, W, FOTO_H);
        k.degradado(page, 0, FOTO_Y, W, FOTO_H * 0.5, k.NEGRO, 0.28, 0);
    }

    // Logo arriba a la izquierda; arriba a la derecha, "ITINERARIO DE VIAJE".
    k.tarjetaLogo(page, M, H - M + 6 * s, 136 * s, 80 * s);
    const sup = t.itinerario.toUpperCase();
    const anchoSup = k.anchoEspaciado(sup, k.helvB, 8.5 * s, 2 * s);
    k.espaciado(page, sup, W - M - anchoSup, H - M - 26 * s, k.helvB, 8.5 * s, 2 * s, k.BLANCO, 0.92);
    page.drawRectangle({ x: W - M - 26 * s, y: H - M - 38 * s, width: 26 * s, height: 2 * s, color: c(k.sec) });

    // Sobre la foto, abajo: "Preparado para" + pasajero (script) + filete secundario.
    const yBase = FOTO_Y + 44 * s;
    const nombre = textoPdfSeguro(datos.pasajero);
    const tamNombre = k.ajustar(nombre, k.script, 58 * s, 26 * s, W - 2 * M);
    page.drawRectangle({ x: M, y: yBase, width: 44 * s, height: 3 * s, color: c(k.sec) });
    k.texto(page, nombre, M, yBase + 22 * s, k.script, tamNombre, k.BLANCO);
    k.espaciado(page, t.preparado.toUpperCase(), M, yBase + 30 * s + tamNombre, k.helvB, 9 * s, 1.8 * s, k.BLANCO, 0.85);

    // Panel inferior: franja de marca, nombre del viaje y datos.
    page.drawRectangle({ x: 0, y: FOTO_Y - 5 * s, width: W, height: 5 * s, color: c(k.prim) });
    page.drawRectangle({ x: 0, y: FOTO_Y - 5 * s, width: W * 0.28, height: 5 * s, color: c(k.sec) });
    let y = FOTO_Y - 5 * s - 52 * s;
    const titulo = textoPdfSeguro(datos.titulo);
    const tamTitulo = k.ajustar(titulo, k.titulo, 30 * s, 20 * s, W - 2 * M);
    const lineasTitulo = envolverTextoPdf(titulo, k.titulo, tamTitulo, W - 2 * M).slice(0, 2);
    lineasTitulo.forEach((l, i) => k.texto(page, l, M, y - i * tamTitulo * 1.15, k.titulo, tamTitulo, k.TINTA));
    y -= (lineasTitulo.length - 1) * tamTitulo * 1.15 + 42 * s;

    // Datos en columnas con separadores: Fechas · Duración · Viajeros.
    const stats = [];
    if (datos.fInicio) {
        const anioIgual = datos.fFin && datos.fFin.slice(0, 4) === datos.fInicio.slice(0, 4);
        const desde = fechaLargaPdf(datos.fInicio, k.idioma, !anioIgual);
        const hasta = datos.fFin && datos.fFin !== datos.fInicio ? fechaLargaPdf(datos.fFin, k.idioma, true) : '';
        stats.push([t.fechas, hasta ? `${desde} - ${hasta}` : desde]);
    }
    if (datos.nDias) {
        const noches = Math.max(0, datos.nDias - 1);
        stats.push([t.duracion, `${datos.nDias} ${datos.nDias === 1 ? t.unDia : t.dias}${noches ? ` / ${noches} ${noches === 1 ? t.noche : t.noches}` : ''}`]);
    }
    if (datos.nPax) stats.push([t.viajeros, `${datos.nPax} ${datos.nPax === 1 ? t.pasajero : t.pasajeros}`]);
    if (stats.length) {
        const colW = (W - 2 * M) / stats.length;
        stats.forEach(([etq, valor], i) => {
            const x = M + i * colW + (i ? 16 * s : 0);
            if (i) page.drawLine({ start: { x: M + i * colW, y: y + 12 * s }, end: { x: M + i * colW, y: y - 30 * s }, thickness: 0.8 * s, color: c(k.LINEA) });
            k.espaciado(page, textoPdfSeguro(etq.toUpperCase()), x, y, k.helvB, 7.5 * s, 1.4 * s, k.secTexto);
            const v = textoPdfSeguro(valor);
            k.texto(page, v, x, y - 22 * s, k.helvB, k.ajustar(v, k.helvB, 13 * s, 8.5 * s, colW - (i ? 22 : 8) * s), k.TINTA);
        });
        y -= 66 * s;
    }

    // Ruta: destinos del viaje en orden, unidos por una línea con nodos.
    const destinos = (datos.destinos || []).map(textoPdfSeguro).filter(Boolean);
    if (destinos.length && y > k.Y_PIE + 60 * s) {
        k.espaciado(page, t.ruta.toUpperCase(), M, y, k.helvB, 7.5 * s, 1.4 * s, k.secTexto);
        y -= 26 * s;
        const F = 10 * s, PAD = 11 * s, H_CHIP = 22 * s, GAP = 18 * s;
        let x = M, fila = 0;
        destinos.forEach((d, i) => {
            const texto = recortarTextoPdf(d, k.helvB, F, W - 2 * M - 2 * PAD);
            const w = k.helvB.widthOfTextAtSize(texto, F) + 2 * PAD;
            if (x > M && x + w > W - M) { x = M; fila++; y -= H_CHIP + 10 * s; }
            if (fila > 1) return;
            if (i && x > M) page.drawLine({ start: { x: x - GAP + 3 * s, y: y - H_CHIP / 2 }, end: { x: x - 3 * s, y: y - H_CHIP / 2 }, thickness: 1.2 * s, color: c(k.mezclar(k.prim, k.BLANCO, 0.4)), dashArray: [2 * s, 2.5 * s] });
            rectRedondeadoPdf(page, x, y, w, H_CHIP, H_CHIP / 2, { color: c(i === 0 ? k.prim : k.mezclar(k.prim, k.BLANCO, 0.88)) });
            k.texto(page, texto, x + PAD, y - H_CHIP / 2 - F * 0.35, k.helvB, F, i === 0 ? k.sobrePrim : k.TINTA);
            x += w + GAP;
        });
        y -= H_CHIP + 30 * s;
    }

    // De un vistazo: cada día con su(s) itinerario(s), en una o dos columnas según cuántos haya.
    const agenda = datos.agenda || [];
    const LH_AG = 21 * s;
    const filasDisp = Math.floor((y - 22 * s - (k.Y_PIE + 14 * s)) / LH_AG);
    if (agenda.length && filasDisp >= 2) {
        page.drawLine({ start: { x: M, y: y + 10 * s }, end: { x: W - M, y: y + 10 * s }, thickness: 0.7 * s, color: c(k.LINEA) });
        k.espaciado(page, textoPdfSeguro(t.vistazo.toUpperCase()), M, y - 8 * s, k.helvB, 7.5 * s, 1.4 * s, k.secTexto);
        y -= 30 * s;
        const columnas = agenda.length > filasDisp || agenda.length > 6 ? 2 : 1;
        const capacidad = filasDisp * columnas;
        const sobran = agenda.length > capacidad;
        const visibles = sobran ? agenda.slice(0, capacidad - 1) : agenda;
        const porCol = Math.ceil((visibles.length + (sobran ? 1 : 0)) / columnas);
        const colW = (W - 2 * M - (columnas - 1) * 24 * s) / columnas;
        const posicion = i => ({ x: M + Math.floor(i / porCol) * (colW + 24 * s), yy: y - (i % porCol) * LH_AG });
        visibles.forEach((it, i) => {
            const { x, yy } = posicion(i);
            const num = it.libre ? '-' : String(it.dia).padStart(2, '0');
            rectRedondeadoPdf(page, x, yy + 4 * s, 26 * s, 16 * s, 5 * s, { color: c(it.libre ? k.mezclar(k.prim, k.BLANCO, 0.9) : k.prim) });
            k.texto(page, num, x + (26 * s - k.helvB.widthOfTextAtSize(num, 8.5 * s)) / 2, yy - 7.5 * s, k.helvB, 8.5 * s, it.libre ? k.primTexto : k.sobrePrim);
            const fuente = it.libre ? k.helvI : k.helv;
            const txt = recortarTextoPdf(textoPdfSeguro(it.titulo), fuente, 9.8 * s, colW - 36 * s);
            k.texto(page, txt, x + 36 * s, yy - 7.5 * s, fuente, 9.8 * s, it.libre ? k.GRIS : k.TINTA);
        });
        if (sobran) {
            const { x, yy } = posicion(visibles.length);
            k.texto(page, textoPdfSeguro(t.mas(agenda.length - visibles.length)), x + 36 * s, yy - 7.5 * s, k.helvI, 9.8 * s, k.GRIS);
        }
    }
    k.pie(page);
}

// ===== Página de un día =====
// Foto arriba con el "DÍA N" en una tarjeta de marca, la fecha y el título. Debajo, el texto
// del día a la izquierda y, a la derecha, una tarjeta con lugares, incluye y no incluye. Si
// no entra, sigue en otra página con una cabecera compacta.
async function generarPaginaDiaPdf(k, { modulo, dia, fecha, ruta, imagenUrl, libreAntes, siguiente }) {
    const { W, H, s, M, t, c } = k;
    const FOTO_H = Math.round(H * 0.44);
    const FOTO_Y = H - FOTO_H;
    const titulo = textoPdfSeguro(modulo?.titulo || '');
    const descripcion = parrafosPdf(modulo?.descripcion);
    const secciones = [
        { titulo: t.lugares, items: listaResumenPdf(modulo?.lugares_visitar), marca: 'punto', color: k.prim },
        { titulo: t.incluye, items: listaResumenPdf(modulo?.incluye), marca: 'check', color: k.prim },
        { titulo: t.noIncluye, items: listaResumenPdf(modulo?.no_incluye), marca: 'x', color: k.sec }
    ].filter(x => x.items.length);

    const paginas = [];
    const nuevaPagina = async () => {
        const page = k.pdfDoc.addPage([W, H]);
        paginas.push(page);
        if (paginas.length === 1) {
            const imagen = await imagenCubrirPdf(k.pdfDoc, imagenUrl, W, FOTO_H, 0.5);
            if (imagen) {
                page.drawImage(imagen, { x: 0, y: FOTO_Y, width: W, height: FOTO_H });
                k.degradado(page, 0, FOTO_Y, W, FOTO_H * 0.68, k.NEGRO, 0.78, 0);
                k.degradado(page, 0, H - 90 * s, W, 90 * s, k.NEGRO, 0, 0.3);
            } else {
                k.fondoMarca(page, 0, FOTO_Y, W, FOTO_H);
                k.degradado(page, 0, FOTO_Y, W, FOTO_H * 0.6, k.NEGRO, 0.35, 0);
            }
            page.drawRectangle({ x: 0, y: FOTO_Y - 4 * s, width: W, height: 4 * s, color: c(k.prim) });
            k.tarjetaLogo(page, W - M - 92 * s, H - 26 * s, 92 * s, 54 * s);
            // Día libre justo antes: una píldora arriba a la izquierda.
            if (libreAntes) {
                const txt = textoPdfSeguro(`${t.dia} ${libreAntes.desde}${libreAntes.hasta !== libreAntes.desde ? `-${libreAntes.hasta}` : ''} · ${t.libreAntes}`.toUpperCase());
                const w = k.anchoEspaciado(txt, k.helvB, 7.5 * s, 1.2 * s) + 22 * s;
                rectRedondeadoPdf(page, M, H - 30 * s, w, 20 * s, 10 * s, { color: c(k.BLANCO), opacity: 0.92 });
                k.espaciado(page, txt, M + 11 * s, H - 43 * s, k.helvB, 7.5 * s, 1.2 * s, k.TINTA);
            }
            // Tarjeta "DÍA / N" + fecha, ruta y título sobre la foto.
            const TJ = 70 * s, tx = M, ty = FOTO_Y + 34 * s + TJ;
            rectRedondeadoPdf(page, tx, ty, TJ, TJ, 14 * s, { color: c(k.prim) });
            const etq = t.dia.toUpperCase();
            k.espaciado(page, etq, tx + (TJ - k.anchoEspaciado(etq, k.helvB, 7.5 * s, 1.6 * s)) / 2, ty - 20 * s, k.helvB, 7.5 * s, 1.6 * s, k.sobrePrim, 0.9);
            const num = String(dia).padStart(2, '0');
            const tamNum = k.ajustar(num, k.titulo, 30 * s, 16 * s, TJ - 14 * s);
            k.texto(page, num, tx + (TJ - k.titulo.widthOfTextAtSize(num, tamNum)) / 2, ty - TJ + 15 * s, k.titulo, tamNum, k.sobrePrim);
            const xt = tx + TJ + 18 * s, anchoT = W - xt - M;
            // Hasta 2 líneas: se achica hasta que entre (lo que siga sobrando se corta).
            let tamT = 26 * s;
            while (tamT > 16 * s && envolverTextoPdf(titulo, k.titulo, tamT, anchoT).length > 2) tamT -= 1 * s;
            const lineasT = envolverTextoPdf(titulo, k.titulo, tamT, anchoT).slice(0, 2);
            let yt = ty - TJ + 8 * s + (lineasT.length - 1) * tamT * 1.12;
            lineasT.forEach((l, i) => k.texto(page, l, xt, yt - i * tamT * 1.12, k.titulo, tamT, k.BLANCO));
            yt += tamT + 10 * s;
            const meta = [fecha, ruta].filter(Boolean).map(x => textoPdfSeguro(x.toUpperCase())).join('   ·   ');
            if (meta) k.espaciado(page, recortarTextoPdf(meta, k.helvB, 8 * s, anchoT - 20 * s), xt, yt, k.helvB, 8 * s, 1.2 * s, k.BLANCO, 0.88);
            return { page, yTop: FOTO_Y - 4 * s - 34 * s };
        }
        // Continuación: banda compacta de marca con el día y el título.
        const BANDA = 92 * s;
        page.drawRectangle({ x: 0, y: H - BANDA, width: W, height: BANDA, color: c(k.prim) });
        page.drawCircle({ x: W - 40 * s, y: H + 10 * s, size: 90 * s, color: c(k.mezclar(k.prim, k.BLANCO, 0.1)) });
        page.drawRectangle({ x: 0, y: H - BANDA - 4 * s, width: W, height: 4 * s, color: c(k.sec) });
        const sup = textoPdfSeguro(`${t.dia} ${dia} · ${t.continua}`.toUpperCase());
        k.espaciado(page, sup, M, H - 36 * s, k.helvB, 8 * s, 1.4 * s, k.sobrePrim, 0.85);
        k.texto(page, recortarTextoPdf(titulo, k.titulo, 20 * s, W - 2 * M - 110 * s), M, H - 66 * s, k.titulo, 20 * s, k.sobrePrim);
        k.tarjetaLogo(page, W - M - 84 * s, H - 19 * s, 84 * s, 54 * s, { sombra: false });
        return { page, yTop: H - BANDA - 4 * s - 34 * s };
    };

    // Bloques de cada columna, medidos antes de dibujar para paginar sin cortarlos.
    const conTexto = descripcion.length > 0;
    const conTarjeta = secciones.length > 0;
    const GAP = 22 * s;
    const anchoIzq = conTexto && conTarjeta ? (W - 2 * M - GAP) * 0.6 : W - 2 * M;
    const anchoDer = conTexto && conTarjeta ? W - 2 * M - GAP - anchoIzq : W - 2 * M;
    const xDer = conTexto && conTarjeta ? M + anchoIzq + GAP : M;
    const bloquesIzq = [];
    descripcion.forEach((p, i) => {
        const lead = i === 0;
        const F = (lead ? 13 : 11) * s, LH = (lead ? 19 : 16.5) * s;
        const lineas = envolverTextoPdf(p, lead ? k.helvB : k.helv, F, anchoIzq);
        lineas.forEach((l, j) => bloquesIzq.push({
            alto: LH + (j === lineas.length - 1 ? 9 * s : 0),
            dibujar: (page, y) => k.texto(page, l, M, y - F, lead ? k.helvB : k.helv, F, lead ? k.TINTA : k.mezclar(k.TINTA, k.BLANCO, 0.12))
        }));
    });
    const PADC = 18 * s, F_IT = 9.8 * s, LH_IT = 13.5 * s, R = 6.5 * s;
    const anchoItem = anchoDer - 2 * PADC - 2 * R - 9 * s;
    const bloquesDer = [];
    secciones.forEach((sec, iSec) => {
        bloquesDer.push({
            alto: (iSec ? 16 : 0) * s + 24 * s,
            dibujar: (page, y) => {
                const y0 = y - (iSec ? 16 : 0) * s;
                if (iSec) page.drawLine({ start: { x: xDer + PADC, y: y0 + 9 * s }, end: { x: xDer + anchoDer - PADC, y: y0 + 9 * s }, thickness: 0.7 * s, color: c(k.mezclar(k.prim, k.BLANCO, 0.75)) });
                k.espaciado(page, textoPdfSeguro(sec.titulo.toUpperCase()), xDer + PADC, y0 - 10 * s, k.helvB, 8 * s, 1.4 * s, sec.color === k.sec ? k.secTexto : k.primTexto);
            }
        });
        sec.items.forEach(item => {
            const lineas = envolverTextoPdf(textoPdfSeguro(item), k.helv, F_IT, anchoItem);
            bloquesDer.push({
                alto: Math.max(lineas.length * LH_IT, 2 * R) + 6 * s,
                dibujar: (page, y) => {
                    const cy = y - R + 0.5 * s;
                    if (sec.marca === 'punto') k.marca(page, 'punto', xDer + PADC + R, cy, R * 1.2, sec.color);
                    else {
                        page.drawCircle({ x: xDer + PADC + R, y: cy, size: R, color: c(k.mezclar(sec.color, k.BLANCO, 0.78)) });
                        k.marca(page, sec.marca, xDer + PADC + R, cy, R, k.mezclar(sec.color, k.NEGRO, luminanciaPdf(sec.color) > 0.6 ? 0.45 : 0));
                    }
                    lineas.forEach((l, i) => k.texto(page, l, xDer + PADC + 2 * R + 9 * s, y - F_IT * 0.95 - i * LH_IT, k.helv, F_IT, k.TINTA));
                }
            });
        });
    });

    // Reparte cada columna en páginas (la izquierda y la derecha avanzan por separado).
    const Y_MIN = k.Y_PIE + 10 * s;
    // Alto útil de la primera página y de las de continuación.
    const altoPrimera = (FOTO_Y - 4 * s - 34 * s) - Y_MIN;
    const altoSiguientes = (H - 92 * s - 4 * s - 34 * s) - Y_MIN;
    const repartir = (bloques, pad = 0) => {
        const paginasCol = [[]];
        let usado = 2 * pad;
        bloques.forEach(b => {
            const limite = paginasCol.length === 1 ? altoPrimera : altoSiguientes;
            if (paginasCol[paginasCol.length - 1].length && usado + b.alto > limite) { paginasCol.push([]); usado = 2 * pad; }
            paginasCol[paginasCol.length - 1].push(b);
            usado += b.alto;
        });
        return paginasCol[0].length ? paginasCol : [];
    };
    const izq = repartir(bloquesIzq);
    const der = repartir(bloquesDer, PADC);
    const total = Math.max(1, izq.length, der.length);
    for (let p = 0; p < total; p++) {
        const { page, yTop } = await nuevaPagina();
        let y = yTop, yFinTarjeta = yTop;
        (izq[p] || []).forEach(b => { b.dibujar(page, y); y -= b.alto; });
        const enTarjeta = der[p] || [];
        if (enTarjeta.length) {
            const alto = enTarjeta.reduce((a, b) => a + b.alto, 0) + 2 * PADC - 6 * s;
            rectRedondeadoPdf(page, xDer, yTop + 6 * s, anchoDer, alto, 14 * s, { color: c(k.mezclar(k.prim, k.BLANCO, 0.94)) });
            rectRedondeadoPdf(page, xDer, yTop + 6 * s - 18 * s, 3.5 * s, alto - 36 * s, 1.75 * s, { color: c(k.prim) });
            let yd = yTop + 6 * s - PADC;
            enTarjeta.forEach(b => { b.dibujar(page, yd); yd -= b.alto; });
            yFinTarjeta = yTop + 6 * s - alto;
        }
        // Al pie de la última página del día: qué viene después.
        const SIG_H = 50 * s, ySig = k.Y_PIE + 14 * s + SIG_H;
        if (siguiente && p === total - 1 && Math.min(y, yFinTarjeta) - 24 * s > ySig) {
            rectRedondeadoPdf(page, M, ySig, W - 2 * M, SIG_H, 12 * s, { color: c(k.BLANCO), borderColor: c(k.LINEA), borderWidth: 0.8 * s });
            const etq = textoPdfSeguro((siguiente.libre ? `${t.siguiente} · ${siguiente.titulo}` : `${t.siguiente} · ${t.dia} ${String(siguiente.dia).padStart(2, '0')}`).toUpperCase());
            k.espaciado(page, etq, M + 18 * s, ySig - (siguiente.libre ? 28 : 19) * s, k.helvB, 7.5 * s, 1.4 * s, k.secTexto);
            if (!siguiente.libre) k.texto(page, recortarTextoPdf(textoPdfSeguro(siguiente.titulo), k.helvB, 11.5 * s, W - 2 * M - 80 * s), M + 18 * s, ySig - 37 * s, k.helvB, 11.5 * s, k.TINTA);
            const ax = W - M - 30 * s, ay = ySig - SIG_H / 2;
            page.drawCircle({ x: ax, y: ay, size: 12 * s, color: c(k.prim) });
            page.drawSvgPath(`M ${-4.5 * s} 0 L ${4.5 * s} 0 M ${0.5 * s} ${-4 * s} L ${4.5 * s} 0 L ${0.5 * s} ${4 * s}`, { x: ax, y: ay, borderColor: c(k.sobrePrim), borderWidth: 1.6 * s, borderLineCap: k.LineCapStyle.Round });
        }
        if (!conTexto && !conTarjeta && p === 0) {
            k.texto(page, recortarTextoPdf(titulo, k.helvI, 11 * s, W - 2 * M), M, yTop - 12 * s, k.helvI, 11 * s, k.GRIS);
        }
        k.pie(page);
    }
}

// ===== Bloque de días libres (2 o más seguidos) =====
async function generarPaginaLibrePdf(k, { desde, hasta, fechas }) {
    const { W, H, s, M, t, c } = k;
    const page = k.pdfDoc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c(k.mezclar(k.prim, k.BLANCO, 0.95)) });
    page.drawCircle({ x: W * 0.86, y: H * 0.9, size: W * 0.42, color: c(k.mezclar(k.prim, k.BLANCO, 0.86)) });
    page.drawCircle({ x: W * 0.1, y: H * 0.18, size: W * 0.3, color: c(k.mezclar(k.sec, k.BLANCO, 0.9)) });
    k.tarjetaLogo(page, M, H - M + 6 * s, 112 * s, 66 * s);
    const cy = H * 0.56;
    const rango = desde === hasta ? String(desde).padStart(2, '0') : `${String(desde).padStart(2, '0')}-${String(hasta).padStart(2, '0')}`;
    const etq = (desde === hasta ? t.dia : t.dias).toUpperCase();
    k.espaciado(page, textoPdfSeguro(etq), M, cy + 76 * s, k.helvB, 9 * s, 2 * s, k.secTexto);
    k.texto(page, rango, M, cy + 4 * s, k.titulo, k.ajustar(rango, k.titulo, 64 * s, 30 * s, W - 2 * M), k.primTexto);
    page.drawRectangle({ x: M, y: cy - 18 * s, width: 44 * s, height: 3 * s, color: c(k.sec) });
    k.texto(page, desde === hasta ? t.libre : t.libres, M, cy - 58 * s, k.titulo, 30 * s, k.TINTA);
    if (fechas) k.espaciado(page, textoPdfSeguro(fechas.toUpperCase()), M, cy - 84 * s, k.helvB, 8.5 * s, 1.4 * s, k.GRIS);
    envolverTextoPdf(textoPdfSeguro(t.libreDetalle), k.helv, 11 * s, W * 0.62).forEach((l, i) =>
        k.texto(page, l, M, cy - 116 * s - i * 16 * s, k.helv, 11 * s, k.mezclar(k.TINTA, k.BLANCO, 0.15)));
    k.pie(page);
}

// ===== Términos y condiciones (los de Mi Empresa, en el idioma del PDF) =====
// El texto viene del editor (HTML con negrita, cursiva y listas) o es texto plano de antes.
function bloquesTerminosPdf(html) {
    let fuente = String(html || '').trim();
    if (!fuente) return [];
    if (!/<[a-z][\s\S]*>/i.test(fuente)) fuente = fuente.split(/\r?\n/).map(l => `<div>${l.replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch])}</div>`).join('');
    const doc = new DOMParser().parseFromString(`<div>${fuente}</div>`, 'text/html');
    const bloques = [];
    let actual = null;
    const nuevo = tipo => { actual = { tipo, runs: [] }; bloques.push(actual); };
    const recorrer = (nodo, fmt, enLista) => {
        nodo.childNodes.forEach(n => {
            if (n.nodeType === Node.TEXT_NODE) {
                const tx = n.textContent.replace(/\s+/g, ' ');
                if (!tx.trim() && !actual) return;
                if (!actual) nuevo(enLista ? 'li' : 'p');
                actual.runs.push({ texto: tx, b: fmt.b, i: fmt.i });
                return;
            }
            if (n.nodeType !== Node.ELEMENT_NODE) return;
            const tag = n.tagName.toLowerCase();
            if (tag === 'br') { actual = null; return; }
            const peso = n.style?.fontWeight || '';
            const f = {
                b: fmt.b || ['b', 'strong', 'h1', 'h2', 'h3', 'h4'].includes(tag) || peso === 'bold' || Number(peso) >= 600,
                i: fmt.i || ['i', 'em'].includes(tag) || n.style?.fontStyle === 'italic'
            };
            if (tag === 'li') { nuevo('li'); recorrer(n, f, true); actual = null; }
            else if (['div', 'p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'section'].includes(tag)) { actual = null; recorrer(n, f, enLista || tag === 'ul' || tag === 'ol'); actual = null; }
            else recorrer(n, f, enLista);
        });
    };
    recorrer(doc.body.firstChild, { b: false, i: false }, false);
    return bloques.filter(b => b.runs.some(r => r.texto.trim())).map(b => {
        const plano = b.runs.map(r => r.texto).join('').trim();
        // Un párrafo corto todo en negrita es un subtítulo.
        const titulo = b.tipo === 'p' && plano.length <= 90 && b.runs.filter(r => r.texto.trim()).every(r => r.b);
        return { ...b, tipo: titulo ? 'h' : b.tipo };
    });
}
// Líneas de texto con tramos de distinta fuente (negrita / cursiva) que entran en `ancho`.
function lineasConFormatoPdf(runs, fuentes, size, ancho) {
    const palabras = [];
    runs.forEach(r => {
        const font = r.b ? fuentes.b : r.i ? fuentes.i : fuentes.n;
        r.texto.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { if (palabras.length) palabras[palabras.length - 1].espacio = true; return; }
            palabras.push({ texto: textoPdfSeguro(p), font, espacio: false });
        });
    });
    const lineas = [];
    let linea = [], x = 0;
    palabras.forEach(p => {
        if (!p.texto) return;
        const w = p.font.widthOfTextAtSize(p.texto, size);
        const esp = linea.length && linea[linea.length - 1].espacio ? linea[linea.length - 1].font.widthOfTextAtSize(' ', size) : 0;
        if (linea.length && x + esp + w > ancho) { lineas.push(linea); linea = []; x = 0; }
        const xi = linea.length ? x + esp : 0;
        linea.push({ ...p, x: xi });
        x = xi + w;
    });
    if (linea.length) lineas.push(linea);
    return lineas;
}
function generarTerminosPdf(k, html) {
    const bloques = bloquesTerminosPdf(html);
    if (!bloques.length) return;
    const { W, H, s, M, t, c } = k;
    const BANDA = 150 * s;
    const fuentes = { n: k.helv, b: k.helvB, i: k.helvI };
    const F = 9.6 * s, LH = 13.8 * s, FH = 11.5 * s;
    const piezas = [];
    bloques.forEach(b => {
        if (b.tipo === 'h') {
            const lineas = envolverTextoPdf(textoPdfSeguro(b.runs.map(r => r.texto).join('')), k.helvB, FH, W - 2 * M);
            piezas.push({ alto: 14 * s + lineas.length * 15 * s + 4 * s, conSiguiente: true, dibujar: (page, y) => {
                lineas.forEach((l, i) => k.texto(page, l, M, y - 14 * s - FH - i * 15 * s, k.helvB, FH, k.secTexto));
            } });
            return;
        }
        const sangria = b.tipo === 'li' ? 16 * s : 0;
        lineasConFormatoPdf(b.runs, fuentes, F, W - 2 * M - sangria).forEach((linea, i, todas) => {
            piezas.push({ alto: LH + (i === todas.length - 1 ? 6 * s : 0), dibujar: (page, y) => {
                if (b.tipo === 'li' && i === 0) page.drawCircle({ x: M + 5 * s, y: y - F * 0.62, size: 2.1 * s, color: c(k.prim) });
                linea.forEach(p => page.drawText(p.texto, { x: M + sangria + p.x, y: y - F, size: F, font: p.font, color: c(k.mezclar(k.TINTA, k.BLANCO, 0.1)) }));
            } });
        });
    });

    const nuevaPagina = (continua) => {
        const page = k.pdfDoc.addPage([W, H]);
        page.drawRectangle({ x: 0, y: H - BANDA, width: W, height: BANDA, color: c(k.prim) });
        page.drawCircle({ x: W - 30 * s, y: H + 6 * s, size: 128 * s, color: c(k.mezclar(k.prim, k.BLANCO, 0.1)) });
        page.drawCircle({ x: W - 210 * s, y: H - BANDA + 4 * s, size: 54 * s, color: c(k.BLANCO), opacity: 0.07 });
        page.drawRectangle({ x: 0, y: H - BANDA - 4 * s, width: W, height: 4 * s, color: c(k.sec) });
        const sup = textoPdfSeguro((continua ? `${t.terminosSup} · ${t.continua}` : t.terminosSup).toUpperCase());
        page.drawRectangle({ x: M, y: H - 58 * s + 2.5 * s, width: 18 * s, height: 1.6 * s, color: c(k.sobrePrim), opacity: 0.8 });
        k.espaciado(page, sup, M + 26 * s, H - 58 * s, k.helvB, 8.5 * s, 1.4 * s, k.sobrePrim, 0.85);
        const CW = 118 * s;
        k.texto(page, t.terminos, M, H - 100 * s, k.titulo, k.ajustar(t.terminos, k.titulo, 30 * s, 18 * s, W - 2 * M - CW - 20 * s), k.sobrePrim);
        k.tarjetaLogo(page, W - M - CW, H - (BANDA - 72 * s) / 2, CW, 72 * s);
        k.pie(page);
        return page;
    };
    const Y_TOP = H - BANDA - 4 * s - 26 * s, Y_MIN = k.Y_PIE + 10 * s;
    let page = nuevaPagina(false), y = Y_TOP;
    piezas.forEach((p, i) => {
        // Un subtítulo no queda solo al final de la página: pasa con su primera línea.
        const necesario = p.alto + (p.conSiguiente && piezas[i + 1] ? piezas[i + 1].alto : 0);
        if (y - necesario < Y_MIN && y < Y_TOP) { page = nuevaPagina(true); y = Y_TOP; }
        p.dibujar(page, y);
        y -= p.alto;
    });
}

// ===== Cierre / contacto =====
function generarCierrePdf(k, datos) {
    const { W, H, s, M, t, c } = k;
    const page = k.pdfDoc.addPage([W, H]);
    k.fondoMarca(page, 0, 0, W, H);
    k.degradado(page, 0, 0, W, H * 0.45, k.NEGRO, 0.22, 0);

    // Logo grande, centrado arriba.
    const LW = 190 * s, LH = 110 * s;
    k.tarjetaLogo(page, (W - LW) / 2, H * 0.84, LW, LH);

    // Mensaje central.
    const centro = (texto, y, font, size, color, op = 1) => k.texto(page, texto, (W - font.widthOfTextAtSize(texto, size)) / 2, y, font, size, color, op);
    let y = H * 0.84 - LH - 70 * s;
    const sup = textoPdfSeguro(t.gracias.toUpperCase());
    k.espaciado(page, sup, (W - k.anchoEspaciado(sup, k.helvB, 9 * s, 2.2 * s)) / 2, y, k.helvB, 9 * s, 2.2 * s, k.sobrePrim, 0.85);
    y -= 52 * s;
    const bv = textoPdfSeguro(t.buenViaje);
    centro(bv, y, k.titulo, k.ajustar(bv, k.titulo, 40 * s, 22 * s, W - 2 * M), k.sobrePrim);
    const nombre = textoPdfSeguro(datos.pasajero || '');
    if (nombre) {
        y -= 58 * s;
        centro(nombre, y, k.script, k.ajustar(nombre, k.script, 46 * s, 22 * s, W - 2 * M), k.sobrePrim);
    }
    y -= 30 * s;
    page.drawRectangle({ x: (W - 44 * s) / 2, y, width: 44 * s, height: 3 * s, color: c(luminanciaPdf(k.sec) > 0.5 || k.sobrePrim === k.TINTA ? k.sec : k.BLANCO), opacity: 0.9 });
    y -= 34 * s;
    envolverTextoPdf(textoPdfSeguro(t.cierreTexto), k.helv, 11.5 * s, W * 0.7).forEach(l => { centro(l, y, k.helv, 11.5 * s, k.sobrePrim, 0.9); y -= 17 * s; });

    // Tarjeta de contacto: 2 columnas con los datos que tenga la agencia.
    const ag = k.agencia || {};
    const filas = [
        [t.telefono, [ag.telefono, ag.telefono2].filter(Boolean).join('  /  ')],
        [t.whatsapp, ag.whatsapp],
        [t.direccion, ag.direccion],
        [t.ruc, ag.ruc]
    ].filter(([, v]) => v && String(v).trim()).map(([e, v]) => [textoPdfSeguro(e.toUpperCase()), textoPdfSeguro(v)]);
    if (filas.length) {
        const CW = W - 2 * M, PAD = 24 * s, colW = (CW - 2 * PAD - 20 * s) / 2;
        const celdas = filas.map(([e, v]) => ({ e, lineas: envolverTextoPdf(v, k.helvB, 11 * s, colW).slice(0, 3) }));
        const altoFila = i => Math.max(...[celdas[i], celdas[i + 1]].filter(Boolean).map(x => 18 * s + x.lineas.length * 15 * s));
        let altoTotal = 2 * PAD - 14 * s;
        for (let i = 0; i < celdas.length; i += 2) altoTotal += altoFila(i) + 14 * s;
        const yTop = Math.max(y - 44 * s, k.Y_PIE + 30 * s + altoTotal);
        rectRedondeadoPdf(page, M, yTop - 4 * s, CW, altoTotal, 16 * s, { color: c(k.NEGRO), opacity: 0.12 });
        rectRedondeadoPdf(page, M, yTop, CW, altoTotal, 16 * s, { color: c(k.BLANCO) });
        rectRedondeadoPdf(page, M, yTop, 5 * s, altoTotal, 2.5 * s, { color: c(k.sec) });
        let yy = yTop - PAD;
        for (let i = 0; i < celdas.length; i += 2) {
            [celdas[i], celdas[i + 1]].forEach((cel, j) => {
                if (!cel) return;
                const x = M + PAD + j * (colW + 20 * s);
                k.espaciado(page, cel.e, x, yy - 7 * s, k.helvB, 7.5 * s, 1.4 * s, k.secTexto);
                cel.lineas.forEach((l, n) => k.texto(page, l, x, yy - 24 * s - n * 15 * s, k.helvB, 11 * s, k.TINTA));
            });
            yy -= altoFila(i) + 14 * s;
        }
    }
    k.pie(page, { claro: k.sobrePrim === k.BLANCO });
}
