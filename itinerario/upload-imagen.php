<?php
// itinerario/upload-imagen.php
// Sube la imagen de un itinerario (Gestión de Datos > Itinerarios > <idioma> > Itinerarios
// > Editar) a uploads/<idioma>/imagenes/ y devuelve el nombre final del archivo. El registro
// se actualiza después con api.php?path=actualizar-modulo (campo `imagen`), igual que los
// PDF con upload.php + crear-modulo.
require_once __DIR__ . '/../shared/auth.php';
header('Content-Type: application/json');

if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}
if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió la imagen o hubo un error en la subida.']);
    exit;
}

$maxBytes = 5 * 1024 * 1024;
if ($_FILES['imagen']['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen pesa más de 5 MB.']);
    exit;
}

// El tipo se decide por el contenido real del archivo, no por la extensión que trae.
$extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['imagen']['tmp_name']);
finfo_close($finfo);
if (!isset($extensiones[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Solo se permiten imágenes JPG, PNG o WebP.']);
    exit;
}

$idioma = $_POST['idioma'] ?? 'es';
if (!in_array($idioma, ['es', 'en', 'pt'], true)) {
    $idioma = 'es';
}

// Mismo criterio de nombre seguro que upload.php: sin tildes y solo [A-Za-z0-9 _-].
$base = pathinfo(basename($_FILES['imagen']['name']), PATHINFO_FILENAME);
$base = strtr($base, [
    'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
    'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
    'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
    'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
    'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
    'ñ' => 'n', 'Ñ' => 'N', 'ç' => 'c', 'Ç' => 'C'
]);
$base = trim(preg_replace('/[^A-Za-z0-9 _\-]/', '_', $base));
if ($base === '') $base = 'imagen';
$ext = $extensiones[$mime];

$dir = __DIR__ . "/uploads/$idioma/imagenes/";
if (!is_dir($dir)) {
    mkdir($dir, 0775, true);
}
$nombre = "$base.$ext";
$contador = 1;
while (file_exists($dir . $nombre)) {
    $nombre = "{$base}_$contador.$ext";
    $contador++;
}

if (!move_uploaded_file($_FILES['imagen']['tmp_name'], $dir . $nombre)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar la imagen.']);
    exit;
}
echo json_encode(['success' => true, 'imagen' => $nombre]);
