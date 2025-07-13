'use strict';

let Page = {
    App : null,
    init : function(App) {
        Page.App = App;
        let token = Page.App.Cookie.get("token");
        if (token) {
            Page.App.token = token;
        };
        let username = Page.App.Cookie.get("username");
        if (username) {
            Page.App.username = username;
        };
    },

    render : function(parent) {
        parent.innerHTML = `
        <div class="help-container">
            <h2>How to use Discogs Collection Analytics</h2>
            <ul class="help-list">
                <li>
                    <div class="help-key">Setup:</div>
                    <div class="help-desc">On the setup page, enter your <b>private token</b> and click <b>Test credentials</b> to automatically retrieve your username. Alternatively, you may enter only a username to access (your or someone else's) public releases.</div>
                </li>
                <li>
                    <div class="help-key">Loading & Updating:</div>
                    <div class="help-desc">Use the <b>Collection</b> tab to load or update your collection. The collection is cached locally for faster access on future visits.</div>
                </li>
                <li>
                    <div class="help-key">Table View:</div>
                    <div class="help-desc">Once loaded, your collection is displayed as a sortable and filterable table. Sorting and filtering can be applied to any column. The app will always try to use the cached collection first when starting.</div>
                </li>
                <li>
                    <div class="help-key">Uniqueness Score:</div>
                    <div class="help-desc">Each release (album) is assigned a <b>score</b> representing its uniqueness within your collection. This is shown in the <b>score</b> column.</div>
                </li>
                <li>
                    <div class="help-key">Progress & Status:</div>
                    <div class="help-desc">The footer displays the current process and progress bar for long-running operations.</div>
                </li>
                <li>
                    <div class="help-key">Privacy:</div>
                    <div class="help-desc">All data is stored locally in your browser and is not shared externally.</div>
                </li>
                <li>
                    <div class="help-key">Navigation:</div>
                    <div class="help-desc">Use the menu at the top to switch between setup, collection, analytics, and help sections.</div>
                </li>
                <li>
                    <div class="help-key">Additional information:</div>
                    <div class="help-desc">Almost in all of its entirety (this help page included) this webapp was "vibecoded" on a weekend.</div>
                </li>
                <li>
                    <div class="help-key">Support:</div>
                    <div class="help-desc">For more information or to report issues, visit the <a href="https://github.com/r0d1on/deezqy" target="_blank">GitHub</a> page.</div>
                </li>
            </ul>
        </div>
        `;
    }
}

export {Page};