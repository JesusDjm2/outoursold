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
        if (!empty($_POST['remember'])) {
            set_remember_cookie($result['id']);
        }
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
    <style>
        #video-bg-wrap { position: fixed; inset: 0; overflow: hidden; z-index: 0; background: #000; }
        #video-bg-wrap iframe {
            position: absolute; top: 50%; left: 50%;
            width: 177.77vh; height: 100vh;
            min-width: 100%; min-height: 56.25vw;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 relative">
    <div id="video-bg-wrap">
        <div id="yt-bg-player"></div>
    </div>
    <div class="fixed inset-0 bg-black/50 z-[1]"></div>

    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md relative z-10">
        <div class="text-center mb-6">
            <img src="logo.png" alt="Logo" class="h-16 mx-auto mb-3 object-contain">
            <h1 class="text-2xl font-bold text-slate-800">Acceso al Cotizador</h1>
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
                    <input type="password" name="pass" id="pass" required
                           class="w-full border border-slate-300 rounded-lg px-3 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <i class="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <button type="button" id="togglePass" tabindex="-1"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <label class="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
                <input type="checkbox" name="remember" value="1"
                       class="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500">
                Recordar mi sesión
            </label>
            <button type="submit"
                    class="w-full bg-gradient-to-r from-[#e80c13] to-[#bb3135] text-white py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center">
                <i class="fas fa-sign-in-alt mr-2"></i> Ingresar
            </button>
        </form>
    </div>

    <script>
        const togglePass = document.getElementById('togglePass');
        const passInput = document.getElementById('pass');
        togglePass.addEventListener('click', () => {
            const isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            togglePass.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        });
    </script>

    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
        const YT_LOOP_START = 21;
        const YT_LOOP_END = 50;
        let ytBgPlayer = null;
        let ytLoopInterval = null;

        function onYouTubeIframeAPIReady() {
            ytBgPlayer = new YT.Player('yt-bg-player', {
                videoId: '9mS_91IgqbA',
                playerVars: {
                    autoplay: 1,
                    mute: 1,
                    controls: 0,
                    cc_load_policy: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                    start: YT_LOOP_START,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        e.target.mute();
                        e.target.playVideo();
                        disableCaptions(e.target);
                    },
                    onStateChange: (e) => {
                        if (e.data === YT.PlayerState.PLAYING) {
                            clearInterval(ytLoopInterval);
                            ytLoopInterval = setInterval(() => {
                                if (ytBgPlayer.getCurrentTime() >= YT_LOOP_END) {
                                    ytBgPlayer.seekTo(YT_LOOP_START, true);
                                }
                                disableCaptions(ytBgPlayer);
                            }, 300);
                        }
                    }
                }
            });
        }

        // YouTube a veces fuerza subtítulos auto-traducidos según el idioma del navegador,
        // ignorando cc_load_policy. Forzamos el track de captions vacío para tapar ese caso.
        function disableCaptions(player) {
            try { player.setOption('captions', 'track', {}); } catch (e) {}
            try { player.unloadModule('captions'); } catch (e) {}
        }
    </script>
</body>
</html>