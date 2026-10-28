<?php
// shared/api.php
// Controlador único para pen/api.php y usd/api.php.
// El caller debe definir $currency ('pen' | 'usd') antes de hacer require de este archivo.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/error-helpers.php';
require_once __DIR__ . '/agencia-helpers.php';

if (!is_logged_in()) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Debes iniciar sesión.']);
    exit;
}

header('Content-Type: application/json');
$db = getDB();

$tablaTours = "tours_$currency";
$tablaHoteles = "hoteles_$currency";
$tablaCotizaciones = "cotizaciones_$currency";
$tablaPaquetesTours = "paquetes_tours_$currency";

$path = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Normaliza un número tal como puede venir de un CSV exportado por Excel en español
// ("50,00" con coma decimal, o "1.234,56" con punto de miles) a un string con punto
// decimal, para poder floatval()/is_numeric() sobre él de forma confiable.
function normalizarNumeroCsv($valor) {
    $valor = trim((string) $valor);
    if ($valor === '') return '';
    if (preg_match('/^-?\d{1,3}(\.\d{3})*(,\d+)?$/', $valor)) {
        // "1.234,56" (miles con punto, decimal con coma)
        $valor = str_replace(',', '.', str_replace('.', '', $valor));
    } elseif (strpos($valor, ',') !== false && strpos($valor, '.') === false) {
        // "50,00" (solo coma: es el decimal)
        $valor = str_replace(',', '.', $valor);
    }
    return $valor;
}

// grupo_id de destino tal como llega del cliente: null/'' = "Sin asignar"; si viene un id,
// debe ser un grupo que el usuario ve (base o de su agencia, ver grupos-destino). Devuelve
// el id (int) o null; false si es inválido (ya respondió el error HTTP y el caller debe
// hacer `break`).
function grupoDestinoValido($db, $grupoId) {
    if ($grupoId === null || $grupoId === '') return null;
    [$fg, $pg] = filtroDueno('creado_por');
    $stmt = $db->prepare("SELECT id FROM grupos_destino WHERE id = ? AND (es_base = 1 OR $fg)");
    $stmt->execute(array_merge([(int) $grupoId], $pg));
    if (!$stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Grupo de destino no válido.']);
        return false;
    }
    return (int) $grupoId;
}

// Ámbito de las cotizaciones: el de la agencia (filtroDueno) y, solo para el admin, además
// las históricas sin creado_por (de antes de registrar el autor), que siempre fueron suyas.
function filtroCotizaciones() {
    [$fd, $pd] = filtroDueno();
    return [is_admin() ? "($fd OR creado_por IS NULL)" : $fd, $pd];
}
function cotizacionEsDelAmbito($db, $tabla, $id) {
    [$fc, $pc] = filtroCotizaciones();
    $stmt = $db->prepare("SELECT 1 FROM $tabla WHERE id = ? AND $fc");
    $stmt->execute(array_merge([$id], $pc));
    return (bool) $stmt->fetchColumn();
}

