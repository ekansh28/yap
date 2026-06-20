/**
 * Reusable Notification Component
 *
 * Displays toast notifications throughout the application.
 */

class Notification {
    /**
     * Creates a Notification Container if it doesn't exist
     */
    static initialize() {
        let container = document.getElementById('notification-container');
        if (container) return;
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    /**
     * Shows a notification
     */
    static show({ title = 'Title', message = '', type = 'info', duration }) {
        // Handle "persist" mode: if duration is null, 0, or specifically false, we don't auto-hide
        const isPersistent = duration === null || duration === 0 || duration === false;
        const finalDuration = !isPersistent ? ((typeof duration === 'number' && !isNaN(duration)) ? duration : 3000) : null;

        this.initialize();
        const container = document.getElementById('notification-container');

        // --- FIX: exclude notifications that are already removing ---
        const existing = [...document.querySelectorAll('.Notification')]
            .filter(n => !n.classList.contains('removing'))
            .find(notification => {
                const msg = notification.querySelector('.notification-message');
                return msg?.textContent === message;
            });

        if (existing) {
            const windowEl = existing.querySelector('.notification-window');
            if (windowEl) {
                windowEl.classList.remove('shake');
                void windowEl.offsetWidth;
                windowEl.classList.add('shake');

                const onAnimationEnd = () => {
                    windowEl.classList.remove('shake');
                    windowEl.removeEventListener('animationend', onAnimationEnd);
                };
                windowEl.addEventListener('animationend', onAnimationEnd, { once: true });
            }

            // Reset timer ONLY if it's not persistent
            clearTimeout(existing.notificationTimeout);
            if (!isPersistent) {
                existing.notificationTimeout = setTimeout(() => {
                    existing.classList.add('removing');
                    setTimeout(() => existing.remove(), 250);
                }, finalDuration);
            }
            return;
        }

        // Determine icon path
        const iconName = type === 'warning' ? 'notif-warning.png' : `${type}.png`;
        const iconPath = `/static/accounts/images/${iconName}`;

        // Create new notification
        const notification = document.createElement('div');
        notification.classList.add('Notification', type);
        notification.innerHTML = `
            <div class="window notification-window">
                <div class="title-bar notification-${type}">
                    <div class="title-bar-text" style="display: flex; align-items: center; gap: 4px;">
                        <img src="${iconPath}" alt="" style="width: 14px; height: 14px; image-rendering: pixelated;">
                        ${title}
                    </div>
                    <div class="title-bar-controls">
                        <button class="notification-close" aria-label="Close"></button>
                    </div>
                </div>
                <div class="window-body">
                    <p class="notification-message">${message}</p>
                </div>
            </div>
        `;

        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.classList.add('removing');
                setTimeout(() => notification.remove(), 250);
            });
        }

        container.appendChild(notification);

        // Auto-remove timer (Skip if persistent)
        if (!isPersistent) {
            notification.notificationTimeout = setTimeout(() => {
                notification.classList.add('removing');
                setTimeout(() => notification.remove(), 250);
            }, finalDuration);

            notification.addEventListener('mouseenter', () => {
                clearTimeout(notification.notificationTimeout);
            });

            notification.addEventListener('mouseleave', () => {
                notification.notificationTimeout = setTimeout(() => {
                    notification.classList.add('removing');
                    setTimeout(() => notification.remove(), 250);
                }, finalDuration);
            });
        }
    }

    // Helper methods
    static success(message, options = {}) {
        const duration = typeof options === 'number' ? options : options.duration;
        this.show({ title: 'Success', message, type: 'success', duration });
    }

    static error(message, options = {}) {
        const duration = typeof options === 'number' ? options : options.duration;
        this.show({ title: 'Error', message, type: 'error', duration });
    }

    static warning(message, options = {}) {
        const duration = typeof options === 'number' ? options : options.duration;
        this.show({ title: 'Warning', message, type: 'warning', duration });
    }

    static info(message, options = {}) {
        const duration = typeof options === 'number' ? options : options.duration;
        this.show({ title: 'Info', message, type: 'info', duration });
    }
}

export default Notification;
