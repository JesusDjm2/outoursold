-- Permite iniciar sesión con email además de con el nombre de usuario. Pensado sobre todo
-- para cuentas de rol 'agencia': cada agencia inicia sesión con su propio email en vez de
-- memorizar un usuario interno. NULL/único: los usuarios existentes (sin email) no se ven
-- afectados y siguen entrando con su usuario de siempre.

ALTER TABLE usuarios
    ADD COLUMN email VARCHAR(150) NULL UNIQUE AFTER usuario;
