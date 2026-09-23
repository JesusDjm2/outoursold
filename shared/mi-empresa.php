<?php
// shared/mi-empresa.php
// Autoservicio: cada usuario (admin o agencia) edita solo los datos de SU PROPIA empresa
// (logo, contacto, Términos y Condiciones en 3 idiomas) — los mismos que usa el PDF de
// cotización. A diferencia de usuarios.php > Agencias, aquí no se ve ni se edita a nadie más.
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/agencia-helpers.php';

require_login();
$navRoot = '../';
$navShared = '';
$navActive = 'mi-empresa';
$esAdmin = is_admin();
$db = getDB();
$heroImagenUrl = resolverHeroImagenUrl($db, $navShared);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Empresa</title>
    <link rel="icon" type="image/png" href="favicon-outoors.png?v=<?= filemtime(__DIR__ . '/favicon-outoors.png') ?>">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="cotizador.css?v=<?= filemtime(__DIR__ . '/cotizador.css') ?>">
    <link rel="stylesheet" href="sidebar.css?v=<?= filemtime(__DIR__ . '/sidebar.css') ?>">
    <link rel="stylesheet" href="hero.css?v=<?= filemtime(__DIR__ . '/hero.css') ?>">
</head>
<body>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($heroImagenUrl) ?>')">
            <button type="button" id="hero-edit-btn" class="hero-edit-btn" title="Cambiar imagen del Hero de tu empresa"><i class="fas fa-camera"></i></button>
            <input type="file" id="hero-edit-input" accept="image/jpeg,image/png,image/webp" class="hidden">
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <div class="page-hero-content">
                    <h1>Mi Empresa</h1>
                    <p>Logo, contacto y Términos y Condiciones que se usan en el PDF de tus cotizaciones.</p>
                </div>
            </div>
        </header>
        <div class="p-4 md:p-6">
        <div class="max-w-7xl mx-auto">

        <div id="mi-empresa-vacio" class="card p-6 hidden">
            <p class="text-slate-600">
                <?php if ($esAdmin): ?>
                    No se encontró una agencia marcada como principal. Ve a <a href="usuarios.php" class="text-[#e80c13] underline">Usuarios &rarr; Agencias</a> y marca una como principal.
                <?php else: ?>
                    No tienes una agencia/empresa asignada todavía. Contacta a tu administrador para que te asigne una.
                <?php endif; ?>
            </p>
        </div>

        <div id="mi-empresa-vista" class="card p-6 hidden">
            <div class="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div class="flex items-center gap-4">
                    <img id="ve-logo" src="" alt="Logo" class="h-20 w-20 object-contain rounded-lg border bg-white p-1 hidden">
                    <div id="ve-logo-placeholder" class="h-20 w-20 flex items-center justify-center rounded-lg border bg-slate-50 text-slate-300 text-3xl">
                        <i class="fas fa-building"></i>
                    </div>
                    <div>
                        <h2 id="ve-nombre" class="text-xl font-semibold text-slate-800"></h2>
                        <p class="text-sm text-slate-500"><i class="fas fa-id-card mr-1.5 text-slate-400"></i>RUC: <span id="ve-ruc"></span></p>
                    </div>
                </div>
                <button id="me-editar-btn" type="button" class="btn btn-primary">
                    <i class="fas fa-pen mr-2"></i>Editar
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div>
                    <div class="text-xs uppercase tracking-wide text-slate-400 mb-0.5"><i class="fas fa-map-marker-alt mr-1"></i>Dirección</div>
                    <div id="ve-direccion" class="text-sm text-slate-700"></div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-wide text-slate-400 mb-0.5"><i class="fas fa-phone mr-1"></i>Teléfono</div>
                    <div id="ve-telefono" class="text-sm text-slate-700"></div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-wide text-slate-400 mb-0.5"><i class="fas fa-phone mr-1"></i>2do Teléfono</div>
                    <div id="ve-telefono2" class="text-sm text-slate-700"></div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-wide text-slate-400 mb-0.5"><i class="fab fa-whatsapp mr-1"></i>Teléfono de WhatsApp</div>
                    <div id="ve-whatsapp" class="text-sm text-slate-700"></div>
                </div>
            </div>
            <div class="flex items-center gap-2 mb-5">
                <span class="text-xs uppercase tracking-wide text-slate-400"><i class="fas fa-palette mr-1"></i>Colores de marca</span>
                <span id="ve-color-principal" class="inline-block h-5 w-5 rounded-full border" title="Color principal"></span>
                <span id="ve-color-secundario" class="inline-block h-5 w-5 rounded-full border" title="Color secundario"></span>
            </div>
            <div class="pt-4 border-t">
                <div class="text-xs uppercase tracking-wide text-slate-400 mb-2"><i class="fas fa-file-contract mr-1"></i>Términos y Condiciones</div>
                <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-3">
                    <button type="button" class="categoria-tipo-tab ve-terminos-lang-tab active" data-lang="es">Español</button>
                    <button type="button" class="categoria-tipo-tab ve-terminos-lang-tab" data-lang="en">English</button>
                    <button type="button" class="categoria-tipo-tab ve-terminos-lang-tab" data-lang="pt">Português</button>
                </div>
                <div id="ve-terminos-es" class="ve-terminos-panel text-sm text-slate-700" data-lang="es"></div>
                <div id="ve-terminos-en" class="ve-terminos-panel text-sm text-slate-700 hidden" data-lang="en"></div>
                <div id="ve-terminos-pt" class="ve-terminos-panel text-sm text-slate-700 hidden" data-lang="pt"></div>
            </div>
        </div>

        <div id="mi-empresa-form-wrap" class="card p-6 hidden">
            <form id="form-mi-empresa" class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label class="text-sm">Nombre
                        <input id="me-nombre" class="input w-full rounded px-2 py-2 border mt-1" type="text" required>
                    </label>
                    <label class="text-sm">RUC
                        <input id="me-ruc" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">Dirección
                        <input id="me-direccion" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">Teléfono
                        <input id="me-telefono" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">2do Teléfono
                        <input id="me-telefono2" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">Teléfono de WhatsApp
                        <input id="me-whatsapp" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">Color principal
                        <input id="me-color-principal" class="block w-full h-10 rounded border mt-1 p-1" type="color" value="#ff0000">
                    </label>
                    <label class="text-sm">Color secundario
                        <input id="me-color-secundario" class="block w-full h-10 rounded border mt-1 p-1" type="color" value="#0566cf">
                    </label>
                    <label class="text-sm md:col-span-3">Logo
                        <div class="flex items-center gap-3 mt-1">
                            <img id="me-logo-actual" src="" alt="Logo actual" class="h-14 w-14 object-contain rounded border bg-white p-1 hidden">
                            <span id="me-logo-actual-vacio" class="text-xs text-slate-400">Sin logo guardado todavía.</span>
                            <input id="me-logo" class="block flex-1 text-sm text-slate-500" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        </div>
                    </label>
                </div>

                <div>
                    <div class="text-sm font-medium text-slate-700 mb-1">Términos y Condiciones</div>
                    <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-2">
                        <button type="button" class="categoria-tipo-tab me-terminos-lang-tab active" data-lang="es">Español</button>
                        <button type="button" class="categoria-tipo-tab me-terminos-lang-tab" data-lang="en">English</button>
                        <button type="button" class="categoria-tipo-tab me-terminos-lang-tab" data-lang="pt">Português</button>
                    </div>
                    <div class="rte me-terminos-panel" data-lang="es" style="min-height:200px">
                        <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                            <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                            <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                            <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                            <span class="rte-sep"></span>
                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                        </div>
                        <div id="me-terminos-es" class="rte-editor flex-1" contenteditable="true" data-placeholder="Términos y condiciones en español..."></div>
                    </div>
                    <div class="rte me-terminos-panel hidden" data-lang="en" style="min-height:200px">
                        <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                            <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                            <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                            <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                            <span class="rte-sep"></span>
                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                        </div>
                        <div id="me-terminos-en" class="rte-editor flex-1" contenteditable="true" data-placeholder="Terms and conditions in English..."></div>
                    </div>
                    <div class="rte me-terminos-panel hidden" data-lang="pt" style="min-height:200px">
                        <div class="rte-toolbar" role="toolbar" aria-label="Formato de texto">
                            <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                            <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                            <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                            <span class="rte-sep"></span>
                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista con viñetas"><i class="fas fa-list-ul"></i></button>
                        </div>
                        <div id="me-terminos-pt" class="rte-editor flex-1" contenteditable="true" data-placeholder="Termos e condições em português..."></div>
                    </div>
                </div>

                <div class="flex gap-2 pt-2">
                    <button type="submit" id="me-form-submit" class="btn btn-primary">
                        <i class="fas fa-save mr-2"></i>Guardar cambios
                    </button>
                    <button type="button" id="me-cancelar-btn" class="btn border">Cancelar</button>
                </div>
            </form>
        </div>

        </div>
        </div>
    </div>

    <link rel="stylesheet" href="notify.css?v=<?= filemtime(__DIR__ . '/notify.css') ?>">
    <script src="notify.js?v=<?= filemtime(__DIR__ . '/notify.js') ?>"></script>
    <script src="rte.js?v=<?= filemtime(__DIR__ . '/rte.js') ?>"></script>
    <script>
        const ME_API_URL = 'mi-empresa-api.php';
        const ME_TERMINOS_LANGS = ['es', 'en', 'pt'];
        let agenciaActual = null;

        ME_TERMINOS_LANGS.forEach(lang => initRichTextEditor(document.getElementById(`me-terminos-${lang}`)));

        document.querySelectorAll('.me-terminos-lang-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.me-terminos-lang-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.me-terminos-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                document.querySelector(`.me-terminos-panel[data-lang="${tab.dataset.lang}"]`).classList.remove('hidden');
            });
        });

        document.querySelectorAll('.ve-terminos-lang-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.ve-terminos-lang-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.ve-terminos-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                document.querySelector(`.ve-terminos-panel[data-lang="${tab.dataset.lang}"]`).classList.remove('hidden');
            });
        });

        function setVistaCampo(id, value) {
            const el = document.getElementById(id);
            el.textContent = value || '—';
            el.classList.toggle('text-slate-400', !value);
        }

        function renderVista(agencia) {
            document.getElementById('ve-nombre').textContent = agencia.nombre || 'Sin nombre';
            setVistaCampo('ve-ruc', agencia.ruc);
            setVistaCampo('ve-direccion', agencia.direccion);
            setVistaCampo('ve-telefono', agencia.telefono);
            setVistaCampo('ve-telefono2', agencia.telefono2);
            setVistaCampo('ve-whatsapp', agencia.whatsapp);
            document.getElementById('ve-color-principal').style.background = agencia.color_principal || '#ff0000';
            document.getElementById('ve-color-secundario').style.background = agencia.color_secundario || '#0566cf';
            ME_TERMINOS_LANGS.forEach(lang => {
                const contenido = agencia[`terminos_${lang}`];
                document.getElementById(`ve-terminos-${lang}`).innerHTML = (contenido && contenido.trim() !== '')
                    ? contenido
                    : '<span class="text-slate-400">Sin términos y condiciones en este idioma.</span>';
            });
            const logoImg = document.getElementById('ve-logo');
            const logoPlaceholder = document.getElementById('ve-logo-placeholder');
            if (agencia.logo) {
                logoImg.src = `uploads/agencias/${agencia.logo}`;
                logoImg.classList.remove('hidden');
                logoPlaceholder.classList.add('hidden');
            } else {
                logoImg.classList.add('hidden');
                logoPlaceholder.classList.remove('hidden');
            }
        }

        function poblarFormulario(agencia) {
            document.getElementById('me-nombre').value = agencia.nombre || '';
            document.getElementById('me-ruc').value = agencia.ruc || '';
            document.getElementById('me-direccion').value = agencia.direccion || '';
            document.getElementById('me-telefono').value = agencia.telefono || '';
            document.getElementById('me-telefono2').value = agencia.telefono2 || '';
            document.getElementById('me-whatsapp').value = agencia.whatsapp || '';
            document.getElementById('me-color-principal').value = agencia.color_principal || '#ff0000';
            document.getElementById('me-color-secundario').value = agencia.color_secundario || '#0566cf';
            ME_TERMINOS_LANGS.forEach(lang => {
                document.getElementById(`me-terminos-${lang}`).innerHTML = agencia[`terminos_${lang}`] || '';
            });
            document.getElementById('me-logo').value = '';
            const logoActual = document.getElementById('me-logo-actual');
            const logoActualVacio = document.getElementById('me-logo-actual-vacio');
            if (agencia.logo) {
                logoActual.src = `uploads/agencias/${agencia.logo}`;
                logoActual.classList.remove('hidden');
                logoActualVacio.classList.add('hidden');
            } else {
                logoActual.classList.add('hidden');
                logoActualVacio.classList.remove('hidden');
            }
        }

        function mostrarVista() {
            document.getElementById('mi-empresa-vista').classList.remove('hidden');
            document.getElementById('mi-empresa-form-wrap').classList.add('hidden');
        }

        function mostrarFormulario() {
            poblarFormulario(agenciaActual);
            document.getElementById('mi-empresa-vista').classList.add('hidden');
            document.getElementById('mi-empresa-form-wrap').classList.remove('hidden');
        }

        document.getElementById('me-editar-btn').addEventListener('click', mostrarFormulario);
        document.getElementById('me-cancelar-btn').addEventListener('click', mostrarVista);

        async function cargarMiEmpresa() {
            const res = await fetch(`${ME_API_URL}?path=mi-agencia`);
            const { agencia } = await res.json();
            if (!agencia) {
                agenciaActual = null;
                document.getElementById('mi-empresa-vacio').classList.remove('hidden');
                document.getElementById('mi-empresa-vista').classList.add('hidden');
                document.getElementById('mi-empresa-form-wrap').classList.add('hidden');
                return;
            }
            agenciaActual = agencia;
            document.getElementById('mi-empresa-vacio').classList.add('hidden');
            renderVista(agencia);
            mostrarVista();
        }

        document.getElementById('form-mi-empresa').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('me-nombre').value.trim();
            if (!nombre) { notifyError('El nombre es obligatorio.'); return; }

            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('ruc', document.getElementById('me-ruc').value.trim());
            formData.append('direccion', document.getElementById('me-direccion').value.trim());
            formData.append('telefono', document.getElementById('me-telefono').value.trim());
            formData.append('telefono2', document.getElementById('me-telefono2').value.trim());
            formData.append('whatsapp', document.getElementById('me-whatsapp').value.trim());
            formData.append('color_principal', document.getElementById('me-color-principal').value);
            formData.append('color_secundario', document.getElementById('me-color-secundario').value);
            ME_TERMINOS_LANGS.forEach(lang => {
                formData.append(`terminos_${lang}`, document.getElementById(`me-terminos-${lang}`).innerHTML);
            });
            const logoFile = document.getElementById('me-logo').files[0];
            if (logoFile) formData.append('logo', logoFile);

            const res = await fetch(`${ME_API_URL}?path=guardar`, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                notifySuccess('Datos de tu empresa actualizados.');
                await cargarMiEmpresa();
            } else {
                notifyError(result.error);
            }
        });

        cargarMiEmpresa();
    </script>
    <script>window.ME_API_URL = 'mi-empresa-api.php';</script>
    <script src="hero-edit.js?v=<?= filemtime(__DIR__ . '/hero-edit.js') ?>"></script>
</body>
</html>
