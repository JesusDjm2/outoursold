<?php
// shared/agencias-api.php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

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

function guardarLogoAgencia($file) {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return [null, null];
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    $permitidos = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/svg+xml' => 'svg'];
    if (!isset($permitidos[$mime])) {
        return [null, 'El logo debe ser una imagen (PNG, JPG, WEBP o SVG).'];
    }
    $filename = 'agencia_' . bin2hex(random_bytes(8)) . '.' . $permitidos[$mime];
    global $uploadDir;
    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        return [null, 'No se pudo guardar el logo.'];
    }
    return [$filename, null];
}

try {
    switch ($path) {
        case 'listar':
            $stmt = $db->query("SELECT id, nombre, ruc, direccion, telefono, whatsapp, logo, creado_en FROM agencias ORDER BY nombre");
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
            [$logo, $logoError] = guardarLogoAgencia($_FILES['logo'] ?? null);
            if ($logoError) {
                http_response_code(400);
                echo json_encode(['error' => $logoError]);
                break;
            }
            $stmt = $db->prepare("INSERT INTO agencias (nombre, ruc, direccion, telefono, whatsapp, logo) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $nombre,
                trim($_POST['ruc'] ?? ''),
                trim($_POST['direccion'] ?? ''),
                trim($_POST['telefono'] ?? ''),
                trim($_POST['whatsapp'] ?? ''),
                $logo
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
            [$logo, $logoError] = guardarLogoAgencia($_FILES['logo'] ?? null);
            if ($logoError) {
                http_response_code(400);
                echo json_encode(['error' => $logoError]);
                break;
            }
            if ($logo) {
                $stmt = $db->prepare("SELECT logo FROM agencias WHERE id = ?");
                $stmt->execute([$id]);
                $anterior = $stmt->fetchColumn();
                if ($anterior && file_exists($uploadDir . $anterior)) {
                    @unlink($uploadDir . $anterior);
                }
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, whatsapp = ?, logo = ? WHERE id = ?");
                $stmt->execute([$nombre, trim($_POST['ruc'] ?? ''), trim($_POST['direccion'] ?? ''), trim($_POST['telefono'] ?? ''), trim($_POST['whatsapp'] ?? ''), $logo, $id]);
            } else {
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, whatsapp = ? WHERE id = ?");
                $stmt->execute([$nombre, trim($_POST['ruc'] ?? ''), trim($_POST['direccion'] ?? ''), trim($_POST['telefono'] ?? ''), trim($_POST['whatsapp'] ?? ''), $id]);
            }
            echo json_encode(['success' => true]);
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
            $stmt = $db->prepare("SELECT logo FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            $logo = $stmt->fetchColumn();
            $stmt = $db->prepare("DELETE FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            if ($logo && file_exists($uploadDir . $logo)) {
                @unlink($uploadDir . $logo);
            }
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
