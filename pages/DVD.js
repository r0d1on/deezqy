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
        {name: "details", path: "details", render:false},
        {name: "release_score", path: "film.vote_average", render:false},

        {name: "raw_folder", path: (row, ctx)=>{
                return Object.keys(ctx.film.folders).map((folder_id)=>{
                    return ctx.folders[folder_id].name;
                }).join(";")
            }, render:false},

        {name: "folder", path: (row, ctx)=>{
                return Object.keys(ctx.film.folders).map((folder_id)=>{
                    const folder_name = ctx.folders[folder_id].name;
                    return `<a href="https://www.themoviedb.org/list/${folder_id}-${folder_name}">${folder_name}<a/>`
                }).join("; ")
            }, filter:"<>", filter_source:"raw_folder", sortable:true, maxwidth:"80px"},

        {name: "release_id", path: "film.id0", filter:"", sortable:true, maxwidth:"90px", render: (row)=>{
            return `<a href="https://www.themoviedb.org/${row['film_format']}/${row['release_id']}" target="_blank">${row['release_id']}</a>`;
        }},

        {name: "film_format", sortable:true, filter:"<>", path: (row, ctx)=>{
            return row.film.media_type;
        }, maxwidth:"70px", extended:false},

        {name: "film_poster", path: "film.poster_path", maxwidth:"85px", render: (row)=>{
            return `<a href="${row.details.homepage}"><img style="width:80px;" src="https://media.themoviedb.org/t/p/w300_and_h450_face/${[row['film_poster']]}"/></a>`
        }},

        {name: "film_thumb", path: "film.backdrop_path", maxwidth:"85px", render: (row)=>{
            return `<a href="https://www.imdb.com/title/${row.details.imdb_id}/"><img style="width:80px;" src="https://media.themoviedb.org/t/p/w300_and_h450_face/${[row['film_thumb']]}"/></a>`
        }},

        {name: "film_title", sortable:true, filter:"", path: (row, ctx)=>{
            return row.film.title || row.film.name
        }, maxwidth:"250px", extended:false},

        {name: "film_date", sortable:true, filter:"", path: (row, ctx)=>{
            return row.film.release_date || row.film.first_air_date;
        }, maxwidth:"120px", extended:false},

        {name: "film_rating", sortable:true, path: "film.vote_average", filter:"", maxwidth:"80px"},

        {name: "film_t", sortable:true, path: "details.runtime", filter:"", maxwidth:"40px"},

        {name: "film_notes", sortable:true, filter:"", path: (row, ctx)=>{
            let notes = (row.film.comments||[]);
            return (notes.length>0)?notes.join("<br>"):"";
        }, maxwidth:"120px", extended:false},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "film_genres", path: "details.genres", filter:"", maxwidth:"150px"},
        {name: "film_mark", path: ()=>'⬜', filter:"<>", maxwidth:"78px"},
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

        // Normalise details
        this.appState.films.details = structuredClone(this.appState.data.dvd_details);

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
                    "details": Page.appState.films.details[film_id],
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

    downloadDetails: function(update) {
        if (update) {
            Page.appState.data.dvd_details = Page.appState.data.dvd_details || {};
        } else {
            Page.appState.data.dvd_details = {};
        };

        // increment: required details
        let details = new Set(Object.keys(Page.appState.data.dvd_details));
        let items = new Set(Object.keys(Page.appState.data.dvd_items));
        let deleted = details.difference(items);
        let needed = items.difference(details);

        // decrement: obsolete details
        deleted.forEach(id=>{
            delete Page.appState.data.dvd_details[id];
        });
        if (deleted.size || needed.size)
            alert(`Pending updates: new = ${needed.size} , deleted = ${deleted.size}`);

        Page.appState.progress(`Loading DVD details`, 0, needed.size);

        Page.appState._needed = Array.from(needed);

        let getter = (resolve) => {
            let item = Page.appState._needed.pop();
            item = this.appState.data.dvd_items[item];
            let call = null;

            if (item.media_type=="movie") {
                call = Page.appState.TMDB.call(
                `https://api.themoviedb.org/3/movie/${item.id0}`,"GET"
                )
            } else if (item.media_type=="tv") {
                call = Page.appState.TMDB.call(
                `https://api.themoviedb.org/3/tv/${item.id0}`,"GET"
                )
            };

            call.then(r => {
                Page.appState.progress(`Loading DVD details`,-1);
                r.id = `${item.media_type}:${r.id}`;

                r = Page.appState.data.dvd_details[r.id]||(Page.appState.data.dvd_details[r.id] = r);

                r.genres = r.genres.map((g)=>{
                    return g.name;
                }).join(" ; ");

                if (Page.appState._needed.length) {
                    setTimeout(()=>{getter(resolve)}, 800);
                } else {
                    resolve();
                }
            });
        }

        if (Page.appState._needed.length) {
            return new Promise((resolve, d)=>{
                getter(resolve);
            })
        } else {
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 100)})
        }
    },

    downloadFilms: function() {
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
                data.results.map((item, i)=>{
                    item.id0 = item.id;
                    item.id = `${item.media_type}:${item.id}`

                    let r = Page.appState.data.dvd_items[item.id] || (Page.appState.data.dvd_items[item.id] = item);

                    r.folders = r.folders || {};
                    r.folders[folder.id] = r.folders[folder.id] || 1;
                    r.comments = r.comments || [];
                    let c = data.comments[r.id];
                    if (c)
                        r.comments.push(c);
                    
                    r.genres = r.genre_ids.map((i)=>{
                        return (this.appState.data.dvd_genres[i]||{name:i}).name;
                    }).join(" ; ");
                    r.i =i;
                });

                if (Page.appState._folders.length) {
                    setTimeout(()=>{getter(resolve)}, 800);
                } else {
                    resolve();
                }
            });
        }

        if (Page.appState._folders.length) {
            return new Promise((resolve, d)=>{
                getter(resolve);
            })
        } else {
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 100)})
        }
    },

    downloadFolders : function(userid) {
        return this.appState.TMDB.call(
            `https://api.themoviedb.org/3/account/${userid}/lists`,
            "GET", {"session_id": appState.tmdb_session, },
            (stage, stages)=>{
                this.appState.progress("Loading DVD folders", stage, stages);
            }                
        ).then(data => {
            this.appState.data.dvd_folders = Page.appState.make_index(data.results);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        });
    },
 
    downloadGenres: function() {
        return this.appState.TMDB.call(
            `https://api.themoviedb.org/3/genre/movie/list`,
            "GET", {"session_id": appState.tmdb_session, },
            (stage, stages)=>{
                this.appState.progress("Loading movie genres", stage, stages);
            }                
        ).then(data => {
            this.appState.data.dvd_genres = Page.appState.make_index(data.genres);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        });
    },

    downloadData: function(update) {
        if (!this.appState.tmdb_username) {
            uiFeedback.showStatus("DB update works only if TMDB credentials authenticated!", "warning");
            return;
        };
        const userid = this.appState.tmdb_username.split(":")[1];

        this.downloadGenres()
        .then(()=>{
            return Page.downloadFolders(userid);
        }).then(()=>{
            return Page.downloadFilms();
        }).then(()=>{
            uiFeedback.showStatus("Films loaded", 'success')            
            return Page.downloadDetails(update);
        }).then(()=>{
            uiFeedback.showStatus("Film details loaded", 'success')            
            return Page.saveData("DVD data saved");
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
            compact: false,
            filters: Page.listFilters,
            sort: Page.listSort,

            onFiltersChange: (filters, sortby) => {
                Page.listFilters = {...filters};
                Page.listSort = sortby;
            },
            onRowClick: (row, target) => {
                row.film_mark = row.film_mark == '⬜' ? '🟩' : '⬜'; // 🟥
                (appState.Pages.DVD.renderer)&&(appState.Pages.DVD.renderer.filters.film_mark.cached=undefined);
                Page.render(Page._last_parent);
            },
            onRowDblCLick: function(row, target) {
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
        buttonReload.onclick = (e)=>this.downloadData();
        controls.appendChild(buttonReload);

        let buttonUpdate = document.createElement("button");
        buttonUpdate.innerText = "Update";
        buttonUpdate.className = "settings-button";
        buttonUpdate.onclick = (e)=>this.downloadData(true);
        controls.appendChild(buttonUpdate);

        parent.appendChild(controls);
        parent.appendChild(document.createElement("hr"));

        let list_view = document.createElement("div");
        list_view.className="collection-container";
        this.render_list(list_view);
        parent.appendChild(list_view);
    }

}

export { Page };