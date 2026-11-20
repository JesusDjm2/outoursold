<?php
// viaje/index.php — Página pública del itinerario para el pasajero (enlace viaje/?t=TOKEN).
// No pide iniciar sesión: el token (migración 046, tabla itinerario_enlaces) es lo único que da
// acceso, y se puede desactivar desde el Cotizador o el Historial. Se arma en el servidor:
// carga rápido en el celular, la vista previa de WhatsApp muestra foto y título, y nunca
// salen datos internos (precios confidenciales, precio por ítem, notas internas).
// Siempre muestra la versión actual de la cotización (si el agente la cambia, el enlace también).
require_once __DIR__ . '/../shared/db.php';

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");

$e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

// ===== Textos (idioma de la cotización) =====
$TEXTOS = [
    'es' => [
        'titulo_pag' => 'Tu viaje', 'preparado' => 'Preparado para', 'itinerario' => 'Itinerario de viaje',
        'fechas' => 'Fechas', 'duracion' => 'Duración', 'viajeros' => 'Viajeros', 'destinos' => 'Destinos',
        'dias' => 'días', 'dia_s' => 'día', 'noches' => 'noches', 'noche' => 'noche', 'pasajero' => 'viajero', 'pasajeros' => 'viajeros',
        'dia' => 'Día', 'dia_a_dia' => 'Día a día', 'dia_a_dia_sub' => 'Todo lo que vivirás, en orden.',
        'libre' => 'Día libre', 'libres' => 'Días libres', 'libre_txt' => 'Tiempo para descansar o explorar a tu ritmo.',
        'lugares' => 'Lugares a visitar', 'actividades' => 'Actividades del día', 'incluye' => 'Incluye', 'no_incluye' => 'No incluye',
        'ver_incluye' => 'Qué incluye', 'noche_en' => 'Esta noche', 'otras' => 'Otras actividades',
        'hoteles' => 'Dónde dormirás', 'hoteles_sub' => 'Tus alojamientos durante el viaje.', 'checkin' => 'Llegada', 'checkout' => 'Salida', 'hab' => 'hab.',
        'inversion' => 'Tu inversión', 'total' => 'Precio total', 'reserva' => 'Reserva para confirmar', 'descuento' => 'Descuento aplicado', 'por' => 'para',
        'incluye_todo' => 'Tu viaje incluye', 'notas' => 'Notas de tu asesor', 'terminos' => 'Términos y condiciones',
        'contacto' => '¿Dudas? Estamos para ayudarte', 'contacto_sub' => 'Escríbenos y te respondemos lo antes posible.',
        'asesor' => 'Tu asesor', 'escribir' => 'Escribir por WhatsApp', 'llamar' => 'Llamar',
        'calendario' => 'Agregar al calendario', 'imprimir' => 'Guardar en PDF', 'compartir' => 'Compartir', 'copiado' => 'Enlace copiado',
        'faltan' => 'Faltan %d días para tu viaje', 'falta1' => 'Mañana empieza tu viaje', 'hoy_empieza' => '¡Hoy empieza tu viaje!',
        'en_curso' => 'Día %d de %d · ¡Buen viaje!', 'terminado' => 'Esperamos que hayas disfrutado tu viaje', 'hoy' => 'Hoy',
        'wa_msg' => 'Hola, tengo una consulta sobre mi viaje (%s).',
        'no_disp' => 'Este enlace ya no está disponible', 'no_disp_txt' => 'Puede que tu asesor lo haya actualizado. Pídele el enlace nuevo.',
        'sin_fecha' => 'Fechas por confirmar', 'ir_dia' => 'Ir al día', 'etq_hoteles' => 'Alojamiento', 'etq_incluye' => 'Servicios',
    ],
    'en' => [
        'titulo_pag' => 'Your trip', 'preparado' => 'Prepared for', 'itinerario' => 'Travel itinerary',
        'fechas' => 'Dates', 'duracion' => 'Duration', 'viajeros' => 'Travelers', 'destinos' => 'Destinations',
        'dias' => 'days', 'dia_s' => 'day', 'noches' => 'nights', 'noche' => 'night', 'pasajero' => 'traveler', 'pasajeros' => 'travelers',
        'dia' => 'Day', 'dia_a_dia' => 'Day by day', 'dia_a_dia_sub' => 'Everything you will experience, in order.',
        'libre' => 'Free day', 'libres' => 'Free days', 'libre_txt' => 'Time to rest or explore at your own pace.',
        'lugares' => 'Places to visit', 'actividades' => 'Activities of the day', 'incluye' => 'Included', 'no_incluye' => 'Not included',
        'ver_incluye' => "What's included", 'noche_en' => 'Tonight', 'otras' => 'Other activities',
        'hoteles' => "Where you'll stay", 'hoteles_sub' => 'Your accommodation during the trip.', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'hab' => 'rooms',
        'inversion' => 'Your investment', 'total' => 'Total price', 'reserva' => 'Deposit to confirm', 'descuento' => 'Discount applied', 'por' => 'for',
        'incluye_todo' => 'Your trip includes', 'notas' => 'Notes from your advisor', 'terminos' => 'Terms and conditions',
        'contacto' => 'Questions? We are here to help', 'contacto_sub' => 'Write to us and we will get back to you shortly.',
        'asesor' => 'Your advisor', 'escribir' => 'Message on WhatsApp', 'llamar' => 'Call',
        'calendario' => 'Add to calendar', 'imprimir' => 'Save as PDF', 'compartir' => 'Share', 'copiado' => 'Link copied',
        'faltan' => '%d days to go until your trip', 'falta1' => 'Your trip starts tomorrow', 'hoy_empieza' => 'Your trip starts today!',
        'en_curso' => 'Day %d of %d · Enjoy!', 'terminado' => 'We hope you enjoyed your trip', 'hoy' => 'Today',
        'wa_msg' => 'Hello, I have a question about my trip (%s).',
        'no_disp' => 'This link is no longer available', 'no_disp_txt' => 'Your advisor may have updated it. Ask them for the new link.',
        'sin_fecha' => 'Dates to be confirmed', 'ir_dia' => 'Go to day', 'etq_hoteles' => 'Accommodation', 'etq_incluye' => 'Services',
    ],
    'pt' => [
        'titulo_pag' => 'Sua viagem', 'preparado' => 'Preparado para', 'itinerario' => 'Roteiro de viagem',
        'fechas' => 'Datas', 'duracion' => 'Duração', 'viajeros' => 'Viajantes', 'destinos' => 'Destinos',
        'dias' => 'dias', 'dia_s' => 'dia', 'noches' => 'noites', 'noche' => 'noite', 'pasajero' => 'viajante', 'pasajeros' => 'viajantes',
        'dia' => 'Dia', 'dia_a_dia' => 'Dia a dia', 'dia_a_dia_sub' => 'Tudo o que você vai viver, em ordem.',
        'libre' => 'Dia livre', 'libres' => 'Dias livres', 'libre_txt' => 'Tempo para descansar ou explorar no seu ritmo.',
        'lugares' => 'Lugares a visitar', 'actividades' => 'Atividades do dia', 'incluye' => 'Inclui', 'no_incluye' => 'Não inclui',
        'ver_incluye' => 'O que inclui', 'noche_en' => 'Esta noite', 'otras' => 'Outras atividades',
        'hoteles' => 'Onde você vai ficar', 'hoteles_sub' => 'Suas hospedagens durante a viagem.', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'hab' => 'quartos',
        'inversion' => 'Seu investimento', 'total' => 'Preço total', 'reserva' => 'Sinal para confirmar', 'descuento' => 'Desconto aplicado', 'por' => 'para',
        'incluye_todo' => 'Sua viagem inclui', 'notas' => 'Notas do seu consultor', 'terminos' => 'Termos e condições',
        'contacto' => 'Dúvidas? Estamos aqui para ajudar', 'contacto_sub' => 'Escreva para nós e responderemos o quanto antes.',
        'asesor' => 'Seu consultor', 'escribir' => 'Escrever no WhatsApp', 'llamar' => 'Ligar',
        'calendario' => 'Adicionar ao calendário', 'imprimir' => 'Salvar em PDF', 'compartir' => 'Compartilhar', 'copiado' => 'Link copiado',
        'faltan' => 'Faltam %d dias para a sua viagem', 'falta1' => 'Sua viagem começa amanhã', 'hoy_empieza' => 'Sua viagem começa hoje!',
        'en_curso' => 'Dia %d de %d · Boa viagem!', 'terminado' => 'Esperamos que você tenha aproveitado a viagem', 'hoy' => 'Hoje',
        'wa_msg' => 'Olá, tenho uma dúvida sobre a minha viagem (%s).',
        'no_disp' => 'Este link não está mais disponível', 'no_disp_txt' => 'Seu consultor pode tê-lo atualizado. Peça o novo link.',
        'sin_fecha' => 'Datas a confirmar', 'ir_dia' => 'Ir para o dia', 'etq_hoteles' => 'Hospedagem', 'etq_incluye' => 'Serviços',
    ],
];
$MESES = [
    'es' => ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    'en' => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    'pt' => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
];
$SEMANA = [
    'es' => ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    'en' => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'pt' => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
];

