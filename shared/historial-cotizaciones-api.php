<?php
// shared/historial-cotizaciones-api.php
// Datos de la vista Historial de cotizaciones (historial-cotizaciones.js): las cotizaciones de
// USD y PEN juntas, de la más reciente a la más antigua según su creación, ya resumidas
// (pasajero, viaje, contenido y total) para no mandar el JSON completo de cada una.
//
// GET ?q=texto&moneda=todas|usd|pen&pagina=1
// → { filas: [...], total, pagina, por_pagina, resumen: { total, usd, pen, este_mes } }
//
// Mismo ámbito que la API del cotizador (filtroCotizaciones en api.php): las de mi agencia y,
// para el admin, además las históricas sin creado_por.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}
header('Content-Type: application/json');

const HC_POR_PAGINA = 25;

// Fecha de creación: el ID es "COT-" + milisegundos de cuando se creó (fecha_guardado cambia
// con cada guardado). Si el ID no tiene esa forma, se usa fecha_guardado.
const HC_CREADA = "CASE WHEN c.id REGEXP '^COT-[0-9]{13}$' THEN FROM_UNIXTIME(CAST(SUBSTRING(c.id, 5) AS UNSIGNED) DIV 1000) ELSE c.fecha_guardado END";

function hcNumero($valor) {
    return is_numeric($valor) ? (float) $valor : 0.0;
}

// Total final igual que calcularResumen() del cotizador: precio promo de actividades y
// hoteles, más el precio adicional, menos el descuento especial.
function hcResumen(array $data) {
    $pax = is_array($data['pax'] ?? null) ? $data['pax'] : [];
    $tours = array_values(array_filter(is_array($data['tours'] ?? null) ? $data['tours'] : [], fn($t) => trim($t['tour'] ?? '') !== ''));
    $hoteles = array_values(array_filter(is_array($data['hotels'] ?? null) ? $data['hotels'] : [], fn($h) => trim($h['aloj'] ?? '') !== ''));

    $total = 0.0;
    foreach ($tours as $t) $total += hcNumero($t['ppromo'] ?? 0) * hcNumero($t['cant'] ?? 0);
    foreach ($hoteles as $h) $total += hcNumero($h['ppromo'] ?? 0) * hcNumero($h['nhab'] ?? 0) * hcNumero($h['noches'] ?? 0);
    $precios = is_array($data['precios'] ?? null) ? $data['precios'] : [];
    $total += hcNumero($precios['precioAdicional'] ?? 0) - hcNumero($precios['descuentoEspecial'] ?? 0);

    // Días del itinerario armado (Día 1 = llegada, cuenta los libres de en medio).
    $armado = is_array($data['itinerarioArmado'] ?? null) ? $data['itinerarioArmado'] : [];
    $modulos = is_array($armado['modulos'] ?? null) ? count($armado['modulos']) : 0;
    $dias = is_array($armado['dias'] ?? null) && $armado['dias'] ? (int) max(array_map('intval', $armado['dias'])) : $modulos;

    $texto = fn($k) => trim((string) ($pax[$k] ?? ''));
    return [
        'nombre_pax' => $texto('nombre_pax'),
        'contacto'   => $texto('contacto'),
        'pais'       => $texto('pais'),
        'n_pax'      => (int) hcNumero($pax['n_pax'] ?? 0),
        'f_llegada'  => $texto('f_llegada'),
        'f_salida'   => $texto('f_salida'),
        'idioma'     => $texto('idioma'),
        'agente'     => $texto('agente'),
        'paquete'    => trim((string) ($data['paquete']['nombre'] ?? '')),
        'actividades' => count($tours),
        'hoteles'    => count($hoteles),
        'modulos'    => $modulos,
        'dias_itinerario' => $dias,
        'total'      => round($total, 2),
        'estado'     => ($data['estado'] ?? '') === 'borrador' ? 'borrador' : 'terminada',
    ];
}

