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

async function confirmAction(msg, confirmText = 'Sí', cancelText = 'Cancelar') {
    const result = await Swal.fire({
        icon: 'question',
        title: msg,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#e80c13',
        cancelButtonColor: '#64748b'
    });
    return result.isConfirmed;
}
