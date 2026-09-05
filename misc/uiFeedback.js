/**
 * Centralized UI feedback module for error and status messages.
 * @module uiFeedback
 */
const uiFeedback = {
    activeNotifications: [],

    positionNotifications(type) {
        this.activeNotifications.forEach((entry, index) => {
            if (!entry.element) return;
            entry.element.style.top = `${80 + index * 65}px`;
            entry.element.style.left = '50%';
            entry.element.style.transform = 'translateX(-50%)';
            if ((type!=='error') & (entry.type=='error')) {
                this.dismissNotification(entry);
            }
        });
    },

    dismissNotification(entry) {
        const idx = this.activeNotifications.indexOf(entry);
        if (idx !== -1) {
            this.activeNotifications.splice(idx, 1);
        }
        if (entry.element && entry.element.parentNode) {
            entry.element.parentNode.removeChild(entry.element);
        }
        this.positionNotifications();
    },

    /**
     * Show a status message in a designated status area.
     * @param {string} message - The status message to display.
     * @param {string} [type="info"] - Message type: "info", "success", "warning", "error".
     */
    showStatus(message, type = "info") {
        const statusBar = document.createElement('div');
        statusBar.className = `app-status-bar ${type}`;
        statusBar.textContent = message;
        statusBar.style.display = 'block';
        document.body.appendChild(statusBar);

        const entry = {
            message,
            type,
            element: statusBar,
            timeoutId: null
        };

        this.activeNotifications.push(entry);
        this.positionNotifications(type);

        if (type !== 'error') {
            entry.timeoutId = setTimeout(() => {
                this.dismissNotification(entry);
            }, 3000);
        }
    },
    /**
     * Show an error message in a designated error area.
     * @param {string} message - The error message to display.
     */
    showError(message) {
        this.showStatus(message, 'error');
    }
};

export { uiFeedback };
