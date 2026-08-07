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
        return false;
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
