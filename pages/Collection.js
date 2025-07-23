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
    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState || this.appState;
        appState = this.appState;
        appState.data = {};
        appState.data['timestamp'] = 0;
        appState.data.folders = {};
        appState.data.releases = {};
        appState.data.release_details = {};

        if (appState.username) {
            appState.progress(0, 4, "Restoring user's cached data");
            Promise.all([
                appState.DB.get(appState.username),
                appState.DB.get(appState.username + ".folders"),
                appState.DB.get(appState.username + ".releases"),
                appState.DB.get(appState.username + ".release_details")
            ]).then(([
                timestamp,
                folders,
                releases,
                details
            ])=>{
                appState.data['timestamp'] = timestamp * 1;
                appState.data.folders = folders || [];
                appState.data.releases = releases || [];
                appState.data.release_details = details || [];

                if (Array.isArray(appState.data.folders))
                    appState.data.folders = Page.make_index(appState.data.folders);

                if (Array.isArray(appState.data.releases))
                    appState.data.releases = Page.make_index(appState.data.releases);

                if (Array.isArray(appState.data.release_details))
                    appState.data.release_details = Page.make_index(appState.data.release_details);

                appState.progress();
                this.normaliseCollection();
            });
        };
    },

    make_index : function(list) {
        return list.reduce((o, item)=>{
            o[item.id] = item;
            return o;
        }, {})
    },

    LIST : [
        {name: "release_folder", path: "folder.name", filter:"", maxwidth:"90px", render: (row)=>{
            return row['release_folder'].toLowerCase().replace("uncategorized","*");
        }},

        {name: "release_id", path: "release.id", filter:"", maxwidth:"90px", render: (row)=>{
            return `<a href="https://www.discogs.com/release/${row['release_id']}" target="_blank">${row['release_id']}</a>`;
        }},

        {name: "release_format", path: "release.format", filter:"", maxwidth:"65px", render: (row)=>{
            return row['release_format'].toLowerCase().replace("|","\n");
        }},

        {name: "release_thumb", path: "release.basic_information.thumb", maxwidth:"65px", render: (row)=>{
            return `<img style="width:60px;" src="${Page.appState.collection.releases[row['release_id']].basic_information.thumb}"/>`
        }},
        {name: "release_artist", path: "release.details.artists_sort", filter:"", maxwidth:"150px"},
        {name: "release_title", path: "release.details.title", filter:"", maxwidth:"250px"},
        {name: "release_rating", path: "release.rating", filter:"", maxwidth:"80px", render: (row)=>`&gt; ${row['release_rating']} &lt;`},
        {name: "release_score", path: "release.score", post:true, maxwidth:"80px"},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "track_artist", path: "raw_track.artist", filter:"", maxwidth:"150px"},
        {name: "track_position", path: "raw_track.position", maxwidth:"80px"},
        {name: "track_name", path: "track.title", filter:"", maxwidth:"250px"},
        {name: "track_time", path: "raw_track.duration", maxwidth:"80px"},

        {name: "track_seen", path: "track.refs", render: (row)=>{
            let refs = row.track_seen;
            if ((refs===undefined)||(refs.length==0)) return;

            let html = "";
            let first = true;

            refs.filter(ref=>{
                return ref.release_id != row.release_id;
            }).forEach((ref)=>{
                if (!first) 
                    html += "<br>";
                first = false;
                let time_this = row.track_time.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
                let time_that = ref.duration.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
                html += `<b style="color:${((Math.abs(time_this-time_that) < 10) ? 'blue':'red')}" title="${ref.duration}">♪</b> `;
                html += `<b><small><a href="#${ref.release_id}">${ref.format}</a> : ${ref.title}</small></b>`;
            });
            return html;
        }},

    ],

    normaliseCollection : function() {
        if ((this.appState.data==undefined)||(this.appState.data.release_details==undefined)) {
            return;
        }

        if (this._working) {
            setTimeout(this.normaliseCollection.bind(this), 500);
            return;
        };
        this._working = true;

        this.appState.collection = {};

        // Normalise folders
        this.appState.collection['folders'] = structuredClone(this.appState.data.folders);

        // Normalise releases
        this.appState.collection['releases'] = {};
        Object.keys(this.appState.data.releases).forEach((id)=>{
            let item_cpy = structuredClone(this.appState.data.releases[id]);
            item_cpy.basic_information.title = Utils.unifyName(item_cpy.basic_information.title);
            this.appState.collection['releases'][item_cpy.id] = item_cpy;
        });

        // Inject release details into releases
        Object.keys(this.appState.data.release_details).forEach((id)=>{
            let item_cpy = structuredClone(this.appState.data.release_details[id]);
            item_cpy.title = Utils.unifyName(item_cpy.title);
            item_cpy.artists_sort = Utils.unifyName(item_cpy.artists_sort);
            this.appState.collection['releases'][item_cpy.id]['details'] = item_cpy;
        });

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        this.appState.progress(0, Object.keys(this.appState.collection.releases).length, "Normalising the collection");
        this.appState.collection.tracks_by_code = {};
        this.appState.collection.tracks = {};
        this.appState.collection.list = [];

        let i=0;
        let trackr = () => {
            let r_ids = Object.keys(this.appState.collection.releases);
            if (i < r_ids.length) {
                this.appState.progress(i);
                let release_id = r_ids[i];
                let release = this.appState.collection.releases[release_id];
                let format = release.basic_information.formats.map(e=>e.name).join("|")
                release.format = format;

                let loadTrack = (raw_track)=>{
                    let track_artist = (
                        Utils.unifyName(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
                        release.details.artists_sort
                    );
                    raw_track.artist = track_artist;

                    let track_title = raw_track.title;
                    let track_code = Utils.getTrackCode(track_artist, track_title, this.appState.matching_type);

                    let id = this.appState.collection.tracks_by_code[track_code];
                    if (id === undefined) {
                        id = Object.keys(this.appState.collection.tracks_by_code).length + 1
                        this.appState.collection.tracks_by_code[track_code] = id;
                        this.appState.collection.tracks[id] = {
                            id: id,
                            title: track_title,
                            artist: track_artist,
                            code: track_code,
                            releases: [],
                            refs : []
                        };
                    };
                    let track = this.appState.collection.tracks[id];
                    
                    track.releases.push(release_id);
                    track.refs.push({
                        release_id: release_id,
                        track_position: raw_track.position,
                        artist: track_artist,
                        format: format,
                        title: release.details.title,
                        duration: raw_track.duration
                    });

                    raw_track.id = id;
                    raw_track.refs = track.refs;

                    // add flattened track info into collection items list
                    let context = {
                        "folder": this.appState.collection.folders[release.folder_id]||{name:`${release.folder_id||"---"}`},
                        "release": release,
                        "track": track,
                        "raw_track": raw_track
                    };
                    let list_item = ListRenderer.flattenItem(this.LIST, context);
                    this.appState.collection.list.push(list_item);
                };

                release.details.tracklist.forEach((raw_track)=>{
                    if (raw_track.type_=='heading') return;
                    if (raw_track.type_=="index") 
                        raw_track.sub_tracks.forEach(loadTrack)
                    else
                        loadTrack(raw_track);
                });
                i+=1;
                setTimeout(trackr, 1);

            } else {

                // calculate release "uniqueness" - fraction of unreferenced tracks in it
                Object.keys(this.appState.collection.releases).forEach(release_id=>{
                    let release = this.appState.collection.releases[release_id];
                    let scores = release.details.tracklist.map((track)=>{
                        if (!(track.id in this.appState.collection.tracks)) {
                            return 1;
                        } else {
                            return (this.appState.collection.tracks[track.id].releases.length == 1)*1
                        };
                    });
                    release.score = scores.reduce((p,c)=>p+c, 0) / release.details.tracklist.length;
                    release.score = Math.round(release.score*1000)/10;
                });

                // add "post" columns to the list
                this.LIST.forEach(col=>{
                    if (col.post) {
                        this.appState.collection.list.forEach((row)=>{
                            let release = this.appState.collection.releases[row.release_id];
                            row[col.name] = ListRenderer.extractListValue(
                                {
                                    "release": release
                                },
                                col.path
                            )                            
                        });
                    };
                });

                if ((this._last_parent)&&(this.appState.ui.activeMenu.page==this)) {
                    this.render(this._last_parent);
                }
                else {
                    let scores = this.appState.collection.list.map(row=>{
                        return [row.release_id, this.appState.collection.releases[row.release_id].score];
                    });
                    this.appState.score = scores.reduce((p,c)=>p+c[1], 0) / scores.length;
                    console.log("Collection average score: ", this.appState.score);
                }

                this.appState.rowCount = Object.keys(this.appState.data.releases).length;
                this.appState.progress();
                this._working = false;
                uiFeedback.showStatus('Collection loaded', 'success');
            };
        };
        trackr();
    },

    saveData : function(message) {
        this.appState.data['timestamp'] = Date.now();
        Promise.all([
            this.appState.DB.set(this.appState.username, this.appState.data['timestamp']),
            this.appState.DB.set(this.appState.username + ".folders", this.appState.data.folders),
            this.appState.DB.set(this.appState.username + ".releases", this.appState.data.releases),
            this.appState.DB.set(this.appState.username + ".release_details", this.appState.data.release_details)
        ]).then(()=>{
            this.normaliseCollection();
            if ((this._last_parent)&&(this.appState.ui.activeMenu.page==this)) {
                this.render(this._last_parent);
            };
            (message)&&(uiFeedback.showStatus(message, 'success'));
        });
    },

    downloadTracks: function(update) {
        if (update) {
            this.appState.data['release_details'] = this.appState.data['release_details'] || {};
        } else {
            this.appState.data['release_details'] = {};
        };

        // increment: required details
        let available = {};
        Object.keys(this.appState.data['release_details']).forEach((id)=>{available[id] = 1});
        this.appState._needed = Object.keys(this.appState.data['releases']).reduce((o, id)=>{
            if (id in available) {
                delete available[id];
            } else {
                o.push(id);
            };
            return o;
        }, []);

        // decrement: obsolete details
        if (Object.keys(available).length) {
            Object.keys(available).forEach((id)=>{
                delete this.appState.data['release_details'][id];
            });
        };

        if (Object.keys(available).length||this.appState._needed.length)
            alert(`Pending updates: new = ${this.appState._needed.length} , deleted = ${Object.keys(available).length}`);

        this.appState.progress(0, this.appState._needed.length, "Loading release details");

        let getter = () => {
            let ix = this.appState._needed.length;
            let release_id = this.appState._needed.pop();
            this.appState.API.call(
                `https://api.discogs.com/releases/${release_id}`
            ).then(data => {
                this.appState.data['release_details'][data.id] = data;
                this.appState.progress(ix);
                if (this.appState._needed.length) {
                    setTimeout(getter, 800);
                } else {
                    this.saveData("Tracks loaded");
                }
            });
        }
        if (this.appState._needed.length)
            getter();
        else
            this.saveData();
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
            this.appState.data['folders'] = Page.make_index(data.folders);
            return this.appState.API.call(
                `https://api.discogs.com/users/${this.appState.username}/collection/folders/0/releases`
                ,(stage, stages)=>{
                    this.appState.progress(stage, stages, "Loading releases");
                }
            )
        })
        .then((v)=>{return new Promise((r,d)=>{setTimeout(()=>{r(v)}, 1000)})})
        .then((data)=>{
            this.appState.data['releases'] = Page.make_index(data.releases);
            setTimeout(()=>{this.downloadTracks(update)}, 1000);
        });
    },
 
    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((this.appState.collection==undefined)||(this.appState.collection.list==undefined)) {
            return;
        }

        new ListRenderer({
            data: this.appState.collection.list,
            columns: Page.LIST,
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