<?php
// shared/auth.php
// Cookie de sesión endurecida: HttpOnly (un script inyectado no puede leerla), SameSite=Lax
// (no viaja en envíos de formularios desde otros sitios: freno a CSRF) y Secure con HTTPS.
// use_strict_mode rechaza ids de sesión que no creó el servidor (fijación de sesión).
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        // Con HTTPS (directo o detrás de un proxy), o si el hosting ya lo exige en php.ini.
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
            || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443'
            || (bool) ini_get('session.cookie_secure'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ===== CSRF =====
// Token por sesión. Las páginas lo publican en window.CSRF_TOKEN (ver sidebar.php) y un
// envoltorio de fetch lo manda en la cabecera X-CSRF-Token en todo pedido que no sea GET.
// Las APIs llaman a exigirCsrf(): un sitio ajeno no conoce el token, así que no puede hacer
// que el navegador de un usuario logueado cree, edite o borre nada.
function csrfToken() {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function exigirCsrf() {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true)) return;
    // Origen distinto al del sitio: se rechaza aunque traiga token.
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origen !== '' && parse_url($origen, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        responderCsrfInvalido();
    }
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!is_string($enviado) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $enviado)) {
        responderCsrfInvalido();
    }
}

function responderCsrfInvalido() {
    http_response_code(403);
    header('Content-Type: application/json');
    // Lo más común es una sesión renovada en otra pestaña: con recargar se arregla.
    echo json_encode(['error' => 'Tu sesión se renovó. Recarga la página e intenta de nuevo.', 'csrf' => true]);
    exit;
}

// ===== Límite de intentos de login =====
// Usa la bitácora de accesos: con muchos intentos fallidos seguidos para el mismo usuario
// (o desde la misma IP) se bloquea un rato, para frenar a quien prueba contraseñas.
const LOGIN_MAX_POR_USUARIO = 5;   // fallidos en la ventana, por usuario/email
const LOGIN_MAX_POR_IP = 20;       // fallidos en la ventana, por IP
const LOGIN_VENTANA_MIN = 15;

// Minutos que faltan para poder intentar de nuevo (0 = puede intentar ya).
function minutosBloqueoLogin($identificador) {
    $db = getDB();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $stmt = $db->prepare("SELECT
            SUM(identificador = ?) AS por_usuario,
            SUM(ip = ?) AS por_ip,
            -- Segundos que faltan, calculados en MySQL (PHP y MySQL pueden tener otra zona horaria).
            TIMESTAMPDIFF(SECOND, NOW(), MIN(creado_en) + INTERVAL " . LOGIN_VENTANA_MIN . " MINUTE) AS faltan
        FROM bitacora_accesos
        WHERE exito = 0 AND motivo = 'credenciales_invalidas'
          AND creado_en >= NOW() - INTERVAL " . LOGIN_VENTANA_MIN . " MINUTE
          AND (identificador = ? OR ip = ?)");
    $stmt->execute([$identificador, $ip, $identificador, $ip]);
    $r = $stmt->fetch();
    if ((int) $r['por_usuario'] < LOGIN_MAX_POR_USUARIO && (int) $r['por_ip'] < LOGIN_MAX_POR_IP) return 0;
    return max(1, (int) ceil(((int) $r['faltan']) / 60));
}

// ===== Política de contraseñas =====
// null si es válida; si no, el motivo para mostrar.
function motivoContrasenaDebil($password, $usuario = '') {
    if (!is_string($password) || mb_strlen($password) < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) return 'La contraseña debe tener letras y números.';
    if ($usuario !== '' && mb_strtolower($password) === mb_strtolower($usuario)) return 'La contraseña no puede ser igual al usuario.';
    $comunes = ['password1', 'password123', 'contraseña1', 'qwerty123', '12345678a', 'abc12345', 'admin123', 'peru1234'];
    if (in_array(mb_strtolower($password), $comunes, true)) return 'Esa contraseña es demasiado común.';
    return null;
}

// ===== Content-Security-Policy =====
// Lista de orígenes desde donde el navegador puede cargar scripts, estilos, imágenes, etc.
// Si se inyectara código, no podría mandar datos a otro servidor (connect-src) ni cargar
// scripts de otro sitio. 'unsafe-inline' sigue porque las vistas usan <script> en línea.
// Al agregar una librería de un CDN nuevo, sumarlo acá.
function politicaSeguridadContenido() {
    $cdns = 'https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com';
    return implode('; ', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' $cdns https://www.youtube.com https://s.ytimg.com",
        "style-src 'self' 'unsafe-inline' $cdns https://fonts.googleapis.com",
        "font-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com",
        "connect-src 'self' blob: data: $cdns",
        "frame-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com",
        "worker-src 'self' blob: https://cdnjs.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ]);
}
if (!headers_sent()) header('Content-Security-Policy: ' . politicaSeguridadContenido());

// Tras iniciar sesión (login o "recordarme"): id de sesión nuevo, para que uno fijado
// antes del login no sirva después.
function iniciarSesionUsuario($row) {
    session_regenerate_id(true);
    unset($_SESSION['csrf']); // token nuevo para la sesión nueva
    $_SESSION['logged_in'] = true;
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['usuario'] = $row['usuario'];
    $_SESSION['rol'] = $row['rol'];
}
require_once __DIR__ . '/db.php';
require_once '../config.php';

// Devuelve la fila del usuario si las credenciales son correctas y la cuenta está activa.
// Si el usuario existe pero está pausado, devuelve ['paused' => true] para que login.php
// pueda mostrar un mensaje distinto a "credenciales incorrectas".
// $identificador acepta tanto el nombre de usuario como el email (pensado para cuentas de
// rol 'agencia', que inician sesión con su email en vez de un usuario interno).
// Cada intento (exitoso o no) queda registrado en bitacora_accesos.
function authenticate($identificador, $pass) {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, usuario, password_hash, rol, activo FROM usuarios WHERE usuario = ? OR email = ?");
    $stmt->execute([$identificador, $identificador]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($pass, $row['password_hash'])) {
        registrarAcceso($row['id'] ?? null, $identificador, false, 'credenciales_invalidas');
        return false;
    }
    if (!$row['activo']) {
        registrarAcceso($row['id'], $identificador, false, 'pausado');
        return ['paused' => true];
    }
    registrarAcceso($row['id'], $identificador, true, null);
    $db->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?")->execute([$row['id']]);
    return $row;
}

function registrarAcceso($usuarioId, $identificador, $exito, $motivo) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO bitacora_accesos (usuario_id, identificador, ip, user_agent, exito, motivo) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $usuarioId,
        mb_substr($identificador, 0, 150),
        $_SERVER['REMOTE_ADDR'] ?? null,
        mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        $exito ? 1 : 0,
        $motivo
    ]);
}