function noDisponible($t) {
    http_response_code(404);
    $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . $e($t['no_disp']) . '</title>'
        . '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f7fb;color:#1e293b;padding:24px}main{max-width:420px;text-align:center}h1{font-size:1.3rem;margin:16px 0 8px}p{color:#64748b;line-height:1.5}.i{width:64px;height:64px;margin:auto;border-radius:20px;background:#e2e8f0;display:grid;place-items:center;font-size:28px}</style></head>'
        . '<body><main><div class="i">🧭</div><h1>' . $e($t['no_disp']) . '</h1><p>' . $e($t['no_disp_txt']) . '</p></main></body></html>';
    exit;
}

// ===== Enlace y cotización =====
$token = (string) ($_GET['t'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $token)) noDisponible($TEXTOS['es']);
$db = getDB();
try {
    $stmt = $db->prepare("SELECT moneda, cotizacion_id, mostrar_precios FROM itinerario_enlaces WHERE token = ? AND revocado_en IS NULL");
    $stmt->execute([$token]);
    $enlace = $stmt->fetch();
} catch (PDOException $ex) {
    $enlace = false; // sin la migración 046
}
if (!$enlace || !in_array($enlace['moneda'], ['usd', 'pen'], true)) noDisponible($TEXTOS['es']);
$moneda = $enlace['moneda'];
$stmt = $db->prepare("SELECT data, creado_por FROM cotizaciones_$moneda WHERE id = ? AND eliminado_en IS NULL");
$stmt->execute([$enlace['cotizacion_id']]);
$fila = $stmt->fetch();
$cot = $fila ? json_decode($fila['data'], true) : null;
if (!is_array($cot)) noDisponible($TEXTOS['es']);

$pax = is_array($cot['pax'] ?? null) ? $cot['pax'] : [];
$idioma = in_array($pax['idioma'] ?? '', ['es', 'en', 'pt'], true) ? $pax['idioma'] : 'es';
$t = $TEXTOS[$idioma];

// Visitas del pasajero (no las de los robots que arman la vista previa al compartir).
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
// La vista previa del agente ("Ver como el pasajero", &vista=agente) tampoco cuenta.
if (!isset($_GET['vista']) && !preg_match('/bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|linkedin/i', $ua)) {
    $db->prepare("UPDATE itinerario_enlaces SET vistas = vistas + 1, ultima_vista = NOW() WHERE token = ?")->execute([$token]);
}

// ===== Agencia (la de quien creó la cotización; sin agencia, la principal) =====
$stmt = $db->prepare("SELECT agencia_id FROM usuarios WHERE id = ?");
$stmt->execute([(int) $fila['creado_por']]);
$agenciaId = (int) ($stmt->fetchColumn() ?: 0);
$stmt = $db->prepare("SELECT * FROM agencias WHERE " . ($agenciaId ? 'id = ?' : 'es_principal = 1 LIMIT 1'));
$stmt->execute($agenciaId ? [$agenciaId] : []);
$ag = $stmt->fetch() ?: [];
// Catálogo de itinerarios: el del ámbito de quien la creó (su agencia o, sin agencia, él).
if ($agenciaId) {
    $stmt = $db->prepare("SELECT id FROM usuarios WHERE agencia_id = ?");
    $stmt->execute([$agenciaId]);
    $duenos = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
} else {
    $duenos = [(int) $fila['creado_por']];
}
$duenos = $duenos ?: [0];

$hex = fn($c, $d) => preg_match('/^#?[0-9a-f]{6}$/i', (string) $c) ? '#' . ltrim($c, '#') : $d;
$colorP = $hex($ag['color_principal'] ?? '', '#e8590c');
$colorS = $hex($ag['color_secundario'] ?? '', '#0b7285');
$urlArchivo = function ($rel) { return is_file(__DIR__ . '/../' . $rel) ? '../' . implode('/', array_map('rawurlencode', explode('/', $rel))) : null; };
$logoUrl = !empty($ag['logo']) ? $urlArchivo('shared/uploads/agencias/' . $ag['logo']) : null;
$heroAgencia = !empty($ag['hero_imagen']) ? $urlArchivo('shared/uploads/agencias/' . $ag['hero_imagen']) : null;

// ===== Fechas =====
$valFecha = fn($f) => is_string($f) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) ? $f : '';
$llegada = $valFecha($pax['f_llegada'] ?? '');
$sumarDias = fn($f, $n) => date('Y-m-d', strtotime("$f +$n day"));
$diaDeFecha = fn($f) => $llegada && $f ? (int) round((strtotime($f) - strtotime($llegada)) / 86400) + 1 : null;
$fechaCorta = function ($f, $conAnio = false) use ($idioma, $MESES, $SEMANA) {
    if (!$f) return '';
    $ts = strtotime($f);
    $txt = $SEMANA[$idioma][(int) date('w', $ts)] . ' ' . (int) date('j', $ts) . ' ' . $MESES[$idioma][(int) date('n', $ts) - 1];
    return $conAnio ? $txt . ' ' . date('Y', $ts) : $txt;
};
$fechaSolo = function ($f, $conAnio = false) use ($idioma, $MESES) {
    if (!$f) return '';
    $ts = strtotime($f);
    return (int) date('j', $ts) . ' ' . $MESES[$idioma][(int) date('n', $ts) - 1] . ($conAnio ? ' ' . date('Y', $ts) : '');
};

