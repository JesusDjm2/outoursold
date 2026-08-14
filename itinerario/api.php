<?php
// itinerario/api.php
// Controlador del Generador de Itinerarios: módulos PDF, páginas fijas y paquetes,
// particionados por idioma (es/en/pt) en vez de moneda. Reemplaza save_config.php
// (que guardaba todo en JSON con flock). El catálogo de Destinos/Categorías sigue
// siendo el compartido con Tours/Hoteles (../usd/api.php?path=destinos|categorias),
// no se toca desde aquí.
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/db.php';

// A diferencia de save_config.php (que solo exigía login en POST), aquí se exige login
// para cualquier método, incluido GET.
if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$idiomasValidos = ['es', 'en', 'pt'];
$idioma = $_GET['idioma'] ?? 'es';
if (!in_array($idioma, $idiomasValidos, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Idioma no válido. Use es, en o pt.']);
    exit;
}

$tablaModulos = "itinerarios_$idioma";
$tablaConfig = "itinerario_config_$idioma";
$tablaPaquetes = "paquetes_itinerarios_$idioma";

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function idOInt($val) {
    return ($val !== null && $val !== '') ? (int) $val : null;
}

try {
    switch ($path) {
        case 'modulos':
            $stmt = $db->query(
                "SELECT m.id, m.titulo, m.filename, m.destino_id, m.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaModulos m
                 LEFT JOIN usuarios u ON u.id = m.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 ORDER BY m.titulo"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'config':
            $stmt = $db->query("SELECT start_files, end_files FROM $tablaConfig WHERE id = 1");
            $row = $stmt->fetch();
            if (!$row) {
                // No debería pasar (la migración siembra la fila), pero por si acaso.
                $db->exec("INSERT INTO $tablaConfig (id, start_files, end_files) VALUES (1, '[]', '[]')");
                $row = ['start_files' => '[]', 'end_files' => '[]'];
            }
            echo json_encode([
                'startFiles' => json_decode($row['start_files'], true) ?: [],
                'endFiles' => json_decode($row['end_files'], true) ?: [],
            ]);
            break;

        case 'paquetes':
            $stmt = $db->query("SELECT id, nombre, modulos FROM $tablaPaquetes ORDER BY nombre");
            $paquetes = [];
            while ($row = $stmt->fetch()) {
                $row['modulos'] = json_decode($row['modulos'], true);
                $paquetes[] = $row;
            }
            echo json_encode($paquetes);
            break;

        case 'crear-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $titulo = trim($data['titulo'] ?? '');
            $filename = trim($data['filename'] ?? '');
            if ($titulo === '' || $filename === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Título y archivo son obligatorios.']);
                break;
            }
            $stmt = $db->prepare("INSERT INTO $tablaModulos (titulo, filename, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $titulo,
                $filename,
                idOInt($data['destino_id'] ?? null),
                idOInt($data['categoria_id'] ?? null),
                $_SESSION['user_id'],
            ]);
            $id = $db->lastInsertId();
            $stmt = $db->prepare("SELECT id, titulo, filename, destino_id, categoria_id FROM $tablaModulos WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id, 'modulo' => $stmt->fetch()]);
            break;

        case 'actualizar-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido.']);
                break;
            }
            $campos = [];
            $valores = [];
            if (array_key_exists('titulo', $data) && trim($data['titulo']) !== '') {
                $campos[] = 'titulo = ?';
                $valores[] = trim($data['titulo']);
            }
            if (array_key_exists('destino_id', $data)) {
                $campos[] = 'destino_id = ?';
                $valores[] = idOInt($data['destino_id']);
            }
            if (array_key_exists('categoria_id', $data)) {
                $campos[] = 'categoria_id = ?';
                $valores[] = idOInt($data['categoria_id']);
            }
            if (empty($campos)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nada que actualizar.']);
                break;
            }
            $valores[] = $id;
            $stmt = $db->prepare("UPDATE $tablaModulos SET " . implode(', ', $campos) . " WHERE id = ?");
            $stmt->execute($valores);
            if ($stmt->rowCount() === 0) {
                // Puede ser "sin cambios" o "no existe"; confirmamos con un SELECT.
                $check = $db->prepare("SELECT id FROM $tablaModulos WHERE id = ?");
                $check->execute([$id]);
                if (!$check->fetch()) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Módulo no encontrado.']);
                    break;
                }
            }
            echo json_encode(['success' => true]);
            break;

        case 'eliminar-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido.']);
                break;
            }
            $stmt = $db->prepare("SELECT filename FROM $tablaModulos WHERE id = ?");
            $stmt->execute([$id]);
            $filename = $stmt->fetchColumn();
            if ($filename === false) {
                http_response_code(404);
                echo json_encode(['error' => 'Módulo no encontrado.']);
                break;
            }

            $db->beginTransaction();
            try {
                $db->prepare("DELETE FROM $tablaModulos WHERE id = ?")->execute([$id]);

                // Limpia el filename borrado de las páginas fijas...
                $stmt = $db->prepare("SELECT start_files, end_files FROM $tablaConfig WHERE id = 1");
                $stmt->execute();
                $configRow = $stmt->fetch();
                $startFiles = $configRow ? array_values(array_diff(json_decode($configRow['start_files'], true) ?: [], [$filename])) : [];
                $endFiles = $configRow ? array_values(array_diff(json_decode($configRow['end_files'], true) ?: [], [$filename])) : [];
                $db->prepare("UPDATE $tablaConfig SET start_files = ?, end_files = ? WHERE id = 1")
                    ->execute([json_encode($startFiles, JSON_UNESCAPED_UNICODE), json_encode($endFiles, JSON_UNESCAPED_UNICODE)]);

                // ...y de cualquier paquete que lo tuviera incluido.
                $paquetesAfectados = 0;
                $stmt = $db->query("SELECT id, modulos FROM $tablaPaquetes");
                $paquetesRows = $stmt->fetchAll();
                $updPaquete = $db->prepare("UPDATE $tablaPaquetes SET modulos = ? WHERE id = ?");
                foreach ($paquetesRows as $p) {
                    $modulos = json_decode($p['modulos'], true) ?: [];
                    if (in_array($filename, $modulos, true)) {
                        $modulos = array_values(array_diff($modulos, [$filename]));
                        $updPaquete->execute([json_encode($modulos, JSON_UNESCAPED_UNICODE), $p['id']]);
                        $paquetesAfectados++;
                    }
                }

                $db->commit();
                echo json_encode([
                    'success' => true,
                    'config' => ['startFiles' => $startFiles, 'endFiles' => $endFiles],
                    'paquetes_afectados' => $paquetesAfectados,
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;

        case 'guardar-config':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $startFiles = is_array($data['startFiles'] ?? null) ? $data['startFiles'] : [];
            $endFiles = is_array($data['endFiles'] ?? null) ? $data['endFiles'] : [];
            $stmt = $db->prepare("UPDATE $tablaConfig SET start_files = ?, end_files = ? WHERE id = 1");
            $stmt->execute([json_encode($startFiles, JSON_UNESCAPED_UNICODE), json_encode($endFiles, JSON_UNESCAPED_UNICODE)]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-paquete':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombre = trim($data['nombre'] ?? '');
            $modulos = $data['modulos'] ?? [];
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del paquete es obligatorio']);
                break;
            }
            if (!is_array($modulos) || count($modulos) === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'El paquete necesita al menos un módulo']);
                break;
            }
            $modulosJson = json_encode(array_values(array_map('strval', $modulos)), JSON_UNESCAPED_UNICODE);
            if (!empty($data['id'])) {
                $stmt = $db->prepare("UPDATE $tablaPaquetes SET nombre = ?, modulos = ? WHERE id = ?");
                $stmt->execute([$nombre, $modulosJson, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaPaquetes (nombre, modulos) VALUES (?, ?)");
                $stmt->execute([$nombre, $modulosJson]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-paquete':
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
            $stmt = $db->prepare("DELETE FROM $tablaPaquetes WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
