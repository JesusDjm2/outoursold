-- Bitácora de inicios de sesión: un registro por cada intento de login (exitoso o no),
-- para poder auditar accesos y fallas. usuario_id queda NULL cuando el identificador
-- escrito no corresponde a ninguna cuenta (no hay a quién asociarlo); identificador
-- guarda siempre lo que se escribió en el formulario (usuario o email) tal cual, para
-- poder investigar intentos fallidos aunque no exista esa cuenta.

CREATE TABLE bitacora_accesos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    identificador VARCHAR(150) NOT NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    exito TINYINT(1) NOT NULL,
    motivo VARCHAR(50) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bitacora_accesos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_bitacora_accesos_fecha (creado_en),
    INDEX idx_bitacora_accesos_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
