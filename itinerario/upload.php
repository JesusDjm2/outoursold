<?php
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

if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió el archivo PDF o hubo un error en la subida.']);
    exit;
}

$fileName = basename($_FILES['pdf']['name']);
$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
if ($ext !== 'pdf') {
    http_response_code(400);
    echo json_encode(['error' => 'Solo se permiten archivos PDF.']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['pdf']['tmp_name']);
finfo_close($finfo);
if ($mime !== 'application/pdf') {
    http_response_code(400);
    echo json_encode(['error' => 'El archivo no es un PDF válido.']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';
$targetPath = $uploadDir . $fileName;

// Opcional: Prevenir sobrescritura generando un nombre único
$counter = 1;
$originalFileName = $fileName;
while (file_exists($targetPath)) {
    $fileName = pathinfo($originalFileName, PATHINFO_FILENAME) . '_' . $counter . '.' . pathinfo($originalFileName, PATHINFO_EXTENSION);
    $targetPath = $uploadDir . $fileName;
    $counter++;
}

if (move_uploaded_file($_FILES['pdf']['tmp_name'], $targetPath)) {
    echo json_encode([
        'success' => true,
        'filename' => $fileName // Devolvemos el nombre final del archivo
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al mover el archivo al directorio de destino.']);
}
?>