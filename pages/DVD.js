'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { uiFeedback } from '../misc/uiFeedback.js';

/**
 * DVD Page Module
 * @module PageDVD
 */
const Page = {
    /** @type {object} */

    appState: null,
    renderer: null,

    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState || this.appState;
        appState = this.appState;
        this.renderer = null;
        Page.normalise();
    },

    LIST : [
        {name: "id", path: (row, ctx)=>ctx.film.id, render:false},

        {name: "film", path: "film", render:false},

        {name: "release_score", path: "film.vote_average", render:false},

        {name: "folder", path: (row, ctx)=>{
                return Object.keys(ctx.film.folders).map((folder_id)=>{
                    const folder_name = ctx.folders[folder_id].name;
                    return `<a href="https://www.themoviedb.org/list/${folder_id}-${folder_name}">${folder_name}<a/>`
                }).join("; ")
            }, filter:"", sortable:true, maxwidth:"80px"},

        {name: "release_id", path: "film.id", filter:"", sortable:true, maxwidth:"90px", render: (row)=>{
            return `<a href="https://www.themoviedb.org/${row['film_format']}/${row['release_id']}" target="_blank">${row['release_id']}</a>`;
        }},

        {name: "film_format", sortable:true, filter:"", path: (row, ctx)=>{
            return row.film.media_type;
        }, maxwidth:"60px", extended:false},

        {name: "film_poster", path: "film.poster_path", maxwidth:"85px", render: (row)=>{
            return `<img style="width:80px;" src="https://media.themoviedb.org/t/p/w300_and_h450_face/${[row['film_poster']]}"/>`
        }},

        {name: "film_thumb", path: "film.backdrop_path", maxwidth:"85px", render: (row)=>{
            return `<img style="width:80px;" src="https://media.themoviedb.org/t/p/w300_and_h450_face/${[row['film_thumb']]}"/>`
        }},

        {name: "film_title", sortable:true, filter:"", path: (row, ctx)=>{
            return row.film.title || row.film.name
        }, maxwidth:"250px", extended:false},

        {name: "film_date", sortable:true, filter:"", path: (row, ctx)=>{
            return row.film.release_date || row.film.first_air_date;
        }, maxwidth:"120px", extended:false},

        {name: "film_rating", sortable:true, path: "film.vote_average", filter:"", maxwidth:"80px"},

        {name: "film_notes", sortable:true, filter:"", path: (row, ctx)=>{
            let notes = (row.film.comments.notes||[]);
            return (notes.length>0)?notes.join("<br>"):"-";
        }, maxwidth:"120px", extended:false},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "film_genres", path: "film.genres", filter:"", maxwidth:"150px"},
    ],

    getColumns : function() {
        return this.LIST.filter((e)=>{
            return (Page.appState.columns_set == "extended")||(!!!e.extended)
        })
    },

    normalise : function() {
        if ((this.appState.data==undefined)||(this.appState.data.dvd_items==undefined)||(
            Object.keys(this.appState.data.dvd_items).length == 0
        )) {
            return;
        }

        this.appState.films = {};

        // Normalise folders
        this.appState.films.folders = structuredClone(this.appState.data.dvd_folders);

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        this.appState.progress(`Normalising dvd collection`, 0, Object.keys(this.appState.data.dvd_items).length);
        this.appState.films.list = [];

        let i = 0;
        let trackr = () => {
            let src = structuredClone(Page.appState.data.dvd_items);
            let r_ids = Object.keys(src);
            if (i < r_ids.length) {
                Page.appState.progress(`Normalising dvd collection`, i);
                let film_id = r_ids[i];

                // add flattened film info into dvd list
                let context = {
                    "folders": Page.appState.films.folders,
                    "film": src[film_id],
                };
                let list_item = ListRenderer.flattenItem(Page.getColumns(), context);
                Page.appState.films.list.push(list_item);
                i += 1;
                setTimeout(trackr, 1);

            } else {
                Page.appState.films.list.sort((a, b) => {
                    if (a.film.i < b.film.i) return -1;
                    if (a.film.i > b.film.i) return 1;
                    return 0;
                });

                if (appState.ui.activeMenu.name in {"DVD":1}) {
                    Page.appState.renderContent();
                };
                appState.Pages.DVD.renderer = null;
                Page.appState.progress(`Normalising dvd collection`);
                Page._working = false;
                uiFeedback.showStatus(`DVD list loaded`, 'success');
            };
        };
        trackr();
    },

    saveData : function(message) {
        return this.appState.save_db(
        ).then(()=>{
            return this.appState.restore_db();
        }).then(()=>{
            this.init();
            (message)&&(uiFeedback.showStatus(message, 'success'));
            return new Promise((r,d)=>{r()});
        });
    },

    downloadFilms: function(userid) {
        Page.appState.data.dvd_items = {};

        Page.appState._folders = Object.keys(this.appState.data.dvd_folders).map((k)=>{
            return this.appState.data.dvd_folders[k];
        });

        let getter = (resolve) => {
            let folder = Page.appState._folders.pop();
            Page.appState.TMDB.call(
                `https://api.themoviedb.org/4/list/${folder.id}`,
                "GET", {"session_id": appState.tmdb_session, },
                (stage, stages)=>{
                    Page.appState.progress(`Loading DVD folder ${folder.name}`, stage, stages);
                }
            ).then(data => {
                data.results.map((r, i)=>{
                    if (r.id in Page.appState.data.dvd_items) {
                        r = Page.appState.data.dvd_items[r.id]
                    } else {
                        Page.appState.data.dvd_items[r.id] = r;
                    };
                    r.folders = r.folders || {};
                    r.folders[folder.id] = r.folders[folder.id] || 1;
                    r.comments = r.comments || [];
                    let c = data.comments[`movie:${r.id}`];
                    if (c)
                        r.comments.push(data.name + " : " + c);
                    
                    r.genres = r.genre_ids.map((i)=>{
                        return (this.appState.data.dvd_genres[i]||{name:i}).name;
                    }).join(" ; ");
                    r.i =i;
                });

                if (Page.appState._folders.length) {
                    setTimeout(()=>{getter(resolve)}, 800);
                } else {
                    Page.saveData("Films loaded").then(resolve);
                }
            });
        }

        if (Page.appState._folders.length) {
            return new Promise((resolve, d)=>{
                getter(resolve);
            })
        } else {
            return Page.saveData();
        }

    },

    downloadFolders : function(userid) {
        this.appState.TMDB.call(
            `https://api.themoviedb.org/3/account/${userid}/lists`,
            "GET", {"session_id": appState.tmdb_session, },
            (stage, stages)=>{
                this.appState.progress("Loading DVD folders", stage, stages);
            }                
        ).then(data => {
            console.log(data);
            this.appState.data.dvd_folders = Page.appState.make_index(data.results);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        }).then(()=>{
            return Page.downloadFilms(userid);
        });
    },
 
    downloadGenres: function() {
        if (!this.appState.tmdb_username) {
            uiFeedback.showStatus("DB update works only if TMDB credentials authenticated!", "warning");
            return;
        };
        const userid = this.appState.tmdb_username.split(":")[1];

        this.appState.TMDB.call(
            `https://api.themoviedb.org/3/genre/movie/list`,
            "GET", {"session_id": appState.tmdb_session, },
            (stage, stages)=>{
                this.appState.progress("Loading movie genres", stage, stages);
            }                
        ).then(data => {
            console.log(data);
            this.appState.data.dvd_genres = Page.appState.make_index(data.genres);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        }).then(()=>{
            return Page.downloadFolders(userid);
        });
    },

    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((this.appState.films==undefined)||(this.appState.films.list==undefined)) {
            return;
        };

        this.renderer = this.renderer || new ListRenderer({
            data: this.appState.films.list,
            columns: Page.appState.Pages.DVD.getColumns(),
            compact: true,
            filters: Page.listFilters,
            sort: Page.listSort,

            onFiltersChange: (filters, sortby) => {
                Page.listFilters = filters.slice();
                Page.listSort = sortby;
            },
            onRowClick: (row, target) => {
                let clicker = target.querySelector(".clicker span");
                (clicker)&&(clicker.switch({target:clicker}));
            },
            onRowDblCLick: function(row, target) {
                let clicker = target.querySelector(".clicker span");
                if (clicker==null)
                    return;
            },
            onScore: (score, rows)=>{
                Page.appState.score = score;
                Page.appState.rowCount = rows;
                Page.appState.progress(-1);
            }
        });
        this.renderer.render(parent_div);

    },

    render : function(parent) {
        Page._last_parent = parent;
        parent.innerHTML = "";

        let controls = document.createElement("div");
        controls.className = "collection-controls";
        
        let buttonReload = document.createElement("button");
        buttonReload.innerText = "Reload";
        buttonReload.className = "settings-button";
        buttonReload.onclick = (e)=>this.downloadGenres();
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