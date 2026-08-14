// shared/rte.js
// Editor de texto enriquecido simple (negrita, cursiva, subrayado, lista), compartido por
// el campo de Notas del cotizador y los campos de Términos y Condiciones de Agencias.

// Convierte notas guardadas en el formato plano anterior (antes del editor de texto
// enriquecido) a HTML equivalente, para que se sigan viendo bien tanto en el editor
// como en el PDF. Si ya trae etiquetas HTML, se asume que viene del editor nuevo y se
// deja tal cual.
function notasLegacyToHtml(raw) {
    if (!raw) return '';
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    const div = document.createElement('div');
    div.textContent = raw;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Inicializa la barra de herramientas de un editor "contenteditable" simple (negrita,
// cursiva, subrayado, lista). Pega siempre como texto plano para no permitir que se
// inyecte HTML arbitrario copiado de otra página.
function initRichTextEditor(editor) {
    const toolbar = editor.closest('.rte').querySelector('.rte-toolbar');
    toolbar.querySelectorAll('.rte-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // no perder el foco/selección
        btn.addEventListener('click', () => {
            editor.focus();
            document.execCommand(btn.dataset.cmd, false, null);
            actualizarEstadoToolbar();
        });
    });
    function actualizarEstadoToolbar() {
        toolbar.querySelectorAll('.rte-btn').forEach(btn => {
            btn.classList.toggle('is-active', document.queryCommandState(btn.dataset.cmd));
        });
    }
    editor.addEventListener('keyup', actualizarEstadoToolbar);
    editor.addEventListener('mouseup', actualizarEstadoToolbar);
    editor.addEventListener('focus', actualizarEstadoToolbar);
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, texto);
    });
}
