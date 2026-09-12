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
    MUSIC_LIST: [
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
        { name: 'release_want', sortable:true, path: 'result.user_data.in_wantlist', render: (row) => {
            return (row['release_want'] ? "🟥" : "⬜");
        }},
        { name: 'release_have', sortable:true, path: 'result.user_data.in_collection', render: (row) => {
            return (row['release_have'] ? "🟩" : "⬜");
        }},
    ],
    FILMS_LIST: [
        { name: 'film_id', path: 'result.id', maxwidth: '90px', render: (row) => {
            return `<a href="https://www.themoviedb.org/movie/${row.film_id}" target="_blank">${row.film_id}</a>`;
        }},
        { name: 'film_poster', path: 'result.poster_path', maxwidth: '100px', render: (row) => {
            return row.film_poster ? `<img src="https://image.tmdb.org/t/p/w185${row.film_poster}" style="width:100px;">` : '';
        }},
        { name: 'film_title', path: 'result.title' },
        { name: 'film_original_title', path: 'result.original_title' },
        { name: 'film_release_date', sortable: true, path: 'result.release_date', maxwidth: '120px' },
        { name: 'film_rating', sortable: true, path: 'result.vote_average', maxwidth: '100px' },
        { name: 'film_overview', path: 'result.overview' },
        { name: 'film_want', path: (row, context) => Page.isFilmInDvdFolder(context.result, 'want'), render: (row) => {
            return (row.film_want ? "🟥" : "⬜");
        }},
        { name: 'film_have', path: (row, context) => Page.isFilmInDvdFolder(context.result, 'collected')||Page.isFilmInDvdFolder(context.result, 'dvd'), render: (row) => {
            return (row.film_have ? "🟩" : "⬜");
        }},
    ],
    /**
     * Search input field definitions.
     */
    musicSearchFields: [
        { placeholder: 'Title', ref: 'inputTitle', param: 'release_title' },
        { placeholder: 'Artist', ref: 'inputArtist', param: 'artist' },
        { placeholder: 'Track', ref: 'inputTrack', param: 'track' },
        { placeholder: 'Country', ref: 'inputCountry', param: 'country' },
        { placeholder: 'Format', ref: 'inputFormat', param: 'format' },
        { placeholder: 'Barcode', ref: 'inputBarcode', param: 'barcode' }
    ],
    filmSearchFields: [
        { placeholder: 'Film title', ref: 'inputFilmQuery', param: 'query' }
    ],
    /** @type {object} */
    appState: null,
    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState;
        this.appState.search_type = 'Music';
    },

    isFilmInDvdFolder(film, folderName) {
        const dvdItems = this.appState.data.dvd_items || {};
        const dvdFolders = this.appState.data.dvd_folders || {};
        const dvdItem = Object.values(dvdItems).find((item) => String(item.id0) === String(film.id));
        if (!dvdItem) return false;
        return Object.keys(dvdItem.folders || {}).some((folderId) => {
            const folder = dvdFolders[folderId];
            return folder && String(folder.name).toLowerCase() === folderName;
        });
    },
    /**
     * Render the search page
     * @param {HTMLElement} parent - Parent DOM element
     */
    render(parent) {
        parent.innerHTML = '';

        let resultsSection = document.createElement('div');
        resultsSection.className = 'release-results-section';
        let infoSection = document.createElement('div');
        infoSection.className = 'release-info-section';
        // Store for later use
        this._resultsSection = resultsSection;
        this._infoSection = infoSection;

        let searchBlock = document.createElement('div');
        searchBlock.className = 'release-search-block';
        let fieldsContainer = document.createElement('div');
        searchBlock.appendChild(fieldsContainer);
        this._fieldsContainer = fieldsContainer;
        searchBlock.insertBefore(this.renderSearchModeSwitch(), fieldsContainer);
        this.renderSearchFields();
        parent.appendChild(searchBlock);
        // Results section
        parent.appendChild(resultsSection);
        // Release info section
        parent.appendChild(infoSection);
    },

    renderSearchModeSwitch() {
        let switchGroup = document.createElement('div');
        switchGroup.className = 'settings-group other-settings-group';

        let switchContainer = document.createElement('div');
        switchContainer.className = 'switch-container';
        let switchLabel = document.createElement('label');
        switchLabel.className = 'switch-label';
        let switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.className = 'switch-input';
        let slider = document.createElement('span');
        slider.className = 'switch-slider';
        let knob = document.createElement('span');
        knob.className = 'switch-knob';
        slider.appendChild(knob);
        let audioText = document.createElement('span');
        audioText.textContent = 'Music';
        audioText.className = 'switch-left-text';
        let filmText = document.createElement('span');
        filmText.textContent = 'Films';
        filmText.className = 'switch-right-text';
        switchInput.checked = this.appState.search_type === 'Films';

        const updateSwitch = () => {
            this.appState.search_type = switchInput.checked ? 'Films' : 'Music';
            this._resultsSection.innerHTML = '';
            this._infoSection.innerHTML = '';
            this.selectedRelease = null;
            this._resultsSection.classList.toggle('films-results', switchInput.checked);
            knob.style.left = switchInput.checked ? '30px' : '2px';
            audioText.classList.toggle('switch-active-text', !switchInput.checked);
            filmText.classList.toggle('switch-active-text', switchInput.checked);
            this.renderSearchFields();
        };
        switchInput.onchange = updateSwitch;
        slider.onclick = (event) => {
            switchInput.checked = !switchInput.checked;
            updateSwitch();
            event.preventDefault();
        };
        switchLabel.append(audioText, slider, filmText, switchInput);
        switchContainer.appendChild(switchLabel);
        switchGroup.appendChild(switchContainer);
        updateSwitch();
        return switchGroup;
    },

    renderSearchFields() {
        this._fieldsContainer.innerHTML = '';
        this._infoSection.innerHTML = '';

        let fields = this.appState.search_type === 'Films' ? this.filmSearchFields : this.musicSearchFields;
        let rowDiv = null;
        fields.forEach((f, idx) => {
            if (idx % 3 === 0) {
                rowDiv = document.createElement('div');
                rowDiv.className = 'search-row';
                this._fieldsContainer.appendChild(rowDiv);
            }
            let fieldWrap = document.createElement('div');
            fieldWrap.className = 'search-field-wrap';

            let input = document.createElement('input');
            input.type = 'text';
            input.placeholder = f.placeholder;
            input.className = 'settings-input';
            input.value = f.value || "";

            let clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'search-clear-button';
            clearBtn.title = 'Clear field';
            clearBtn.innerHTML = '✕';
            clearBtn.onclick = () => {
                input.value = '';
                f.value = undefined;
                clearBtn.classList.remove('active');
                input.focus();
            };

            const updateClearBtn = () => {
                const hasValue = String(input.value || '').trim().length > 0;
                clearBtn.classList.toggle('active', hasValue);
            };
            input.addEventListener('input', updateClearBtn);
            updateClearBtn();

            fieldWrap.appendChild(input);
            fieldWrap.appendChild(clearBtn);
            rowDiv.appendChild(fieldWrap);
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
    },
    
    renderSearchResults: function(results) {
        this._resultsSection.innerHTML = '';
        this._infoSection.innerHTML = '';

        let columns = this.appState.search_type === 'Films' ? this.FILMS_LIST : this.MUSIC_LIST;
        let flattened = results.map((result, index)=>{
            let row = ListRenderer.flattenItem(
            columns,
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
            columns: columns,
            compact: false,
            onRowClick: (row, target) => {
                if (this.appState.search_type === 'Music') {
                    this.fetchReleaseInfo(row.release_id);
                }
                Array.from(this._resultsSection.querySelectorAll('tr')).forEach(tr=>tr.classList.remove('collection-row-active'));
                target.classList.add('collection-row-active');
            }
        }).render(this._resultsSection);
        
    },

    search: function() {
        // Save search values for persistence
        let fields = this.appState.search_type === 'Films' ? this.filmSearchFields : this.musicSearchFields;
        fields.forEach(f => {f.value = this[f.ref].value;});
        let isFilmSearch = this.appState.search_type === 'Films';
        if (isFilmSearch && !this.appState.tmdb_token || !isFilmSearch && !this.appState.token) {
            uiFeedback.showStatus("Search works only if access token is provided!", "warning");
            return;
        };
        this._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">Searching...</div>';
        let url = isFilmSearch ? 'https://api.themoviedb.org/3/search/movie' : 'https://api.discogs.com/database/search?type=release';
        let query = {};
        fields.forEach(f => {
            const val = this[f.ref] && this[f.ref].value;
            if (val) {
                if (isFilmSearch) query[f.param] = val;
                else url += `&${f.param}=${encodeURIComponent(val)}`;
            }
        });
        let request = isFilmSearch
            ? this.appState.TMDB.call(url, 'GET', query)
            : this.appState.API.call(url);
        request.then(data => {
            let results = Array.isArray(data) ? data : data.results;
            if (!results || results.length === 0) {
                this._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">No results found.</div>';
                return;
            }
            this.renderSearchResults(results);
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