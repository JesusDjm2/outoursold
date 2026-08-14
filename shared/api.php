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
                "SELECT t.id, t.tour, t.distr, t.preg, t.ppromo, t.destino_id, t.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaTours t
                 LEFT JOIN usuarios u ON u.id = t.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 ORDER BY t.tour"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'destinos':
            $stmt = $db->query("SELECT id, nombre FROM destinos ORDER BY nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-destino':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreDestino = trim($data['nombre'] ?? '');
            if ($nombreDestino === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del destino es obligatorio']);
                break;
            }
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE destinos SET nombre = ? WHERE id = ?");
                $stmt->execute([$nombreDestino, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO destinos (nombre, creado_por) VALUES (?, ?)");
                $stmt->execute([$nombreDestino, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-destino':
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
            try {
                $stmt = $db->prepare("DELETE FROM destinos WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene categorías, tours o hoteles asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'categorias':
            $stmt = $db->query("SELECT id, destino_id, nombre FROM categorias ORDER BY nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-categoria':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreCategoria = trim($data['nombre'] ?? '');
            $destinoIdCat = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            if ($nombreCategoria === '' || !$destinoIdCat) {
                http_response_code(400);
                echo json_encode(['error' => 'El destino y el nombre de la categoría son obligatorios']);
                break;
            }
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE categorias SET nombre = ?, destino_id = ? WHERE id = ?");
                $stmt->execute([$nombreCategoria, $destinoIdCat, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$destinoIdCat, $nombreCategoria, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-categoria':
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
            try {
                $stmt = $db->prepare("DELETE FROM categorias WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene tours asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'hoteles':
            $stmt = $db->query(
                "SELECT h.id, h.aloj, h.distr, h.preg, h.ppromo, h.destino_id, h.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaHoteles h
                 LEFT JOIN usuarios u ON u.id = h.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 ORDER BY h.aloj"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'categorias-hoteles':
            $stmt = $db->query("SELECT id, destino_id, nombre FROM categorias_hoteles ORDER BY nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-categoria-hotel':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreCategoriaHotel = trim($data['nombre'] ?? '');
            $destinoIdCatHotel = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            if ($nombreCategoriaHotel === '' || !$destinoIdCatHotel) {
                http_response_code(400);
                echo json_encode(['error' => 'El destino y el nombre de la categoría son obligatorios']);
                break;
            }
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE categorias_hoteles SET nombre = ?, destino_id = ? WHERE id = ?");
                $stmt->execute([$nombreCategoriaHotel, $destinoIdCatHotel, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias_hoteles (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$destinoIdCatHotel, $nombreCategoriaHotel, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-categoria-hotel':
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
            try {
                $stmt = $db->prepare("DELETE FROM categorias_hoteles WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene hoteles asociados.']);
                } else {
                    throw $e;
                }
            }
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
            $destinoId = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            $categoriaId = !empty($data['categoria_id']) ? intval($data['categoria_id']) : null;
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaTours SET tour = ?, distr = ?, preg = ?, ppromo = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $destinoId, $categoriaId, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaTours (tour, distr, preg, ppromo, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $destinoId, $categoriaId, $_SESSION['user_id']]);
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
            $destinoIdHotel = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            $categoriaIdHotel = !empty($data['categoria_id']) ? intval($data['categoria_id']) : null;
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaHoteles SET aloj = ?, distr = ?, preg = ?, ppromo = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $destinoIdHotel, $categoriaIdHotel, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaHoteles (aloj, distr, preg, ppromo, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $destinoIdHotel, $categoriaIdHotel, $_SESSION['user_id']]);
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

        // Datos de empresa a usar en el PDF de esta cotización: la agencia de quien la creó,
        // o si no tiene una asignada (típicamente el admin), la agencia marcada como
        // principal. Se pide siempre fresco (no se guarda dentro del JSON de la cotización)
        // para que el logo/términos usados reflejen la ficha de agencia actual.
        case 'cotizacion-agencia':
            $id = $_GET['id'] ?? '';
            if (is_admin()) {
                $stmt = $db->prepare("SELECT u.agencia_id FROM $tablaCotizaciones c
                                       LEFT JOIN usuarios u ON u.id = c.creado_por WHERE c.id = ?");
                $stmt->execute([$id]);
            } else {
                $stmt = $db->prepare("SELECT u.agencia_id FROM $tablaCotizaciones c
                                       LEFT JOIN usuarios u ON u.id = c.creado_por WHERE c.id = ? AND c.creado_por = ?");
                $stmt->execute([$id, $_SESSION['user_id']]);
            }
            $filaCot = $stmt->fetch();
            if (!$filaCot) {
                http_response_code(404);
                echo json_encode(['error' => 'No encontrada']);
                break;
            }
            $agenciaId = $filaCot['agencia_id'] ?: null;
            $sqlAgencia = "SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp, logo,
                                   terminos_es, terminos_en, terminos_pt
                            FROM agencias WHERE " . ($agenciaId ? "id = ?" : "es_principal = 1 LIMIT 1");
            $agStmt = $db->prepare($sqlAgencia);
            $agStmt->execute($agenciaId ? [$agenciaId] : []);
            echo json_encode($agStmt->fetch() ?: null);
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
            // Si la primera fila trae encabezados (p.ej. la plantilla descargable), sus columnas
            // de precio no van a ser numéricas — se descarta antes de insertar. Un archivo sin
            // encabezado (como se pedía antes) sigue funcionando igual, porque su primera fila
            // ya trae precios numéricos y no cae en este caso.
            if (isset($csv[0]) && (!is_numeric(trim($csv[0][2] ?? '')) || !is_numeric(trim($csv[0][3] ?? '')))) {
                array_shift($csv);
            }
            $esTours = $path === 'upload-tours';
            $table = $esTours ? $tablaTours : $tablaHoteles;
            $tablaCategoriaCsv = $esTours ? 'categorias' : 'categorias_hoteles';
            // Se acepta opcionalmente Destino y Categoría como columnas 5 y 6 (por nombre; si no
            // existen en el catálogo se crean, igual que al escribirlas a mano en Gestión de Datos).
            // La categoría de tours y la de hoteles son catálogos separados, aunque comparten Destino.
            $fields = ($esTours
                ? ['tour', 'distr', 'preg', 'ppromo']
                : ['aloj', 'distr', 'preg', 'ppromo']);
            $fields = array_merge($fields, ['destino_id', 'categoria_id', 'creado_por']);

            $destinoIdPorNombre = [];
            $categoriaIdPorNombre = [];
            $buscarDestinoStmt = $db->prepare("SELECT id FROM destinos WHERE nombre = ?");
            $crearDestinoStmt = $db->prepare("INSERT INTO destinos (nombre, creado_por) VALUES (?, ?)");
            $buscarCategoriaStmt = $db->prepare("SELECT id FROM $tablaCategoriaCsv WHERE destino_id = ? AND nombre = ?");
            $crearCategoriaStmt = $db->prepare("INSERT INTO $tablaCategoriaCsv (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
            $resolverDestinoId = function ($nombre) use ($db, $buscarDestinoStmt, $crearDestinoStmt, &$destinoIdPorNombre) {
                if (isset($destinoIdPorNombre[$nombre])) return $destinoIdPorNombre[$nombre];
                $buscarDestinoStmt->execute([$nombre]);
                $id = $buscarDestinoStmt->fetchColumn();
                if ($id === false) {
                    $crearDestinoStmt->execute([$nombre, $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $destinoIdPorNombre[$nombre] = $id;
            };
            $resolverCategoriaId = function ($destinoId, $nombre) use ($db, $buscarCategoriaStmt, $crearCategoriaStmt, &$categoriaIdPorNombre) {
                $clave = $destinoId . '|' . $nombre;
                if (isset($categoriaIdPorNombre[$clave])) return $categoriaIdPorNombre[$clave];
                $buscarCategoriaStmt->execute([$destinoId, $nombre]);
                $id = $buscarCategoriaStmt->fetchColumn();
                if ($id === false) {
                    $crearCategoriaStmt->execute([$destinoId, $nombre, $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $categoriaIdPorNombre[$clave] = $id;
            };

            $db->beginTransaction();
            try {
                $db->exec("DELETE FROM $table");
                $placeholders = implode(',', array_fill(0, count($fields), '?'));
                $stmt = $db->prepare("INSERT INTO $table (" . implode(',', $fields) . ") VALUES ($placeholders)");
                foreach ($csv as $row) {
                    if (count($row) >= 4) {
                        $nombreDestinoCsv = isset($row[4]) && trim($row[4]) !== '' ? trim($row[4]) : null;
                        $nombreCategoriaCsv = isset($row[5]) && trim($row[5]) !== '' ? trim($row[5]) : null;
                        $destinoIdCsv = $nombreDestinoCsv ? $resolverDestinoId($nombreDestinoCsv) : null;
                        $categoriaIdCsv = ($destinoIdCsv && $nombreCategoriaCsv) ? $resolverCategoriaId($destinoIdCsv, $nombreCategoriaCsv) : null;
                        $valores = [
                            $row[0],
                            $row[1],
                            floatval($row[2]),
                            floatval($row[3]),
                            $destinoIdCsv,
                            $categoriaIdCsv,
                            $_SESSION['user_id']
                        ];
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
