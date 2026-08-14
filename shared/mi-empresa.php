<?php
// shared/mi-empresa.php
// Autoservicio: cada usuario (admin o agencia) edita solo los datos de SU PROPIA empresa
// (logo, contacto, Términos y Condiciones en 3 idiomas) — los mismos que usa el PDF de
// cotización. A diferencia de usuarios.php > Agencias, aquí no se ve ni se edita a nadie más.
require_once __DIR__ . '/auth.php';

require_login();
$navRoot = '../';
$navShared = '';
$navActive = 'mi-empresa';
$esAdmin = is_admin();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Empresa</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="cotizador.css">
    <link rel="stylesheet" href="sidebar.css">
    <link rel="stylesheet" href="hero.css">
</head>
<body>
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="app-content">
        <header class="page-hero" style="--hero-bg-image:url('<?= htmlspecialchars($navShared) ?>fondo-sistema-outours.jpg')">
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
                    <label class="text-sm">2do Número
                        <input id="me-telefono2" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm">WhatsApp
                        <input id="me-whatsapp" class="input w-full rounded px-2 py-2 border mt-1" type="text">
                    </label>
                    <label class="text-sm md:col-span-3">Logo
                        <input id="me-logo" class="block w-full text-sm text-slate-500 mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
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
                </div>
            </form>
        </div>

        </div>
        </div>
    </div>

    <script src="notify.js"></script>
    <script src="rte.js"></script>
    <script>
        const ME_API_URL = 'mi-empresa-api.php';
        const ME_TERMINOS_LANGS = ['es', 'en', 'pt'];

        ME_TERMINOS_LANGS.forEach(lang => initRichTextEditor(document.getElementById(`me-terminos-${lang}`)));

        document.querySelectorAll('.me-terminos-lang-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.me-terminos-lang-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.me-terminos-panel').forEach(p => p.classList.add('hidden'));
                tab.classList.add('active');
                document.querySelector(`.me-terminos-panel[data-lang="${tab.dataset.lang}"]`).classList.remove('hidden');
            });
        });

        async function cargarMiEmpresa() {
            const res = await fetch(`${ME_API_URL}?path=mi-agencia`);
            const { agencia } = await res.json();
            if (!agencia) {
                document.getElementById('mi-empresa-vacio').classList.remove('hidden');
                document.getElementById('mi-empresa-form-wrap').classList.add('hidden');
                return;
            }
            document.getElementById('mi-empresa-vacio').classList.add('hidden');
            document.getElementById('mi-empresa-form-wrap').classList.remove('hidden');
            document.getElementById('me-nombre').value = agencia.nombre || '';
            document.getElementById('me-ruc').value = agencia.ruc || '';
            document.getElementById('me-direccion').value = agencia.direccion || '';
            document.getElementById('me-telefono').value = agencia.telefono || '';
            document.getElementById('me-telefono2').value = agencia.telefono2 || '';
            document.getElementById('me-whatsapp').value = agencia.whatsapp || '';
            ME_TERMINOS_LANGS.forEach(lang => {
                document.getElementById(`me-terminos-${lang}`).innerHTML = agencia[`terminos_${lang}`] || '';
            });
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
            ME_TERMINOS_LANGS.forEach(lang => {
                formData.append(`terminos_${lang}`, document.getElementById(`me-terminos-${lang}`).innerHTML);
            });
            const logoFile = document.getElementById('me-logo').files[0];
            if (logoFile) formData.append('logo', logoFile);

            const res = await fetch(`${ME_API_URL}?path=guardar`, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                notifySuccess('Datos de tu empresa actualizados.');
                document.getElementById('me-logo').value = '';
                await cargarMiEmpresa();
            } else {
                notifyError(result.error);
            }
        });

        cargarMiEmpresa();
    </script>
</body>
</html>
