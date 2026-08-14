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

function sanitizarHtmlTerminos($html) {
    $html = trim((string) $html);
    if ($html === '') return null;
    $permitidos = '<b><strong><i><em><u><ul><ol><li><br><p><span>';
    $html = strip_tags($html, $permitidos);
    // Quita atributos de evento (onclick=, onerror=, ...) y href/src con javascript:
    $html = preg_replace('/\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/\s+(href|src)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\')/i', '', $html);
    return $html;
}
