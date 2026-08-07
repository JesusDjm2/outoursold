<?php
// shared/usuarios-api.php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

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
            $stmt = $db->query("SELECT id, usuario, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC");
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
            $password = $data['password'] ?? '';
            $rol = $data['rol'] ?? '';

            if (!$usuario || !$password || !in_array($rol, $ROLES_VALIDOS, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Usuario, contraseña y un rol válido son requeridos.']);
                break;
            }

            try {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $db->prepare("INSERT INTO usuarios (usuario, password_hash, rol, creado_por) VALUES (?, ?, ?, ?)");
                $stmt->execute([$usuario, $hash, $rol, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'Ese nombre de usuario ya existe.']);
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

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
