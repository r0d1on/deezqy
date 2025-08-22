'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { Utils } from '../misc/Utils.js';
import { uiFeedback } from '../misc/uiFeedback.js';

/**
 * Search Page Module
 * @module PageSearch
 */
const Page = {
    /**
     * Column definitions for search results table.
     */
    LIST: [
        { name: 'release_id', path: 'result.id', maxwidth: '90px', render: (row) => {
            return `<a href="https://www.discogs.com/release/${row.release_id}" target="_blank">${row.release_id}</a>`; 
        }},
        { name: 'release_thumb', path: 'result.thumb', maxwidth: '100px' , render: (row) => {
            return `<img src="${row.release_thumb}" style="width:100px;">`;
        }},
        { name: 'release_year', sortable:true, path: 'result.year', maxwidth: '80px' },
        { name: 'release_country', path: 'result.country', maxwidth: '100px' },
        { name: 'release_format', path: 'result.format', maxwidth: '180px', render: (row) => {
            return (row['release_format']||[]).join(", "); 
        }},
        { name: 'release_genre', path: 'result.genre', maxwidth: '180px', render: (row) => {
            return (row['release_genre']||[]).join(", ");
        }},
        { name: 'release_style', path: 'result.style', maxwidth: '180px', render: (row) => {
            return (row['release_style']||[]).join(", ");
        }},
        { name: 'release_title', path: 'result.title' },
        { name: 'release_having', sortable:true, path: 'result.community.have' },
        { name: 'release_wanting', sortable:true, path: 'result.community.want' },
        { name: 'release_demand', sortable:true, path: (row) => {
            var have = row['release_having'] || 0;
            var want = row['release_wanting'] || 0;
            return (have + want) ? Math.round((want / (want + have)) * 1000) / 10 : '';
        }},
        { name: 'release_have', sortable:true, path: 'result.user_data.in_collection', render: (row) => {
            return (row['release_have'] ? "\u2705" : "");
        }},
        { name: 'release_want', sortable:true, path: 'result.user_data.in_wantlist', render: (row) => {
            return (row['release_want'] ? "\u2705" : "");
        }}
    ],
    /**
     * Search input field definitions.
     */
    searchFields: [
        { placeholder: 'Title', ref: 'inputTitle', param: 'release_title' },
        { placeholder: 'Artist', ref: 'inputArtist', param: 'artist' },
        { placeholder: 'Track', ref: 'inputTrack', param: 'track' },
        { placeholder: 'Country', ref: 'inputCountry', param: 'country' },
        { placeholder: 'Format', ref: 'inputFormat', param: 'format' },
        { placeholder: 'Barcode', ref: 'inputBarcode', param: 'barcode' }
    ],
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
     * Render the search page
     * @param {HTMLElement} parent - Parent DOM element
     */
    render(parent) {
        parent.innerHTML = '';
        // Search block
        let searchBlock = document.createElement('div');
        searchBlock.className = 'release-search-block';
        // Arrange inputs in rows of 3
        let rowDiv = null;
        let firstRowDiv = null;
        this.searchFields.forEach((f, idx) => {
            if (idx % 3 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.className = 'search-row';
                searchBlock.appendChild(rowDiv);
                if (idx === 0) firstRowDiv = rowDiv;
            }
            let input = document.createElement('input');
            input.type = 'text';
            input.placeholder = f.placeholder;
            input.className = 'settings-input';
            // Restore value if present
            input.value = f.value || "";
            rowDiv.appendChild(input);
            this[f.ref] = input;
        });
        // Add search button to the last row
        let searchBtn = document.createElement('button');
        searchBtn.innerText = 'Search';
        searchBtn.className = 'settings-button';
        searchBtn.onclick = () => {
            this.search();
        };
        rowDiv.appendChild(searchBtn);
        // Add clean button to the first row
        let cleanBtn = document.createElement('button');
        cleanBtn.innerText = 'Clean';
        cleanBtn.className = 'settings-button';
        cleanBtn.onclick = () => {
            this.searchFields.forEach(f => {
                f.value = undefined;
                if (this[f.ref]) this[f.ref].value = '';
            });
        };
        if (firstRowDiv) firstRowDiv.appendChild(cleanBtn);
        parent.appendChild(searchBlock);
        // Results section
        let resultsSection = document.createElement('div');
        resultsSection.className = 'release-results-section';
        parent.appendChild(resultsSection);
        // Release info section
        let infoSection = document.createElement('div');
        infoSection.className = 'release-info-section';
        parent.appendChild(infoSection);
        // Store for later use
        this._resultsSection = resultsSection;
        this._infoSection = infoSection;
    },
    
    renderSearchResults: function(results) {
        this._resultsSection.innerHTML = '';

        let flattened = results.map((result, index)=>{
            let row = ListRenderer.flattenItem(
                this.LIST,
                {
                    "result" : result
                }
            );
            row.index = index;
            return row
        });

        // Use ListRenderer for results, preserve filters
        new ListRenderer({
            data: flattened,
            columns: this.LIST,
            compact: false,
            onRowClick: (row, target) => {
                this.fetchReleaseInfo(row.release_id);
                Array.from(this._resultsSection.querySelectorAll('tr')).forEach(tr=>tr.classList.remove('collection-row-active'));
                target.classList.add('collection-row-active');
            }
        }).render(this._resultsSection);
        
    },

    search: function() {
        // Save search values for persistence
        this.searchFields.forEach(f => {f.value = this[f.ref].value;});
        if (!this.appState.token) {
            uiFeedback.showStatus("Search works only if access token is provided!", "warning");
            return;
        };
        this._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">Searching...</div>';
        let url = 'https://api.discogs.com/database/search?type=release';
        this.searchFields.forEach(f => {
            const val = this[f.ref] && this[f.ref].value;
            if (val) url += `&${f.param}=${encodeURIComponent(val)}`;
        });
        this.appState.API.call(
            url
        ).then(data => {
            if (data.results.length === 0) {
                this._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">No results found.</div>';
                return;
            }
            this.renderSearchResults(data.results);
        });
    },

    fetchReleaseInfo: function(releaseId) {
        this._infoSection.innerHTML = '<div style="font-size:18px;color:#888">Loading release info...</div>';
        this.appState.API.call(
            `https://api.discogs.com/releases/${releaseId}`
        ).then(data => {
            this.selectedRelease = data;
            // check if we can update detailed info on a release we have already
            if (data.id in this.appState.data.release_details) {
                this.appState.data.release_details[data.id] = data;
                this.appState.Pages.Collection.saveData(`Release details updated: ${data.title}`);
            };
            this.renderReleaseInfo();
        });
    },

    renderReleaseInfo: function() {
        const data = this.selectedRelease;
        if (!data) {
            this._infoSection.innerHTML = '';
            return;
        }
        let html = '<table class="collection-table release-info-table">';
        html += `<tr><th colspan="2">Release #${data.id}: ${data.title}</th></tr>`;

        [
            {name:"artist", path:"artists_sort"},
            {name:"reviews", path:"community.rating.count"},
            {name:"rating", path:"community.rating.average"},
            {name:"lowest_price", path:"lowest_price"},
            {name:"num_for_sale", path:"num_for_sale"}
        ].forEach(col=>{
            html += `<tr><td>${col.name}</td><td>${ListRenderer.extractListValue(data, col.path)}</td></tr>`;
        });
        html += `<tr>
            <td>label</td>
            <td>${(data.labels||[]).map(l=>l.name).join(', ')}</td>
        </tr>`;
        html += "</table>"

        html += '<div id="collection-table"></div>';

        this._infoSection.innerHTML = html;

        let list = (data.tracklist||[]).map((raw_track)=>{
            let track_artist = (
                Utils.unifyName(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
                Utils.unifyName(data.artists_sort)
            );
            raw_track.artist = track_artist;
            let track_title = raw_track.title;
            let track_code = Utils.getTrackCode(track_artist, track_title, this.appState.matching_type);
            let track_id = this.appState.collection.tracks_by_code[track_code];
            let track = this.appState.collection.tracks[track_id];
            return {
                "id": track_code,
                "raw_track":  raw_track,
                "track": track
            }
        });

        new ListRenderer({
            data: list,
            columns: [
                {name: "position", post:true, path: "row.raw_track.position"},
                {name: "artist", post:true, path: "row.raw_track.artist"},
                {name: "title", post:true, path:(row, ctx)=>{
                    return `${row.raw_track.title} <span style='color:#888'>${row.raw_track.duration||''}</span>`;
                }},
                {name: "references", post:true, path:(row, ctx)=>{
                    let list_refs = "";
                    row['release_score'] = 100;
                    if (row.track !== undefined) {
                        list_refs = "";
                        list_refs+= row.track.refs.map((ref)=>{
                            let html_track = "";
                            let time_this = row.raw_track.duration.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
                            let time_that = ref.duration.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
                            html_track += `<b style="color:${((Math.abs(time_this-time_that) < 10) ? 'blue' : 'red')}" title="${ref.duration}">♪</b> `;
                            if (ref.folder=="wanted")
                                html_track += `<b title="${ref.artist}">🔍<small style="color:red;">${ref.format} :  ${ref.artist} - ${ref.title} [${row.raw_track.duration}]</small></b>`;
                            else {
                                row['release_score'] = 0;
                                html_track += `<b title="${ref.artist}"><small><a href="#${ref.release_id}">${ref.format}</a> : ${ref.artist} - ${ref.title} [${row.raw_track.duration}]</small></b>`;
                            }
                            return html_track;
                        }).join("<br>")
                        
                        list_refs += "";   
                    };
                    return list_refs;
                }},
                {name: "score", post:true, path: "row.release_score"},

            ],
            compact: false,
            onScore: (score, rows)=>{
                Page.appState.score = score;
                Page.appState.rowCount = rows;
                Page.appState.progress(-1);
            }
        }).render(document.getElementById("collection-table"));

    }
}

export { Page };