// ===== Itinerario armado =====
$armado = is_array($cot['itinerarioArmado'] ?? null) ? $cot['itinerarioArmado'] : [];
$modulosGuardados = array_values(array_map('strval', $armado['modulos'] ?? []));
$diasGuardados = is_array($armado['dias'] ?? null) && count($armado['dias']) === count($modulosGuardados) ? array_map('intval', $armado['dias']) : null;
$catalogo = [];
if ($modulosGuardados) {
    $marcas = implode(',', array_fill(0, count($modulosGuardados), '?'));
    $marcasD = implode(',', array_fill(0, count($duenos), '?'));
    $stmt = $db->prepare("SELECT m.*, d.nombre AS destino, c.nombre AS categoria FROM itinerarios_$idioma m
                          LEFT JOIN destinos d ON d.id = m.destino_id LEFT JOIN categorias_itinerarios c ON c.id = m.categoria_id
                          WHERE m.filename IN ($marcas) AND m.creado_por IN ($marcasD)");
    $stmt->execute(array_merge($modulosGuardados, $duenos));
    foreach ($stmt->fetchAll() as $m) if (!isset($catalogo[$m['filename']])) $catalogo[$m['filename']] = $m;
}
$lista = fn($txt) => array_values(array_filter(array_map(fn($l) => trim(preg_replace('/^[-•*]\s*/u', '', $l)), preg_split('/\r?\n/', (string) $txt))));
$items = []; // [{indice, dia, modulo}]
foreach ($modulosGuardados as $i => $fn) {
    $m = $catalogo[$fn] ?? null;
    if ($m && preg_match('/\b(d[ií]a libre|d[ií]as libres|free days?|dia livre|dias livres)\b/iu', $m['titulo'])) continue;
    $items[] = ['indice' => $i, 'dia' => $diasGuardados ? max(1, $diasGuardados[$i]) : $i + 1, 'modulo' => $m, 'filename' => $fn];
}
usort($items, fn($a, $b) => $a['dia'] <=> $b['dia'] ?: $a['indice'] <=> $b['indice']);
$diaPorIndice = [];
foreach ($items as $it) $diaPorIndice[$it['indice']] = $it['dia'];

// Actividades (sin precios): por vínculo con su itinerario o por su fecha.
$tours = array_values(array_filter($cot['tours'] ?? [], fn($x) => trim((string) ($x['tour'] ?? '')) !== ''));
$actividadesPorDia = [];
$otrasActividades = [];
foreach ($tours as $x) {
    $dia = null;
    if (isset($x['vinculo']) && is_int($x['vinculo']) && isset($diaPorIndice[$x['vinculo']])) $dia = $diaPorIndice[$x['vinculo']];
    elseif ($valFecha($x['fecha'] ?? '')) $dia = $diaDeFecha($x['fecha']);
    if ($dia && $dia >= 1) $actividadesPorDia[$dia][] = trim($x['tour']);
    else $otrasActividades[] = trim($x['tour']);
}
// Hoteles
$hoteles = array_values(array_filter($cot['hotels'] ?? [], fn($h) => trim((string) ($h['aloj'] ?? '')) !== ''));
$hotelDeNoche = function ($fecha) use ($hoteles, $valFecha) {
    if (!$fecha) return null;
    foreach ($hoteles as $h) {
        $cin = $valFecha($h['cin'] ?? ''); $cout = $valFecha($h['cout'] ?? '');
        if ($cin && $cout && $fecha >= $cin && $fecha < $cout) return trim($h['aloj']);
    }
    return null;
};

// Línea de tiempo: cada día con sus itinerarios (o solo con actividades, que también cuentan
// como día con plan) y, entre ellos, los bloques de días libres.
$itemsPorDia = [];
foreach ($items as $it) $itemsPorDia[$it['dia']][] = $it;
$diasConPlan = array_unique(array_merge(array_keys($itemsPorDia), array_keys($actividadesPorDia)));
sort($diasConPlan);
$linea = [];
$anterior = null;
foreach ($diasConPlan as $d) {
    if ($anterior !== null && $d - $anterior > 1) $linea[] = ['tipo' => 'libre', 'desde' => $anterior + 1, 'hasta' => $d - 1];
    $linea[] = ['tipo' => 'dia', 'dia' => $d, 'items' => $itemsPorDia[$d] ?? []];
    $anterior = $d;
}
$diaMax = $diasConPlan ? max($diasConPlan) : 0;
$salida = $valFecha($pax['f_salida'] ?? '');
$nDias = $diaMax ?: ($llegada && $salida ? $diaDeFecha($salida) : 0);
$fFin = $salida ?: ($llegada && $nDias ? $sumarDias($llegada, $nDias - 1) : '');

// Destinos del viaje, en orden.
$destinos = [];
foreach ($items as $it) if (!empty($it['modulo']['destino']) && !in_array($it['modulo']['destino'], $destinos, true)) $destinos[] = $it['modulo']['destino'];

// Incluye / No incluye de todo el viaje, sin repetidos.
$juntar = function ($campo) use ($items, $lista) {
    $vistos = []; $res = [];
    foreach ($items as $it) foreach ($lista($it['modulo'][$campo] ?? '') as $l) {
        $k = mb_strtolower(trim($l, " .")); if (!isset($vistos[$k])) { $vistos[$k] = 1; $res[] = $l; }
    }
    return $res;
};
$incluyeTodo = $juntar('incluye');
$noIncluyeTodo = $juntar('no_incluye');

// Imagen de cada itinerario (si el archivo existe) y la de portada.
$imagenDe = fn($m) => $m && !empty($m['imagen']) ? $urlArchivo("itinerario/uploads/$idioma/imagenes/" . $m['imagen']) : null;
$portada = null;
foreach ($items as $it) if ($portada = $imagenDe($it['modulo'])) break;
$portada = $portada ?: $heroAgencia;

// Precios (solo el total y la reserva; nunca precio por ítem ni confidenciales).
$num = fn($v) => is_numeric($v) ? (float) $v : 0.0;
$total = 0.0; $regular = 0.0;
foreach ($tours as $x) { $total += $num($x['ppromo'] ?? 0) * $num($x['cant'] ?? 0); $regular += $num($x['preg'] ?? 0) * $num($x['cant'] ?? 0); }
foreach ($hoteles as $h) { $k = $num($h['nhab'] ?? 0) * $num($h['noches'] ?? 0); $total += $num($h['ppromo'] ?? 0) * $k; $regular += $num($h['preg'] ?? 0) * $k; }
$precios = $cot['precios'] ?? [];
$total += $num($precios['precioAdicional'] ?? 0) - $num($precios['descuentoEspecial'] ?? 0);
$ahorro = max(0, $regular - ($total - $num($precios['precioAdicional'] ?? 0)));
$pctReserva = $num($cot['porcentaje_reserva'] ?? 0);
$simbolo = $moneda === 'pen' ? 'S/' : '$';
$dinero = fn($v) => $simbolo . ' ' . number_format($v, 2, '.', ',');
$mostrarPrecios = (bool) $enlace['mostrar_precios'] && $total > 0;

// Textos del agente / agencia: solo formato básico (sin atributos ni scripts).
$htmlSeguro = function ($html) {
    $html = strip_tags((string) $html, '<b><strong><i><em><u><br><ul><ol><li><p><div>');
    $html = preg_replace('/<(\/?)(b|strong|i|em|u|br|ul|ol|li|p|div)\b[^>]*>/i', '<$1$2>', $html);
    return trim(strip_tags($html)) === '' ? '' : $html;
};
$notas = $htmlSeguro($cot['notas'] ?? '');
$terminos = $htmlSeguro($ag["terminos_$idioma"] ?? '');
if ($terminos === '' && trim((string) ($ag["terminos_$idioma"] ?? '')) !== '') $terminos = nl2br($e($ag["terminos_$idioma"]));

// Contacto
$digitos = fn($v) => preg_replace('/\D/', '', (string) $v);
$wa = $digitos($ag['whatsapp'] ?? '');
$waUrl = strlen($wa) >= 8 ? 'https://wa.me/' . $wa . '?text=' . rawurlencode(sprintf($t['wa_msg'], $cot['id'] ?? '')) : null;
$tel = trim((string) ($ag['telefono'] ?? $ag['telefono2'] ?? ''));
$telUrl = strlen($digitos($tel)) >= 6 ? 'tel:' . preg_replace('/[^\d+]/', '', $tel) : null;
$agente = trim((string) ($pax['agente'] ?? ''));

$pasajero = trim((string) ($pax['nombre_pax'] ?? ''));
$nPax = (int) ($pax['n_pax'] ?? 0);
$tituloViaje = trim((string) ($armado['titulo'] ?? ''));
if ($tituloViaje === '' || preg_match('/^\d+ \S+ \/ \d+ \S+$/u', $tituloViaje)) $tituloViaje = $destinos ? implode(' · ', $destinos) : ($tituloViaje ?: $t['itinerario']);
$nombreAgencia = trim((string) ($ag['nombre'] ?? ''));
$duracionTxt = $nDias ? $nDias . ' ' . ($nDias === 1 ? $t['dia_s'] : $t['dias']) . ($nDias > 1 ? ' / ' . ($nDias - 1) . ' ' . ($nDias - 1 === 1 ? $t['noche'] : $t['noches']) : '') : '';
$fechasTxt = $llegada ? ($fFin && $fFin !== $llegada ? $fechaSolo($llegada, substr($llegada, 0, 4) !== substr($fFin, 0, 4)) . ' – ' . $fechaSolo($fFin, true) : $fechaSolo($llegada, true)) : $t['sin_fecha'];

// Vista previa al compartir (WhatsApp, etc.): URL absoluta.
$esquema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' ? 'https' : 'http';
// Raíz del sitio (la carpeta que contiene viaje/), para pasar de "../algo" a una URL limpia.
$raiz = $esquema . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/viaje/index.php'))), '/') . '/';
$absoluta = fn($rel) => $rel ? $raiz . preg_replace('#^\.\./#', '', $rel) : null;
$ogTitulo = ($pasajero ? $pasajero . ' · ' : '') . $tituloViaje;
$ogDesc = implode(' · ', array_filter([$fechasTxt, $duracionTxt, $nombreAgencia]));

// Datos para el script (fechas de cada día para "Hoy", la cuenta regresiva y el calendario).
$diasJs = [];
foreach ($linea as $u) {
    if ($u['tipo'] !== 'dia') continue;
    $titulos = array_map(fn($it) => $it['modulo']['titulo'] ?? preg_replace('/\.pdf$/i', '', $it['filename']), $u['items']);
    if (!$titulos) $titulos = $actividadesPorDia[$u['dia']] ?? [];
    $diasJs[] = ['dia' => $u['dia'], 'fecha' => $llegada ? $sumarDias($llegada, $u['dia'] - 1) : null, 'titulo' => implode(' + ', $titulos)];
}
$jsDatos = [
    'llegada' => $llegada ?: null, 'fin' => $fFin ?: null, 'nDias' => $nDias, 'dias' => $diasJs,
    'titulo' => $tituloViaje, 'agencia' => $nombreAgencia, 'cot' => $cot['id'] ?? '',
    't' => ['faltan' => $t['faltan'], 'falta1' => $t['falta1'], 'hoy_empieza' => $t['hoy_empieza'], 'en_curso' => $t['en_curso'], 'terminado' => $t['terminado'], 'hoy' => $t['hoy'], 'copiado' => $t['copiado'], 'dia' => $t['dia']],
];
$iconos = [
    'cal' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    'reloj' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    'gente' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/></svg>',
    'pin' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    'cama' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18V6M3 13h18v5M21 18v-4a3 3 0 0 0-3-3h-7v2"/><circle cx="7" cy="10.5" r="1.8"/></svg>',
    'check' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    'x' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    'estrella' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    'taza' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.5 1.5 1.5 1.5 3M12 3.5c0 1.5 1.5 1.5 1.5 3"/></svg>',
    'wa' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.6-4.4a8.4 8.4 0 1 1 15.4-4.5z"/><path d="M9 8.6c.2 2.9 3.2 5.9 6.3 6.3l1.2-1.5-1.9-1.1-1 .8a5.4 5.4 0 0 1-2.8-2.8l.8-1-1.1-1.9z"/></svg>',
    'tel' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.3 1.7V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5z"/></svg>',
    'compartir' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/></svg>',
    'pdf' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/></svg>',
    'flecha' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
];
?><!doctype html>
<html lang="<?= $e($idioma) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="<?= $e($colorP) ?>">
<title><?= $e($ogTitulo) ?></title>
<meta property="og:type" content="website">
<meta property="og:title" content="<?= $e($ogTitulo) ?>">
<meta property="og:description" content="<?= $e($ogDesc) ?>">
<?php if ($portada): ?><meta property="og:image" content="<?= $e($absoluta($portada)) ?>"><?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap">
<style>
:root {
    --p: <?= $e($colorP) ?>; --s: <?= $e($colorS) ?>;
    --p-suave: color-mix(in srgb, var(--p) 10%, white); --p-tinte: color-mix(in srgb, var(--p) 5%, white);
    --s-suave: color-mix(in srgb, var(--s) 12%, white);
    --tinta: #172033; --texto: #3b4658; --tenue: #6b7588; --linea: #e6e9ef; --fondo: #f6f7fb; --blanco: #fff;
    --radio: 20px; --sombra: 0 1px 2px rgba(23,32,51,.04), 0 8px 24px rgba(23,32,51,.06);
    --titulo: 'Fraunces', Georgia, serif; --cuerpo: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { margin: 0; font-family: var(--cuerpo); color: var(--texto); background: var(--fondo); line-height: 1.55; -webkit-font-smoothing: antialiased; }
img { display: block; max-width: 100%; }
svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
a { color: inherit; }
.envoltura { width: min(1080px, 100% - 32px); margin-inline: auto; }

/* ===== Portada ===== */
.portada { position: relative; min-height: min(88vh, 760px); display: flex; align-items: flex-end; color: #fff; isolation: isolate; overflow: hidden; }
.portada-img { position: absolute; inset: 0; z-index: -2; width: 100%; height: 100%; object-fit: cover; transform: scale(1.04); animation: acercar 16s ease-out forwards; }
.portada-marca { position: absolute; inset: 0; z-index: -2; background: radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, var(--p) 75%, white) 0%, var(--p) 45%, color-mix(in srgb, var(--p) 70%, black) 100%); }
.portada::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(10,14,24,.45) 0%, rgba(10,14,24,0) 28%, rgba(10,14,24,.15) 50%, rgba(10,14,24,.82) 100%); }
@keyframes acercar { to { transform: scale(1); } }
.portada-top { position: absolute; top: 0; left: 0; right: 0; padding: max(18px, env(safe-area-inset-top)) 0 0; }
.portada-top .envoltura { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.logo-card { display: inline-flex; align-items: center; justify-content: center; height: 54px; padding: 8px 14px; border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 6px 20px rgba(0,0,0,.15); color: var(--p); font-weight: 700; font-size: .9rem; }
.logo-card img { max-height: 38px; max-width: 150px; object-fit: contain; }
.etiqueta { font-size: .7rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; opacity: .9; }
.portada-cuerpo { width: 100%; padding: 120px 0 44px; }
.estado-viaje { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.28); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: .82rem; font-weight: 600; }
.estado-viaje[hidden] { display: none; }
.estado-viaje i { width: 8px; height: 8px; border-radius: 50%; background: var(--s); box-shadow: 0 0 0 4px color-mix(in srgb, var(--s) 35%, transparent); }
.portada h1 { margin: 6px 0 10px; font-family: var(--titulo); font-weight: 700; font-size: clamp(2.1rem, 6.4vw, 4.2rem); line-height: 1.04; letter-spacing: -.02em; text-wrap: balance; }
.portada .para { font-size: clamp(1rem, 2.4vw, 1.2rem); opacity: .92; }
.portada .para b { font-weight: 600; }

