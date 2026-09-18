<?php
// shared/mi-empresa-api.php
// Autoservicio: cada usuario logueado edita solo SU PROPIA agencia/empresa (nunca la de
// otro), a diferencia de agencias-api.php que es el CRUD admin sobre todas las agencias.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/agencia-helpers.php';
require_once __DIR__ . '/error-helpers.php';

require_login();

header('Content-Type: application/json');
$db = getDB();
$uploadDir = __DIR__ . '/uploads/agencias/';
$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// resolverAgenciaPropiaId() vive ahora en agencia-helpers.php (también la usa el Hero
// de cada vista para saber de quién es la imagen de fondo a mostrar).

try {
    switch ($path) {
        case 'mi-agencia':
            $id = resolverAgenciaPropiaId($db);
            if (!$id) {
                echo json_encode(['agencia' => null]);
                break;
            }
            $stmt = $db->prepare("SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp,
                                          color_principal, color_secundario, logo, hero_imagen,
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
                trim($_POST['color_principal'] ?? '') ?: null,
                trim($_POST['color_secundario'] ?? '') ?: null,
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
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, color_principal = ?, color_secundario = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ?, logo = ? WHERE id = ?");
                $stmt->execute([...$comunes, $logo, $id]);
            } else {
                $stmt = $db->prepare("UPDATE agencias SET nombre = ?, ruc = ?, direccion = ?, telefono = ?, telefono2 = ?, whatsapp = ?, color_principal = ?, color_secundario = ?, terminos_es = ?, terminos_en = ?, terminos_pt = ? WHERE id = ?");
                $stmt->execute([...$comunes, $id]);
            }
            echo json_encode(['success' => true]);
            break;

        // Imagen de fondo del Hero de MI agencia (independiente del botón "Guardar
        // cambios" del resto de la ficha: se sube y se aplica al instante). Cada agencia
        // tiene la suya; mientras no suba una, todas sus vistas usan el fondo por defecto
        // del sistema (ver resolverHeroImagenUrl() en agencia-helpers.php).
        case 'subir-hero':
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
            $file = $_FILES['imagen'] ?? null;
            if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['error' => 'No se recibió ninguna imagen.']);
                break;
            }
            if ($file['size'] > 10 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['error' => 'La imagen no debe superar 10MB.']);
                break;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            $creadores = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng'];
            if (function_exists('imagecreatefromwebp')) {
                $creadores['image/webp'] = 'imagecreatefromwebp';
            }
            if (!isset($creadores[$mime])) {
                http_response_code(400);
                echo json_encode(['error' => 'La imagen debe ser JPG, PNG o WEBP.']);
                break;
            }

            $origen = $creadores[$mime]($file['tmp_name']);
            if (!$origen) {
                http_response_code(400);
                echo json_encode(['error' => 'No se pudo leer la imagen.']);
                break;
            }

            // Recomprime siempre a JPG y limita el ancho: es un fondo decorativo, no hace
            // falta conservar una foto de varios MB.
            $anchoOriginal = imagesx($origen);
            $altoOriginal = imagesy($origen);
            $anchoFinal = min($anchoOriginal, 1920);
            $altoFinal = (int) round($altoOriginal * ($anchoFinal / $anchoOriginal));

            $final = imagecreatetruecolor($anchoFinal, $altoFinal);
            imagefill($final, 0, 0, imagecolorallocate($final, 255, 255, 255));
            imagealphablending($final, true);
            imagecopyresampled($final, $origen, 0, 0, 0, 0, $anchoFinal, $altoFinal, $anchoOriginal, $altoOriginal);
            imagedestroy($origen);

            $nuevoNombre = 'hero_' . bin2hex(random_bytes(8)) . '.jpg';
            $rutaFinal = $uploadDir . $nuevoNombre;
            $guardado = imagejpeg($final, $rutaFinal, 85);
            imagedestroy($final);
            if (!$guardado) {
                http_response_code(500);
                echo json_encode(['error' => 'No se pudo guardar la imagen.']);
                break;
            }

            $stmt = $db->prepare("SELECT hero_imagen FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            $anterior = $stmt->fetchColumn();
            $db->prepare("UPDATE agencias SET hero_imagen = ? WHERE id = ?")->execute([$nuevoNombre, $id]);
            if ($anterior && file_exists($uploadDir . $anterior)) {
                @unlink($uploadDir . $anterior);
            }

            echo json_encode(['success' => true, 'filename' => $nuevoNombre, 'v' => filemtime($rutaFinal)]);
            break;

        // Logo de MI agencia, autoservicio instantáneo desde el botón del Hero (igual
        // criterio que 'subir-hero': independiente del formulario completo de "Guardar
        // cambios", para poder cambiarlo desde cualquier vista sin abrir Mi Empresa).
        case 'subir-logo':
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
            [$logo, $logoError] = guardarLogoAgencia($_FILES['logo'] ?? null, $uploadDir);
            if ($logoError) {
                http_response_code(400);
                echo json_encode(['error' => $logoError]);
                break;
            }
            if (!$logo) {
                http_response_code(400);
                echo json_encode(['error' => 'No se recibió ningún logo.']);
                break;
            }
            $stmt = $db->prepare("SELECT logo FROM agencias WHERE id = ?");
            $stmt->execute([$id]);
            $anterior = $stmt->fetchColumn();
            $db->prepare("UPDATE agencias SET logo = ? WHERE id = ?")->execute([$logo, $id]);
            if ($anterior && file_exists($uploadDir . $anterior)) {
                @unlink($uploadDir . $anterior);
            }
            echo json_encode(['success' => true, 'filename' => $logo, 'v' => filemtime($uploadDir . $logo)]);
            break;

        // Color de marca (color_principal) de MI agencia, autoservicio instantáneo desde
        // el botón de cuentagotas del Hero. Aplica en vivo a --accent-1/--accent-2 en el
        // navegador (ver hero-edit.js) y, en las siguientes cargas de página, server-side
        // vía resolverAccentColorStyle() (agencia-helpers.php).
        case 'guardar-color':
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
            $color = trim($_POST['color_principal'] ?? '');
            if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
                http_response_code(400);
                echo json_encode(['error' => 'Color inválido.']);
                break;
            }
            $db->prepare("UPDATE agencias SET color_principal = ? WHERE id = ?")->execute([$color, $id]);
            echo json_encode(['success' => true, 'color_principal' => $color]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
