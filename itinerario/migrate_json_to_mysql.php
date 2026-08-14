<?php
// itinerario/migrate_json_to_mysql.php
// Script de un solo uso: migra itineraryModules.json + defaultConfig.json (todo en
// español hasta ahora) a las tablas MySQL itinerarios_es / itinerario_config_es.
// Se ejecuta a mano una vez, después de aplicar shared/migrations/012_...sql.
// No borra los JSON originales — quedan como respaldo, sin ser referenciados por
// ningún código nuevo.
//
// IMPORTANTE: borrar este archivo del servidor apenas termine de correr con éxito.
// Solo admin puede ejecutarlo, y además se niega a correr si itinerarios_es ya tiene
// datos (para no duplicar todo si alguien lo vuelve a abrir por accidente).
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/db.php';

require_login();
if (!is_admin()) {
    http_response_code(403);
    die('Acceso denegado. Solo el administrador puede correr esta migración.');
}

header('Content-Type: text/plain; charset=utf-8');

$modulesFile = __DIR__ . '/itineraryModules.json';
$configFile = __DIR__ . '/defaultConfig.json';
$uploadDir = __DIR__ . '/uploads/';
$uploadDirEs = __DIR__ . '/uploads/es/';

$db = getDB();
$yaMigrado = (int) $db->query("SELECT COUNT(*) FROM itinerarios_es")->fetchColumn();
if ($yaMigrado > 0) {
    die("itinerarios_es ya tiene $yaMigrado registro(s) — esta migración ya se corrió antes. " .
        "Abortando para no duplicar datos. Si de verdad quieres re-migrar, vacía la tabla " .
        "itinerarios_es a mano primero.\n");
}

$modules = file_exists($modulesFile) ? json_decode(file_get_contents($modulesFile), true) : [];
if (!is_array($modules)) $modules = [];
$config = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : [];
if (!is_array($config)) $config = [];

echo "Módulos encontrados en JSON: " . count($modules) . "\n";

// 1. Pre-flight: qué archivos existen físicamente antes de mover nada.
$faltantes = [];
foreach ($modules as $m) {
    if (!file_exists($uploadDir . $m['filename'])) {
        $faltantes[] = $m['filename'];
    }
}
echo "Archivos físicos faltantes en uploads/: " . count($faltantes) . " de " . count($modules) . "\n";
if ($faltantes) {
    echo "  (se migra igual el registro; el archivo deberá subirse manualmente después)\n";
}

// 2. Carpetas por idioma.
foreach (['es', 'en', 'pt'] as $idioma) {
    $dir = __DIR__ . '/uploads/' . $idioma . '/';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
        echo "Creada carpeta: uploads/$idioma/\n";
    }
}

$db->beginTransaction();
try {
    $stmt = $db->prepare(
        "INSERT INTO itinerarios_es (titulo, filename, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, NULL)"
    );
    $movidos = 0;
    $erroresMovimiento = [];
    foreach ($modules as $m) {
        $origen = $uploadDir . $m['filename'];
        $destino = $uploadDirEs . $m['filename'];
        if (file_exists($origen)) {
            if (rename($origen, $destino)) {
                $movidos++;
            } else {
                // No fatal: el registro igual se migra a la BD, solo queda el archivo
                // físico en su ubicación anterior para mover a mano después.
                $erroresMovimiento[] = $m['filename'];
            }
        }
        $stmt->execute([
            $m['title'],
            $m['filename'],
            $m['destino_id'] ?? null,
            $m['categoria_id'] ?? null,
        ]);
    }
    echo "Archivos físicos movidos a uploads/es/: $movidos\n";
    if ($erroresMovimiento) {
        echo "No se pudieron mover (revisar permisos, mover a mano): " . implode(', ', $erroresMovimiento) . "\n";
    }

    $startFiles = json_encode($config['startFiles'] ?? [], JSON_UNESCAPED_UNICODE);
    $endFiles = json_encode($config['endFiles'] ?? [], JSON_UNESCAPED_UNICODE);
    $db->prepare("UPDATE itinerario_config_es SET start_files = ?, end_files = ? WHERE id = 1")
        ->execute([$startFiles, $endFiles]);
    echo "Config de páginas fijas migrada: startFiles=" . count($config['startFiles'] ?? []) . ", endFiles=" . count($config['endFiles'] ?? []) . "\n";

    $count = (int) $db->query("SELECT COUNT(*) FROM itinerarios_es")->fetchColumn();
    echo "Registros en itinerarios_es tras migrar: $count (esperado: " . count($modules) . ")\n";
    if ($count !== count($modules)) {
        throw new Exception("El conteo final ($count) no coincide con lo esperado (" . count($modules) . "). Revirtiendo.");
    }

    $db->commit();
    echo "\nMIGRACIÓN COMPLETADA Y CONFIRMADA (commit).\n";
    echo "itineraryModules.json y defaultConfig.json se dejaron intactos como respaldo.\n";
} catch (Exception $e) {
    $db->rollBack();
    echo "\nERROR: " . $e->getMessage() . "\nSe revirtió la transacción (rollback). No se modificó la base de datos.\n";
}
