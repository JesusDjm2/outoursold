<?php
// shared/login.php
require_once 'auth.php';

if (is_logged_in()) {
    header('Location: ../usd/');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['user'] ?? '');
    $pass = $_POST['pass'] ?? '';
    $result = authenticate($user, $pass);
    if ($result && !isset($result['paused'])) {
        $_SESSION['logged_in'] = true;
        $_SESSION['user_id'] = $result['id'];
        $_SESSION['usuario'] = $result['usuario'];
        $_SESSION['rol'] = $result['rol'];
        header('Location: ../usd/');
        exit;
    } elseif ($result && isset($result['paused'])) {
        $error = 'Esta cuenta está pausada. Contacta al administrador.';
    } else {
        $error = 'Usuario o contraseña incorrectos.';
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Cotizador Turístico</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gradient-to-br from-cyan-50 to-emerald-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="text-center mb-6">
            <i class="fas fa-lock text-4xl text-cyan-500 mb-3"></i>
            <h1 class="text-2xl font-bold text-slate-800">Acceso al Cotizador</h1>
            <p class="text-slate-500 text-sm">Solo para el equipo autorizado</p>
        </div>

        <?php if ($error): ?>
            <div class="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm flex items-center">
                <i class="fas fa-exclamation-triangle mr-2"></i> <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-5">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                <div class="relative">
                    <input type="text" name="user" required
                           class="w-full border border-slate-300 rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <i class="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <div class="relative">
                    <input type="password" name="pass" required
                           class="w-full border border-slate-300 rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <i class="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                </div>
            </div>
            <button type="submit"
                    class="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center">
                <i class="fas fa-sign-in-alt mr-2"></i> Ingresar
            </button>
        </form>

        <div class="mt-6 text-center">
            <p class="text-xs text-slate-400">© 2025 Cotizador Turístico Pro</p>
        </div>
    </div>
</body>
</html>