// shared/notify.js
// Helpers de notificación con SweetAlert2, reutilizados por cotizador.js, usuarios.php
// e itinerario.js en vez de alert()/confirm() nativos repetidos por todo el sistema.

function notifyError(msg) {
    return Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#e80c13' });
}

function notifySuccess(msg) {
    return Swal.fire({ icon: 'success', title: '¡Listo!', text: msg, confirmButtonColor: '#e80c13' });
}

function notifyWarning(msg) {
    return Swal.fire({ icon: 'warning', text: msg, confirmButtonColor: '#e80c13' });
}

// Como notifySuccess, pero con un botón de acción secundario (ej. "Generar PDF").
// Devuelve true si el usuario hizo clic en ese botón, false si solo cerró el aviso.
async function notifySuccessAction(msg, actionText) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: msg,
        showCancelButton: true,
        confirmButtonText: actionText,
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#e80c13',
        cancelButtonColor: '#64748b'
    });
    return result.isConfirmed;
}

// Si el mensaje trae "¿Pregunta? Detalle adicional.", la pregunta queda en negrita
// (title de SweetAlert2) y el detalle abajo en texto normal, con el salto de línea que
// separa ambos bloques ya puesto por el propio layout de Swal — sin esto, un mensaje
// largo salía entero como título, todo del mismo tamaño y peso, muy plano/brusco.
// Si no hay un "?" (o está al final, como en "...¿Continuar?"), se muestra igual que
// antes: todo en el título.
async function confirmAction(msg, confirmText = 'Sí', cancelText = 'Cancelar') {
    const corte = msg.indexOf('?');
    const pregunta = corte === -1 ? msg : msg.slice(0, corte + 1);
    const detalle = corte === -1 ? '' : msg.slice(corte + 1).trim();
    const result = await Swal.fire({
        icon: 'question',
        title: pregunta,
        text: detalle || undefined,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#e80c13',
        cancelButtonColor: '#64748b'
    });
    return result.isConfirmed;
}
