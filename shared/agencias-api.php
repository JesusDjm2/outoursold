<?php
// shared/agencias-api.php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/agencia-helpers.php';

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
            $stmt = $db->query("SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp, logo, es_principal,
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
            $stmt = $db->prepare("INSERT INTO agencias (nombre, ruc, direccion, telefono, telefono2, whatsapp, logo, terminos_es, terminos_en, terminos_pt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $nombre,
                trim($_POST['ruc'] ?? ''),
                trim($_POST['direccion'] ?? ''),
                trim($_POST['telefono'] ?? ''),
                trim($_POST['telefono2'] ?? ''),
                trim($_POST['whatsapp'] ?? ''),
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
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ?, logo = ? WHERE id = ?");
                $stmt->execute([...$comunes, $logo, $id]);
            } else {
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ? WHERE id = ?");
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
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
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

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
