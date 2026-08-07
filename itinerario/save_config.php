<?php
require_once __DIR__ . '/../shared/auth.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}

// Determinar qué archivo se está solicitando
$mode = $_GET['mode'] ?? 'modules'; // 'modules' o 'config'

if ($mode === 'modules') {
    $configFile = __DIR__ . '/itineraryModules.json';
} elseif ($mode === 'config') {
    $configFile = __DIR__ . '/defaultConfig.json';
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Modo no válido. Use "modules" o "config".']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Guardar la configuración
    $json = file_get_contents('php://input');
    if ($json === false) {
        http_response_code(400);
        echo json_encode(['error' => 'No se recibieron datos.']);
        exit;
    }

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos JSON inválidos.']);
        exit;
    }

    if (file_put_contents($configFile, $json) !== false) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo guardar el archivo de configuración en el servidor.']);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Cargar la configuración
    if (file_exists($configFile)) {
        $json = file_get_contents($configFile);
        if ($json === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al leer el archivo de configuración.']);
        } else {
            echo $json;
        }
    } else {
        // Si no existe, devolvemos un objeto/array vacío según el modo
        if ($mode === 'modules') {
            echo '[]';
        } else {
            echo '{}';
        }
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
?>