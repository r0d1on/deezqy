'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { Utils } from '../misc/Utils.js';
import { uiFeedback } from '../misc/uiFeedback.js';

/**
 * Collection Page Module
 * @module PageCollection
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

        this.appState.collection = {};
        this.appState.collection.tracks_by_code = {};
        this.appState.collection.tracks = {};
        this.renderer = null;

        Page.normalise();
    },

    LIST : [
        {name: "id", path: (row, ctx)=>`${ctx.release.id}-${ctx.track.id}`, render:false},
        {name: "release", path: "release", render:false},
        {name: "track", path: "track", render:false},

        {name: "release_folder", path: "folder.name", filter:"", sortable:true, maxwidth:"90px", render: (row)=>{
            return row['release_folder'].toLowerCase().replace("uncategorized","*");
        }},

        {name: "release_id", path: "release.id", filter:"", sortable:true, maxwidth:"90px", render: (row)=>{
            return `<a href="https://www.discogs.com/release/${row['release_id']}" target="_blank">${row['release_id']}</a>`;
        }},

        {name: "release_format", path: "release.format", filter:"", maxwidth:"65px", render: (row)=>{
            return row['release_format'].toLowerCase().replace("|","\n");
        }},

        {name: "release_thumb", path: "release.basic_information.thumb", maxwidth:"65px", render: (row)=>{
            return `<img style="width:60px;" src="${[row['release_thumb']]}"/>`
        }},
        {name: "release_artist", path: "release.details.artists_sort", filter:"", maxwidth:"150px"},
        {name: "release_title", path: "release.details.title", filter:"", maxwidth:"250px"},
        {name: "release_rating", path: "release.rating", filter:"", maxwidth:"80px", render: (row)=>`&gt; ${row['release_rating']} &lt;`},
        {name: "release_score", sortable:true, path: (row, ctx)=>{
            // calculate release "uniqueness" - fraction of unreferenced tracks in it
            let scores = ctx.release.details.tracklist.map((track)=>{
                if (!(track.id in Page.appState.collection.tracks)) {
                    return 1; // special tracks are always "unique"
                } else {
                    let unique = !(Page.appState.collection.tracks[track.id].refs.some((ref)=>{
                        if (ctx.release.id==ref.release_id)
                            return false;
                        if (ref.folder=="wanted")
                            return false;
                        let delta = Utils.durationDiff(ref.duration, track.duration);
                        return ((delta <= 25)||(delta == 1/0));
                    }));
                    return unique;
                };
            });
            ctx.release.score = scores.reduce((p, c) => p + c, 0) / ctx.release.details.tracklist.length;
            ctx.release.score = Math.round(ctx.release.score * 1000) / 10;
            return ctx.release.score
        }, post:true, maxwidth:"80px"},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "track_artist", path: "raw_track.artist", filter:"", maxwidth:"150px"},
        {name: "track_position", path: "raw_track.position", maxwidth:"80px"},
        {name: "track_name", path: "track.title", filter:"", maxwidth:"250px"},
        {name: "track_time", path: "raw_track.duration", maxwidth:"80px"},

        {name: "track_seen", path: (row, ctx)=>{
            let refs = row.track.refs;
            if ((refs===undefined)||(refs.length==0)) return;

            let html = "";
            refs.filter(ref=>{
                return ref.release_id != row.release_id;
            }).forEach((ref, ix)=>{
                if (ix > 0)
                    html += "<br>";
                let diff = Utils.durationDiff(row.track_time, ref.duration);
                let color = "blue";
                if (diff == (1/0)) {
                    color = "gray";
                } else if (diff > 25) {
                    color = "red";
                }
                html += `<b title="${ref.duration}" style="color:${color}"><small>[${ref.duration}]</small></b> `;
                if (ref.folder=="wanted")
                    html += `<b title="${ref.artist}">🔍<small style="color:red;">${ref.format} : ${ref.title}</small></b>`;
                else
                    html += `<b title="${ref.artist}"><small><a href="#${ref.release_id}">${ref.format}</a> : ${ref.title}</small></b>`;
            });

            return html;
        }, post:true},
    ],

    normalise : function({folder, list}={folder: "releases", list: "list"}) {
        if ((this.appState.data==undefined)||(this.appState.data.release_details==undefined)||(
            Object.keys(this.appState.data.release_details).length == 0
        )) {
            return;
        }

        if (this._working) {
            setTimeout(
                ((p)=>{
                    return ()=>{Page.normalise(p)}
                })({folder: folder, list: list})
                ,500
            );
            return;
        };
        this._working = true;

        if (folder=="releases")
            Page.normalise({folder : "wanted", list : "wanted_list"});

        // Normalise folders
        this.appState.collection['folders'] = structuredClone(this.appState.data.folders);

        // Normalise releases
        this.appState.collection[folder] = {};
        Object.keys(this.appState.data[folder]).forEach((id)=>{
            let item_cpy = structuredClone(this.appState.data[folder][id]);
            item_cpy.basic_information.title = Utils.unifyName(item_cpy.basic_information.title);
            this.appState.collection[folder][item_cpy.id] = item_cpy;
        });

        // Inject release details into releases
        Object.keys(this.appState.data[folder]).forEach((id)=>{
            let item_cpy = structuredClone(this.appState.data.release_details[id]);
            item_cpy.title = Utils.unifyName(item_cpy.title);
            item_cpy.artists_sort = Utils.unifyName(item_cpy.artists_sort);
            if (item_cpy.id in this.appState.collection[folder])
                this.appState.collection[folder][item_cpy.id]['details'] = item_cpy;
        });

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        this.appState.progress(0, Object.keys(this.appState.collection[folder]).length, `Normalising the collection [${folder}]`);
        this.appState.collection[list] = [];

        let i = 0;
        let trackr = () => {
            let src = Page.appState.collection[folder];
            let r_ids = Object.keys(src);
            if (i < r_ids.length) {
                Page.appState.progress(i);
                let release_id = r_ids[i];
                let release = src[release_id];
                let format = release.basic_information.formats.map(e=>e.name).join("|")
                release.format = format;

                let loadTrack = (raw_track)=>{
                    let track_artist = (
                        Utils.unifyName(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
                        release.details.artists_sort
                    );
                    raw_track.artist = track_artist;

                    let track_title = raw_track.title;
                    let track_code = Utils.getTrackCode(track_artist, track_title, Page.appState.matching_type);

                    let id = Page.appState.collection.tracks_by_code[track_code];
                    if (id === undefined) {
                        id = Object.keys(Page.appState.collection.tracks_by_code).length + 1;
                        Page.appState.collection.tracks_by_code[track_code] = id;
                        Page.appState.collection.tracks[id] = {
                            id: id,
                            title: track_title,
                            artist: track_artist,
                            code: track_code,
                            refs : []
                        };
                    };
                    let track = Page.appState.collection.tracks[id];
                    
                    track[folder] = track[folder] || [];
                    track[folder].push(release_id);
                    track.refs.push({
                        release_id: release_id,
                        track_position: raw_track.position,
                        artist: track_artist,
                        format: format,
                        title: release.details.title,
                        duration: raw_track.duration,
                        folder: folder,
                    });

                    raw_track.id = id;
                    raw_track.refs = track.refs;

                    // add flattened track info into collection items list
                    let context = {
                        "folder": Page.appState.collection.folders[release.folder_id]||{name:`${release.folder_id||"---"}`},
                        "release": release,
                        "track": track,
                        "raw_track": raw_track
                    };
                    let list_item = ListRenderer.flattenItem(Page.LIST, context);
                    Page.appState.collection[list].push(list_item);
                };

                release.details.tracklist.forEach((raw_track)=>{
                    if (raw_track.type_=='heading') return;
                    if (raw_track.type_=="index") 
                        raw_track.sub_tracks.forEach(loadTrack)
                    else
                        loadTrack(raw_track);
                });
                i += 1;
                setTimeout(trackr, 1);

            } else {
                Page.appState.collection[list].sort((a, b) => {
                    if (a.release.date_added < b.release.date_added) return 1;
                    if (a.release.date_added > b.release.date_added) return -1;
                    return 0;
                });                
                
                if (appState.ui.activeMenu.name in {"Wanted":1,"Collection":1, "Analytics":1}) {
                    Page.appState.renderContent();
                };
                appState.Pages.Collection.renderer = null;
                appState.Pages.Wanted.renderer = null;
                Page.appState.progress();
                Page._working = false;
                uiFeedback.showStatus(`${folder} list loaded`, 'success');
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

    downloadTracks : function(update) {
        if (update) {
            Page.appState.data['release_details'] = Page.appState.data['release_details'] || {};
        } else {
            Page.appState.data['release_details'] = {};
        };

        // increment: required details
        let details = new Set(Object.keys(Page.appState.data.release_details));
        let releases = (
            new Set(Object.keys(Page.appState.data.releases))
            .union(new Set(Object.keys(Page.appState.data.wanted)))
        );

        let deleted = details.difference(releases);
        let needed = releases.difference(details);

        // decrement: obsolete details
        deleted.forEach(id=>{
            delete Page.appState.data.release_details[id];
        });

        if (deleted.size||needed.size)
            alert(`Pending updates: new = ${needed.size} , deleted = ${deleted.size}`);

        Page.appState.progress(0, needed.size, "Loading release details");

        Page.appState._needed = Array.from(needed);

        let getter = (resolve) => {
            let ix = Page.appState._needed.length;
            let release_id = Page.appState._needed.pop();
            Page.appState.API.call(
                `https://api.discogs.com/releases/${release_id}`
            ).then(data => {
                Page.appState.data.release_details[data.id] = data;
                Page.appState.progress(ix);
                if (Page.appState._needed.length) {
                    setTimeout(()=>{getter(resolve)}, 800);
                } else {
                    Page.saveData("Tracks loaded").then(resolve);
                }
            });
        }

        if (Page.appState._needed.length) {
            return new Promise((resolve,d)=>{
                getter(resolve);
            })
        } else {
            return Page.saveData();
        }
    },

    downloadData : function(update) {
        if (!this.appState.username) {
            uiFeedback.showStatus("DB update works only if user name is provided!", "warning");
            return;
        };
        this.appState.API.call(
            `https://api.discogs.com/users/${this.appState.username}/collection/folders`
            ,(stage, stages)=>{
                this.appState.progress(stage, stages, "Loading folders");
            }
        )
        .then((v)=>{return new Promise((r,d)=>{setTimeout(()=>{r(v)}, 1000)})})
        .then((data)=>{
            this.appState.data['folders'] = Page.appState.make_index(data.folders);
            return this.appState.API.call(
                `https://api.discogs.com/users/${this.appState.username}/collection/folders/0/releases`
                ,(stage, stages)=>{
                    this.appState.progress(stage, stages, "Loading releases");
                }
            )
        })
        .then((v)=>{return new Promise((r,d)=>{setTimeout(()=>{r(v)}, 1000)})})
        .then((data)=>{
            this.appState.data.releases = Page.appState.make_index(data.releases);
            return new Promise((r,d)=>{setTimeout(()=>{r()}, 1000)})
        }).then(()=>{
            return Page.downloadTracks(update);
        }).then(()=>{
            if ((Page._last_parent)&&(Page.appState.ui.activeMenu.page==Page)) {
                Page.render(Page._last_parent);
            }
        });
    },
 
    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((this.appState.collection==undefined)||(this.appState.collection.list==undefined)) {
            return;
        }

        this.renderer = this.renderer || new ListRenderer({
            data: this.appState.collection.list,
            columns: Page.LIST,
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

                Page.appState.API.call(
                    `https://api.discogs.com/releases/${row.release_id}`
                ).then(data => {
                    // check if we can update detailed info on a release we have already
                    if (data.id in Page.appState.data.release_details) {
                        Page.appState.data.release_details[data.id] = data;
                        Page.appState.Pages.Collection.saveData(`Release details updated: ${data.title}`);
                    };
                });                
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