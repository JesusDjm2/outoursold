<?php
// shared/logout.php
require_once 'auth.php';

forget_remember_cookie($_SESSION['user_id'] ?? null);

// Eliminar todas las variables de sesi��n
$_SESSION = array();

// Si se usa cookie de sesi��n, eliminarla
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destruir la sesi��n
session_destroy();

// Redirigir al login
header('Location: login.php');
exit;
?>