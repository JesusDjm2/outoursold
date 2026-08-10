<?php
// shared/api.php
// Controlador único para pen/api.php y usd/api.php.
// El caller debe definir $currency ('pen' | 'usd') antes de hacer require de este archivo.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$tablaTours = "tours_$currency";
$tablaHoteles = "hoteles_$currency";
$tablaCotizaciones = "cotizaciones_$currency";
$tablaPaquetesTours = "paquetes_tours_$currency";

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($path) {
        case 'tours':
            $stmt = $db->query(
                "SELECT t.id, t.tour, t.distr, t.preg, t.ppromo, t.destino, t.categoria, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaTours t
                 LEFT JOIN usuarios u ON u.id = t.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 ORDER BY t.tour"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'hoteles':
            $stmt = $db->query(
                "SELECT h.id, h.aloj, h.distr, h.preg, h.ppromo, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaHoteles h
                 LEFT JOIN usuarios u ON u.id = h.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 ORDER BY h.aloj"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $tour = trim($data['tour'] ?? '');
            if ($tour === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del tour es obligatorio']);
                break;
            }
            $distr = trim($data['distr'] ?? '');
            $preg = floatval($data['preg'] ?? 0);
            $ppromo = floatval($data['ppromo'] ?? 0);
            $destino = trim($data['destino'] ?? '') ?: null;
            $categoria = trim($data['categoria'] ?? '') ?: null;
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaTours SET tour = ?, distr = ?, preg = ?, ppromo = ?, destino = ?, categoria = ? WHERE id = ?");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $destino, $categoria, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaTours (tour, distr, preg, ppromo, destino, categoria, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $destino, $categoria, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("DELETE FROM $tablaTours WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-hotel':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $aloj = trim($data['aloj'] ?? '');
            if ($aloj === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del alojamiento es obligatorio']);
                break;
            }
            $distr = trim($data['distr'] ?? '');
            $preg = floatval($data['preg'] ?? 0);
            $ppromo = floatval($data['ppromo'] ?? 0);
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaHoteles SET aloj = ?, distr = ?, preg = ?, ppromo = ? WHERE id = ?");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaHoteles (aloj, distr, preg, ppromo, creado_por) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-hotel':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("DELETE FROM $tablaHoteles WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'paquetes-tours':
            $stmt = $db->query("SELECT id, nombre, tours FROM $tablaPaquetesTours ORDER BY nombre");
            $paquetes = [];
            while ($row = $stmt->fetch()) {
                $row['tours'] = json_decode($row['tours'], true);
                $paquetes[] = $row;
            }
            echo json_encode($paquetes);
            break;

        case 'guardar-paquete-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombre = trim($data['nombre'] ?? '');
            $tours = $data['tours'] ?? [];
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del paquete es obligatorio']);
                break;
            }
            if (!is_array($tours) || count($tours) === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'El paquete necesita al menos un tour']);
                break;
            }
            $toursJson = json_encode(array_values(array_map(function ($t) {
                return ['tour' => trim($t['tour'] ?? ''), 'cant' => floatval($t['cant'] ?? 1)];
            }, $tours)), JSON_UNESCAPED_UNICODE);
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaPaquetesTours SET nombre = ?, tours = ? WHERE id = ?");
                $stmt->execute([$nombre, $toursJson, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaPaquetesTours (nombre, tours) VALUES (?, ?)");
                $stmt->execute([$nombre, $toursJson]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-paquete-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $stmt = $db->prepare("DELETE FROM $tablaPaquetesTours WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'cotizaciones':
            $term = $_GET['q'] ?? '';
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $condiciones = [];
            $params = [];
            if ($term) {
                // La columna `data` usa collation utf8mb4_bin (sensible a mayúsculas/minúsculas);
                // se normaliza todo a minúsculas para que la búsqueda no dependa de cómo se escribió el nombre.
                $condiciones[] = "(LOWER(id) LIKE LOWER(?)"
                    . " OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pax.nombre_pax'))) LIKE LOWER(?)"
                    . " OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pax.contacto'))) LIKE LOWER(?))";
                $like = "%$term%";
                array_push($params, $like, $like, $like);
            }
            // Un no-admin solo ve lo que él mismo creó. Los registros históricos sin
            // creado_por (de antes de esta función) quedan visibles solo para el admin.
            if (!is_admin()) {
                $condiciones[] = "creado_por = ?";
                $params[] = $_SESSION['user_id'];
            }
            $where = $condiciones ? ' WHERE ' . implode(' AND ', $condiciones) : '';

            $countStmt = $db->prepare("SELECT COUNT(*) FROM $tablaCotizaciones" . $where);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $db->prepare("SELECT id, data FROM $tablaCotizaciones$where ORDER BY fecha_guardado DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            $results = [];
            while ($row = $stmt->fetch()) {
                $row['data'] = json_decode($row['data'], true);
                $results[] = $row;
            }
            echo json_encode(['results' => $results, 'total' => $total]);
            break;

        case 'cotizacion':
            $id = $_GET['id'] ?? '';
            if (is_admin()) {
                $stmt = $db->prepare("SELECT data FROM $tablaCotizaciones WHERE id = ?");
                $stmt->execute([$id]);
            } else {
                $stmt = $db->prepare("SELECT data FROM $tablaCotizaciones WHERE id = ? AND creado_por = ?");
                $stmt->execute([$id, $_SESSION['user_id']]);
            }
            $row = $stmt->fetch();
            if ($row) {
                echo $row['data'];
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'No encontrada']);
            }
            break;

        case 'guardar-cotizacion':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }

            $stmt = $db->prepare("SELECT creado_por FROM $tablaCotizaciones WHERE id = ?");
            $stmt->execute([$id]);
            $existente = $stmt->fetch();

            if ($existente && !is_admin() && intval($existente['creado_por']) !== intval($_SESSION['user_id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes permiso para modificar esta cotización.']);
                break;
            }

            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            if ($existente) {
                // Ya existe: se preserva el creado_por original, solo se actualiza el contenido.
                $stmt = $db->prepare("UPDATE $tablaCotizaciones SET data = ? WHERE id = ?");
                $stmt->execute([$json, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaCotizaciones (id, data, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$id, $json, $_SESSION['user_id']]);
            }
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'eliminar-cotizacion':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            if (!is_admin()) {
                $stmt = $db->prepare("SELECT creado_por FROM $tablaCotizaciones WHERE id = ?");
                $stmt->execute([$data['id']]);
                $row = $stmt->fetch();
                if (!$row || intval($row['creado_por']) !== intval($_SESSION['user_id'])) {
                    http_response_code(403);
                    echo json_encode(['error' => 'No tienes permiso para eliminar esta cotización.']);
                    break;
                }
            }
            $stmt = $db->prepare("DELETE FROM $tablaCotizaciones WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'upload-tours':
        case 'upload-hoteles':
            if ($method !== 'POST' || !isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Archivo requerido']);
                break;
            }
            $file = $_FILES['file']['tmp_name'];
            $csv = array_map('str_getcsv', file($file));
            $esTours = $path === 'upload-tours';
            $table = $esTours ? $tablaTours : $tablaHoteles;
            // Para tours se acepta opcionalmente Destino y Categoría como columnas 5 y 6.
            $fields = $esTours
                ? ['tour', 'distr', 'preg', 'ppromo', 'destino', 'categoria', 'creado_por']
                : ['aloj', 'distr', 'preg', 'ppromo', 'creado_por'];

            $db->beginTransaction();
            try {
                $db->exec("DELETE FROM $table");
                $placeholders = implode(',', array_fill(0, count($fields), '?'));
                $stmt = $db->prepare("INSERT INTO $table (" . implode(',', $fields) . ") VALUES ($placeholders)");
                foreach ($csv as $row) {
                    if (count($row) >= 4) {
                        $valores = [
                            $row[0],
                            $row[1],
                            floatval($row[2]),
                            floatval($row[3])
                        ];
                        if ($esTours) {
                            $valores[] = isset($row[4]) && trim($row[4]) !== '' ? trim($row[4]) : null;
                            $valores[] = isset($row[5]) && trim($row[5]) !== '' ? trim($row[5]) : null;
                        }
                        $valores[] = $_SESSION['user_id'];
                        $stmt->execute($valores);
                    }
                }
                $db->commit();
                echo json_encode(['success' => true, 'count' => count($csv)]);
            } catch (Exception $e) {
                $db->rollback();
                throw $e;
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
