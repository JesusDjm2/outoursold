<?php
// shared/agencia-helpers.php
// Funciones compartidas por agencias-api.php (CRUD de admin sobre todas las agencias) y
// mi-empresa-api.php (autoservicio: cada usuario edita solo su propia agencia/empresa).

function guardarLogoAgencia($file, $uploadDir) {
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
    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        return [null, 'No se pudo guardar el logo.'];
    }
    return [$filename, null];
}

// Resuelve el id de la agencia "propia" del usuario logueado a partir de la sesión, nunca
// de un id que venga del cliente: si es admin, la agencia marcada como principal (su
// propia empresa); si no, la que tiene asignada en su ficha de usuario (o ninguna).
// Compartida por mi-empresa-api.php (autoservicio) y el Hero de cada vista (ver abajo).
function resolverAgenciaPropiaId($db) {
    if (is_admin()) {
        $stmt = $db->query("SELECT id FROM agencias WHERE es_principal = 1 LIMIT 1");
        return $stmt->fetchColumn() ?: null;
    }
    $stmt = $db->prepare("SELECT agencia_id FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetchColumn() ?: null;
}

// URL (con cache-busting) de la imagen del Hero para el usuario logueado: la de su propia
// agencia si la personalizó, o si no, el fondo por defecto del sistema — así nadie se
// queda sin imagen mientras no haya subido la suya. $navShared es la ruta relativa hasta
// shared/ desde la página que llama ('' desde shared/, '../shared/' desde pen//usd//itinerario).
function resolverHeroImagenUrl($db, $navShared) {
    $agenciaId = resolverAgenciaPropiaId($db);
    if ($agenciaId) {
        $stmt = $db->prepare("SELECT hero_imagen FROM agencias WHERE id = ?");
        $stmt->execute([$agenciaId]);
        $heroImagen = $stmt->fetchColumn();
        if ($heroImagen) {
            $ruta = __DIR__ . '/uploads/agencias/' . $heroImagen;
            if (file_exists($ruta)) {
                return $navShared . 'uploads/agencias/' . $heroImagen . '?v=' . filemtime($ruta);
            }
        }
    }
    $rutaDefault = __DIR__ . '/fondo-sistema-outours.jpg';
    return $navShared . 'fondo-sistema-outours.jpg?v=' . filemtime($rutaDefault);
}

function sanitizarHtmlTerminos($html) {
    $html = trim((string) $html);
    if ($html === '') return null;
    // <div> incluido a propósito: Chrome envuelve cada línea/párrafo del editor
    // contenteditable en un <div> (no en <p>) — sin permitirlo, strip_tags borraba esos
    // envoltorios y con ellos el salto de línea que representaban, así que un párrafo en
    // blanco (Enter dos veces) terminaba colapsando a un solo <br> al guardar.
    $permitidos = '<b><strong><i><em><u><ul><ol><li><br><p><span><div>';
    $html = strip_tags($html, $permitidos);
    // Quita atributos de evento (onclick=, onerror=, ...) y href/src con javascript:
    $html = preg_replace('/\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/\s+(href|src)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\')/i', '', $html);
    return $html;
}
