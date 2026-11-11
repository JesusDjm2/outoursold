<?php
// itinerario/descargar-generado.php
// Entrega el PDF de un itinerario generado (lleva datos de pasajeros) solo a quien puede
// verlo: usuarios de la misma agencia que lo generó, o el admin (que ve los de las agencias
// en solo lectura desde Usuarios › Agencias). La carpeta uploads/<idioma>/generados/ está
// cerrada al acceso directo (ver uploads/.htaccess), así que esta es la única vía.
//
// GET ?idioma=es|en|pt&id=N[&descargar=1]
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/db.php';

if (!is_logged_in()) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Acceso denegado. Debes iniciar sesión.');
}

$idioma = $_GET['idioma'] ?? '';
$id = (int) ($_GET['id'] ?? 0);
if (!in_array($idioma, ['es', 'en', 'pt'], true) || $id < 1) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Pedido inválido.');
}

$db = getDB();
$tabla = "itinerario_generados_$idioma";
if (is_admin()) {
    $stmt = $db->prepare("SELECT pasajero, filename FROM $tabla WHERE id = ?");
    $stmt->execute([$id]);
} else {
    [$fd, $pd] = filtroDueno('generado_por');
    $stmt = $db->prepare("SELECT pasajero, filename FROM $tabla WHERE id = ? AND $fd");
    $stmt->execute(array_merge([$id], $pd));
}
$fila = $stmt->fetch();

$ruta = $fila ? __DIR__ . "/uploads/$idioma/generados/" . basename($fila['filename']) : null;
if (!$fila || !is_file($ruta)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('No encontrado.');
}

// Nombre para el usuario: "Itinerario - <pasajero>.pdf", sin caracteres que rompan la cabecera.
$nombre = 'Itinerario - ' . trim(preg_replace('/[^\p{L}\p{N} _\-.]/u', '', (string) $fila['pasajero'])) . '.pdf';
$nombreAscii = preg_replace('/[^A-Za-z0-9 _\-.]/', '_', $nombre);
$disposicion = !empty($_GET['descargar']) ? 'attachment' : 'inline';

// Sin la CSP de las páginas (auth.php): el visor de PDF del navegador la necesita libre.
header_remove('Content-Security-Policy');
header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($ruta));
header("Content-Disposition: $disposicion; filename=\"$nombreAscii\"; filename*=UTF-8''" . rawurlencode($nombre));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($ruta);
