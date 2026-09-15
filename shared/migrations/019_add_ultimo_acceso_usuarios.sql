-- Para poder mostrar quién está "conectado ahora" (heartbeat): se actualiza en cada
-- request autenticado válido (ver is_logged_in() en auth.php). "En línea" se calcula en
-- la consulta como ultimo_acceso dentro de los últimos minutos, no es un estado exacto de
-- sesión abierta/cerrada (no hay evento de logout garantizado si el usuario solo cierra
-- la pestaña).

ALTER TABLE usuarios
    ADD COLUMN ultimo_acceso DATETIME NULL AFTER activo;
