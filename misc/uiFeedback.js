/**
 * Centralized UI feedback module for error and status messages.
 * @module uiFeedback
 */
const uiFeedback = {
    /**
     * Show a status message in a designated status area.
     * @param {string} message - The status message to display.
     * @param {string} [type="info"] - Message type: "info", "success", "warning", "error".
     */
    showStatus(message, type = "info") {
        let statusBar = document.getElementById('app-status-bar');
        if (!statusBar) {
            statusBar = document.createElement('div');
            statusBar.id = 'app-status-bar';
            statusBar.className = 'app-status-bar';
            document.body.appendChild(statusBar);
        }
        statusBar.textContent = message;
        statusBar.className = `app-status-bar ${type}`;
        statusBar.style.display = 'block';
        if (type !== 'error') {
            setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
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
