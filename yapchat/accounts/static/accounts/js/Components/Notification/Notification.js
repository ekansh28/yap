/**
 * Reusable Notification Component
 *
 * Displays toast notifications throughout the application.
 *
 * Usage:
 *
 * Notification.success("Connected!");
 * Notification.error("Connection failed.");
 * Notification.warning("Maximum 5 tags allowed.");
 * Notification.info("Searching for a partner...");
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
    static show({ title = 'Title', message = '', type = 'info', duration = 3000 }) {
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
            // Get the inner window element
            const windowEl = existing.querySelector('.notification-window');
            if (windowEl) {
                // Remove any existing shake class and force reflow on the window element
                windowEl.classList.remove('shake');
                void windowEl.offsetWidth;        // reliable reflow
                windowEl.classList.add('shake');

                // Remove shake class after animation ends
                const onAnimationEnd = () => {
                    windowEl.classList.remove('shake');
                    windowEl.removeEventListener('animationend', onAnimationEnd);
                };
                windowEl.addEventListener('animationend', onAnimationEnd, { once: true });
            }

            // Reset timer
            clearTimeout(existing.notificationTimeout);
            existing.notificationTimeout = setTimeout(() => {
                existing.classList.add('removing');
                setTimeout(() => existing.remove(), 250);
            }, duration);
            return;
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.classList.add('Notification', type);
        notification.innerHTML = `
            <div class="window notification-window">
                <div class="title-bar notification-${type}">
                    <div class="title-bar-text">${title}</div>
                    <div class="title-bar-controls">
                        <button class="notification-close" aria-label="Close"></button>
                    </div>
                </div>
                <div class="window-body">
                    <p class="notification-message">${message}</p>
                </div>
            </div>
        `;

        // Close button
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.classList.add('removing');
                setTimeout(() => notification.remove(), 250);
            });
        }

        container.appendChild(notification);

        // Auto-remove timer
        notification.notificationTimeout = setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => notification.remove(), 250);
        }, duration);

        // Pause on hover
        notification.addEventListener('mouseenter', () => {
            clearTimeout(notification.notificationTimeout);
        });

        // Resume on leave
        notification.addEventListener('mouseleave', () => {
            notification.notificationTimeout = setTimeout(() => {
                notification.classList.add('removing');
                setTimeout(() => notification.remove(), 250);
            }, duration);
        });
    }

    // Helper methods
    static success(message, duration) {
        this.show({ title: 'Success', message, type: 'success', duration });
    }

    static error(message, duration) {
        this.show({ title: 'Error', message, type: 'error', duration });
    }

    static warning(message, duration) {
        this.show({ title: 'Warning', message, type: 'warning', duration });
    }

    static info(message, duration) {
        this.show({ title: 'Info', message, type: 'info', duration });
    }
}

export default Notification;