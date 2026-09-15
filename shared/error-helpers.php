<?php
// shared/error-helpers.php
// Traduce excepciones (sobre todo de base de datos) a mensajes aptos para mostrar tal
// cual al usuario final. El texto crudo de una PDOException (SQLSTATE, nombre de índice,
// columna interna) es ruido técnico que no debe llegar a la pantalla — se registra en el
// log del servidor para quien tenga que depurarlo, pero nunca se devuelve en el JSON.

// Nombres de UNIQUE KEY conocidos → una frase corta y amigable sobre qué es lo que ya
// existe. Si el índice no está en esta lista, se arma un mensaje genérico igual de
// presentable a partir del valor duplicado (ver responderErrorAmigable).
const ERROR_HELPERS_CLAVES_UNICAS = [
    'uq_destinos_nombre' => 'Ya existe un destino',
    'uq_categorias_destino_nombre' => 'Ya existe una categoría',
    'uq_categorias_hoteles_destino_nombre' => 'Ya existe una categoría',
    'usuario' => 'Ese nombre de usuario ya está en uso',
    'email' => 'Ese email ya está en uso por otro usuario',
];

// Llamar dentro de un catch (Exception $e) — deja el código HTTP y el JSON de error ya
// enviados, listos para el break/return que sigue en el case correspondiente.
//
// Distingue dos casos:
// - PDOException (error crudo de la base de datos): nunca se muestra tal cual, se traduce
//   a un mensaje presentable (o a uno genérico si no se pudo interpretar) y el original
//   queda solo en el log del servidor.
// - Exception "plana": por convención en este código se lanzan a mano con un mensaje ya
//   pensado para el usuario (ej. "Agencia no encontrada"), así que se muestra tal cual.
function responderErrorAmigable(Throwable $e) {
    if ($e instanceof PDOException) {
        if ($e->getCode() === '23000') {
            $msg = $e->getMessage();
            if (preg_match("/Duplicate entry '(.+?)' for key '([^']+)'/", $msg, $m)) {
                [, $valor, $clave] = $m;
                // uq_destinos_nombre es (nombre, creado_por): MySQL concatena ambos valores
                // con '-' en el mensaje ("Lima-15") — se quita el ID de usuario final para
                // mostrar solo el nombre, ya que la unicidad es por usuario, no global.
                if ($clave === 'uq_destinos_nombre') {
                    $valor = preg_replace('/-\d+$/', '', $valor);
                }
                $etiqueta = ERROR_HELPERS_CLAVES_UNICAS[$clave] ?? null;
                http_response_code(409);
                echo json_encode([
                    'error' => $etiqueta
                        ? "$etiqueta con el nombre \"$valor\"."
                        : "Ya existe un registro con el valor \"$valor\"."
                ]);
                return;
            }
            // 23000 sin "Duplicate entry" = casi siempre una foreign key (borrar algo que
            // todavía está referenciado desde otra tabla).
            http_response_code(409);
            echo json_encode(['error' => 'No se puede completar la acción: hay otros registros que dependen de esto.']);
            return;
        }
        error_log('[error-helpers] ' . get_class($e) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Ocurrió un error inesperado. Intenta de nuevo o contacta al administrador.']);
        return;
    }
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
