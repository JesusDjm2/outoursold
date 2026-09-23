<?php
// itinerario/api.php
// Controlador del Generador de Itinerarios: módulos PDF, páginas fijas y paquetes,
// particionados por idioma (es/en/pt) en vez de moneda. Reemplaza save_config.php
// (que guardaba todo en JSON con flock). El catálogo de Destinos sigue siendo el
// compartido con Tours/Hoteles (../usd/api.php?path=destinos). Categorías NO: cada
// módulo tiene sus propias (categorias_itinerarios), gestionadas aquí mismo, igual
// que Hoteles tiene las suyas (categorias_hoteles) separadas de las de Tours.
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/db.php';
require_once __DIR__ . '/../shared/error-helpers.php';

// A diferencia de save_config.php (que solo exigía login en POST), aquí se exige login
// para cualquier método, incluido GET.
if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$idiomasValidos = ['es', 'en', 'pt'];
$idioma = $_GET['idioma'] ?? 'es';
if (!in_array($idioma, $idiomasValidos, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Idioma no válido. Use es, en o pt.']);
    exit;
}

$tablaModulos = "itinerarios_$idioma";
$tablaConfig = "itinerario_config_$idioma";
$tablaPaquetes = "paquetes_itinerarios_$idioma";
$tablaPaginasFijas = "paginas_fijas_$idioma";
$tablaGenerados = "itinerario_generados_$idioma";

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function idOInt($val) {
    return ($val !== null && $val !== '') ? (int) $val : null;
}

// El filename que llega en el JSON de crear-modulo/crear-pagina-fija/guardar-generado
// debería ser siempre el que devolvió upload.php, pero nada lo obliga: sin esta
// whitelist, un valor como "../../../shared/db.php" quedaba guardado tal cual y luego
// se usaba para leer/borrar archivos fuera de uploads/$idioma/ (ver el unlink() de
// actualizar-pagina-fija más abajo). Se permite espacio porque upload.php conserva el
// nombre original del PDF subido (p.ej. "Cusco City Tour.pdf").
function validarNombreArchivoPdf($filename) {
    return is_string($filename)
        && strpos($filename, '..') === false
        && preg_match('/^[A-Za-z0-9 _\-.]+\.pdf$/', $filename) === 1;
}

try {
    switch ($path) {
        case 'modulos':
            // Acotado a TU propio catálogo (admin incluido) — igual que shared/api.php.
            $stmt = $db->prepare(
                "SELECT m.id, m.titulo, m.filename, m.destino_id, m.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaModulos m
                 LEFT JOIN usuarios u ON u.id = m.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE m.creado_por = ?
                 ORDER BY m.titulo"
            );
            $stmt->execute([$_SESSION['user_id']]);
            $modulos = $stmt->fetchAll();
            foreach ($modulos as &$m) {
                $m['archivo_existe'] = is_file(__DIR__ . "/uploads/$idioma/" . $m['filename']);
            }
            unset($m);
            echo json_encode($modulos);
            break;

        case 'categorias-itinerarios':
            $stmt = $db->prepare(
                "SELECT c.id, c.destino_id, c.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM categorias_itinerarios c
                 LEFT JOIN usuarios u ON u.id = c.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE c.creado_por = ?
                 ORDER BY c.nombre"
            );
            $stmt->execute([$_SESSION['user_id']]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-categoria-itinerario':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreCategoriaItin = trim($data['nombre'] ?? '');
            $destinoIdCatItin = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            if ($nombreCategoriaItin === '' || !$destinoIdCatItin) {
                http_response_code(400);
                echo json_encode(['error' => 'El destino y el nombre de la categoría son obligatorios']);
                break;
            }
            if (!empty($data['id'])) {
                if (!verificarDueno($db, 'categorias_itinerarios', $data['id'])) break;
                $stmt = $db->prepare("UPDATE categorias_itinerarios SET nombre = ?, destino_id = ? WHERE id = ?");
                $stmt->execute([$nombreCategoriaItin, $destinoIdCatItin, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias_itinerarios (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$destinoIdCatItin, $nombreCategoriaItin, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-categoria-itinerario':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            if (!verificarDueno($db, 'categorias_itinerarios', $data['id'])) break;
            try {
                $stmt = $db->prepare("DELETE FROM categorias_itinerarios WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene módulos asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'paginas-fijas':
            $stmt = $db->prepare(
                "SELECT p.id, p.titulo, p.filename, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaPaginasFijas p
                 LEFT JOIN usuarios u ON u.id = p.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE p.creado_por = ?
                 ORDER BY p.titulo"
            );
            $stmt->execute([$_SESSION['user_id']]);
            $paginas = $stmt->fetchAll();
            foreach ($paginas as &$p) {
                $p['archivo_existe'] = is_file(__DIR__ . "/uploads/$idioma/" . $p['filename']);
            }
            unset($p);
            echo json_encode($paginas);
            break;

        case 'historial-generados':
            $sqlGenerados = "SELECT g.id, g.pasajero, g.titulo, g.filename, g.modulos, g.generado_en,
                                     COALESCE(ag.nombre, u.usuario) AS generado_por_nombre
                              FROM $tablaGenerados g
                              LEFT JOIN usuarios u ON u.id = g.generado_por
                              LEFT JOIN agencias ag ON ag.id = u.agencia_id";
            if (is_admin()) {
                $stmt = $db->query("$sqlGenerados ORDER BY g.generado_en DESC LIMIT 500");
            } else {
                $stmt = $db->prepare("$sqlGenerados WHERE g.generado_por = ? ORDER BY g.generado_en DESC LIMIT 500");
                $stmt->execute([$_SESSION['user_id']]);
            }
            $registros = [];
            while ($row = $stmt->fetch()) {
                $row['modulos'] = $row['modulos'] !== null ? json_decode($row['modulos'], true) : [];
                $registros[] = $row;
            }
            echo json_encode($registros);
            break;

        case 'guardar-generado':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $pasajero = trim($data['pasajero'] ?? '');
            $titulo = trim($data['titulo'] ?? '');
            $filename = trim($data['filename'] ?? '');
            $modulos = is_array($data['modulos'] ?? null) ? array_values(array_map('strval', $data['modulos'])) : [];
            if ($pasajero === '' || $titulo === '' || $filename === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Pasajero, título y archivo son obligatorios.']);
                break;
            }
            if (!validarNombreArchivoPdf($filename)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre de archivo no válido.']);
                break;
            }
            $stmt = $db->prepare("INSERT INTO $tablaGenerados (pasajero, titulo, filename, modulos, generado_por) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$pasajero, $titulo, $filename, json_encode($modulos, JSON_UNESCAPED_UNICODE), $_SESSION['user_id']]);
            $id = $db->lastInsertId();
            $stmt = $db->prepare(
                "SELECT g.id, g.pasajero, g.titulo, g.filename, g.modulos, g.generado_en,
                        COALESCE(ag.nombre, u.usuario) AS generado_por_nombre
                 FROM $tablaGenerados g
                 LEFT JOIN usuarios u ON u.id = g.generado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE g.id = ?"
            );
            $stmt->execute([$id]);
            $registro = $stmt->fetch();
            $registro['modulos'] = json_decode($registro['modulos'], true);
            echo json_encode(['success' => true, 'id' => $id, 'registro' => $registro]);
            break;

        case 'config':
            $stmt = $db->query("SELECT start_files, end_files FROM $tablaConfig WHERE id = 1");
            $row = $stmt->fetch();
            if (!$row) {
                // No debería pasar (la migración siembra la fila), pero por si acaso.
                $db->exec("INSERT INTO $tablaConfig (id, start_files, end_files) VALUES (1, '[]', '[]')");
                $row = ['start_files' => '[]', 'end_files' => '[]'];
            }
            echo json_encode([
                'startFiles' => json_decode($row['start_files'], true) ?: [],
                'endFiles' => json_decode($row['end_files'], true) ?: [],
            ]);
            break;

        case 'paquetes':
            $stmt = $db->prepare("SELECT id, nombre, modulos FROM $tablaPaquetes WHERE creado_por = ? ORDER BY nombre");
            $stmt->execute([$_SESSION['user_id']]);
            $paquetes = [];
            while ($row = $stmt->fetch()) {
                $row['modulos'] = json_decode($row['modulos'], true);
                $paquetes[] = $row;
            }
            echo json_encode($paquetes);
            break;

        case 'crear-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $titulo = trim($data['titulo'] ?? '');
            $filename = trim($data['filename'] ?? '');
            if ($titulo === '' || $filename === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Título y archivo son obligatorios.']);
                break;
            }
            if (!validarNombreArchivoPdf($filename)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre de archivo no válido.']);
                break;
            }
            $stmt = $db->prepare("INSERT INTO $tablaModulos (titulo, filename, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $titulo,
                $filename,
                idOInt($data['destino_id'] ?? null),
                idOInt($data['categoria_id'] ?? null),
                $_SESSION['user_id'],
            ]);
            $id = $db->lastInsertId();
            $stmt = $db->prepare("SELECT id, titulo, filename, destino_id, categoria_id FROM $tablaModulos WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id, 'modulo' => $stmt->fetch()]);
            break;

        case 'actualizar-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido.']);
                break;
            }
            if (!verificarDueno($db, $tablaModulos, $id)) break;
            $campos = [];
            $valores = [];
            if (array_key_exists('titulo', $data) && trim($data['titulo']) !== '') {
                $campos[] = 'titulo = ?';
                $valores[] = trim($data['titulo']);
            }
            if (array_key_exists('destino_id', $data)) {
                $campos[] = 'destino_id = ?';
                $valores[] = idOInt($data['destino_id']);
            }
            if (array_key_exists('categoria_id', $data)) {
                $campos[] = 'categoria_id = ?';
                $valores[] = idOInt($data['categoria_id']);
            }
            if (empty($campos)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nada que actualizar.']);
                break;
            }
            $valores[] = $id;
            $stmt = $db->prepare("UPDATE $tablaModulos SET " . implode(', ', $campos) . " WHERE id = ?");
            $stmt->execute($valores);
            if ($stmt->rowCount() === 0) {
                // Puede ser "sin cambios" o "no existe"; confirmamos con un SELECT.
                $check = $db->prepare("SELECT id FROM $tablaModulos WHERE id = ?");
                $check->execute([$id]);
                if (!$check->fetch()) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Módulo no encontrado.']);
                    break;
                }
            }
            echo json_encode(['success' => true]);
            break;

        case 'guardar-clasificaciones-modulos':
            // Guarda de una sola vez la clasificación Destino/Categoría de varios módulos,
            // cada uno con su propio valor. Solo toca los IDs recibidos, nunca recorre el
            // resto del catálogo — mismo patrón que shared/api.php > guardar-clasificaciones-tours.
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $cambios = is_array($data['cambios'] ?? null) ? $data['cambios'] : [];
            if (empty($cambios)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay cambios para guardar.']);
                break;
            }
            $esAdminClasifModulos = is_admin();
            $stmt = $esAdminClasifModulos
                ? $db->prepare("UPDATE $tablaModulos SET destino_id = ?, categoria_id = ? WHERE id = ?")
                : $db->prepare("UPDATE $tablaModulos SET destino_id = ?, categoria_id = ? WHERE id = ? AND creado_por = ?");
            $db->beginTransaction();
            try {
                $actualizados = 0;
                foreach ($cambios as $c) {
                    $id = idOInt($c['id'] ?? null);
                    if (!$id) continue;
                    if ($esAdminClasifModulos) {
                        $stmt->execute([idOInt($c['destino_id'] ?? null), idOInt($c['categoria_id'] ?? null), $id]);
                    } else {
                        $stmt->execute([idOInt($c['destino_id'] ?? null), idOInt($c['categoria_id'] ?? null), $id, $_SESSION['user_id']]);
                    }
                    $actualizados++;
                }
                $db->commit();
                echo json_encode(['success' => true, 'actualizados' => $actualizados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'eliminar-modulo':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido.']);
                break;
            }
            if (!verificarDueno($db, $tablaModulos, $id)) break;
            $stmt = $db->prepare("SELECT filename, creado_por FROM $tablaModulos WHERE id = ?");
            $stmt->execute([$id]);
            $moduloRow = $stmt->fetch();
            if (!$moduloRow) {
                http_response_code(404);
                echo json_encode(['error' => 'Módulo no encontrado.']);
                break;
            }
            $filename = $moduloRow['filename'];
            $duenoModulo = $moduloRow['creado_por'];

            $db->beginTransaction();
            try {
                $db->prepare("DELETE FROM $tablaModulos WHERE id = ?")->execute([$id]);

                // Limpia los paquetes del MISMO dueño del módulo que lo tuvieran incluido (un
                // paquete de otro usuario no puede referenciarlo: sus módulos también son
                // privados). No necesariamente es quien está borrando — un admin puede borrar
                // el módulo de otro usuario.
                $paquetesAfectados = 0;
                $stmt = $db->prepare("SELECT id, modulos FROM $tablaPaquetes WHERE creado_por = ?");
                $stmt->execute([$duenoModulo]);
                $paquetesRows = $stmt->fetchAll();
                $updPaquete = $db->prepare("UPDATE $tablaPaquetes SET modulos = ? WHERE id = ?");
                foreach ($paquetesRows as $p) {
                    $modulos = json_decode($p['modulos'], true) ?: [];
                    if (in_array($filename, $modulos, true)) {
                        $modulos = array_values(array_diff($modulos, [$filename]));
                        $updPaquete->execute([json_encode($modulos, JSON_UNESCAPED_UNICODE), $p['id']]);
                        $paquetesAfectados++;
                    }
                }

                $db->commit();
                echo json_encode(['success' => true, 'paquetes_afectados' => $paquetesAfectados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'crear-pagina-fija':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $titulo = trim($data['titulo'] ?? '');
            $filename = trim($data['filename'] ?? '');
            if ($titulo === '' || $filename === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Título y archivo son obligatorios.']);
                break;
            }
            if (!validarNombreArchivoPdf($filename)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre de archivo no válido.']);
                break;
            }
            $stmt = $db->prepare("INSERT INTO $tablaPaginasFijas (titulo, filename, creado_por) VALUES (?, ?, ?)");
            $stmt->execute([$titulo, $filename, $_SESSION['user_id']]);
            $id = $db->lastInsertId();
            $stmt = $db->prepare("SELECT id, titulo, filename FROM $tablaPaginasFijas WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'id' => $id, 'pagina' => $stmt->fetch()]);
            break;

        case 'actualizar-pagina-fija':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            $titulo = trim($data['titulo'] ?? '');
            // filename es opcional: solo viene cuando el usuario reemplazó el PDF (ya subido
            // por upload.php antes de esta llamada). Sin esa clave, el archivo no cambia.
            $filenameNuevo = array_key_exists('filename', $data) ? trim($data['filename']) : null;
            if (!$id || $titulo === '') {
                http_response_code(400);
                echo json_encode(['error' => 'ID y título son obligatorios.']);
                break;
            }
            if ($filenameNuevo && !validarNombreArchivoPdf($filenameNuevo)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nombre de archivo no válido.']);
                break;
            }
            if (!verificarDueno($db, $tablaPaginasFijas, $id)) break;
            $stmt = $db->prepare("SELECT filename FROM $tablaPaginasFijas WHERE id = ?");
            $stmt->execute([$id]);
            $filenameAnterior = $stmt->fetchColumn();
            if ($filenameAnterior === false) {
                http_response_code(404);
                echo json_encode(['error' => 'Página fija no encontrada.']);
                break;
            }

            $reemplazaArchivo = $filenameNuevo && $filenameNuevo !== $filenameAnterior;
            $db->beginTransaction();
            try {
                if ($reemplazaArchivo) {
                    $db->prepare("UPDATE $tablaPaginasFijas SET titulo = ?, filename = ? WHERE id = ?")
                        ->execute([$titulo, $filenameNuevo, $id]);

                    // El PDF viejo pudo estar referenciado en las páginas de inicio/cierre
                    // configuradas: se actualiza la referencia al nuevo archivo en vez de perderla.
                    $stmt = $db->prepare("SELECT start_files, end_files FROM $tablaConfig WHERE id = 1");
                    $stmt->execute();
                    $configRow = $stmt->fetch();
                    $reemplazar = fn($f) => $f === $filenameAnterior ? $filenameNuevo : $f;
                    $startFiles = array_map($reemplazar, $configRow ? (json_decode($configRow['start_files'], true) ?: []) : []);
                    $endFiles = array_map($reemplazar, $configRow ? (json_decode($configRow['end_files'], true) ?: []) : []);
                    $db->prepare("UPDATE $tablaConfig SET start_files = ?, end_files = ? WHERE id = 1")
                        ->execute([json_encode($startFiles, JSON_UNESCAPED_UNICODE), json_encode($endFiles, JSON_UNESCAPED_UNICODE)]);
                } else {
                    $db->prepare("UPDATE $tablaPaginasFijas SET titulo = ? WHERE id = ?")->execute([$titulo, $id]);
                }
                $db->commit();
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
                break;
            }

            if ($reemplazaArchivo) {
                $rutaAnterior = __DIR__ . "/uploads/$idioma/" . $filenameAnterior;
                if (is_file($rutaAnterior)) {
                    @unlink($rutaAnterior);
                }
            }

            echo json_encode(['success' => true]);
            break;

        case 'eliminar-pagina-fija':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = idOInt($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido.']);
                break;
            }
            if (!verificarDueno($db, $tablaPaginasFijas, $id)) break;
            $stmt = $db->prepare("SELECT filename FROM $tablaPaginasFijas WHERE id = ?");
            $stmt->execute([$id]);
            $filename = $stmt->fetchColumn();
            if ($filename === false) {
                http_response_code(404);
                echo json_encode(['error' => 'Página fija no encontrada.']);
                break;
            }

            $db->beginTransaction();
            try {
                $db->prepare("DELETE FROM $tablaPaginasFijas WHERE id = ?")->execute([$id]);

                // Quita el filename borrado de las páginas de inicio/cierre configuradas.
                $stmt = $db->prepare("SELECT start_files, end_files FROM $tablaConfig WHERE id = 1");
                $stmt->execute();
                $configRow = $stmt->fetch();
                $startFiles = $configRow ? array_values(array_diff(json_decode($configRow['start_files'], true) ?: [], [$filename])) : [];
                $endFiles = $configRow ? array_values(array_diff(json_decode($configRow['end_files'], true) ?: [], [$filename])) : [];
                $db->prepare("UPDATE $tablaConfig SET start_files = ?, end_files = ? WHERE id = 1")
                    ->execute([json_encode($startFiles, JSON_UNESCAPED_UNICODE), json_encode($endFiles, JSON_UNESCAPED_UNICODE)]);

                $db->commit();
                echo json_encode([
                    'success' => true,
                    'config' => ['startFiles' => $startFiles, 'endFiles' => $endFiles],
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'guardar-config':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $startFiles = is_array($data['startFiles'] ?? null) ? $data['startFiles'] : [];
            $endFiles = is_array($data['endFiles'] ?? null) ? $data['endFiles'] : [];
            $stmt = $db->prepare("UPDATE $tablaConfig SET start_files = ?, end_files = ? WHERE id = 1");
            $stmt->execute([json_encode($startFiles, JSON_UNESCAPED_UNICODE), json_encode($endFiles, JSON_UNESCAPED_UNICODE)]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-paquete':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombre = trim($data['nombre'] ?? '');
            $modulos = $data['modulos'] ?? [];
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del paquete es obligatorio']);
                break;
            }
            if (!is_array($modulos) || count($modulos) === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'El paquete necesita al menos un módulo']);
                break;
            }
            $modulosJson = json_encode(array_values(array_map('strval', $modulos)), JSON_UNESCAPED_UNICODE);
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaPaquetes, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaPaquetes SET nombre = ?, modulos = ? WHERE id = ?");
                $stmt->execute([$nombre, $modulosJson, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaPaquetes (nombre, modulos, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$nombre, $modulosJson, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-paquete':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            if (!verificarDueno($db, $tablaPaquetes, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaPaquetes WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
