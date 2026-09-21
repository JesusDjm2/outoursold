<?php
// shared/api.php
// Controlador único para pen/api.php y usd/api.php.
// El caller debe definir $currency ('pen' | 'usd') antes de hacer require de este archivo.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/error-helpers.php';

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

// Normaliza un número tal como puede venir de un CSV exportado por Excel en español
// ("50,00" con coma decimal, o "1.234,56" con punto de miles) a un string con punto
// decimal, para poder floatval()/is_numeric() sobre él de forma confiable.
function normalizarNumeroCsv($valor) {
    $valor = trim((string) $valor);
    if ($valor === '') return '';
    if (preg_match('/^-?\d{1,3}(\.\d{3})*(,\d+)?$/', $valor)) {
        // "1.234,56" (miles con punto, decimal con coma)
        $valor = str_replace(',', '.', str_replace('.', '', $valor));
    } elseif (strpos($valor, ',') !== false && strpos($valor, '.') === false) {
        // "50,00" (solo coma: es el decimal)
        $valor = str_replace(',', '.', $valor);
    }
    return $valor;
}

try {
    switch ($path) {
        case 'tours':
            // Siempre acotado a TU propio catálogo, admin incluido: el admin también arma
            // sus propias cotizaciones con sus propios tours, no con los de cada agencia.
            // Ver todo mezclado de todas las agencias es cosa de Comparativo/Catálogo por
            // agencia (shared/agencias-api.php), no de este selector de trabajo.
            $stmt = $db->prepare(
                "SELECT t.id, t.tour, t.distr, t.preg, t.ppromo, t.pconf, t.pctotal, t.destino_id, t.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaTours t
                 LEFT JOIN usuarios u ON u.id = t.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE t.creado_por = ?
                 ORDER BY t.tour"
            );
            $stmt->execute([$_SESSION['user_id']]);
            echo json_encode($stmt->fetchAll());
            break;

        // Catálogo global de Países/Departamentos (shared/migrations/027_...): a
        // diferencia de Destinos/Categorías, NO es propio de cada usuario — es geografía,
        // igual para todos, así que no lleva creado_por ni filtro por sesión.
        case 'paises':
            $stmt = $db->query("SELECT id, nombre, codigo_telefono FROM paises ORDER BY nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'departamentos':
            $paisId = intval($_GET['pais_id'] ?? 0);
            if (!$paisId) {
                http_response_code(400);
                echo json_encode(['error' => 'pais_id requerido']);
                break;
            }
            $stmt = $db->prepare("SELECT id, nombre FROM departamentos WHERE pais_id = ? ORDER BY nombre");
            $stmt->execute([$paisId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'destinos':
            // Acotado a TU propio catálogo (admin incluido) — ver el de todas las agencias
            // mezclado es cosa de Comparativo/Catálogo por agencia, no de este selector.
            $stmt = $db->prepare(
                "SELECT d.id, d.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM destinos d
                 LEFT JOIN usuarios u ON u.id = d.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE d.creado_por = ?
                 ORDER BY d.nombre"
            );
            $stmt->execute([$_SESSION['user_id']]);
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
                if (!verificarDueno($db, 'destinos', $data['id'])) break;
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
            if (!verificarDueno($db, 'destinos', $data['id'])) break;
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
            $stmt = $db->prepare(
                "SELECT c.id, c.destino_id, c.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM categorias c
                 LEFT JOIN usuarios u ON u.id = c.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE c.creado_por = ?
                 ORDER BY c.nombre"
            );
            $stmt->execute([$_SESSION['user_id']]);
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
                if (!verificarDueno($db, 'categorias', $data['id'])) break;
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
            if (!verificarDueno($db, 'categorias', $data['id'])) break;
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
            $stmt = $db->prepare(
                "SELECT h.id, h.aloj, h.distr, h.preg, h.ppromo, h.pconf, h.pctotal, h.destino_id, h.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaHoteles h
                 LEFT JOIN usuarios u ON u.id = h.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE h.creado_por = ?
                 ORDER BY h.aloj"
            );
            $stmt->execute([$_SESSION['user_id']]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'categorias-hoteles':
            $stmt = $db->prepare(
                "SELECT c.id, c.destino_id, c.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM categorias_hoteles c
                 LEFT JOIN usuarios u ON u.id = c.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE c.creado_por = ?
                 ORDER BY c.nombre"
            );
            $stmt->execute([$_SESSION['user_id']]);
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
                if (!verificarDueno($db, 'categorias_hoteles', $data['id'])) break;
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
            if (!verificarDueno($db, 'categorias_hoteles', $data['id'])) break;
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
            $pconf = floatval($data['pconf'] ?? 0);
            $pctotal = floatval($data['pctotal'] ?? 0);
            $destinoId = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            $categoriaId = !empty($data['categoria_id']) ? intval($data['categoria_id']) : null;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaTours, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaTours SET tour = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $pconf, $pctotal, $destinoId, $categoriaId, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaTours (tour, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $pconf, $pctotal, $destinoId, $categoriaId, $_SESSION['user_id']]);
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
            if (!verificarDueno($db, $tablaTours, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaTours WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-clasificaciones-tours':
            // Guarda de una sola vez la clasificación Destino/Categoría de varios tours,
            // cada uno con su propio valor (no un mismo par para todos). Solo toca los IDs
            // que vinieron en la lista — nunca recorre el resto del catálogo.
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $cambios = is_array($data['cambios'] ?? null) ? $data['cambios'] : [];
            if (empty($cambios)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay cambios para guardar.']);
                break;
            }
            $esAdminClasifTours = is_admin();
            $stmt = $esAdminClasifTours
                ? $db->prepare("UPDATE $tablaTours SET destino_id = ?, categoria_id = ? WHERE id = ?")
                : $db->prepare("UPDATE $tablaTours SET destino_id = ?, categoria_id = ? WHERE id = ? AND creado_por = ?");
            $db->beginTransaction();
            try {
                $actualizados = 0;
                foreach ($cambios as $c) {
                    $id = intval($c['id'] ?? 0);
                    if (!$id) continue;
                    $destinoId = !empty($c['destino_id']) ? intval($c['destino_id']) : null;
                    $categoriaId = !empty($c['categoria_id']) ? intval($c['categoria_id']) : null;
                    if ($esAdminClasifTours) {
                        $stmt->execute([$destinoId, $categoriaId, $id]);
                    } else {
                        $stmt->execute([$destinoId, $categoriaId, $id, $_SESSION['user_id']]);
                    }
                    $actualizados++;
                }
                $db->commit();
                echo json_encode(['success' => true, 'actualizados' => $actualizados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
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
            $pconfHotel = floatval($data['pconf'] ?? 0);
            $pctotalHotel = floatval($data['pctotal'] ?? 0);
            $destinoIdHotel = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            $categoriaIdHotel = !empty($data['categoria_id']) ? intval($data['categoria_id']) : null;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaHoteles, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaHoteles SET aloj = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $pconfHotel, $pctotalHotel, $destinoIdHotel, $categoriaIdHotel, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaHoteles (aloj, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $pconfHotel, $pctotalHotel, $destinoIdHotel, $categoriaIdHotel, $_SESSION['user_id']]);
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
            if (!verificarDueno($db, $tablaHoteles, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaHoteles WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-clasificaciones-hoteles':
            // Mismo mecanismo que 'guardar-clasificaciones-tours' — ver el comentario ahí.
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $cambios = is_array($data['cambios'] ?? null) ? $data['cambios'] : [];
            if (empty($cambios)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay cambios para guardar.']);
                break;
            }
            $esAdminClasifHoteles = is_admin();
            $stmt = $esAdminClasifHoteles
                ? $db->prepare("UPDATE $tablaHoteles SET destino_id = ?, categoria_id = ? WHERE id = ?")
                : $db->prepare("UPDATE $tablaHoteles SET destino_id = ?, categoria_id = ? WHERE id = ? AND creado_por = ?");
            $db->beginTransaction();
            try {
                $actualizados = 0;
                foreach ($cambios as $c) {
                    $id = intval($c['id'] ?? 0);
                    if (!$id) continue;
                    $destinoId = !empty($c['destino_id']) ? intval($c['destino_id']) : null;
                    $categoriaId = !empty($c['categoria_id']) ? intval($c['categoria_id']) : null;
                    if ($esAdminClasifHoteles) {
                        $stmt->execute([$destinoId, $categoriaId, $id]);
                    } else {
                        $stmt->execute([$destinoId, $categoriaId, $id, $_SESSION['user_id']]);
                    }
                    $actualizados++;
                }
                $db->commit();
                echo json_encode(['success' => true, 'actualizados' => $actualizados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'paquetes-tours':
            // Si la migración 030 (columnas hoteles/itinerario) todavía no se aplicó en esta
            // base, se cae al SELECT anterior en vez de romper el arranque del Cotizador
            // (que pide los paquetes al cargar): siguen funcionando como paquetes de solo tours.
            try {
                $stmt = $db->prepare("SELECT id, nombre, tours, hoteles, itinerario FROM $tablaPaquetesTours WHERE creado_por = ? ORDER BY nombre");
                $stmt->execute([$_SESSION['user_id']]);
            } catch (PDOException $e) {
                $stmt = $db->prepare("SELECT id, nombre, tours, NULL AS hoteles, NULL AS itinerario FROM $tablaPaquetesTours WHERE creado_por = ? ORDER BY nombre");
                $stmt->execute([$_SESSION['user_id']]);
            }
            $paquetes = [];
            while ($row = $stmt->fetch()) {
                $row['tours'] = json_decode($row['tours'], true) ?: [];
                // Paquetes anteriores a la migración 030 (solo tours) traen NULL en estas dos.
                $row['hoteles'] = $row['hoteles'] ? (json_decode($row['hoteles'], true) ?: []) : [];
                $row['itinerario'] = $row['itinerario'] ? json_decode($row['itinerario'], true) : null;
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
            $tours = is_array($data['tours'] ?? null) ? $data['tours'] : [];
            $hoteles = is_array($data['hoteles'] ?? null) ? $data['hoteles'] : [];
            $itinerario = is_array($data['itinerario'] ?? null) ? $data['itinerario'] : null;
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del paquete es obligatorio']);
                break;
            }
            // Un paquete puede combinar Actividades, Hoteles e Itinerario; alcanza con que
            // tenga al menos uno de los tres.
            $tours = array_values(array_filter(array_map(function ($t) {
                return ['tour' => trim($t['tour'] ?? ''), 'cant' => floatval($t['cant'] ?? 1)];
            }, $tours), fn($t) => $t['tour'] !== ''));
            $hoteles = array_values(array_filter(array_map(function ($h) {
                return [
                    'aloj' => trim($h['aloj'] ?? ''),
                    'nhab' => max(1, intval($h['nhab'] ?? 1)),
                    'noches' => max(1, intval($h['noches'] ?? 1))
                ];
            }, $hoteles), fn($h) => $h['aloj'] !== ''));
            $modulos = $itinerario ? array_values(array_filter(array_map('strval', $itinerario['modulos'] ?? []))) : [];
            $idiomaItinerario = $itinerario['idioma'] ?? '';
            if ($modulos && !in_array($idiomaItinerario, ['es', 'en', 'pt'], true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Idioma del itinerario inválido']);
                break;
            }
            if (!$tours && !$hoteles && !$modulos) {
                http_response_code(400);
                echo json_encode(['error' => 'El paquete necesita al menos una actividad, un hotel o un módulo de itinerario']);
                break;
            }
            $toursJson = json_encode($tours, JSON_UNESCAPED_UNICODE);
            $hotelesJson = $hoteles ? json_encode($hoteles, JSON_UNESCAPED_UNICODE) : null;
            $itinerarioJson = $modulos ? json_encode(['idioma' => $idiomaItinerario, 'modulos' => $modulos], JSON_UNESCAPED_UNICODE) : null;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaPaquetesTours, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaPaquetesTours SET nombre = ?, tours = ?, hoteles = ?, itinerario = ? WHERE id = ?");
                $stmt->execute([$nombre, $toursJson, $hotelesJson, $itinerarioJson, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaPaquetesTours (nombre, tours, hoteles, itinerario, creado_por) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$nombre, $toursJson, $hotelesJson, $itinerarioJson, $_SESSION['user_id']]);
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
            if (!verificarDueno($db, $tablaPaquetesTours, $data['id'])) break;
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
            $sqlAgencia = "SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp,
                                   color_principal, color_secundario, logo,
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
            // preview=1: corre exactamente la misma lógica (valida, resuelve Destino/Categoría,
            // decide crear vs actualizar) pero termina en rollback en vez de commit — así el
            // frontend puede mostrar "se crearán X, se actualizarán Y" ANTES de aplicar nada,
            // y el usuario confirma con números reales, no una advertencia genérica.
            $esPreview = !empty($_POST['preview']);
            $file = $_FILES['file']['tmp_name'];
            $lineas = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            // Excel en español (configuración regional de Perú/Latam) exporta e importa CSV
            // separados por punto y coma, no por coma — si se abre a doble clic un CSV con
            // comas, Excel no reconoce las columnas y lo muestra todo pegado en una sola celda.
            // Para que la plantilla descargable "simplemente funcione" al abrirla, se detecta
            // el separador real del archivo (el que más aparece en la primera línea) en vez de
            // asumir uno fijo — así sirve tanto para el CSV que da el sistema (con ;) como para
            // cualquier CSV con comas que ya tuviera armado el usuario.
            $primeraLinea = $lineas[0] ?? '';
            $delimitador = substr_count($primeraLinea, ';') > substr_count($primeraLinea, ',') ? ';' : ',';
            $csv = array_map(fn($linea) => str_getcsv($linea, $delimitador), $lineas);
            // Si la primera fila trae encabezados (p.ej. la plantilla descargable), sus columnas
            // de precio no van a ser numéricas — se descarta antes de insertar. Un archivo sin
            // encabezado (como se pedía antes) sigue funcionando igual, porque su primera fila
            // ya trae precios numéricos y no cae en este caso.
            if (isset($csv[0]) && (!is_numeric(normalizarNumeroCsv($csv[0][2] ?? '')) || !is_numeric(normalizarNumeroCsv($csv[0][3] ?? '')))) {
                array_shift($csv);
            }
            $esTours = $path === 'upload-tours';
            $table = $esTours ? $tablaTours : $tablaHoteles;
            $nombreCampo = $esTours ? 'tour' : 'aloj';
            $tablaCategoriaCsv = $esTours ? 'categorias' : 'categorias_hoteles';

            // ===== 1. Validar cada fila (todavía no toca la base de datos) =====
            $filasValidas = [];
            $errores = [];
            foreach ($csv as $i => $row) {
                $numFila = $i + 1;
                if (count($row) < 4) {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'Faltan columnas (se requieren al menos Nombre, Distr, P.Reg y P.Promo).'];
                    continue;
                }
                $nombreCsv = trim($row[0] ?? '');
                if ($nombreCsv === '') {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'El nombre está vacío.'];
                    continue;
                }
                $pregTxt = normalizarNumeroCsv($row[2] ?? '');
                $ppromoTxt = normalizarNumeroCsv($row[3] ?? '');
                if ($pregTxt === '' || !is_numeric($pregTxt) || $ppromoTxt === '' || !is_numeric($ppromoTxt)) {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'P.Reg o P.Promo no es un número válido.'];
                    continue;
                }
                $filasValidas[] = [
                    'nombre' => $nombreCsv,
                    'distr' => trim($row[1] ?? ''),
                    'preg' => floatval($pregTxt),
                    'ppromo' => floatval($ppromoTxt),
                    'destinoNombre' => isset($row[4]) && trim($row[4]) !== '' ? trim($row[4]) : null,
                    'categoriaNombre' => isset($row[5]) && trim($row[5]) !== '' ? trim($row[5]) : null,
                    'pconf' => isset($row[6]) && trim($row[6]) !== '' ? floatval(normalizarNumeroCsv($row[6])) : 0,
                    'pctotal' => isset($row[7]) && trim($row[7]) !== '' ? floatval(normalizarNumeroCsv($row[7])) : 0,
                ];
            }

            // Si más de la mitad de las filas tienen error, mejor no aplicar nada — casi
            // seguro es el archivo equivocado o un problema de formato, no vale la pena
            // dejar un catálogo a medio armar.
            $totalFilas = count($csv);
            if ($totalFilas > 0 && count($errores) >= 2 && (count($errores) / $totalFilas) > 0.5) {
                http_response_code(422);
                echo json_encode([
                    'success' => false,
                    'error' => 'Demasiadas filas con error (' . count($errores) . ' de ' . $totalFilas . '). Revisa el archivo antes de volver a intentarlo.',
                    'errores' => $errores,
                ]);
                break;
            }

            // ===== 2. Resolver Destino/Categoría — tolerante a mayúsculas/espacios, para no
            // crear duplicados por "Cusco" vs "cusco " =====
            $destinoIdPorNombre = [];
            $categoriaIdPorNombre = [];
            // Busca solo entre TUS PROPIOS destinos (nunca los de otro usuario).
            $buscarDestinoStmt = $db->prepare("SELECT id FROM destinos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND creado_por = ?");
            $crearDestinoStmt = $db->prepare("INSERT INTO destinos (nombre, creado_por) VALUES (?, ?)");
            $buscarCategoriaStmt = $db->prepare("SELECT id FROM $tablaCategoriaCsv WHERE destino_id = ? AND LOWER(TRIM(nombre)) = LOWER(TRIM(?))");
            $crearCategoriaStmt = $db->prepare("INSERT INTO $tablaCategoriaCsv (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
            $resolverDestinoId = function ($nombre) use ($db, $buscarDestinoStmt, $crearDestinoStmt, &$destinoIdPorNombre) {
                $clave = mb_strtolower(trim($nombre));
                if (isset($destinoIdPorNombre[$clave])) return $destinoIdPorNombre[$clave];
                $buscarDestinoStmt->execute([$nombre, $_SESSION['user_id']]);
                $id = $buscarDestinoStmt->fetchColumn();
                if ($id === false) {
                    $crearDestinoStmt->execute([trim($nombre), $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $destinoIdPorNombre[$clave] = $id;
            };
            $resolverCategoriaId = function ($destinoId, $nombre) use ($db, $buscarCategoriaStmt, $crearCategoriaStmt, &$categoriaIdPorNombre) {
                $clave = $destinoId . '|' . mb_strtolower(trim($nombre));
                if (isset($categoriaIdPorNombre[$clave])) return $categoriaIdPorNombre[$clave];
                $buscarCategoriaStmt->execute([$destinoId, $nombre]);
                $id = $buscarCategoriaStmt->fetchColumn();
                if ($id === false) {
                    $crearCategoriaStmt->execute([$destinoId, trim($nombre), $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $categoriaIdPorNombre[$clave] = $id;
            };

            // ===== 3. Crear o actualizar por nombre (tolerante a mayúsculas/espacios) — nunca
            // se borra nada que no venga en el archivo, a diferencia del reemplazo total de
            // antes =====
            $buscarExistenteStmt = $db->prepare("SELECT id FROM $table WHERE creado_por = ? AND LOWER(TRIM($nombreCampo)) = LOWER(TRIM(?))");
            $actualizarStmt = $db->prepare("UPDATE $table SET $nombreCampo = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
            $insertarStmt = $db->prepare("INSERT INTO $table ($nombreCampo, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $db->beginTransaction();
            try {
                $creados = 0;
                $actualizados = 0;
                // Dos filas con el mismo nombre en el MISMO archivo actualizan el mismo
                // registro en vez de crear uno duplicado por cada una.
                $idsDeEsteLote = [];
                foreach ($filasValidas as $f) {
                    $destinoId = $f['destinoNombre'] ? $resolverDestinoId($f['destinoNombre']) : null;
                    $categoriaId = ($destinoId && $f['categoriaNombre']) ? $resolverCategoriaId($destinoId, $f['categoriaNombre']) : null;

                    $claveNombre = mb_strtolower(trim($f['nombre']));
                    $id = $idsDeEsteLote[$claveNombre] ?? null;
                    if (!$id) {
                        $buscarExistenteStmt->execute([$_SESSION['user_id'], $f['nombre']]);
                        $encontrado = $buscarExistenteStmt->fetchColumn();
                        $id = $encontrado !== false ? $encontrado : null;
                    }

                    if ($id) {
                        $actualizarStmt->execute([$f['nombre'], $f['distr'], $f['preg'], $f['ppromo'], $f['pconf'], $f['pctotal'], $destinoId, $categoriaId, $id]);
                        $actualizados++;
                    } else {
                        $insertarStmt->execute([$f['nombre'], $f['distr'], $f['preg'], $f['ppromo'], $f['pconf'], $f['pctotal'], $destinoId, $categoriaId, $_SESSION['user_id']]);
                        $id = $db->lastInsertId();
                        $creados++;
                    }
                    $idsDeEsteLote[$claveNombre] = $id;
                }

                if ($esPreview) {
                    $db->rollBack();
                } else {
                    $db->commit();
                }

                echo json_encode([
                    'success' => true,
                    'preview' => $esPreview,
                    'creados' => $creados,
                    'actualizados' => $actualizados,
                    'errores' => $errores,
                    'totalFilas' => $totalFilas,
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
