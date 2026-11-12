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
// Todo pedido que modifica algo debe traer el token CSRF de la sesión (ver auth.php).
exigirCsrf();
header('Content-Type: application/json');

const HC_POR_PAGINA = 25;

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
    // Estado: 'borrador' | 'terminada' | 'papelera' (eliminadas, se borran solas a los 30 días) | todas.
    $estadoPedido = $_GET['estado'] ?? 'todas';
    $enPapelera = $estadoPedido === 'papelera';
    // Al mirar la papelera se borra para siempre lo que ya pasó los 30 días (igual que en api.php).
    if ($enPapelera) {
        foreach ($monedas as $m) $db->exec("DELETE FROM cotizaciones_$m WHERE eliminado_en IS NOT NULL AND eliminado_en < NOW() - INTERVAL 30 DAY");
    }

    [$fd, $pd] = filtroDueno('c.creado_por');
    $ambito = is_admin() ? "($fd OR c.creado_por IS NULL)" : $fd;

    // Búsqueda: ID, pasajero, contacto, país o paquete. La columna `data` es utf8mb4_bin
    // (distingue mayúsculas), así que se compara todo en minúsculas.
    $condBusqueda = $enPapelera ? ' AND c.eliminado_en IS NOT NULL' : ' AND c.eliminado_en IS NULL';
    $paramsBusqueda = [];
    if ($q !== '') {
        $campos = ['c.id'];
        foreach (['$.pax.nombre_pax', '$.pax.contacto', '$.pax.pais', '$.paquete.nombre'] as $ruta) {
            $campos[] = "JSON_UNQUOTE(JSON_EXTRACT(c.data, '$ruta'))";
        }
        $condBusqueda .= ' AND (' . implode(' OR ', array_map(fn($c) => "LOWER($c) LIKE LOWER(?)", $campos)) . ')';
        $paramsBusqueda = array_fill(0, count($campos), '%' . $q . '%');
    }
    // Columna `estado` calculada (migración 041), con índice.
    if ($estadoPedido === 'borrador' || $estadoPedido === 'terminada') {
        $condBusqueda .= " AND c.estado = '$estadoPedido'";
    }

    // Una subconsulta liviana por moneda (sin el JSON), unidas: así se ordena y pagina en el
    // servidor sin cargar el contenido de todas. creada_ms = milisegundos del ID (índice).
    $partes = [];
    $params = [];
    foreach ($monedasConsulta as $m) {
        $partes[] = "SELECT '$m' AS moneda, c.id, c.creada_ms, FROM_UNIXTIME(c.creada_ms DIV 1000) AS creada, c.fecha_guardado, c.eliminado_en, u.usuario AS creado_por_nombre
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
    $orden = $enPapelera ? 'eliminado_en DESC' : 'COALESCE(creada_ms, UNIX_TIMESTAMP(fecha_guardado) * 1000) DESC';
    $stmt = $db->prepare("SELECT * FROM ($union) x ORDER BY $orden, id DESC LIMIT $porPagina OFFSET $offset");
    $stmt->execute($params);
    $pagina_filas = $stmt->fetchAll();

    // Solo ahora se trae el JSON, y solo de las filas de esta página.
    $datos = [];
    foreach ($monedas as $m) {
        $ids = array_column(array_filter($pagina_filas, fn($r) => $r['moneda'] === $m), 'id');
        if (!$ids) continue;
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = $db->prepare("SELECT id, data FROM cotizaciones_$m WHERE id IN ($marcas)");
        $st->execute($ids);
        foreach ($st->fetchAll() as $d) $datos["$m|{$d['id']}"] = json_decode($d['data'], true);
    }

    $filas = [];
    foreach ($pagina_filas as $r) {
        $data = $datos["{$r['moneda']}|{$r['id']}"] ?? [];
        $filas[] = array_merge([
            'id' => $r['id'],
            'moneda' => $r['moneda'],
            'creada' => $r['creada'] ?: $r['fecha_guardado'], // fecha de MySQL (misma zona horaria que antes)
            'modificada' => $r['fecha_guardado'],
            'creado_por' => $r['creado_por_nombre'],
            'eliminada' => $r['eliminado_en'],
        ], hcResumen(is_array($data) ? $data : []));
    }

    // Resumen de arriba: sin la búsqueda ni los filtros (siempre lo de la agencia).
    $resumen = ['total' => 0, 'usd' => 0, 'pen' => 0, 'este_mes' => 0, 'papelera' => 0];
    foreach ($monedas as $m) {
        $stmt = $db->prepare("SELECT SUM(c.eliminado_en IS NULL) AS n,
                                     SUM(c.eliminado_en IS NULL AND c.creada_ms >= UNIX_TIMESTAMP(DATE_FORMAT(CURDATE(), '%Y-%m-01')) * 1000) AS mes,
                                     SUM(c.eliminado_en IS NOT NULL) AS papelera
                              FROM cotizaciones_$m c WHERE $ambito");
        $stmt->execute($pd);
        $fila = $stmt->fetch();
        $resumen[$m] = (int) $fila['n'];
        $resumen['total'] += (int) $fila['n'];
        $resumen['este_mes'] += (int) $fila['mes'];
        $resumen['papelera'] += (int) $fila['papelera'];
    }

    echo json_encode([
        'filas' => $filas,
        'total' => $total,
        'pagina' => $pagina,
        'por_pagina' => $porPagina,
        'resumen' => $resumen,
        'papelera_dias' => 30,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    error_log('historial-cotizaciones-api: ' . $e->getMessage());
    echo json_encode(['error' => 'No se pudo cargar el historial.']);
}
