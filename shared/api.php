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

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($path) {
        case 'tours':
            $stmt = $db->query("SELECT id, tour, distr, preg, ppromo FROM $tablaTours ORDER BY tour");
            echo json_encode($stmt->fetchAll());
            break;

        case 'hoteles':
            $stmt = $db->query("SELECT id, aloj, distr, preg, ppromo FROM $tablaHoteles ORDER BY aloj");
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
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaTours SET tour = ?, distr = ?, preg = ?, ppromo = ? WHERE id = ?");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaTours (tour, distr, preg, ppromo) VALUES (?, ?, ?, ?)");
                $stmt->execute([$tour, $distr, $preg, $ppromo]);
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
                $stmt = $db->prepare("INSERT INTO $tablaHoteles (aloj, distr, preg, ppromo) VALUES (?, ?, ?, ?)");
                $stmt->execute([$aloj, $distr, $preg, $ppromo]);
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

        case 'cotizaciones':
            $term = $_GET['q'] ?? '';
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $where = '';
            $params = [];
            if ($term) {
                $where = " WHERE id LIKE ? OR JSON_EXTRACT(data, '$.pax.nombre_pax') LIKE ? OR JSON_EXTRACT(data, '$.pax.contacto') LIKE ?";
                $like = "%$term%";
                $params = [$like, $like, $like];
            }

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
            $stmt = $db->prepare("SELECT data FROM $tablaCotizaciones WHERE id = ?");
            $stmt->execute([$id]);
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
            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            $stmt = $db->prepare("REPLACE INTO $tablaCotizaciones (id, data) VALUES (?, ?)");
            $stmt->execute([$id, $json]);
            echo json_encode(['success' => true, 'id' => $id]);
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
            $table = $path === 'upload-tours' ? $tablaTours : $tablaHoteles;
            $fields = $path === 'upload-tours' ? ['tour', 'distr', 'preg', 'ppromo'] : ['aloj', 'distr', 'preg', 'ppromo'];

            $db->beginTransaction();
            try {
                $db->exec("DELETE FROM $table");
                $placeholders = implode(',', array_fill(0, count($fields), '?'));
                $stmt = $db->prepare("INSERT INTO $table (" . implode(',', $fields) . ") VALUES ($placeholders)");
                foreach ($csv as $row) {
                    if (count($row) >= 4) {
                        $stmt->execute([
                            $row[0],
                            $row[1],
                            floatval($row[2]),
                            floatval($row[3])
                        ]);
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
