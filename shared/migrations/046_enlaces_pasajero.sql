-- 046: Enlace para el pasajero: una página pública (viaje/?t=TOKEN) con el itinerario de una
-- cotización, sin iniciar sesión. El token (32 caracteres al azar) es lo único que da acceso:
-- no se puede adivinar ni recorrer. Una cotización tiene a lo sumo un enlace activo; al
-- desactivarlo (revocado_en) deja de abrir, y uno nuevo lleva otro token.
-- mostrar_precios: si la página muestra el total y la reserva.
-- vistas / ultima_vista: cuántas veces lo abrió el pasajero (para el agente).
--
-- Correr ANTES de subir los archivos de esta versión.

CREATE TABLE itinerario_enlaces (
    token CHAR(32) NOT NULL PRIMARY KEY,
    moneda CHAR(3) NOT NULL,
    cotizacion_id VARCHAR(40) NOT NULL,
    mostrar_precios TINYINT(1) NOT NULL DEFAULT 1,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revocado_en DATETIME NULL DEFAULT NULL,
    vistas INT NOT NULL DEFAULT 0,
    ultima_vista DATETIME NULL DEFAULT NULL,
    INDEX idx_enlaces_cotizacion (moneda, cotizacion_id, revocado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
