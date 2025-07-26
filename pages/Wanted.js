'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { uiFeedback } from '../misc/uiFeedback.js';

/**
 * Wanted Page Module
 * @module PageWanted
 */
const Page = {
    /** @type {object} */
    appState: null,
    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState || this.appState;
        appState = this.appState;
    },

    saveData : function(message) {
        Page.appState.Pages.Collection.saveData(message);
    },

    downloadTracks: function(update) {
        return Page.appState.Pages.Collection.downloadTracks(update);
    },

    downloadData : function() {
        if (!this.appState.username) {
            uiFeedback.showStatus("DB update works only if user name is provided!", "warning");
            return;
        };

        this.appState.API.call(
            `https://api.discogs.com/users/${this.appState.username}/wants`
            ,(stage, stages)=>{
                this.appState.progress(stage, stages, "Loading wanted list");
            }
        ).then((data)=>{
            this.appState.data.wanted = Page.appState.make_index(data.wants);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        }).then(()=>{
            return Page.downloadTracks(true);
        }).then(()=>{
            //if ((Page._last_parent)&&(Page.appState.ui.activeMenu.page==Page)) {
            //    Page.render(Page._last_parent);
            //}
        });
    },
 
    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((this.appState.collection==undefined)||(this.appState.collection.wanted_list==undefined)) {
            return;
        }
        new ListRenderer({
            data: this.appState.collection.wanted_list,
            columns: Page.appState.Pages.Collection.LIST,
            parent: parent_div,
            compact: true,
            filters: Page.listFilters,
            onFiltersChange: (filters) => {
                Page.listFilters = filters.slice();
            },
            onScore: (score, rows)=>{
                Page.appState.score = score;
                Page.appState.rowCount = rows;
                Page.appState.progress(-1);
            }
        });
    },

    render : function(parent) {
        Page._last_parent = parent;
        parent.innerHTML = "";

        let controls = document.createElement("div");
        controls.className = "collection-controls";
        
        let buttonReload = document.createElement("button");
        buttonReload.innerText = "Reload";
        buttonReload.className = "settings-button";
        buttonReload.onclick = (e)=>this.downloadData();
        controls.appendChild(buttonReload);

        parent.appendChild(controls);
        parent.appendChild(document.createElement("hr"));

        let list_view = document.createElement("div");
        list_view.className="collection-container";
        this.render_list(list_view);
        parent.appendChild(list_view);
    }

}

export { Page };