try {
    switch ($path) {
        case 'tours':
            // Siempre acotado al catálogo de TU agencia (filtroDueno, auth.php), admin incluido:
            // el admin también arma sus propias cotizaciones con sus propios tours. Ver el de
            // cada agencia es cosa de Agencias › Catálogo (shared/agencias-api.php), en solo lectura.
            [$fd, $pd] = filtroDueno('t.creado_por');
            $stmt = $db->prepare(
                "SELECT t.id, t.tour, t.distr, t.preg, t.ppromo, t.pconf, t.pctotal, t.destino_id, t.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaTours t
                 LEFT JOIN usuarios u ON u.id = t.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE $fd
                 ORDER BY t.tour"
            );
            $stmt->execute($pd);
            echo json_encode($stmt->fetchAll());
            break;

        // Catálogo global de Países/Departamentos (shared/migrations/027_...): a
        // diferencia de Destinos/Categorías, NO es propio de cada usuario — es geografía,
        // igual para todos, así que no lleva creado_por ni filtro por sesión.
        case 'paises':
            $stmt = $db->query("SELECT id, nombre, codigo_telefono FROM paises ORDER BY nombre");
            echo json_encode($stmt->fetchAll());
            break;

        case 'departamentos':
            $paisId = intval($_GET['pais_id'] ?? 0);
            if (!$paisId) {
                http_response_code(400);
                echo json_encode(['error' => 'pais_id requerido']);
                break;
            }
            $stmt = $db->prepare("SELECT id, nombre FROM departamentos WHERE pais_id = ? ORDER BY nombre");
            $stmt->execute([$paisId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'destinos':
            // Acotado al catálogo de TU agencia (admin incluido), igual que tours.
            [$fd, $pd] = filtroDueno('d.creado_por');
            $stmt = $db->prepare(
                "SELECT d.id, d.nombre, d.grupo_id, d.orden, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM destinos d
                 LEFT JOIN usuarios u ON u.id = d.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE $fd
                 ORDER BY d.orden, d.nombre"
            );
            $stmt->execute($pd);
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-destino':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreDestino = trim($data['nombre'] ?? '');
            if ($nombreDestino === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del destino es obligatorio']);
                break;
            }
            // El nombre se repite libremente ENTRE grupos: Con pernocte, Sin pernocte y los
            // destinos sin grupo (los de Actividades / Hoteles) son catálogos separados, así
            // que puede haber un "Cusco" en cada uno. Dentro del mismo grupo, no. Se valida
            // acá (y no solo con el UNIQUE de la migración 034) porque en MySQL un UNIQUE con
            // grupo_id NULL no impide duplicados entre los destinos sin grupo.
            $existeEnGrupo = function ($grupoId, $excluirId) use ($db, $nombreDestino) {
                [$fd, $pd] = filtroDueno();
                $stmt = $db->prepare("SELECT id FROM destinos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND $fd AND grupo_id <=> ? AND id <> ?");
                $stmt->execute(array_merge([$nombreDestino], $pd, [$grupoId, (int) $excluirId]));
                return (bool) $stmt->fetchColumn();
            };
            $mensajeDuplicado = fn($grupoId) => "Ya existe un destino con el nombre \"$nombreDestino\"" . ($grupoId ? ' en este grupo.' : '.');
            if (!empty($data['id'])) {
                if (!verificarDueno($db, 'destinos', $data['id'])) break;
                $stmt = $db->prepare("SELECT grupo_id FROM destinos WHERE id = ?");
                $stmt->execute([$data['id']]);
                $grupoActual = $stmt->fetchColumn() ?: null;
                if ($existeEnGrupo($grupoActual, $data['id'])) {
                    http_response_code(409);
                    echo json_encode(['error' => $mensajeDuplicado($grupoActual)]);
                    break;
                }
                $stmt = $db->prepare("UPDATE destinos SET nombre = ? WHERE id = ?");
                $stmt->execute([$nombreDestino, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                // Un destino de Itinerarios nace dentro de su grupo (Con / Sin pernocte); uno
                // de Actividades / Hoteles, sin grupo.
                $grupoId = grupoDestinoValido($db, $data['grupo_id'] ?? null);
                if ($grupoId === false) break;
                if ($existeEnGrupo($grupoId, 0)) {
                    http_response_code(409);
                    echo json_encode(['error' => $mensajeDuplicado($grupoId)]);
                    break;
                }
                // Uno de Itinerarios nace al final del orden de su grupo (ver ordenar-destinos);
                // los sin grupo quedan en 0 y siguen saliendo por nombre.
                $orden = 0;
                if ($grupoId !== null) {
                    [$fd, $pd] = filtroDueno();
                    $stmt = $db->prepare("SELECT COALESCE(MAX(orden), 0) + 1 FROM destinos WHERE $fd AND grupo_id = ?");
                    $stmt->execute(array_merge($pd, [$grupoId]));
                    $orden = (int) $stmt->fetchColumn();
                }
                $stmt = $db->prepare("INSERT INTO destinos (nombre, grupo_id, orden, creado_por) VALUES (?, ?, ?, ?)");
                $stmt->execute([$nombreDestino, $grupoId, $orden, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        // Grupos de destino de Itinerarios (migraciones 032 y 039): los base (Con hotel / Sin
        // hotel, comunes a todas las agencias) y los propios de la agencia. `editable`: un
        // base solo lo renombra el admin; `eliminable`: solo los propios.
        case 'grupos-destino':
            [$fg, $pg] = filtroDueno('creado_por');
            $stmt = $db->prepare("SELECT id, clave, nombre, es_base FROM grupos_destino
                                  WHERE es_base = 1 OR $fg ORDER BY es_base DESC, orden, id");
            $stmt->execute($pg);
            $grupos = array_map(fn($g) => $g + [
                'editable' => !$g['es_base'] || is_admin(),
                'eliminable' => !$g['es_base']
            ], $stmt->fetchAll());
            echo json_encode($grupos);
            break;

        case 'guardar-grupo-destino':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreGrupo = trim($data['nombre'] ?? '');
            $idGrupo = (int) ($data['id'] ?? 0);
            if ($nombreGrupo === '' || mb_strlen($nombreGrupo) > 50) {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del grupo es obligatorio (máximo 50 caracteres).']);
                break;
            }
            [$fg, $pg] = filtroDueno('creado_por');
            if ($idGrupo) {
                $stmt = $db->prepare("SELECT es_base FROM grupos_destino WHERE id = ? AND (es_base = 1 OR $fg)");
                $stmt->execute(array_merge([$idGrupo], $pg));
                $esBase = $stmt->fetchColumn();
                if ($esBase === false) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Grupo no encontrado.']);
                    break;
                }
                if ($esBase && !is_admin()) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Los grupos base (Con hotel / Sin hotel) solo los renombra el administrador.']);
                    break;
                }
            }
            // Sin nombres repetidos entre los grupos que ve esta agencia.
            $stmt = $db->prepare("SELECT 1 FROM grupos_destino WHERE LOWER(TRIM(nombre)) = LOWER(?) AND id <> ? AND (es_base = 1 OR $fg)");
            $stmt->execute(array_merge([$nombreGrupo, $idGrupo], $pg));
            if ($stmt->fetchColumn()) {
                http_response_code(409);
                echo json_encode(['error' => "Ya existe un grupo llamado \"$nombreGrupo\"."]);
                break;
            }
            if ($idGrupo) {
                $db->prepare("UPDATE grupos_destino SET nombre = ? WHERE id = ?")->execute([$nombreGrupo, $idGrupo]);
            } else {
                $orden = (int) $db->query("SELECT COALESCE(MAX(orden), 0) + 1 FROM grupos_destino")->fetchColumn();
                $db->prepare("INSERT INTO grupos_destino (clave, nombre, orden, es_base, creado_por) VALUES (NULL, ?, ?, 0, ?)")
                   ->execute([$nombreGrupo, $orden, $_SESSION['user_id']]);
                $idGrupo = (int) $db->lastInsertId();
            }
            echo json_encode(['success' => true, 'id' => $idGrupo]);
            break;

        // Solo grupos propios y vacíos: borrar uno con destinos los dejaría sin grupo, y un
        // destino sin grupo pasa a ser de Actividades / Hoteles.
        case 'eliminar-grupo-destino':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $idGrupo = (int) ($data['id'] ?? 0);
            [$fg, $pg] = filtroDueno('creado_por');
            $stmt = $db->prepare("SELECT es_base FROM grupos_destino WHERE id = ? AND (es_base = 1 OR $fg)");
            $stmt->execute(array_merge([$idGrupo], $pg));
            $esBase = $stmt->fetchColumn();
            if ($esBase === false) {
                http_response_code(404);
                echo json_encode(['error' => 'Grupo no encontrado.']);
                break;
            }
            if ($esBase) {
                http_response_code(403);
                echo json_encode(['error' => 'Con hotel y Sin hotel son grupos base: no se pueden eliminar.']);
                break;
            }
            $stmt = $db->prepare("SELECT COUNT(*) FROM destinos WHERE grupo_id = ?");
            $stmt->execute([$idGrupo]);
            $nDestinos = (int) $stmt->fetchColumn();
            if ($nDestinos > 0) {
                http_response_code(409);
                echo json_encode(['error' => "El grupo tiene $nDestinos destino" . ($nDestinos === 1 ? '' : 's') . ': muévelos a otro grupo o elimínalos antes de eliminarlo.']);
                break;
            }
            $db->prepare("DELETE FROM grupos_destino WHERE id = ?")->execute([$idGrupo]);
            echo json_encode(['success' => true]);
            break;

        // Guarda el orden de los destinos propios arrastrado en el panel de itinerarios del
        // Cotizador: recibe los ids ya ordenados y cada uno queda con su posición (1, 2, ...).
        case 'ordenar-destinos':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $ids = array_values(array_unique(array_map('intval', is_array($data['ids'] ?? null) ? $data['ids'] : [])));
            if (!$ids) {
                http_response_code(400);
                echo json_encode(['error' => 'Lista de destinos requerida']);
                break;
            }
            [$fd, $pd] = filtroDueno();
            $db->beginTransaction();
            $stmt = $db->prepare("UPDATE destinos SET orden = ? WHERE id = ? AND $fd");
            foreach ($ids as $i => $id) $stmt->execute(array_merge([$i + 1, $id], $pd));
            $db->commit();
            echo json_encode(['success' => true]);
            break;

        // Mueve un destino propio a un grupo, o lo deja "Sin asignar" (grupo_id null).
        case 'asignar-grupo-destino':
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
            if (!verificarDueno($db, 'destinos', $data['id'])) break;
            $grupoId = grupoDestinoValido($db, $data['grupo_id'] ?? null);
            if ($grupoId === false) break;
            $stmt = $db->prepare("UPDATE destinos SET grupo_id = ? WHERE id = ?");
            $stmt->execute([$grupoId, $data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'eliminar-destino':
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
            if (!verificarDueno($db, 'destinos', $data['id'])) break;
            try {
                $stmt = $db->prepare("DELETE FROM destinos WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene categorías, tours o hoteles asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'categorias':
            [$fd, $pd] = filtroDueno('c.creado_por');
            $stmt = $db->prepare(
                "SELECT c.id, c.destino_id, c.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM categorias c
                 LEFT JOIN usuarios u ON u.id = c.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE $fd
                 ORDER BY c.nombre"
            );
            $stmt->execute($pd);
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-categoria':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreCategoria = trim($data['nombre'] ?? '');
            $destinoIdCat = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            if ($nombreCategoria === '' || !$destinoIdCat) {
                http_response_code(400);
                echo json_encode(['error' => 'El destino y el nombre de la categoría son obligatorios']);
                break;
            }
            if (idVinculoPropio($db, 'destinos', $destinoIdCat) === false) break;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, 'categorias', $data['id'])) break;
                $stmt = $db->prepare("UPDATE categorias SET nombre = ?, destino_id = ? WHERE id = ?");
                $stmt->execute([$nombreCategoria, $destinoIdCat, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$destinoIdCat, $nombreCategoria, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-categoria':
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
            if (!verificarDueno($db, 'categorias', $data['id'])) break;
            try {
                $stmt = $db->prepare("DELETE FROM categorias WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene tours asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'hoteles':
            [$fd, $pd] = filtroDueno('h.creado_por');
            $stmt = $db->prepare(
                "SELECT h.id, h.aloj, h.distr, h.preg, h.ppromo, h.pconf, h.pctotal, h.destino_id, h.categoria_id, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM $tablaHoteles h
                 LEFT JOIN usuarios u ON u.id = h.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE $fd
                 ORDER BY h.aloj"
            );
            $stmt->execute($pd);
            echo json_encode($stmt->fetchAll());
            break;

        case 'categorias-hoteles':
            [$fd, $pd] = filtroDueno('c.creado_por');
            $stmt = $db->prepare(
                "SELECT c.id, c.destino_id, c.nombre, COALESCE(ag.nombre, u.usuario) AS creado_por_nombre
                 FROM categorias_hoteles c
                 LEFT JOIN usuarios u ON u.id = c.creado_por
                 LEFT JOIN agencias ag ON ag.id = u.agencia_id
                 WHERE $fd
                 ORDER BY c.nombre"
            );
            $stmt->execute($pd);
            echo json_encode($stmt->fetchAll());
            break;

        case 'guardar-categoria-hotel':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombreCategoriaHotel = trim($data['nombre'] ?? '');
            $destinoIdCatHotel = !empty($data['destino_id']) ? intval($data['destino_id']) : null;
            if ($nombreCategoriaHotel === '' || !$destinoIdCatHotel) {
                http_response_code(400);
                echo json_encode(['error' => 'El destino y el nombre de la categoría son obligatorios']);
                break;
            }
            if (idVinculoPropio($db, 'destinos', $destinoIdCatHotel) === false) break;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, 'categorias_hoteles', $data['id'])) break;
                $stmt = $db->prepare("UPDATE categorias_hoteles SET nombre = ?, destino_id = ? WHERE id = ?");
                $stmt->execute([$nombreCategoriaHotel, $destinoIdCatHotel, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO categorias_hoteles (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$destinoIdCatHotel, $nombreCategoriaHotel, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-categoria-hotel':
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
            if (!verificarDueno($db, 'categorias_hoteles', $data['id'])) break;
            try {
                $stmt = $db->prepare("DELETE FROM categorias_hoteles WHERE id = ?");
                $stmt->execute([$data['id']]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['error' => 'No se puede eliminar: tiene hoteles asociados.']);
                } else {
                    throw $e;
                }
            }
            break;

        case 'guardar-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $tour = trim($data['tour'] ?? '');
            if ($tour === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del tour es obligatorio']);
                break;
            }
            $distr = trim($data['distr'] ?? '');
            $preg = floatval($data['preg'] ?? 0);
            $ppromo = floatval($data['ppromo'] ?? 0);
            $pconf = floatval($data['pconf'] ?? 0);
            $pctotal = floatval($data['pctotal'] ?? 0);
            if ($preg < 0 || $ppromo < 0 || $pconf < 0 || $pctotal < 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Los precios no pueden ser negativos']);
                break;
            }
            $destinoId = idVinculoPropio($db, 'destinos', $data['destino_id'] ?? null);
            if ($destinoId === false) break;
            $categoriaId = idVinculoPropio($db, 'categorias', $data['categoria_id'] ?? null);
            if ($categoriaId === false) break;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaTours, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaTours SET tour = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $pconf, $pctotal, $destinoId, $categoriaId, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaTours (tour, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$tour, $distr, $preg, $ppromo, $pconf, $pctotal, $destinoId, $categoriaId, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-tour':
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
            if (!verificarDueno($db, $tablaTours, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaTours WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-clasificaciones-tours':
            // Guarda de una sola vez la clasificación Destino/Categoría de varios tours,
            // cada uno con su propio valor (no un mismo par para todos). Solo toca los IDs
            // que vinieron en la lista — nunca recorre el resto del catálogo.
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
            // Solo tours de mi agencia, y solo con destinos/categorías de mi agencia.
            $cambios = validarCambiosClasificacion($db, $cambios, 'categorias');
            if ($cambios === false) break;
            [$fd, $pd] = filtroDueno();
            $stmt = $db->prepare("UPDATE $tablaTours SET destino_id = ?, categoria_id = ? WHERE id = ? AND $fd");
            $db->beginTransaction();
            try {
                $actualizados = 0;
                foreach ($cambios as $c) {
                    $stmt->execute(array_merge([$c['destino_id'], $c['categoria_id'], $c['id']], $pd));
                    $actualizados += $stmt->rowCount() > 0 ? 1 : 0;
                }
                $db->commit();
                echo json_encode(['success' => true, 'actualizados' => $actualizados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'guardar-hotel':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $aloj = trim($data['aloj'] ?? '');
            if ($aloj === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del alojamiento es obligatorio']);
                break;
            }
            $distr = trim($data['distr'] ?? '');
            $preg = floatval($data['preg'] ?? 0);
            $ppromo = floatval($data['ppromo'] ?? 0);
            $pconfHotel = floatval($data['pconf'] ?? 0);
            $pctotalHotel = floatval($data['pctotal'] ?? 0);
            if ($preg < 0 || $ppromo < 0 || $pconfHotel < 0 || $pctotalHotel < 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Los precios no pueden ser negativos']);
                break;
            }
            $destinoIdHotel = idVinculoPropio($db, 'destinos', $data['destino_id'] ?? null);
            if ($destinoIdHotel === false) break;
            $categoriaIdHotel = idVinculoPropio($db, 'categorias_hoteles', $data['categoria_id'] ?? null);
            if ($categoriaIdHotel === false) break;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaHoteles, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaHoteles SET aloj = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $pconfHotel, $pctotalHotel, $destinoIdHotel, $categoriaIdHotel, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaHoteles (aloj, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$aloj, $distr, $preg, $ppromo, $pconfHotel, $pctotalHotel, $destinoIdHotel, $categoriaIdHotel, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-hotel':
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
            if (!verificarDueno($db, $tablaHoteles, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaHoteles WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'guardar-clasificaciones-hoteles':
            // Mismo mecanismo que 'guardar-clasificaciones-tours' — ver el comentario ahí.
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
            $cambios = validarCambiosClasificacion($db, $cambios, 'categorias_hoteles');
            if ($cambios === false) break;
            [$fd, $pd] = filtroDueno();
            $stmt = $db->prepare("UPDATE $tablaHoteles SET destino_id = ?, categoria_id = ? WHERE id = ? AND $fd");
            $db->beginTransaction();
            try {
                $actualizados = 0;
                foreach ($cambios as $c) {
                    $stmt->execute(array_merge([$c['destino_id'], $c['categoria_id'], $c['id']], $pd));
                    $actualizados += $stmt->rowCount() > 0 ? 1 : 0;
                }
                $db->commit();
                echo json_encode(['success' => true, 'actualizados' => $actualizados]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        case 'paquetes-tours':
            // Si la migración 030 (columnas hoteles/itinerario) todavía no se aplicó en esta
            // base, se cae al SELECT anterior en vez de romper el arranque del Cotizador
            // (que pide los paquetes al cargar): siguen funcionando como paquetes de solo tours.
            [$fd, $pd] = filtroDueno();
            try {
                $stmt = $db->prepare("SELECT id, nombre, tours, hoteles, itinerario FROM $tablaPaquetesTours WHERE $fd ORDER BY nombre");
                $stmt->execute($pd);
            } catch (PDOException $e) {
                $stmt = $db->prepare("SELECT id, nombre, tours, NULL AS hoteles, NULL AS itinerario FROM $tablaPaquetesTours WHERE $fd ORDER BY nombre");
                $stmt->execute($pd);
            }
            $paquetes = [];
            while ($row = $stmt->fetch()) {
                $row['tours'] = json_decode($row['tours'], true) ?: [];
                // Paquetes anteriores a la migración 030 (solo tours) traen NULL en estas dos.
                $row['hoteles'] = $row['hoteles'] ? (json_decode($row['hoteles'], true) ?: []) : [];
                $row['itinerario'] = $row['itinerario'] ? json_decode($row['itinerario'], true) : null;
                $paquetes[] = $row;
            }
            echo json_encode($paquetes);
            break;

        case 'guardar-paquete-tour':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $nombre = trim($data['nombre'] ?? '');
            $tours = is_array($data['tours'] ?? null) ? $data['tours'] : [];
            $hoteles = is_array($data['hoteles'] ?? null) ? $data['hoteles'] : [];
            $itinerario = is_array($data['itinerario'] ?? null) ? $data['itinerario'] : null;
            if ($nombre === '') {
                http_response_code(400);
                echo json_encode(['error' => 'El nombre del paquete es obligatorio']);
                break;
            }
            // Un paquete puede combinar Actividades, Hoteles e Itinerario; alcanza con que
            // tenga al menos uno de los tres.
            $tours = array_values(array_filter(array_map(function ($t) {
                return ['tour' => trim($t['tour'] ?? ''), 'cant' => floatval($t['cant'] ?? 1)];
            }, $tours), fn($t) => $t['tour'] !== ''));
            $hoteles = array_values(array_filter(array_map(function ($h) {
                return [
                    'aloj' => trim($h['aloj'] ?? ''),
                    'nhab' => max(1, intval($h['nhab'] ?? 1)),
                    'noches' => max(1, intval($h['noches'] ?? 1))
                ];
            }, $hoteles), fn($h) => $h['aloj'] !== ''));
            // `dias` (opcional) va en paralelo a `modulos`: día del viaje de cada módulo (1 =
            // llegada; puede repetirse y saltear días libres). Se guarda solo si viene completo.
            $modulos = [];
            $dias = [];
            $diasRecibidos = is_array($itinerario['dias'] ?? null) ? array_values($itinerario['dias']) : [];
            foreach (array_values($itinerario['modulos'] ?? []) as $i => $modulo) {
                $modulo = strval($modulo);
                if ($modulo === '') continue;
                $modulos[] = $modulo;
                $dias[] = intval($diasRecibidos[$i] ?? 0);
            }
            $diasValidos = $dias && min($dias) >= 1 && max($dias) <= 366;
            $idiomaItinerario = $itinerario['idioma'] ?? '';
            if ($modulos && !in_array($idiomaItinerario, ['es', 'en', 'pt'], true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Idioma del itinerario inválido']);
                break;
            }
            if (!$tours && !$hoteles && !$modulos) {
                http_response_code(400);
                echo json_encode(['error' => 'El paquete necesita al menos una actividad, un hotel o un módulo de itinerario']);
                break;
            }
            $toursJson = json_encode($tours, JSON_UNESCAPED_UNICODE);
            $hotelesJson = $hoteles ? json_encode($hoteles, JSON_UNESCAPED_UNICODE) : null;
            $itinerarioJson = $modulos
                ? json_encode(['idioma' => $idiomaItinerario, 'modulos' => $modulos] + ($diasValidos ? ['dias' => $dias] : []), JSON_UNESCAPED_UNICODE)
                : null;
            if (!empty($data['id'])) {
                if (!verificarDueno($db, $tablaPaquetesTours, $data['id'])) break;
                $stmt = $db->prepare("UPDATE $tablaPaquetesTours SET nombre = ?, tours = ?, hoteles = ?, itinerario = ? WHERE id = ?");
                $stmt->execute([$nombre, $toursJson, $hotelesJson, $itinerarioJson, $data['id']]);
                echo json_encode(['success' => true, 'id' => $data['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaPaquetesTours (nombre, tours, hoteles, itinerario, creado_por) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$nombre, $toursJson, $hotelesJson, $itinerarioJson, $_SESSION['user_id']]);
                echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            }
            break;

        case 'eliminar-paquete-tour':
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
            if (!verificarDueno($db, $tablaPaquetesTours, $data['id'])) break;
            $stmt = $db->prepare("DELETE FROM $tablaPaquetesTours WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'cotizaciones':
            $term = $_GET['q'] ?? '';
            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $condiciones = [];
            $params = [];
            if ($term) {
                // La columna `data` usa collation utf8mb4_bin (sensible a mayúsculas/minúsculas);
                // se normaliza todo a minúsculas para que la búsqueda no dependa de cómo se escribió el nombre.
                $condiciones[] = "(LOWER(id) LIKE LOWER(?)"
                    . " OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pax.nombre_pax'))) LIKE LOWER(?)"
                    . " OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pax.contacto'))) LIKE LOWER(?))";
                $like = "%$term%";
                array_push($params, $like, $like, $like);
            }
            // Solo las de mi agencia, admin incluido (las de las demás las ve desde Agencias).
            [$fc, $pc] = filtroCotizaciones();
            $condiciones[] = $fc;
            array_push($params, ...$pc);
            $where = $condiciones ? ' WHERE ' . implode(' AND ', $condiciones) : '';

            $countStmt = $db->prepare("SELECT COUNT(*) FROM $tablaCotizaciones" . $where);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $stmt = $db->prepare("SELECT id, data FROM $tablaCotizaciones$where ORDER BY fecha_guardado DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            $results = [];
            while ($row = $stmt->fetch()) {
                $row['data'] = json_decode($row['data'], true);
                $results[] = $row;
            }
            echo json_encode(['results' => $results, 'total' => $total]);
            break;

        case 'cotizacion':
            // Las de mi agencia se abren normal. El admin además puede ABRIR la de otra
            // agencia (desde Agencias › Cotizaciones) en solo lectura: el cabecero
            // X-Solo-Lectura hace que el cotizador bloquee guardar, y guardar-cotizacion
            // la rechaza igual.
            $id = $_GET['id'] ?? '';
            $soloLectura = !cotizacionEsDelAmbito($db, $tablaCotizaciones, $id);
            $row = null;
            if (!$soloLectura || is_admin()) {
                $stmt = $db->prepare("SELECT data FROM $tablaCotizaciones WHERE id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch();
            }
            if ($row) {
                if ($soloLectura) header('X-Solo-Lectura: 1');
                echo $row['data'];
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'No encontrada']);
            }
            break;

        // Datos de empresa a usar en el PDF de esta cotización: la agencia de quien la creó,
        // o si no tiene una asignada (típicamente el admin), la agencia marcada como
        // principal. Se pide siempre fresco (no se guarda dentro del JSON de la cotización)
        // para que el logo/términos usados reflejen la ficha de agencia actual.
        case 'cotizacion-agencia':
            // Mismo acceso que 'cotizacion' (el admin la lee también en solo lectura).
            $id = $_GET['id'] ?? '';
            $filaCot = false;
            if (is_admin() || cotizacionEsDelAmbito($db, $tablaCotizaciones, $id)) {
                $stmt = $db->prepare("SELECT u.agencia_id FROM $tablaCotizaciones c
                                       LEFT JOIN usuarios u ON u.id = c.creado_por WHERE c.id = ?");
                $stmt->execute([$id]);
                $filaCot = $stmt->fetch();
            }
            if (!$filaCot) {
                http_response_code(404);
                echo json_encode(['error' => 'No encontrada']);
                break;
            }
            $agenciaId = $filaCot['agencia_id'] ?: null;
            $sqlAgencia = "SELECT id, nombre, ruc, direccion, telefono, telefono2, whatsapp,
                                   color_principal, color_secundario, logo,
                                   terminos_es, terminos_en, terminos_pt
                            FROM agencias WHERE " . ($agenciaId ? "id = ?" : "es_principal = 1 LIMIT 1");
            $agStmt = $db->prepare($sqlAgencia);
            $agStmt->execute($agenciaId ? [$agenciaId] : []);
            echo json_encode($agStmt->fetch() ?: null);
            break;

        case 'guardar-cotizacion':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                break;
            }
            $paxCot = is_array($data['pax'] ?? null) ? $data['pax'] : [];
            $tienePax = trim($paxCot['nombre_pax'] ?? '') !== '';
            $toursCot = is_array($data['tours'] ?? null) ? $data['tours'] : [];
            $hotelsCot = is_array($data['hotels'] ?? null) ? $data['hotels'] : [];
            $tieneItem = array_filter($toursCot, fn($t) => trim($t['tour'] ?? '') !== '')
                || array_filter($hotelsCot, fn($h) => trim($h['aloj'] ?? '') !== '');
            if (!$tienePax || !$tieneItem) {
                http_response_code(400);
                echo json_encode(['error' => 'Falta el nombre del pasajero o al menos una actividad/hotel.']);
                break;
            }
            // Las notas vienen del editor de texto enriquecido (contenteditable): se limpian
            // con la misma whitelist de tags/atributos que ya se usa para los Términos y
            // Condiciones de la agencia, para no guardar HTML/JS arbitrario que luego se
            // vuelve a inyectar con innerHTML al reabrir la cotización o listarla.
            $data['notas'] = sanitizarHtmlTerminos($data['notas'] ?? '') ?? '';

            $stmt = $db->prepare("SELECT creado_por FROM $tablaCotizaciones WHERE id = ?");
            $stmt->execute([$id]);
            $existente = $stmt->fetch();

            // Nadie (admin incluido) guarda encima de una cotización de otra agencia.
            if ($existente && !cotizacionEsDelAmbito($db, $tablaCotizaciones, $id)) {
                http_response_code(403);
                echo json_encode(['error' => 'Esta cotización es de otra agencia: solo puedes verla, no modificarla.']);
                break;
            }

            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            if ($existente) {
                // Ya existe: se preserva el creado_por original, solo se actualiza el contenido.
                $stmt = $db->prepare("UPDATE $tablaCotizaciones SET data = ? WHERE id = ?");
                $stmt->execute([$json, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO $tablaCotizaciones (id, data, creado_por) VALUES (?, ?, ?)");
                $stmt->execute([$id, $json, $_SESSION['user_id']]);
            }
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'eliminar-cotizacion':
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
            if (!cotizacionEsDelAmbito($db, $tablaCotizaciones, $data['id'])) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes permiso para eliminar esta cotización.']);
                break;
            }
            $stmt = $db->prepare("DELETE FROM $tablaCotizaciones WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'upload-tours':
        case 'upload-hoteles':
            if ($method !== 'POST' || !isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Archivo requerido']);
                break;
            }
            // preview=1: corre exactamente la misma lógica (valida, resuelve Destino/Categoría,
            // decide crear vs actualizar) pero termina en rollback en vez de commit — así el
            // frontend puede mostrar "se crearán X, se actualizarán Y" ANTES de aplicar nada,
            // y el usuario confirma con números reales, no una advertencia genérica.
            $esPreview = !empty($_POST['preview']);
            $file = $_FILES['file']['tmp_name'];
            // Sin esta revisión, un .xlsx (o cualquier binario) se leía igual línea por línea y
            // devolvía decenas de errores de "formato" fila por fila, sin decir cuál era el
            // problema real. Un .xlsx es un zip: trae bytes nulos en el arranque, un CSV no.
            $extCsv = strtolower(pathinfo($_FILES['file']['name'] ?? '', PATHINFO_EXTENSION));
            $arranque = is_readable($file) ? (string) file_get_contents($file, false, null, 0, 4096) : '';
            if ($extCsv !== 'csv' || strpos($arranque, "\0") !== false) {
                http_response_code(400);
                echo json_encode(['error' => 'Solo se aceptan archivos .csv. Si tienes un Excel (.xlsx), guárdalo como "CSV (delimitado por comas)" y vuelve a subirlo.']);
                break;
            }
            $lineas = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            // Excel en español (configuración regional de Perú/Latam) exporta e importa CSV
            // separados por punto y coma, no por coma — si se abre a doble clic un CSV con
            // comas, Excel no reconoce las columnas y lo muestra todo pegado en una sola celda.
            // Para que la plantilla descargable "simplemente funcione" al abrirla, se detecta
            // el separador real del archivo (el que más aparece en la primera línea) en vez de
            // asumir uno fijo — así sirve tanto para el CSV que da el sistema (con ;) como para
            // cualquier CSV con comas que ya tuviera armado el usuario.
            $primeraLinea = $lineas[0] ?? '';
            $delimitador = substr_count($primeraLinea, ';') > substr_count($primeraLinea, ',') ? ';' : ',';
            $csv = array_map(fn($linea) => str_getcsv($linea, $delimitador), $lineas);
            // Si la primera fila trae encabezados (p.ej. la plantilla descargable), sus columnas
            // de precio no van a ser numéricas — se descarta antes de insertar. Un archivo sin
            // encabezado (como se pedía antes) sigue funcionando igual, porque su primera fila
            // ya trae precios numéricos y no cae en este caso.
            if (isset($csv[0]) && (!is_numeric(normalizarNumeroCsv($csv[0][2] ?? '')) || !is_numeric(normalizarNumeroCsv($csv[0][3] ?? '')))) {
                array_shift($csv);
            }
            $esTours = $path === 'upload-tours';
            $table = $esTours ? $tablaTours : $tablaHoteles;
            $nombreCampo = $esTours ? 'tour' : 'aloj';
            $tablaCategoriaCsv = $esTours ? 'categorias' : 'categorias_hoteles';

            // ===== 1. Validar cada fila (todavía no toca la base de datos) =====
            $filasValidas = [];
            $errores = [];
            foreach ($csv as $i => $row) {
                $numFila = $i + 1;
                if (count($row) < 4) {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'Faltan columnas (se requieren al menos Nombre, Distr, P.Reg y P.Promo).'];
                    continue;
                }
                $nombreCsv = trim($row[0] ?? '');
                if ($nombreCsv === '') {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'El nombre está vacío.'];
                    continue;
                }
                $pregTxt = normalizarNumeroCsv($row[2] ?? '');
                $ppromoTxt = normalizarNumeroCsv($row[3] ?? '');
                if ($pregTxt === '' || !is_numeric($pregTxt) || $ppromoTxt === '' || !is_numeric($ppromoTxt)) {
                    $errores[] = ['fila' => $numFila, 'motivo' => 'P.Reg o P.Promo no es un número válido.'];
                    continue;
                }
                $filasValidas[] = [
                    'nombre' => $nombreCsv,
                    'distr' => trim($row[1] ?? ''),
                    'preg' => floatval($pregTxt),
                    'ppromo' => floatval($ppromoTxt),
                    'destinoNombre' => isset($row[4]) && trim($row[4]) !== '' ? trim($row[4]) : null,
                    'categoriaNombre' => isset($row[5]) && trim($row[5]) !== '' ? trim($row[5]) : null,
                    'pconf' => isset($row[6]) && trim($row[6]) !== '' ? floatval(normalizarNumeroCsv($row[6])) : 0,
                    'pctotal' => isset($row[7]) && trim($row[7]) !== '' ? floatval(normalizarNumeroCsv($row[7])) : 0,
                ];
            }

            // Si más de la mitad de las filas tienen error, mejor no aplicar nada — casi
            // seguro es el archivo equivocado o un problema de formato, no vale la pena
            // dejar un catálogo a medio armar.
            $totalFilas = count($csv);
            if ($totalFilas > 0 && count($errores) >= 2 && (count($errores) / $totalFilas) > 0.5) {
                http_response_code(422);
                echo json_encode([
                    'success' => false,
                    'error' => 'Demasiadas filas con error (' . count($errores) . ' de ' . $totalFilas . '). Revisa el archivo antes de volver a intentarlo.',
                    'errores' => $errores,
                ]);
                break;
            }

            // ===== 2. Resolver Destino/Categoría — tolerante a mayúsculas/espacios, para no
            // crear duplicados por "Cusco" vs "cusco " =====
            $destinoIdPorNombre = [];
            $categoriaIdPorNombre = [];
            // Busca solo entre los destinos de TU agencia (nunca los de otra).
            // Solo entre los de Actividades / Hoteles (sin grupo): los de Con / Sin pernocte
            // son de Itinerarios y pueden repetir el nombre.
            [$fdCsv, $pdCsv] = filtroDueno();
            $buscarDestinoStmt = $db->prepare("SELECT id FROM destinos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND $fdCsv AND grupo_id IS NULL");
            $crearDestinoStmt = $db->prepare("INSERT INTO destinos (nombre, creado_por) VALUES (?, ?)");
            $buscarCategoriaStmt = $db->prepare("SELECT id FROM $tablaCategoriaCsv WHERE destino_id = ? AND LOWER(TRIM(nombre)) = LOWER(TRIM(?))");
            $crearCategoriaStmt = $db->prepare("INSERT INTO $tablaCategoriaCsv (destino_id, nombre, creado_por) VALUES (?, ?, ?)");
            $resolverDestinoId = function ($nombre) use ($db, $buscarDestinoStmt, $crearDestinoStmt, $pdCsv, &$destinoIdPorNombre) {
                $clave = mb_strtolower(trim($nombre));
                if (isset($destinoIdPorNombre[$clave])) return $destinoIdPorNombre[$clave];
                $buscarDestinoStmt->execute(array_merge([$nombre], $pdCsv));
                $id = $buscarDestinoStmt->fetchColumn();
                if ($id === false) {
                    $crearDestinoStmt->execute([trim($nombre), $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $destinoIdPorNombre[$clave] = $id;
            };
            $resolverCategoriaId = function ($destinoId, $nombre) use ($db, $buscarCategoriaStmt, $crearCategoriaStmt, &$categoriaIdPorNombre) {
                $clave = $destinoId . '|' . mb_strtolower(trim($nombre));
                if (isset($categoriaIdPorNombre[$clave])) return $categoriaIdPorNombre[$clave];
                $buscarCategoriaStmt->execute([$destinoId, $nombre]);
                $id = $buscarCategoriaStmt->fetchColumn();
                if ($id === false) {
                    $crearCategoriaStmt->execute([$destinoId, trim($nombre), $_SESSION['user_id']]);
                    $id = $db->lastInsertId();
                }
                return $categoriaIdPorNombre[$clave] = $id;
            };

            // ===== 3. Crear o actualizar por nombre (tolerante a mayúsculas/espacios) — nunca
            // se borra nada que no venga en el archivo, a diferencia del reemplazo total de
            // antes =====
            $buscarExistenteStmt = $db->prepare("SELECT id FROM $table WHERE $fdCsv AND LOWER(TRIM($nombreCampo)) = LOWER(TRIM(?))");
            $actualizarStmt = $db->prepare("UPDATE $table SET $nombreCampo = ?, distr = ?, preg = ?, ppromo = ?, pconf = ?, pctotal = ?, destino_id = ?, categoria_id = ? WHERE id = ?");
            $insertarStmt = $db->prepare("INSERT INTO $table ($nombreCampo, distr, preg, ppromo, pconf, pctotal, destino_id, categoria_id, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $db->beginTransaction();
            try {
                $creados = 0;
                $actualizados = 0;
                // Dos filas con el mismo nombre en el MISMO archivo actualizan el mismo
                // registro en vez de crear uno duplicado por cada una.
                $idsDeEsteLote = [];
                foreach ($filasValidas as $f) {
                    $destinoId = $f['destinoNombre'] ? $resolverDestinoId($f['destinoNombre']) : null;
                    $categoriaId = ($destinoId && $f['categoriaNombre']) ? $resolverCategoriaId($destinoId, $f['categoriaNombre']) : null;

                    $claveNombre = mb_strtolower(trim($f['nombre']));
                    $id = $idsDeEsteLote[$claveNombre] ?? null;
                    if (!$id) {
                        $buscarExistenteStmt->execute(array_merge($pdCsv, [$f['nombre']]));
                        $encontrado = $buscarExistenteStmt->fetchColumn();
                        $id = $encontrado !== false ? $encontrado : null;
                    }

                    if ($id) {
                        $actualizarStmt->execute([$f['nombre'], $f['distr'], $f['preg'], $f['ppromo'], $f['pconf'], $f['pctotal'], $destinoId, $categoriaId, $id]);
                        $actualizados++;
                    } else {
                        $insertarStmt->execute([$f['nombre'], $f['distr'], $f['preg'], $f['ppromo'], $f['pconf'], $f['pctotal'], $destinoId, $categoriaId, $_SESSION['user_id']]);
                        $id = $db->lastInsertId();
                        $creados++;
                    }
                    $idsDeEsteLote[$claveNombre] = $id;
                }

                if ($esPreview) {
                    $db->rollBack();
                } else {
                    $db->commit();
                }

                echo json_encode([
                    'success' => true,
                    'preview' => $esPreview,
                    'creados' => $creados,
                    'actualizados' => $actualizados,
                    'errores' => $errores,
                    'totalFilas' => $totalFilas,
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                responderErrorAmigable($e);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada']);
    }
} catch (Exception $e) {
    responderErrorAmigable($e);
}