/* ===== Datos rápidos ===== */
.datos { position: relative; z-index: 2; margin-top: -30px; }
.datos-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--blanco); border-radius: var(--radio); box-shadow: 0 10px 40px rgba(23,32,51,.12); overflow: hidden; }
.dato { padding: 18px 20px; display: flex; gap: 12px; align-items: flex-start; }
.dato + .dato { border-left: 1px solid var(--linea); }
.dato-ico { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--p-suave); color: var(--p); font-size: 18px; flex: none; }
.dato small { display: block; font-size: .68rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--tenue); }
.dato strong { display: block; margin-top: 2px; color: var(--tinta); font-weight: 600; font-size: .95rem; line-height: 1.3; }

/* ===== Acciones ===== */
.acciones { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--linea); background: var(--blanco); color: var(--tinta); font: 600 .86rem var(--cuerpo); text-decoration: none; cursor: pointer; transition: transform .15s, box-shadow .15s, border-color .15s; }
.btn svg { font-size: 17px; color: var(--p); }
.btn:hover { transform: translateY(-1px); box-shadow: var(--sombra); border-color: #d6dbe4; }
.btn.is-primario { background: var(--p); border-color: var(--p); color: #fff; }
.btn.is-primario svg { color: #fff; }
.btn.is-wa { background: #1faa59; border-color: #1faa59; color: #fff; }
.btn.is-wa svg { color: #fff; }

/* ===== Navegación por días (fija) ===== */
.nav-dias { position: sticky; top: 0; z-index: 20; margin-top: 34px; background: color-mix(in srgb, var(--fondo) 88%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid transparent; transition: border-color .2s; }
.nav-dias.is-fija { border-bottom-color: var(--linea); }
.nav-dias .envoltura { display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; scrollbar-width: none; }
.nav-dias .envoltura::-webkit-scrollbar { display: none; }
.nav-dia { flex: none; display: inline-flex; flex-direction: column; align-items: center; min-width: 58px; padding: 6px 10px; border-radius: 12px; text-decoration: none; color: var(--tenue); border: 1px solid transparent; font-size: .7rem; font-weight: 600; line-height: 1.25; }
.nav-dia b { font-size: 1rem; color: var(--tinta); }
.nav-dia:hover { background: var(--blanco); border-color: var(--linea); }
.nav-dia.is-activo { background: var(--p); color: rgba(255,255,255,.85); }
.nav-dia.is-activo b { color: #fff; }
.nav-dia.is-libre b { color: var(--tenue); font-weight: 500; }

/* ===== Secciones ===== */
.seccion { padding: 40px 0 8px; }
.seccion-cab { margin-bottom: 22px; }
.seccion-cab h2 { margin: 6px 0 4px; font-family: var(--titulo); font-weight: 700; font-size: clamp(1.6rem, 3.6vw, 2.2rem); color: var(--tinta); letter-spacing: -.01em; }
.seccion-cab p { margin: 0; color: var(--tenue); }
.seccion-cab .etiqueta { color: var(--p); opacity: 1; }

/* ===== Día a día (línea de tiempo) ===== */
.linea { position: relative; display: grid; gap: 22px; }
.linea::before { content: ''; position: absolute; left: 27px; top: 10px; bottom: 10px; width: 2px; background: linear-gradient(var(--p-suave), var(--linea)); }
.dia, .libre { scroll-margin-top: 104px; }
.dia { position: relative; display: grid; grid-template-columns: 56px 1fr; gap: 18px; }
.dia-num { position: relative; z-index: 1; width: 56px; height: 56px; border-radius: 18px; background: var(--blanco); border: 2px solid var(--p-suave); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--p); box-shadow: var(--sombra); }
.dia-num small { font-size: .56rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.dia-num b { font-family: var(--titulo); font-size: 1.35rem; line-height: 1; }
.dia.is-hoy .dia-num { background: var(--p); border-color: var(--p); color: #fff; box-shadow: 0 0 0 6px var(--p-suave); }
.dia-contenido { min-width: 0; display: grid; gap: 14px; }
.dia-fecha { display: flex; align-items: center; gap: 8px; font-size: .78rem; font-weight: 600; color: var(--tenue); text-transform: capitalize; margin-top: 4px; }
.chip-hoy { padding: 2px 9px; border-radius: 999px; background: var(--s); color: #fff; font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; }
.tarjeta { background: var(--blanco); border-radius: var(--radio); box-shadow: var(--sombra); overflow: hidden; }
.tarjeta-media { position: relative; aspect-ratio: 16 / 7; background: var(--p-suave); }
.tarjeta-media img { width: 100%; height: 100%; object-fit: cover; }
.tarjeta-media.is-marca { background: radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, var(--p) 60%, white), var(--p) 60%); }
.tarjeta-media.is-marca span { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--titulo); font-size: 3.4rem; color: rgba(255,255,255,.35); }
.tarjeta-cuerpo { padding: 20px 22px 22px; }
.ruta { font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--s); }
.tarjeta h3 { margin: 4px 0 10px; font-family: var(--titulo); font-weight: 700; font-size: 1.4rem; line-height: 1.2; color: var(--tinta); }
.desc p { margin: 0 0 10px; }
.desc p:first-child { font-size: 1.04rem; color: var(--tinta); font-weight: 500; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 0; padding: 0; list-style: none; }
.chips li { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--p-tinte); border: 1px solid var(--p-suave); font-size: .8rem; color: var(--tinta); }
.chips li svg { color: var(--p); font-size: 13px; }
.sub { margin: 16px 0 8px; font-size: .7rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--tenue); }
.extras { display: grid; gap: 10px; }
.extra { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: var(--blanco); box-shadow: var(--sombra); font-size: .9rem; color: var(--tinta); }
.extra-ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--s-suave); color: var(--s); font-size: 16px; flex: none; }
.extra small { display: block; font-size: .68rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--tenue); }
.lista-act { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
details.incluye { margin-top: 16px; border-top: 1px solid var(--linea); padding-top: 12px; }
details.incluye summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: .86rem; color: var(--tinta); }
details.incluye summary::-webkit-details-marker { display: none; }
details.incluye summary svg { transition: transform .2s; color: var(--tenue); font-size: 18px; }
details.incluye[open] summary svg { transform: rotate(180deg); }
.dos-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 12px; }
.checks { margin: 0; padding: 0; list-style: none; display: grid; gap: 7px; font-size: .88rem; }
.checks li { display: flex; gap: 9px; align-items: flex-start; }
.checks li svg { margin-top: 3px; font-size: 15px; color: var(--p); }
.checks.is-no li svg { color: #c2410c; }
.libre { display: grid; grid-template-columns: 56px 1fr; gap: 18px; }
.libre-num { position: relative; z-index: 1; width: 56px; height: 56px; border-radius: 18px; background: var(--fondo); border: 2px dashed #d4d9e2; display: grid; place-items: center; color: var(--tenue); font-size: 22px; }
.libre-caja { padding: 14px 18px; border-radius: 16px; border: 1px dashed #d4d9e2; background: var(--blanco); }
.libre-caja strong { color: var(--tinta); }
.libre-caja p { margin: 2px 0 0; font-size: .88rem; color: var(--tenue); }
.libre.is-hoy .libre-num { border-style: solid; border-color: var(--s); color: var(--s); background: var(--s-suave); }
.libre.is-hoy .libre-caja { border-style: solid; border-color: var(--s); }

/* ===== Hoteles ===== */
.hoteles { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.hotel { padding: 18px 20px; border-radius: var(--radio); background: var(--blanco); box-shadow: var(--sombra); border-top: 4px solid var(--s); }
.hotel h3 { margin: 0 0 12px; font-size: 1.02rem; color: var(--tinta); line-height: 1.3; }
.hotel-fechas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: .84rem; }
.hotel-fechas small { display: block; font-size: .66rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--tenue); }
.hotel-fechas b { color: var(--tinta); font-weight: 600; text-transform: capitalize; }
.hotel-pie { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--linea); font-size: .8rem; color: var(--tenue); }

/* ===== Precio ===== */
.precio { display: grid; grid-template-columns: 1.3fr 1fr; gap: 0; border-radius: var(--radio); overflow: hidden; box-shadow: 0 10px 40px rgba(23,32,51,.1); background: var(--blanco); }
.precio-total { padding: 26px 28px; background: linear-gradient(135deg, var(--p), color-mix(in srgb, var(--p) 65%, black)); color: #fff; }
.precio-total small { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
.precio-total strong { display: block; margin: 6px 0 4px; font-family: var(--titulo); font-size: clamp(2rem, 5vw, 2.8rem); line-height: 1.05; }
.precio-total span { font-size: .88rem; opacity: .85; }
.precio-lado { padding: 22px 26px; display: grid; align-content: center; gap: 14px; }
.precio-lado small { display: block; font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--tenue); }
.precio-lado b { font-size: 1.25rem; color: var(--tinta); }
.precio-lado .ahorro b { color: #15803d; }

/* ===== Notas, incluye general, términos ===== */
.caja { padding: 22px 24px; border-radius: var(--radio); background: var(--blanco); box-shadow: var(--sombra); }
.caja-texto { font-size: .94rem; }
.caja-texto ul { padding-left: 20px; }
.nota-asesor { border-left: 4px solid var(--p); }
details.terminos summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: var(--tinta); }
details.terminos summary::-webkit-details-marker { display: none; }
details.terminos .caja-texto { margin-top: 14px; font-size: .86rem; color: var(--texto); }

/* ===== Contacto ===== */
.contacto { margin: 44px 0 0; padding: 30px; border-radius: 26px; background: linear-gradient(135deg, var(--tinta), color-mix(in srgb, var(--p) 40%, var(--tinta))); color: #fff; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; }
.contacto h2 { margin: 0 0 6px; font-family: var(--titulo); font-size: 1.6rem; }
.contacto p { margin: 0; opacity: .82; }
.contacto .asesor { margin-top: 12px; font-size: .86rem; opacity: .92; }
.contacto-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.contacto .btn { border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.1); color: #fff; }
.contacto .btn svg { color: #fff; }
.contacto .btn.is-wa { background: #1faa59; border-color: #1faa59; }
.pie { padding: 30px 0 calc(90px + env(safe-area-inset-bottom)); text-align: center; font-size: .78rem; color: var(--tenue); }
.pie b { color: var(--tinta); }

/* Botón flotante de WhatsApp (celular) */
.wa-flotante { position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 30; width: 56px; height: 56px; border-radius: 50%; background: #1faa59; color: #fff; display: grid; place-items: center; font-size: 28px; box-shadow: 0 10px 30px rgba(31,170,89,.45); }
.aviso { position: fixed; left: 50%; bottom: 90px; transform: translate(-50%, 20px); opacity: 0; z-index: 40; padding: 10px 16px; border-radius: 12px; background: var(--tinta); color: #fff; font-size: .86rem; transition: all .25s; pointer-events: none; }
.aviso.is-visible { opacity: 1; transform: translate(-50%, 0); }

/* Aparición suave al hacer scroll */
.revelar { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; }
.revelar.is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .revelar { opacity: 1; transform: none; transition: none; } .portada-img { animation: none; transform: none; } html { scroll-behavior: auto; } }

@media (max-width: 760px) {
    .portada { min-height: 70vh; }
    .portada-cuerpo { padding-bottom: 46px; }
    .datos-grid { grid-template-columns: 1fr 1fr; }
    .dato:nth-child(3) { border-left: 0; }
    .dato:nth-child(n+3) { border-top: 1px solid var(--linea); }
    .dato { padding: 14px; }
    .linea::before { left: 21px; }
    .dia, .libre { grid-template-columns: 44px 1fr; gap: 12px; }
    .dia-num, .libre-num { width: 44px; height: 44px; border-radius: 14px; }
    .dia-num b { font-size: 1.1rem; }
    .tarjeta-media { aspect-ratio: 16 / 9; }
    .tarjeta-cuerpo { padding: 16px 16px 18px; }
    .tarjeta h3 { font-size: 1.2rem; }
    .dos-col { grid-template-columns: 1fr; }
    .precio { grid-template-columns: 1fr; }
    .contacto { grid-template-columns: 1fr; padding: 24px; }
    .acciones .btn { flex: 1 1 calc(50% - 8px); justify-content: center; }
}
@media (min-width: 761px) { .wa-flotante { display: none; } }

/* Impresión / Guardar en PDF */
@media print {
    @page { margin: 14mm; }
    body { background: #fff; }
    .nav-dias, .acciones, .wa-flotante, .contacto-btns, .aviso { display: none !important; }
    .portada { min-height: 0; height: 300px; }
    .portada-img { animation: none; transform: none; }
    .revelar { opacity: 1; transform: none; }
    .tarjeta, .caja, .hotel, .extra, .datos-grid, .precio { box-shadow: none; border: 1px solid var(--linea); }
    .dia, .hotel, .precio { break-inside: avoid; }
    details > *:not(summary) { display: block !important; }
    .contacto { background: #fff; color: var(--tinta); border: 1px solid var(--linea); }
}
</style>
</head>
<body>

<header class="portada">
    <?php if ($portada): ?><img class="portada-img" src="<?= $e($portada) ?>" alt=""><?php else: ?><div class="portada-marca"></div><?php endif; ?>
    <div class="portada-top">
        <div class="envoltura">
            <span class="logo-card"><?php if ($logoUrl): ?><img src="<?= $e($logoUrl) ?>" alt="<?= $e($nombreAgencia) ?>"><?php else: ?><?= $e($nombreAgencia ?: $t['itinerario']) ?><?php endif; ?></span>
            <span class="etiqueta"><?= $e($t['itinerario']) ?></span>
        </div>
    </div>
    <div class="portada-cuerpo">
        <div class="envoltura">
            <div id="estado-viaje" class="estado-viaje" hidden><i></i><span></span></div>
            <?php if ($pasajero): ?><div class="etiqueta"><?= $e($t['preparado']) ?> <?= $e($pasajero) ?></div><?php endif; ?>
            <h1><?= $e($tituloViaje) ?></h1>
            <div class="para"><?= $e($fechasTxt) ?><?= $duracionTxt ? ' · <b>' . $e($duracionTxt) . '</b>' : '' ?></div>
        </div>
    </div>
</header>

<section class="datos">
    <div class="envoltura">
        <div class="datos-grid">
            <div class="dato"><span class="dato-ico"><?= $iconos['cal'] ?></span><div><small><?= $e($t['fechas']) ?></small><strong><?= $e($fechasTxt) ?></strong></div></div>
            <div class="dato"><span class="dato-ico"><?= $iconos['reloj'] ?></span><div><small><?= $e($t['duracion']) ?></small><strong><?= $e($duracionTxt ?: '—') ?></strong></div></div>
            <div class="dato"><span class="dato-ico"><?= $iconos['gente'] ?></span><div><small><?= $e($t['viajeros']) ?></small><strong><?= $nPax ? $e($nPax . ' ' . ($nPax === 1 ? $t['pasajero'] : $t['pasajeros'])) : '—' ?></strong></div></div>
            <div class="dato"><span class="dato-ico"><?= $iconos['pin'] ?></span><div><small><?= $e($t['destinos']) ?></small><strong><?= $e($destinos ? implode(', ', $destinos) : '—') ?></strong></div></div>
        </div>
        <div class="acciones">
            <?php if ($waUrl): ?><a class="btn is-wa" href="<?= $e($waUrl) ?>" target="_blank" rel="noopener"><?= $iconos['wa'] ?><?= $e($t['escribir']) ?></a><?php endif; ?>
            <?php if ($llegada && $diasJs): ?><button type="button" class="btn" data-accion="calendario"><?= $iconos['cal'] ?><?= $e($t['calendario']) ?></button><?php endif; ?>
            <button type="button" class="btn" data-accion="compartir"><?= $iconos['compartir'] ?><?= $e($t['compartir']) ?></button>
            <button type="button" class="btn" data-accion="imprimir"><?= $iconos['pdf'] ?><?= $e($t['imprimir']) ?></button>
        </div>
    </div>
</section>

<?php if ($linea): ?>
<nav class="nav-dias" id="nav-dias" aria-label="<?= $e($t['dia_a_dia']) ?>">
    <div class="envoltura">
        <?php foreach ($linea as $u): if ($u['tipo'] === 'dia'): $f = $llegada ? $sumarDias($llegada, $u['dia'] - 1) : ''; ?>
            <a class="nav-dia" href="#dia-<?= (int) $u['dia'] ?>" data-dia="<?= (int) $u['dia'] ?>" aria-label="<?= $e($t['ir_dia'] . ' ' . $u['dia']) ?>"><?= $e($t['dia']) ?><b><?= str_pad((string) $u['dia'], 2, '0', STR_PAD_LEFT) ?></b><?= $f ? $e($fechaSolo($f)) : '' ?></a>
        <?php else: ?>
            <a class="nav-dia is-libre" href="#libre-<?= (int) $u['desde'] ?>"><?= $iconos['taza'] ?><b>·</b><?= $e($u['desde'] === $u['hasta'] ? $t['libre'] : $t['libres']) ?></a>
        <?php endif; endforeach; ?>
    </div>
</nav>

<main class="envoltura">
    <section class="seccion">
        <div class="seccion-cab revelar">
            <span class="etiqueta"><?= $e($t['itinerario']) ?></span>
            <h2><?= $e($t['dia_a_dia']) ?></h2>
            <p><?= $e($t['dia_a_dia_sub']) ?></p>
        </div>
        <div class="linea">
        <?php foreach ($linea as $u): ?>
            <?php if ($u['tipo'] === 'libre'):
                $fd = $llegada ? $sumarDias($llegada, $u['desde'] - 1) : ''; $fh = $llegada ? $sumarDias($llegada, $u['hasta'] - 1) : ''; ?>
            <div class="libre revelar" id="libre-<?= (int) $u['desde'] ?>" data-desde="<?= $e($fd) ?>" data-hasta="<?= $e($fh) ?>">
                <div class="libre-num"><?= $iconos['taza'] ?></div>
                <div class="libre-caja">
                    <strong><?= $e($u['desde'] === $u['hasta'] ? $t['libre'] : $t['libres']) ?></strong> <span class="chip-hoy" hidden><?= $e($t['hoy']) ?></span>
                    · <?= $e($t['dia'] . ' ' . $u['desde'] . ($u['hasta'] > $u['desde'] ? '–' . $u['hasta'] : '')) ?><?= $fd ? ' · ' . $e($fechaSolo($fd) . ($fh !== $fd ? ' – ' . $fechaSolo($fh) : '')) : '' ?>
                    <p><?= $e($t['libre_txt']) ?></p>
                </div>
            </div>
            <?php else:
                $fechaDia = $llegada ? $sumarDias($llegada, $u['dia'] - 1) : '';
                $acts = $actividadesPorDia[$u['dia']] ?? [];
                $hotelNoche = $hotelDeNoche($fechaDia); ?>
            <article class="dia revelar" id="dia-<?= (int) $u['dia'] ?>" data-fecha="<?= $e($fechaDia) ?>">
                <div class="dia-num"><small><?= $e($t['dia']) ?></small><b><?= str_pad((string) $u['dia'], 2, '0', STR_PAD_LEFT) ?></b></div>
                <div class="dia-contenido">
                    <div class="dia-fecha"><?= $iconos['cal'] ?><span><?= $e($fechaDia ? $fechaCorta($fechaDia, true) : $t['dia'] . ' ' . $u['dia']) ?></span><span class="chip-hoy" hidden><?= $e($t['hoy']) ?></span></div>
                    <?php foreach ($u['items'] as $it):
                        $m = $it['modulo'];
                        $titulo = $m['titulo'] ?? preg_replace('/\.pdf$/i', '', $it['filename']);
                        $img = $imagenDe($m);
                        $parrafos = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) ($m['descripcion'] ?? '')))));
                        $lugares = $lista($m['lugares_visitar'] ?? '');
                        $inc = $lista($m['incluye'] ?? ''); $noInc = $lista($m['no_incluye'] ?? '');
                        $ruta = implode(' · ', array_filter([$m['destino'] ?? '', $m['categoria'] ?? ''])); ?>
                    <div class="tarjeta">
                        <?php if ($img): ?><div class="tarjeta-media"><img src="<?= $e($img) ?>" alt="<?= $e($titulo) ?>" loading="lazy" decoding="async"></div>
                        <?php else: ?><div class="tarjeta-media is-marca"><span><?= $e(mb_strtoupper(mb_substr($m['destino'] ?? $titulo, 0, 1))) ?></span></div><?php endif; ?>
                        <div class="tarjeta-cuerpo">
                            <?php if ($ruta): ?><div class="ruta"><?= $e($ruta) ?></div><?php endif; ?>
                            <h3><?= $e($titulo) ?></h3>
                            <?php if ($parrafos): ?><div class="desc"><?php foreach ($parrafos as $p): ?><p><?= $e($p) ?></p><?php endforeach; ?></div><?php endif; ?>
                            <?php if ($lugares): ?>
                                <div class="sub"><?= $e($t['lugares']) ?></div>
                                <ul class="chips"><?php foreach ($lugares as $l): ?><li><?= $iconos['pin'] ?><?= $e($l) ?></li><?php endforeach; ?></ul>
                            <?php endif; ?>
                            <?php if ($inc || $noInc): ?>
                            <details class="incluye">
                                <summary><?= $e($t['ver_incluye']) ?><?= $iconos['flecha'] ?></summary>
                                <div class="dos-col">
                                    <?php if ($inc): ?><div><div class="sub"><?= $e($t['incluye']) ?></div><ul class="checks"><?php foreach ($inc as $l): ?><li><?= $iconos['check'] ?><?= $e($l) ?></li><?php endforeach; ?></ul></div><?php endif; ?>
                                    <?php if ($noInc): ?><div><div class="sub"><?= $e($t['no_incluye']) ?></div><ul class="checks is-no"><?php foreach ($noInc as $l): ?><li><?= $iconos['x'] ?><?= $e($l) ?></li><?php endforeach; ?></ul></div><?php endif; ?>
                                </div>
                            </details>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php if ($acts || $hotelNoche): ?>
                    <div class="extras">
                        <?php if ($acts): ?><div class="extra"><span class="extra-ico"><?= $iconos['estrella'] ?></span><div><small><?= $e($t['actividades']) ?></small><ul class="lista-act"><?php foreach ($acts as $a): ?><li><?= $e($a) ?></li><?php endforeach; ?></ul></div></div><?php endif; ?>
                        <?php if ($hotelNoche): ?><div class="extra"><span class="extra-ico"><?= $iconos['cama'] ?></span><div><small><?= $e($t['noche_en']) ?></small><?= $e($hotelNoche) ?></div></div><?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </article>
            <?php endif; ?>
        <?php endforeach; ?>
        </div>
        <?php if ($otrasActividades): ?>
            <div class="caja revelar" style="margin-top:22px"><div class="sub" style="margin-top:0"><?= $e($t['otras']) ?></div><ul class="checks"><?php foreach ($otrasActividades as $a): ?><li><?= $iconos['estrella'] ?><?= $e($a) ?></li><?php endforeach; ?></ul></div>
        <?php endif; ?>
    </section>
<?php else: ?>
<main class="envoltura">
<?php endif; ?>

    <?php if ($hoteles): ?>
    <section class="seccion">
        <div class="seccion-cab revelar"><span class="etiqueta"><?= $e($t['etq_hoteles']) ?></span><h2><?= $e($t['hoteles']) ?></h2><p><?= $e($t['hoteles_sub']) ?></p></div>
        <div class="hoteles">
            <?php foreach ($hoteles as $h): $cin = $valFecha($h['cin'] ?? ''); $cout = $valFecha($h['cout'] ?? ''); $noc = (int) ($h['noches'] ?? 0); $hab = (int) ($h['nhab'] ?? 0); ?>
            <div class="hotel revelar">
                <h3><?= $e($h['aloj']) ?></h3>
                <div class="hotel-fechas">
                    <div><small><?= $e($t['checkin']) ?></small><b><?= $e($cin ? $fechaCorta($cin) : '—') ?></b></div>
                    <div><small><?= $e($t['checkout']) ?></small><b><?= $e($cout ? $fechaCorta($cout) : '—') ?></b></div>
                </div>
                <div class="hotel-pie"><?= $noc ? $e($noc . ' ' . ($noc === 1 ? $t['noche'] : $t['noches'])) : '' ?><?= $hab ? ' · ' . $e($hab . ' ' . $t['hab']) : '' ?></div>
            </div>
            <?php endforeach; ?>
        </div>
    </section>
    <?php endif; ?>

    <?php if ($mostrarPrecios): ?>
    <section class="seccion">
        <div class="seccion-cab revelar"><span class="etiqueta"><?= $e($t['inversion']) ?></span></div>
        <div class="precio revelar">
            <div class="precio-total">
                <small><?= $e($t['total']) ?></small>
                <strong><?= $e($dinero($total)) ?></strong>
                <?php if ($nPax): ?><span><?= $e($t['por'] . ' ' . $nPax . ' ' . ($nPax === 1 ? $t['pasajero'] : $t['pasajeros'])) ?></span><?php endif; ?>
            </div>
            <div class="precio-lado">
                <?php if ($pctReserva > 0): ?><div><small><?= $e($t['reserva']) ?> (<?= $e(rtrim(rtrim(number_format($pctReserva, 2, '.', ''), '0'), '.')) ?>%)</small><b><?= $e($dinero($total * $pctReserva / 100)) ?></b></div><?php endif; ?>
                <?php if ($ahorro >= 1): ?><div class="ahorro"><small><?= $e($t['descuento']) ?></small><b>− <?= $e($dinero($ahorro)) ?></b></div><?php endif; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <?php if ($incluyeTodo || $noIncluyeTodo): ?>
    <section class="seccion">
        <div class="seccion-cab revelar"><span class="etiqueta"><?= $e($t['etq_incluye']) ?></span><h2><?= $e($t['incluye_todo']) ?></h2></div>
        <div class="caja revelar">
            <div class="dos-col" style="margin-top:0">
                <?php if ($incluyeTodo): ?><div><div class="sub" style="margin-top:0"><?= $e($t['incluye']) ?></div><ul class="checks"><?php foreach ($incluyeTodo as $l): ?><li><?= $iconos['check'] ?><?= $e($l) ?></li><?php endforeach; ?></ul></div><?php endif; ?>
                <?php if ($noIncluyeTodo): ?><div><div class="sub" style="margin-top:0"><?= $e($t['no_incluye']) ?></div><ul class="checks is-no"><?php foreach ($noIncluyeTodo as $l): ?><li><?= $iconos['x'] ?><?= $e($l) ?></li><?php endforeach; ?></ul></div><?php endif; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <?php if ($notas): ?>
    <section class="seccion">
        <div class="caja nota-asesor revelar"><div class="sub" style="margin-top:0"><?= $e($t['notas']) ?></div><div class="caja-texto"><?= $notas ?></div></div>
    </section>
    <?php endif; ?>

    <?php if ($terminos): ?>
    <section class="seccion">
        <details class="caja terminos revelar"><summary><?= $e($t['terminos']) ?><?= $iconos['flecha'] ?></summary><div class="caja-texto"><?= $terminos ?></div></details>
    </section>
    <?php endif; ?>

    <?php if ($waUrl || $telUrl || $agente): ?>
    <section class="contacto revelar">
        <div>
            <h2><?= $e($t['contacto']) ?></h2>
            <p><?= $e($t['contacto_sub']) ?></p>
            <?php if ($agente): ?><div class="asesor"><?= $e($t['asesor']) ?>: <b><?= $e($agente) ?></b><?= $nombreAgencia ? ' · ' . $e($nombreAgencia) : '' ?></div><?php endif; ?>
        </div>
        <div class="contacto-btns">
            <?php if ($waUrl): ?><a class="btn is-wa" href="<?= $e($waUrl) ?>" target="_blank" rel="noopener"><?= $iconos['wa'] ?><?= $e($t['escribir']) ?></a><?php endif; ?>
            <?php if ($telUrl): ?><a class="btn" href="<?= $e($telUrl) ?>"><?= $iconos['tel'] ?><?= $e($t['llamar']) ?></a><?php endif; ?>
        </div>
    </section>
    <?php endif; ?>
</main>

<footer class="pie">
    <b><?= $e($nombreAgencia) ?></b><?= !empty($ag['direccion']) ? ' · ' . $e($ag['direccion']) : '' ?><?= $tel ? ' · ' . $e($tel) : '' ?>
</footer>

<?php if ($waUrl): ?><a class="wa-flotante" href="<?= $e($waUrl) ?>" target="_blank" rel="noopener" aria-label="<?= $e($t['escribir']) ?>"><?= $iconos['wa'] ?></a><?php endif; ?>
<div class="aviso" id="aviso" role="status" aria-live="polite"></div>

<script>
(function () {
    const D = <?= json_encode($jsDatos, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
    const fmt = (s, ...v) => v.reduce((a, x) => a.replace('%d', x), s);
    // Fecha local de hoy (la del pasajero, no la del servidor).
    const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    const diasEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

    // Estado del viaje: cuenta regresiva, en curso (con "Hoy" resaltado) o terminado.
    if (D.llegada) {
        const estado = document.getElementById('estado-viaje');
        const faltan = diasEntre(hoy, D.llegada);
        let txt;
        if (faltan > 1) txt = fmt(D.t.faltan, faltan);
        else if (faltan === 1) txt = D.t.falta1;
        else if (faltan === 0) txt = D.t.hoy_empieza;
        else if (D.fin && hoy <= D.fin) txt = fmt(D.t.en_curso, diasEntre(D.llegada, hoy) + 1, D.nDias || diasEntre(D.llegada, D.fin) + 1);
        else txt = D.t.terminado;
        estado.querySelector('span').textContent = txt;
        estado.hidden = false;
        // Hoy: el día del itinerario o, si cae en días libres, ese bloque.
        const diaHoy = document.querySelector(`.dia[data-fecha="${hoy}"]`)
            || [...document.querySelectorAll('.libre[data-desde]')].find(b => b.dataset.desde && b.dataset.desde <= hoy && hoy <= b.dataset.hasta);
        if (diaHoy) {
            diaHoy.classList.add('is-hoy');
            const chip = diaHoy.querySelector('.chip-hoy');
            if (chip) chip.hidden = false;
            // Durante el viaje, abre directo en el día de hoy.
            if (!location.hash) setTimeout(() => diaHoy.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
        }
    }

    // Aparición suave de las secciones y día activo en la barra de días.
    const nav = document.getElementById('nav-dias');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-visible'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('.revelar').forEach(el => io.observe(el));
        if (nav) {
            const enlaces = new Map([...nav.querySelectorAll('.nav-dia[data-dia]')].map(a => [a.dataset.dia, a]));
            const ioDia = new IntersectionObserver(es => es.forEach(x => {
                if (!x.isIntersecting) return;
                enlaces.forEach(a => a.classList.remove('is-activo'));
                const a = enlaces.get(x.target.id.replace('dia-', ''));
                if (a) { a.classList.add('is-activo'); a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
            }), { rootMargin: '-45% 0px -50% 0px' });
            document.querySelectorAll('.dia').forEach(el => ioDia.observe(el));
        }
    } else {
        document.querySelectorAll('.revelar').forEach(el => el.classList.add('is-visible'));
    }
    if (nav) {
        const marcar = () => nav.classList.toggle('is-fija', nav.getBoundingClientRect().top <= 0);
        window.addEventListener('scroll', marcar, { passive: true });
        marcar();
    }

    const aviso = (txt) => {
        const el = document.getElementById('aviso');
        el.textContent = txt;
        el.classList.add('is-visible');
        clearTimeout(aviso.t);
        aviso.t = setTimeout(() => el.classList.remove('is-visible'), 2200);
    };

    // Calendario: un evento de día completo por cada día del viaje (.ics, sirve en Google,
    // Apple y Outlook).
    function descargarCalendario() {
        const ics = (s) => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
        const compacta = (f) => f.replace(/-/g, '');
        const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
        const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Itinerario//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
        D.dias.filter(d => d.fecha).forEach(d => {
            const fin = new Date(Date.parse(d.fecha + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
            lineas.push('BEGIN:VEVENT', `UID:${D.cot}-${d.dia}@itinerario`, `DTSTAMP:${sello}`,
                `DTSTART;VALUE=DATE:${compacta(d.fecha)}`, `DTEND;VALUE=DATE:${compacta(fin)}`,
                `SUMMARY:${ics(`${D.t.dia} ${d.dia} · ${d.titulo || D.titulo}`)}`,
                `DESCRIPTION:${ics(`${D.titulo}${D.agencia ? ' · ' + D.agencia : ''}\n${location.href}`)}`, 'END:VEVENT');
        });
        lineas.push('END:VCALENDAR');
        const url = URL.createObjectURL(new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `${(D.titulo || 'viaje').replace(/[^\w\- ]+/g, '').trim() || 'viaje'}.ics` });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    async function compartir() {
        const datos = { title: document.title, url: location.href };
        if (navigator.share) { try { await navigator.share(datos); return; } catch (e) { if (e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(location.href); aviso(D.t.copiado); }
        catch (e) { prompt('', location.href); }
    }
    document.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        if (b.dataset.accion === 'calendario') descargarCalendario();
        if (b.dataset.accion === 'compartir') compartir();
        if (b.dataset.accion === 'imprimir') {
            document.querySelectorAll('details').forEach(d => d.open = true);
            window.print();
        }
    });
})();
</script>
</body>
</html>
