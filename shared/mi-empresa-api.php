<?php
// shared/mi-empresa-api.php
// Autoservicio: cada usuario logueado edita solo SU PROPIA agencia/empresa (nunca la de
// otro), a diferencia de agencias-api.php que es el CRUD admin sobre todas las agencias.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/agencia-helpers.php';

require_login();

header('Content-Type: application/json');
$db = getDB();
$uploadDir = __DIR__ . '/uploads/agencias/';
$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Resuelve el id de la agencia "propia" del usuario logueado a partir de la sesión, nunca
// de un id que venga del cliente: si es admin, la agencia marcada como principal (su
// propia empresa); si no, la que tiene asignada en su ficha de usuario (o ninguna).
function resolverAgenciaPropiaId($db) {
    if (is_admin()) {
        $stmt = $db->query("SELECT id FROM agencias WHERE es_principal = 1 LIMIT 1");
        return $stmt->fetchColumn() ?: null;
    }
    $stmt = $db->prepare("SELECT agencia_id FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetchColumn() ?: null;
}

try {
    switch ($path) {
        case 'mi-agencia':
            $id = resolverAgenciaPropiaId($db);
            if (!$id) {
                echo json_encode(['agencia' => null]);
                break;
            }
            $stmt = $db->prepare("SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp, logo,
                                          terminos_es, terminos_en, terminos_pt
                                   FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['agencia' => $stmt->fetch() ?: null]);
            break;

        case 'guardar':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $id = resolverAgenciaPropiaId($db);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'No tienes una agencia/empresa asignada. Contacta a tu administrador.']);
                break;
            }
            $nombre = trim($_POST['nombre'] ?? '');
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre es obligatorio']);
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

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
