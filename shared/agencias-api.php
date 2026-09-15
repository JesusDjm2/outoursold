<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/agencia-helpers.php';
require_once __DIR__ . '/error-helpers.php';

if (!is_admin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Solo el administrador puede gestionar agencias.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$uploadDir = __DIR__ . '/uploads/agencias/';

try {
    switch ($path) {
        case 'listar':
            $stmt = $db->query("SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp,
                                        color_principal, color_secundario, logo, es_principal,
                                        terminos_es, terminos_en, terminos_pt, creado_en
                                 FROM agencias ORDER BY es_principal DESC, nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'crear':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $nombre = trim($_POST['nombre'] ?? '');
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre de la agencia es obligatorio']);
                break;
            }
            [$logo, $logoError] = guardarLogoAgencia($_FILES['logo'] ?? null, $uploadDir);
            if ($logoError) {
                http_response_code(400);
                echo json_encode(['error' => $logoError]);
                break;
            }
            $stmt = $db->prepare("INSERT INTO agencias (nombre, ruc, direccion, telefono, telefono2, whatsapp, color_principal, color_secundario, logo, terminos_es, terminos_en, terminos_pt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $nombre,
                trim($_POST['ruc'] ?? ''),
                trim($_POST['direccion'] ?? ''),
                trim($_POST['telefono'] ?? ''),
                trim($_POST['telefono2'] ?? ''),
                trim($_POST['whatsapp'] ?? ''),
                trim($_POST['color_principal'] ?? '') ?: null,
                trim($_POST['color_secundario'] ?? '') ?: null,
                $logo,
                sanitizarHtmlTerminos($_POST['terminos_es'] ?? ''),
                sanitizarHtmlTerminos($_POST['terminos_en'] ?? ''),
                sanitizarHtmlTerminos($_POST['terminos_pt'] ?? '')
            ]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;

        case 'editar':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $id = intval($_POST['id'] ?? 0);
            $nombre = trim($_POST['nombre'] ?? '');
            if (!$id || $nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'ID y nombre son obligatorios']);
                break;
            }
            [$logo, $logoError] = guardarLogoAgencia($_FILES['logo'] ?? null, $uploadDir);
            if ($logoError) {
                http_response_code(400);
                echo json_encode(['error' => $logoError]);
                break;
            }
            $comunes = [
                $nombre,
                trim($_POST['ruc'] ?? ''),
                trim($_POST['direccion'] ?? ''),
                trim($_POST['telefono'] ?? ''),
                trim($_POST['telefono2'] ?? ''),
                trim($_POST['whatsapp'] ?? ''),
                trim($_POST['color_principal'] ?? '') ?: null,
                trim($_POST['color_secundario'] ?? '') ?: null,
                sanitizarHtmlTerminos($_POST['terminos_es'] ?? ''),
                sanitizarHtmlTerminos($_POST['terminos_en'] ?? ''),
                sanitizarHtmlTerminos($_POST['terminos_pt'] ?? '')
            ];
            if ($logo) {
                $stmt = $db->prepare("SELECT logo FROM agencias WHERE id = ?");
                $stmt->execute([$id]);
                $anterior = $stmt->fetchColumn();
                if ($anterior && file_exists($uploadDir . $anterior)) {
                    @unlink($uploadDir . $anterior);
                }
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, color_principal = ?, color_secundario = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ?, logo = ? WHERE id = ?");
                $stmt->execute([...$comunes, $logo, $id]);
            } else {
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, color_principal = ?, color_secundario = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ? WHERE id = ?");
                $stmt->execute([...$comunes, $id]);
            }
            echo json_encode(['success' => true]);
            break;

        case 'marcar-principal':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = intval($data['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $db->beginTransaction();
            try {
                $db->exec("UPDATE agencias SET es_principal = 0 WHERE es_principal = 1");
                $stmt = $db->prepare("UPDATE agencias SET es_principal = 1 WHERE id = ?");
                $stmt->execute([$id]);
                if ($stmt->rowCount() === 0) {
                    throw new Exception('Agencia no encontrada');
                }
                $db->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'eliminar':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = intval($data['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("SELECT logo, es_principal FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            $agencia = $stmt->fetch();
            if ($agencia && $agencia['es_principal'] == 1) {
                http_response_code(400);
                echo json_encode(['error' => 'No se puede eliminar la agencia principal. Marca otra como principal primero.']);
                break;
            }
            $logo = $agencia['logo'] ?? null;
            $stmt = $db->prepare("DELETE FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            if ($logo && file_exists($uploadDir . $logo)) {
                @unlink($uploadDir . $logo);
            }
            echo json_encode(['success' => true]);
            break;

        // Comparativo/ranking entre todas las agencias: una sola pasada por cada tabla de
        // cotizaciones (pen/usd) e itinerarios (es/en/pt) en vez de repetir la consulta por
        // agencia, para que escale bien aunque haya muchas agencias con muchos registros.
        case 'ranking':
            $stmt = $db->query("SELECT id, nombre, logo, es_principal FROM agencias ORDER BY es_principal DESC, nombre");
            $agencias = $stmt->fetchAll();

            $stmt = $db->query("SELECT id, agencia_id FROM usuarios WHERE agencia_id IS NOT NULL");
            $usuarioAgencia = [];
            foreach ($stmt->fetchAll() as $u) {
                $usuarioAgencia[$u['id']] = $u['agencia_id'];
            }

            $stats = [];
            foreach ($agencias as $a) {
                $stats[$a['id']] = [
                    'id' => $a['id'],
                    'nombre' => $a['nombre'],
                    'logo' => $a['logo'],
                    'es_principal' => $a['es_principal'],
                    'destinos' => 0,
                    'categorias' => 0,
                    'cotizaciones' => 0,
                    'actividades' => 0,
                    'hoteles' => 0,
                    'itinerarios' => 0,
                    'ingresos_pen' => 0.0,
                    'ingresos_usd' => 0.0,
                    'ultima_actividad' => null
                ];
            }

            // Destinos y categorías (de tours y de hoteles) ya son propios de cada usuario —
            // un simple conteo agrupado alcanza, no hace falta leer fila por fila como el
            // resto de las métricas (que sí necesitan procesar el JSON de cada cotización).
            $stmt = $db->query("SELECT creado_por, COUNT(*) AS n FROM destinos WHERE creado_por IS NOT NULL GROUP BY creado_por");
            foreach ($stmt->fetchAll() as $row) {
                $agenciaId = $usuarioAgencia[$row['creado_por']] ?? null;
                if (!$agenciaId || !isset($stats[$agenciaId])) continue;
                $stats[$agenciaId]['destinos'] += (int) $row['n'];
            }
            foreach (['categorias', 'categorias_hoteles'] as $tablaCategoriaRanking) {
                $stmt = $db->query("SELECT creado_por, COUNT(*) AS n FROM $tablaCategoriaRanking WHERE creado_por IS NOT NULL GROUP BY creado_por");
                foreach ($stmt->fetchAll() as $row) {
                    $agenciaId = $usuarioAgencia[$row['creado_por']] ?? null;
                    if (!$agenciaId || !isset($stats[$agenciaId])) continue;
                    $stats[$agenciaId]['categorias'] += (int) $row['n'];
                }
            }

            foreach (['pen', 'usd'] as $moneda) {
                $stmt = $db->query("SELECT creado_por, data, fecha_guardado FROM cotizaciones_$moneda WHERE creado_por IS NOT NULL");
                while ($row = $stmt->fetch()) {
                    $agenciaId = $usuarioAgencia[$row['creado_por']] ?? null;
                    if (!$agenciaId || !isset($stats[$agenciaId])) continue;
                    $data = json_decode($row['data'], true) ?: [];
                    $tours = array_filter($data['tours'] ?? [], fn($t) => trim($t['tour'] ?? '') !== '');
                    $hotels = array_filter($data['hotels'] ?? [], fn($h) => trim($h['aloj'] ?? '') !== '');
                    $precios = $data['precios'] ?? [];
                    $pvPromo = 0;
                    foreach ($tours as $t) $pvPromo += (float)($t['cant'] ?? 0) * (float)($t['ppromo'] ?? 0);
                    foreach ($hotels as $h) $pvPromo += (float)($h['nhab'] ?? 0) * (float)($h['noches'] ?? 0) * (float)($h['ppromo'] ?? 0);
                    $totalCot = $pvPromo + (float)($precios['precioAdicional'] ?? 0) - (float)($precios['descuentoEspecial'] ?? 0);

                    $stats[$agenciaId]['cotizaciones']++;
                    $stats[$agenciaId]['actividades'] += count($tours);
                    $stats[$agenciaId]['hoteles'] += count($hotels);
                    $stats[$agenciaId]["ingresos_$moneda"] += $totalCot;
                    if (!$stats[$agenciaId]['ultima_actividad'] || $row['fecha_guardado'] > $stats[$agenciaId]['ultima_actividad']) {
                        $stats[$agenciaId]['ultima_actividad'] = $row['fecha_guardado'];
                    }
                }
            }

            foreach (['es', 'en', 'pt'] as $idioma) {
                $stmt = $db->query("SELECT generado_por, generado_en FROM itinerario_generados_$idioma WHERE generado_por IS NOT NULL");
                while ($row = $stmt->fetch()) {
                    $agenciaId = $usuarioAgencia[$row['generado_por']] ?? null;
                    if (!$agenciaId || !isset($stats[$agenciaId])) continue;
                    $stats[$agenciaId]['itinerarios']++;
                    if (!$stats[$agenciaId]['ultima_actividad'] || $row['generado_en'] > $stats[$agenciaId]['ultima_actividad']) {
                        $stats[$agenciaId]['ultima_actividad'] = $row['generado_en'];
                    }
                }
            }

            foreach ($stats as &$s) {
                $s['ingresos_pen'] = round($s['ingresos_pen'], 2);
                $s['ingresos_usd'] = round($s['ingresos_usd'], 2);
            }
            unset($s);

            echo json_encode(array_values($stats));
            break;

        // Ranking de accesos por agencia (pestaña Conexiones): cuántos inicios de sesión
        // exitosos/fallidos tuvo cada una y cuándo fue el último exitoso. Mismo patrón de
        // una sola pasada por tabla que 'ranking', para que escale igual de bien.
        case 'ranking-accesos':
            $stmt = $db->query("SELECT id, nombre, logo, es_principal FROM agencias ORDER BY es_principal DESC, nombre");
            $agencias = $stmt->fetchAll();

            $stmt = $db->query("SELECT id, agencia_id FROM usuarios WHERE agencia_id IS NOT NULL");
            $usuarioAgencia = [];
            foreach ($stmt->fetchAll() as $u) {
                $usuarioAgencia[$u['id']] = $u['agencia_id'];
            }

            $stats = [];
            foreach ($agencias as $a) {
                $stats[$a['id']] = [
                    'id' => $a['id'],
                    'nombre' => $a['nombre'],
                    'logo' => $a['logo'],
                    'es_principal' => $a['es_principal'],
                    'accesos_totales' => 0,
                    'conexiones_exitosas' => 0,
                    'conexiones_fallidas' => 0,
                    'ultima_conexion' => null
                ];
            }

            $stmt = $db->query("SELECT usuario_id, exito, creado_en FROM bitacora_accesos WHERE usuario_id IS NOT NULL");
            while ($row = $stmt->fetch()) {
                $agenciaId = $usuarioAgencia[$row['usuario_id']] ?? null;
                if (!$agenciaId || !isset($stats[$agenciaId])) continue;
                $stats[$agenciaId]['accesos_totales']++;
                if ($row['exito']) {
                    $stats[$agenciaId]['conexiones_exitosas']++;
                    if (!$stats[$agenciaId]['ultima_conexion'] || $row['creado_en'] > $stats[$agenciaId]['ultima_conexion']) {
                        $stats[$agenciaId]['ultima_conexion'] = $row['creado_en'];
                    }
                } else {
                    $stats[$agenciaId]['conexiones_fallidas']++;
                }
            }

            echo json_encode(array_values($stats));
            break;

        // Vista general: cotizaciones generadas por día/mes/año (todas las agencias),
        // sumando cotizaciones_pen y cotizaciones_usd. Acotado a una ventana razonable
        // según la agrupación para no devolver miles de puntos en un gráfico de días.
        case 'cotizaciones-por-tiempo':
            $agrupar = $_GET['agrupar'] ?? 'dia';
            $formatos = ['dia' => '%Y-%m-%d', 'mes' => '%Y-%m', 'anio' => '%Y'];
            if (!isset($formatos[$agrupar])) {
                http_response_code(400);
                echo json_encode(['error' => 'Agrupación no válida. Usa dia, mes o anio.']);
                break;
            }
            $formato = $formatos[$agrupar];
            $ventanas = ['dia' => '-90 days', 'mes' => '-24 months', 'anio' => '-10 years'];
            $desde = (new DateTime())->modify($ventanas[$agrupar])->format('Y-m-d 00:00:00');

            $puntos = [];
            foreach (['pen', 'usd'] as $moneda) {
                $stmt = $db->prepare(
                    "SELECT DATE_FORMAT(fecha_guardado, ?) AS periodo, COUNT(*) AS n
                     FROM cotizaciones_$moneda
                     WHERE fecha_guardado >= ?
                     GROUP BY periodo ORDER BY periodo"
                );
                $stmt->execute([$formato, $desde]);
                foreach ($stmt->fetchAll() as $row) {
                    $p = $row['periodo'];
                    if (!isset($puntos[$p])) $puntos[$p] = ['periodo' => $p, 'pen' => 0, 'usd' => 0];
                    $puntos[$p][$moneda] = (int) $row['n'];
                }
            }
            ksort($puntos);
            echo json_encode(array_values($puntos));
            break;

        // ===== Detalle de agencia (CRM): ficha + usuarios + resumen de actividad =====
        case 'detalle':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp,
                                          color_principal, color_secundario, logo, es_principal,
                                          terminos_es, terminos_en, terminos_pt, creado_en
                                   FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            $agencia = $stmt->fetch();
            if (!$agencia) {
                http_response_code(404);
                echo json_encode(['error' => 'Agencia no encontrada']);
                break;
            }

            $stmt = $db->prepare("SELECT id, usuario, email, rol, activo, creado_en, ultimo_acceso FROM usuarios WHERE agencia_id = ? ORDER BY creado_en");
            $stmt->execute([$id]);
            $usuarios = $stmt->fetchAll();
            $usuarioIds = array_column($usuarios, 'id');

            $totalCotizaciones = 0;
            $totalItinerarios = 0;
            $ultimaActividad = null;
            if ($usuarioIds) {
                $placeholders = implode(',', array_fill(0, count($usuarioIds), '?'));
                foreach (['pen', 'usd'] as $moneda) {
                    $stmt = $db->prepare("SELECT COUNT(*), MAX(fecha_guardado) FROM cotizaciones_$moneda WHERE creado_por IN ($placeholders)");
                    $stmt->execute($usuarioIds);
                    [$count, $max] = $stmt->fetch(PDO::FETCH_NUM);
                    $totalCotizaciones += (int)$count;
                    if ($max && (!$ultimaActividad || $max > $ultimaActividad)) $ultimaActividad = $max;
                }
                foreach (['es', 'en', 'pt'] as $idioma) {
                    $stmt = $db->prepare("SELECT COUNT(*), MAX(generado_en) FROM itinerario_generados_$idioma WHERE generado_por IN ($placeholders)");
                    $stmt->execute($usuarioIds);
                    [$count, $max] = $stmt->fetch(PDO::FETCH_NUM);
                    $totalItinerarios += (int)$count;
                    if ($max && (!$ultimaActividad || $max > $ultimaActividad)) $ultimaActividad = $max;
                }
            }

            echo json_encode([
                'agencia' => $agencia,
                'usuarios' => $usuarios,
                'stats' => [
                    'total_cotizaciones' => $totalCotizaciones,
                    'total_itinerarios' => $totalItinerarios,
                    'ultima_actividad' => $ultimaActividad
                ]
            ]);
            break;

        // Cotizaciones de los usuarios de una agencia, buscadas a la vez en cotizaciones_pen
        // y cotizaciones_usd (son tablas separadas por instancia/moneda, ver shared/api.php).
        case 'agencia-cotizaciones':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $term = trim($_GET['q'] ?? '');
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 15)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $stmt = $db->prepare("SELECT id FROM usuarios WHERE agencia_id = ?");
            $stmt->execute([$id]);
            $usuarioIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!$usuarioIds) {
                echo json_encode(['results' => [], 'total' => 0]);
                break;
            }
            $placeholders = implode(',', array_fill(0, count($usuarioIds), '?'));

            $subqueries = [];
            $params = [];
            foreach (['pen', 'usd'] as $moneda) {
                $sub = "SELECT id, '$moneda' AS moneda, data, fecha_guardado, creado_por FROM cotizaciones_$moneda WHERE creado_por IN ($placeholders)";
                $subParams = $usuarioIds;
                if ($term !== '') {
                    $sub .= " AND (LOWER(id) LIKE LOWER(?) OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pax.nombre_pax'))) LIKE LOWER(?))";
                    $like = "%$term%";
                    $subParams[] = $like;
                    $subParams[] = $like;
                }
                $subqueries[] = $sub;
                $params = array_merge($params, $subParams);
            }
            $unionSql = implode(' UNION ALL ', $subqueries);

            $countStmt = $db->prepare("SELECT COUNT(*) FROM ($unionSql) t");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $db->prepare("SELECT * FROM ($unionSql) t ORDER BY fecha_guardado DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $nombresStmt = $db->prepare("SELECT id, usuario FROM usuarios WHERE id IN ($placeholders)");
            $nombresStmt->execute($usuarioIds);
            $nombresPorId = array_column($nombresStmt->fetchAll(), 'usuario', 'id');

            $results = array_map(function ($row) use ($nombresPorId) {
                $data = json_decode($row['data'], true) ?: [];
                $pax = $data['pax'] ?? [];
                $precios = $data['precios'] ?? [];
                $pvPromo = 0;
                foreach (($data['tours'] ?? []) as $t) $pvPromo += (float)($t['cant'] ?? 0) * (float)($t['ppromo'] ?? 0);
                foreach (($data['hotels'] ?? []) as $h) $pvPromo += (float)($h['nhab'] ?? 0) * (float)($h['noches'] ?? 0) * (float)($h['ppromo'] ?? 0);
                $totalCot = $pvPromo + (float)($precios['precioAdicional'] ?? 0) - (float)($precios['descuentoEspecial'] ?? 0);
                return [
                    'id' => $row['id'],
                    'moneda' => $row['moneda'],
                    'nombre_pax' => $pax['nombre_pax'] ?? '',
                    'fecha_guardado' => $row['fecha_guardado'],
                    'total' => round($totalCot, 2),
                    'creado_por_nombre' => $nombresPorId[$row['creado_por']] ?? null
                ];
            }, $rows);

            echo json_encode(['results' => $results, 'total' => $total]);
            break;

        // Itinerarios generados por los usuarios de una agencia, en los 3 idiomas.
        case 'agencia-itinerarios':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $term = trim($_GET['q'] ?? '');
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 15)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $stmt = $db->prepare("SELECT id FROM usuarios WHERE agencia_id = ?");
            $stmt->execute([$id]);
            $usuarioIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!$usuarioIds) {
                echo json_encode(['results' => [], 'total' => 0]);
                break;
            }
            $placeholders = implode(',', array_fill(0, count($usuarioIds), '?'));

            $subqueries = [];
            $params = [];
            foreach (['es', 'en', 'pt'] as $idioma) {
                $sub = "SELECT id, '$idioma' AS idioma, pasajero, titulo, filename, generado_en, generado_por FROM itinerario_generados_$idioma WHERE generado_por IN ($placeholders)";
                $subParams = $usuarioIds;
                if ($term !== '') {
                    $sub .= " AND (LOWER(pasajero) LIKE LOWER(?) OR LOWER(titulo) LIKE LOWER(?))";
                    $like = "%$term%";
                    $subParams[] = $like;
                    $subParams[] = $like;
                }
                $subqueries[] = $sub;
                $params = array_merge($params, $subParams);
            }
            $unionSql = implode(' UNION ALL ', $subqueries);

            $countStmt = $db->prepare("SELECT COUNT(*) FROM ($unionSql) t");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $db->prepare("SELECT * FROM ($unionSql) t ORDER BY generado_en DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $nombresStmt = $db->prepare("SELECT id, usuario FROM usuarios WHERE id IN ($placeholders)");
            $nombresStmt->execute($usuarioIds);
            $nombresPorId = array_column($nombresStmt->fetchAll(), 'usuario', 'id');

            $results = array_map(function ($row) use ($nombresPorId) {
                $row['generado_por_nombre'] = $nombresPorId[$row['generado_por']] ?? null;
                unset($row['generado_por']);
                return $row;
            }, $rows);

            echo json_encode(['results' => $results, 'total' => $total]);
            break;

        // Destinos y categorías (de tours y de hoteles) creados por los usuarios de una
        // agencia — ahora que el catálogo es propio de cada usuario (ya no compartido),
        // esta es la forma de ver "qué armó esta agencia" desde su detalle.
        case 'agencia-catalogo':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("SELECT id FROM usuarios WHERE agencia_id = ?");
            $stmt->execute([$id]);
            $usuarioIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!$usuarioIds) {
                echo json_encode(['destinos' => [], 'categorias' => []]);
                break;
            }
            $placeholders = implode(',', array_fill(0, count($usuarioIds), '?'));

            $stmt = $db->prepare("SELECT id, nombre FROM destinos WHERE creado_por IN ($placeholders) ORDER BY nombre");
            $stmt->execute($usuarioIds);
            $destinosAgencia = $stmt->fetchAll();

            $categoriasAgencia = [];
            foreach (['categorias' => 'tour', 'categorias_hoteles' => 'hotel'] as $tablaCat => $tipoCat) {
                $stmt = $db->prepare(
                    "SELECT c.id, c.nombre, d.nombre AS destino_nombre
                     FROM $tablaCat c
                     JOIN destinos d ON d.id = c.destino_id
                     WHERE c.creado_por IN ($placeholders)
                     ORDER BY d.nombre, c.nombre"
                );
                $stmt->execute($usuarioIds);
                foreach ($stmt->fetchAll() as $row) {
                    $row['tipo'] = $tipoCat;
                    $categoriasAgencia[] = $row;
                }
            }

            echo json_encode(['destinos' => $destinosAgencia, 'categorias' => $categoriasAgencia]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
