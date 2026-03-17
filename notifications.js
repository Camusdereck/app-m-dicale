// notifications.js
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'notification'; // Réinitialise les classes
    notification.classList.add(type); // Ajoute 'success' ou 'error'
    notification.classList.add('show');

    // Cache la notification après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}