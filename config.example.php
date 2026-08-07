<?php
// config.example.php
// Copia este archivo como config.php y completa tus valores reales.
// config.php está en .gitignore: nunca se sube al repositorio.

// === CONFIGURACIÓN DE BASE DE DATOS ===
define('DB_HOST', 'localhost');
define('DB_USER', 'tu_usuario_mysql');
define('DB_PASS', 'tu_contraseña_mysql');
define('DB_NAME', 'tu_base_de_datos');

// === CREDENCIALES DE LOGIN ===
// Los usuarios, roles y contraseñas viven en la tabla `usuarios`
// (ver shared/migrations/001_create_usuarios.sql y shared/usuarios.php).
?>
