'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { Utils } from '../misc/Utils.js';

let Page = {
    SEARCH_LIST : [
        { name: 'release_id', path: 'result.id', render: row => `<a href="https://www.discogs.com/release/${row.release_id}" target="_blank">${row.release_id}</a>`, maxwidth: '90px'},
        { name: 'release_thumb', path: 'result.thumb', render: row=>{
                return `<img src="${row.release_thumb}" style="width:50px;">`
            }
        },
        { name: 'release_year', path: 'result.year', maxwidth: '80px'},
        { name: 'release_country', path: 'result.country', maxwidth: '100px'},
        { name: 'release_format', path: 'result.format', maxwidth: '180px', render: (row)=>{
            return row['release_format'].join(", ")
        }}, //[]
        { name: 'release_genre', path: 'result.genre', maxwidth: '180px', render: (row)=>{
            return row['release_genre'].join(", ")
        }}, // []
        { name: 'release_style', path: 'result.style', maxwidth: '180px', render: (row)=>{
            return row['release_style'].join(", ")
        }}, // []
        { name: 'release_title', path: 'result.title'},
        { name: 'release_having', path: 'result.community.have'},
        { name: 'release_wanting', path: 'result.community.want'},
        { name: 'release_have', path: 'result.user_data.in_collection'},
        { name: 'release_want', path: 'result.user_data.in_wantlist'},
    ],

    App : null,
    searchResults: [],
    searchFilters: [], // Store filter values for ListRenderer
    selectedRelease: null,
    init : function(App) {
        Page.App = App;
    },

    render: function(parent) {
        parent.innerHTML = '';
        // Search block
        let searchBlock = document.createElement('div');
        searchBlock.className = 'release-search-block';
        // Use a config array for inputs
        const searchFields = [
            { placeholder: 'Title', ref: 'inputTitle' },
            { placeholder: 'Artist', ref: 'inputArtist' },
            { placeholder: 'Barcode', ref: 'inputBarcode' }
        ];
        searchFields.forEach(f => {
            let input = document.createElement('input');
            input.type = 'text';
            input.placeholder = f.placeholder;
            input.className = 'settings-input';
            searchBlock.appendChild(input);
            Page[f.ref] = input;
        });
        let searchBtn = document.createElement('button');
        searchBtn.innerText = 'Search';
        searchBtn.className = 'settings-button';
        searchBtn.onclick = () => {
            Page.search(
                Page.inputTitle.value,
                Page.inputArtist.value,
                Page.inputBarcode.value
            );
        };
        searchBlock.appendChild(searchBtn);
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
        Page._resultsSection = resultsSection;
        Page._infoSection = infoSection;
    },
    
    renderSearchResults(results) {
        Page._resultsSection.innerHTML = '';

        let flattened = results.map((result, index)=>{
            let row = ListRenderer.flattenItem(
                Page.SEARCH_LIST,
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
            columns: Page.SEARCH_LIST,
            parent: Page._resultsSection,
            compact: false,
            filters: Page.searchFilters,
            onFiltersChange: (filters) => {
                Page.searchFilters = filters.slice();
            },
            onRowClick: (row, target) => {
                Page.fetchReleaseInfo(row.release_id);
                Array.from(Page._resultsSection.querySelectorAll('tr')).forEach(tr=>tr.classList.remove('collection-row-active'));
                target.classList.add('collection-row-active'); // +1 for header row
            }
        });
    },

    search: function(title, artist, barcode) {
        Page._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">Searching...</div>';
        let url = 'https://api.discogs.com/database/search?type=release';
        if (title) url += `&release_title=${encodeURIComponent(title)}`;
        if (artist) url += `&artist=${encodeURIComponent(artist)}`;
        if (barcode) url += `&barcode=${encodeURIComponent(barcode)}`;
        Page.App.API.call(
            url,
            data => {
                if (data.results.length === 0) {
                    Page._resultsSection.innerHTML = '<div style="font-size:18px;color:#888">No results found.</div>';
                    return;
                }
                Page.renderSearchResults(data.results);
            }
        );
    },

    fetchReleaseInfo: function(releaseId) {
        Page._infoSection.innerHTML = '<div style="font-size:18px;color:#888">Loading release info...</div>';
        Page.App.API.call(
            `https://api.discogs.com/releases/${releaseId}`,
            data => {
                Page.selectedRelease = data;
                Page.renderReleaseInfo();
            }
        );
    },

    renderReleaseInfo: function() {
        const data = Page.selectedRelease;
        if (!data) {
            Page._infoSection.innerHTML = '';
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
            html += `<tr><td>${col.name}</td><td>${ListRenderer.extract_list_value(data, col.path)}</td></tr>`;
        });
        html += `<tr><td>label</td><td>${(data.labels||[]).map(l=>l.name).join(', ')}</td></tr>`;
        html += "</table>"

        html += '<table class="collection-table release-info-table">';
        html += `<tr><th colspan="3">Tracklist</th></tr>`;
        (data.tracklist||[]).forEach(raw_track => {
            let track_artist = (
                Utils.unify_name(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
                Utils.unify_name(data.artists_sort)
            );
            raw_track.artist = track_artist;

            let track_title = raw_track.title;
            let track_code = Utils.getTrackCode(track_artist, track_title, Page.App.matching_type);
            let track_id = App.collection.tracks_by_code[track_code];
            let list_refs="";
            if (track_id!==undefined) {
                list_refs = "<ul><li>";
                list_refs+= Page.App.collection.tracks[track_id].refs.map((ref)=>{
                    return `(${ref.release_id}) ${ref.format} :: ${ref.artist} - ${ref.title} [${ref.track_position} // ${ref.duration}]`;
                }).join("</li><li>")
                list_refs += "</li></ul>";
            };
            html += `<tr><td>${raw_track.position}</td><td>${raw_track.title} <span style='color:#888'>${raw_track.duration||''}</span><td>${list_refs}</td></td></tr>`;
        });
        html += '</table>';
        Page._infoSection.innerHTML = html;
    }
}

export {Page};