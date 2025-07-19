'use strict';

/**
 * Help Page Module
 * @module PageHelp
 */
const Page = {
    /** @type {object} */
    appState: null,
    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState;
    },
    /**
     * Render the help page
     * @param {HTMLElement} parent - Parent DOM element
     */
    render(parent) {
        parent.innerHTML = `
        <div class="help-container">
            <h2>How to use Discogs Collection Analytics</h2>
            <ul class="help-list">
                <li>
                    <div class="help-key">Setup:</div>
                    <div class="help-desc">On the setup page, enter your <b>private token</b> and click <b>Test credentials</b> to automatically retrieve your username. Alternatively, you may enter only a username to access (your or someone else's) public releases. You can also select your preferred <b>track matching mode</b> ("author & title" or "title only") for collection analysis.</div>
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
                    <div class="help-key">Advanced Search:</div>
                    <div class="help-desc">Use the <b>Search</b> tab to find releases by title, artist, track, country, format, or barcode. Results are shown in a sortable/filterable table. Click a result to view detailed release info and see if it matches any tracks in your collection.</div>
                </li>
                <li>
                    <div class="help-key">Track Matching Mode:</div>
                    <div class="help-desc">Switch between <b>author & title</b> and <b>title only</b> matching in Setup to control how tracks are deduplicated and scored for uniqueness.</div>
                </li>
                <li>
                    <div class="help-key">Uniqueness Score:</div>
                    <div class="help-desc">Each release (album) is assigned a <b>score</b> representing its uniqueness within your collection, based on the selected matching mode. This is shown in the <b>score</b> column.</div>
                </li>
                <li>
                    <div class="help-key">Release Info & Tracklist:</div>
                    <div class="help-desc">View detailed release information and tracklists, including cross-references to your collection for each track.</div>
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
                    <div class="help-desc">Use the menu at the top to switch between setup, collection, search, and help sections.</div>
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

export { Page };