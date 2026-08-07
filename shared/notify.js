// shared/notify.js
// Helpers de notificación con SweetAlert2, reutilizados por cotizador.js, usuarios.php
// e itinerario.js en vez de alert()/confirm() nativos repetidos por todo el sistema.

function notifyError(msg) {
    return Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#06b6d4' });
}

function notifySuccess(msg) {
    return Swal.fire({ icon: 'success', title: '¡Listo!', text: msg, confirmButtonColor: '#06b6d4' });
}

function notifyWarning(msg) {
    return Swal.fire({ icon: 'warning', text: msg, confirmButtonColor: '#06b6d4' });
}

async function confirmAction(msg, confirmText = 'Sí', cancelText = 'Cancelar') {
    const result = await Swal.fire({
        icon: 'question',
        title: msg,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#06b6d4',
        cancelButtonColor: '#e2e8f0'
    });
    return result.isConfirmed;
}
