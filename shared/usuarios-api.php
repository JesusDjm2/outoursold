<?php
// shared/usuarios-api.php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/error-helpers.php';

if (!is_admin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Solo el administrador puede gestionar usuarios.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$ROLES_VALIDOS = ['admin', 'agencia', 'conta', 'reservas'];

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($path) {
        case 'listar':
            $stmt = $db->query(
                "SELECT u.id, u.usuario, u.email, u.rol, u.activo, u.creado_en, u.ultimo_acceso, u.agencia_id, a.nombre AS agencia_nombre
                 FROM usuarios u
                 LEFT JOIN agencias a ON a.id = u.agencia_id
                 ORDER BY u.creado_en DESC"
            );
            echo json_encode($stmt->fetchAll());
            break;

        case 'crear':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $usuario = trim($data['usuario'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = $data['password'] ?? '';
            $rol = $data['rol'] ?? '';
            $agenciaId = !empty($data['agencia_id']) ? intval($data['agencia_id']) : null;

            if (!$usuario || !$password || !in_array($rol, $ROLES_VALIDOS, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Usuario, contraseña y un rol válido son requeridos.']);
                break;
            }
            if ($rol === 'agencia' && !$email) {
                http_response_code(400);
                echo json_encode(['error' => 'El email es obligatorio para usuarios con rol agencia: lo usan para iniciar sesión.']);
                break;
            }
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'El email no es válido.']);
                break;
            }

            try {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $db->prepare("INSERT INTO usuarios (usuario, email, password_hash, rol, agencia_id, creado_por) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$usuario, $email ?: null, $hash, $rol, $agenciaId, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    $mensaje = stripos($e->getMessage(), 'email') !== false
                        ? 'Ese email ya está en uso por otro usuario.'
                        : 'Ese nombre de usuario ya existe.';
                    echo json_encode(['error' => $mensaje]);
                } else {
                    throw $e;
                }
            }
            break;

        case 'editar':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = intval($data['id'] ?? 0);
            $usuario = trim($data['usuario'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = $data['password'] ?? '';
            $rol = $data['rol'] ?? '';
            $agenciaId = !empty($data['agencia_id']) ? intval($data['agencia_id']) : null;

            if (!$id || !$usuario || !in_array($rol, $ROLES_VALIDOS, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Usuario y un rol válido son requeridos.']);
                break;
            }
            if ($rol === 'agencia' && !$email) {
                http_response_code(400);
                echo json_encode(['error' => 'El email es obligatorio para usuarios con rol agencia: lo usan para iniciar sesión.']);
                break;
            }
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'El email no es válido.']);
                break;
            }

            try {
                if ($password !== '') {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $db->prepare("UPDATE usuarios SET usuario = ?, email = ?, password_hash = ?, rol = ?, agencia_id = ? WHERE id = ?");
                    $stmt->execute([$usuario, $email ?: null, $hash, $rol, $agenciaId, $id]);
                } else {
                    $stmt = $db->prepare("UPDATE usuarios SET usuario = ?, email = ?, rol = ?, agencia_id = ? WHERE id = ?");
                    $stmt->execute([$usuario, $email ?: null, $rol, $agenciaId, $id]);
                }
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    $mensaje = stripos($e->getMessage(), 'email') !== false
                        ? 'Ese email ya está en uso por otro usuario.'
                        : 'Ese nombre de usuario ya existe.';
                    echo json_encode(['error' => $mensaje]);
                } else {
                    throw $e;
                }
            }
            break;

        case 'pausar':
        case 'activar':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = intval($data['id'] ?? 0);

            if ($path === 'pausar' && $id === intval($_SESSION['user_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'No puedes pausar tu propia cuenta.']);
                break;
            }

            $activo = $path === 'activar' ? 1 : 0;
            $stmt = $db->prepare("UPDATE usuarios SET activo = ? WHERE id = ?");
            $stmt->execute([$activo, $id]);
            echo json_encode(['success' => true]);
            break;

        case 'cambiar-rol':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = intval($data['id'] ?? 0);
            $rol = $data['rol'] ?? '';

            if (!in_array($rol, $ROLES_VALIDOS, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Rol no válido.']);
                break;
            }

            $stmt = $db->prepare("UPDATE usuarios SET rol = ? WHERE id = ?");
            $stmt->execute([$rol, $id]);
            echo json_encode(['success' => true]);
            break;

        // Usuarios con actividad reciente (heartbeat en is_logged_in(), ver auth.php).
        // Es una aproximación de "conectado ahora", no un estado exacto de sesión.
        case 'conectados':
            $minutos = max(1, min(60, (int)($_GET['minutos'] ?? 5)));
            $stmt = $db->prepare(
                "SELECT u.id, u.usuario, u.email, u.rol, u.ultimo_acceso, a.nombre AS agencia_nombre
                 FROM usuarios u
                 LEFT JOIN agencias a ON a.id = u.agencia_id
                 WHERE u.ultimo_acceso IS NOT NULL AND u.ultimo_acceso >= (NOW() - INTERVAL ? MINUTE)
                 ORDER BY u.ultimo_acceso DESC"
            );
            $stmt->execute([$minutos]);
            echo json_encode($stmt->fetchAll());
            break;

        // Bitácora de inicios de sesión (exitosos y fallidos), buscable y paginada.
        case 'bitacora':
            $term = trim($_GET['q'] ?? '');
            $soloFallidos = ($_GET['solo_fallidos'] ?? '') === '1';
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $condiciones = [];
            $params = [];
            if ($term !== '') {
                $condiciones[] = "(LOWER(b.identificador) LIKE LOWER(?) OR LOWER(u.usuario) LIKE LOWER(?) OR LOWER(a.nombre) LIKE LOWER(?))";
                $like = "%$term%";
                array_push($params, $like, $like, $like);
            }
            if ($soloFallidos) {
                $condiciones[] = "b.exito = 0";
            }
            $where = $condiciones ? ' WHERE ' . implode(' AND ', $condiciones) : '';
            $baseSql = "FROM bitacora_accesos b
                        LEFT JOIN usuarios u ON u.id = b.usuario_id
                        LEFT JOIN agencias a ON a.id = u.agencia_id" . $where;

            $countStmt = $db->prepare("SELECT COUNT(*) $baseSql");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $db->prepare(
                "SELECT b.id, b.identificador, b.ip, b.exito, b.motivo, b.creado_en,
                        u.usuario AS usuario_nombre, a.nombre AS agencia_nombre
                 $baseSql
                 ORDER BY b.creado_en DESC LIMIT $limit OFFSET $offset"
            );
            $stmt->execute($params);
            echo json_encode(['results' => $stmt->fetchAll(), 'total' => $total]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