try {
    $db = getDB();
    $monedas = ['usd', 'pen'];
    $monedaPedida = $_GET['moneda'] ?? 'todas';
    $monedasConsulta = in_array($monedaPedida, $monedas, true) ? [$monedaPedida] : $monedas;
    $q = trim((string) ($_GET['q'] ?? ''));
    $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
    // Estado: 'borrador' | 'terminada' (las de antes, sin estado, son terminadas) | todas.
    $estadoPedido = $_GET['estado'] ?? 'todas';

    [$fd, $pd] = filtroDueno('c.creado_por');
    $ambito = is_admin() ? "($fd OR c.creado_por IS NULL)" : $fd;

    // Búsqueda: ID, pasajero, contacto, país o paquete. La columna `data` es utf8mb4_bin
    // (distingue mayúsculas), así que se compara todo en minúsculas.
    $condBusqueda = '';
    $paramsBusqueda = [];
    if ($q !== '') {
        $campos = ['c.id'];
        foreach (['$.pax.nombre_pax', '$.pax.contacto', '$.pax.pais', '$.paquete.nombre'] as $ruta) {
            $campos[] = "JSON_UNQUOTE(JSON_EXTRACT(c.data, '$ruta'))";
        }
        $condBusqueda = ' AND (' . implode(' OR ', array_map(fn($c) => "LOWER($c) LIKE LOWER(?)", $campos)) . ')';
        $paramsBusqueda = array_fill(0, count($campos), '%' . $q . '%');
    }
    if ($estadoPedido === 'borrador') {
        $condBusqueda .= " AND JSON_UNQUOTE(JSON_EXTRACT(c.data, '$.estado')) = 'borrador'";
    } elseif ($estadoPedido === 'terminada') {
        $condBusqueda .= " AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.data, '$.estado')), '') <> 'borrador'";
    }

    // Una subconsulta por moneda, unidas: así se ordena y pagina en el servidor.
    $partes = [];
    $params = [];
    foreach ($monedasConsulta as $m) {
        $partes[] = "SELECT '$m' AS moneda, c.id, c.data, c.fecha_guardado, " . HC_CREADA . " AS creada, u.usuario AS creado_por_nombre
                     FROM cotizaciones_$m c LEFT JOIN usuarios u ON u.id = c.creado_por
                     WHERE $ambito$condBusqueda";
        array_push($params, ...$pd, ...$paramsBusqueda);
    }
    $union = implode(' UNION ALL ', $partes);

    $stmt = $db->prepare("SELECT COUNT(*) FROM ($union) x");
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();

    $porPagina = HC_POR_PAGINA;
    $paginas = max(1, (int) ceil($total / $porPagina));
    $pagina = min($pagina, $paginas);
    $offset = ($pagina - 1) * $porPagina;
    $stmt = $db->prepare("SELECT * FROM ($union) x ORDER BY creada DESC, id DESC LIMIT $porPagina OFFSET $offset");
    $stmt->execute($params);
    $filas = [];
    while ($r = $stmt->fetch()) {
        $data = json_decode($r['data'], true);
        $filas[] = array_merge([
            'id' => $r['id'],
            'moneda' => $r['moneda'],
            'creada' => $r['creada'],
            'modificada' => $r['fecha_guardado'],
            'creado_por' => $r['creado_por_nombre'],
        ], hcResumen(is_array($data) ? $data : []));
    }

    // Resumen de arriba: sin la búsqueda ni el filtro de moneda (siempre lo de la agencia).
    $resumen = ['total' => 0, 'usd' => 0, 'pen' => 0, 'este_mes' => 0];
    foreach ($monedas as $m) {
        $stmt = $db->prepare("SELECT COUNT(*) AS n,
                                     SUM(" . HC_CREADA . " >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS mes
                              FROM cotizaciones_$m c WHERE $ambito");
        $stmt->execute($pd);
        $fila = $stmt->fetch();
        $resumen[$m] = (int) $fila['n'];
        $resumen['total'] += (int) $fila['n'];
        $resumen['este_mes'] += (int) $fila['mes'];
    }

    echo json_encode([
        'filas' => $filas,
        'total' => $total,
        'pagina' => $pagina,
        'por_pagina' => $porPagina,
        'resumen' => $resumen,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    error_log('historial-cotizaciones-api: ' . $e->getMessage());
    echo json_encode(['error' => 'No se pudo cargar el historial.']);
}