function is_logged_in() {
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
        return try_remember_login();
    }
    // Revalida contra la BD en cada request: si el admin pausó esta cuenta,
    // el acceso se corta de inmediato aunque la sesión siga viva.
    $db = getDB();
    $stmt = $db->prepare("SELECT activo FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();
    if (!$row || !$row['activo']) {
        $_SESSION = array();
        session_destroy();
        return false;
    }
    // Heartbeat: cada request autenticado refresca ultimo_acceso, así "conectado ahora"
    // (ver usuarios-api.php) refleja actividad reciente, no solo el momento del login.
    $db->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?")->execute([$_SESSION['user_id']]);
    return true;
}

// Intenta iniciar sesión a partir de la cookie "recordarme". Si es válida,
// rota el token (por seguridad) y deja la sesión igual que un login normal.
function try_remember_login() {
    if (empty($_COOKIE['remember_me'])) {
        return false;
    }
    [$userId, $token] = array_pad(explode(':', $_COOKIE['remember_me'], 2), 2, null);
    if (!$userId || !$token) {
        forget_remember_cookie();
        return false;
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, usuario, rol, activo, remember_token, remember_expires FROM usuarios WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    $valid = $row && $row['activo'] && $row['remember_token'] && $row['remember_expires']
        && strtotime($row['remember_expires']) > time()
        && hash_equals($row['remember_token'], hash('sha256', $token));

    if (!$valid) {
        forget_remember_cookie($row['id'] ?? null);
        return false;
    }

    iniciarSesionUsuario($row);
    set_remember_cookie($row['id']);
    $db->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?")->execute([$row['id']]);
    return true;
}

// Genera un token nuevo, lo guarda (hasheado) en la BD y lo manda como cookie httponly.
function set_remember_cookie($userId) {
    $token = bin2hex(random_bytes(32));
    $expires = time() + 60 * 60 * 24 * 30; // 30 días

    $db = getDB();
    $stmt = $db->prepare("UPDATE usuarios SET remember_token = ?, remember_expires = ? WHERE id = ?");
    $stmt->execute([hash('sha256', $token), date('Y-m-d H:i:s', $expires), $userId]);

    setcookie('remember_me', $userId . ':' . $token, [
        'expires' => $expires,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
}

// Invalida la cookie "recordarme" y, si se conoce el usuario, borra el token en BD.
function forget_remember_cookie($userId = null) {
    if ($userId) {
        $db = getDB();
        $stmt = $db->prepare("UPDATE usuarios SET remember_token = NULL, remember_expires = NULL WHERE id = ?");
        $stmt->execute([$userId]);
    }
    setcookie('remember_me', '', ['expires' => time() - 3600, 'path' => '/']);
}

function is_admin() {
    return is_logged_in() && ($_SESSION['rol'] ?? '') === 'admin';
}

function require_login() {
    if (!is_logged_in()) {
        header('Location: login.php');
        exit;
    }
}

// ===== Ámbito de los datos: la agencia =====
// Catálogo (destinos, categorías, tours, hoteles, módulos de itinerario, páginas fijas,
// paquetes), cotizaciones e itinerarios generados son de la AGENCIA: todos los usuarios de
// una agencia ven y editan lo que cualquiera de ellos creó, y nada se cruza con otras
// agencias. Un usuario sin agencia (típicamente el admin) solo ve y toca lo suyo. El admin
// NO tiene pase libre: lo de las agencias lo ve en solo lectura desde Agencias
// (shared/agencias-api.php). Las filas siguen guardando creado_por / generado_por (el
// usuario); la agencia se resuelve en cada consulta, así que si un usuario cambia de agencia
// sus datos se van con él.

// agencia_id del usuario logueado (null si no tiene), una consulta por request.
function agenciaDeSesion() {
    static $cache = [];
    $uid = (int) ($_SESSION['user_id'] ?? 0);
    if (!array_key_exists($uid, $cache)) {
        $stmt = getDB()->prepare("SELECT agencia_id FROM usuarios WHERE id = ?");
        $stmt->execute([$uid]);
        $cache[$uid] = ($aid = $stmt->fetchColumn()) ? (int) $aid : null;
    }
    return $cache[$uid];
}

// Condición SQL "esta fila es de mi ámbito" sobre la columna de autor indicada, con sus
// parámetros: [$sql, $params]. Uso: [$fd, $pd] = filtroDueno('t.creado_por');
function filtroDueno($columna = 'creado_por') {
    $agenciaId = agenciaDeSesion();
    if ($agenciaId) return ["$columna IN (SELECT id FROM usuarios WHERE agencia_id = ?)", [$agenciaId]];
    return ["$columna = ?", [(int) $_SESSION['user_id']]];
}

// true si la fila $id de $tabla es de mi ámbito (sin responder nada).
function esDelAmbito($db, $tabla, $id, $columna = 'creado_por') {
    [$fd, $pd] = filtroDueno($columna);
    $stmt = $db->prepare("SELECT 1 FROM $tabla WHERE id = ? AND $fd");
    $stmt->execute(array_merge([$id], $pd));
    return (bool) $stmt->fetchColumn();
}

// Para editar/borrar: true si puede proceder; si no, ya respondió el error HTTP y el caller
// debe hacer `break`. Compartida por shared/api.php e itinerario/api.php.
function verificarDueno($db, $tabla, $id, $columna = 'creado_por') {
    if (esDelAmbito($db, $tabla, $id, $columna)) return true;
    $stmt = $db->prepare("SELECT 1 FROM $tabla WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
        http_response_code(404);
        echo json_encode(['error' => 'No encontrado.']);
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permiso sobre este registro: es de otra agencia.']);
    }
    return false;
}

// Destino / categoría que llega del cliente para vincular a un tour, hotel o itinerario:
// null/'' = sin asignar; si viene un id, debe ser de mi ámbito (que nadie enganche sus datos
// al catálogo de otra agencia). Devuelve el id (int), null, o false si es ajeno (ya
// respondió el error HTTP y el caller debe hacer `break`).
function idVinculoPropio($db, $tabla, $id) {
    if ($id === null || $id === '' || (int) $id === 0) return null;
    if (esDelAmbito($db, $tabla, (int) $id)) return (int) $id;
    http_response_code(400);
    echo json_encode(['error' => 'El destino o la categoría elegidos no son de tu agencia.']);
    return false;
}

// Lista de "guardar-clasificaciones-*" ([{id, destino_id, categoria_id}, ...]) normalizada
// y con cada destino/categoría validado con idVinculoPropio. Devuelve la lista limpia, o
// false si alguno es ajeno (ya respondió el error HTTP). Las filas a actualizar se acotan
// aparte, con filtroDueno en el UPDATE.
function validarCambiosClasificacion($db, $cambios, $tablaCategorias) {
    $limpios = [];
    foreach ($cambios as $c) {
        $id = intval($c['id'] ?? 0);
        if (!$id) continue;
        $destinoId = idVinculoPropio($db, 'destinos', $c['destino_id'] ?? null);
        if ($destinoId === false) return false;
        $categoriaId = idVinculoPropio($db, $tablaCategorias, $c['categoria_id'] ?? null);
        if ($categoriaId === false) return false;
        $limpios[] = ['id' => $id, 'destino_id' => $destinoId, 'categoria_id' => $categoriaId];
    }
    return $limpios;
}
?>
