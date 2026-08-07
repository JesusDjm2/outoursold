<?php
// shared/auth.php
session_start();
require_once __DIR__ . '/db.php';
require_once '../config.php';

// Devuelve la fila del usuario si las credenciales son correctas y la cuenta está activa.
// Si el usuario existe pero está pausado, devuelve ['paused' => true] para que login.php
// pueda mostrar un mensaje distinto a "credenciales incorrectas".
function authenticate($usuario, $pass) {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, usuario, password_hash, rol, activo FROM usuarios WHERE usuario = ?");
    $stmt->execute([$usuario]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($pass, $row['password_hash'])) {
        return false;
    }
    if (!$row['activo']) {
        return ['paused' => true];
    }
    return $row;
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

    $_SESSION['logged_in'] = true;
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['usuario'] = $row['usuario'];
    $_SESSION['rol'] = $row['rol'];
    set_remember_cookie($row['id']);
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
?>
