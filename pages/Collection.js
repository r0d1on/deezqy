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
        this.appState.data = {};
        this.appState.collection = {};
        this.appState.showOverlay();
        if (this.appState.username) {
            this.appState.progress(0, 4, "Cache decompression");
            this.appState.DB.get(this.appState.username).then((timestamp) => {
                this.appState.progress(1);
                this.appState.data['timestamp'] = 1 * timestamp;
                this.appState.DB.get(this.appState.username + ".folders").then((folders) => {
                    this.appState.progress(2);
                    this.appState.data.folders = folders || [];
                    this.appState.DB.get(this.appState.username + ".releases").then((releases) => {
                        this.appState.progress(3);
                        this.appState.data.releases = releases || [];
                        this.appState.DB.get(this.appState.username + ".release_details").then((releaseDetails) => {
                            this.appState.progress(4);
                            this.appState.data.release_details = releaseDetails || [];
                            this.normaliseCollection();
                            this.appState.hideOverlay();
                        });
                    });
                });
            });
        } else {
            this.appState.hideOverlay();
        }
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

        if (Page._working) {
            setTimeout(this.normaliseCollection.bind(this), 500);
            return;
        };
        Page._working = true;

        this.appState.collection={};

        // Normalise folders
        this.appState.collection['folders'] = {};
        this.appState.data.folders.forEach((item)=>{
            this.appState.collection['folders'][item.id] = structuredClone(item)
        });

        // Normalise releases
        this.appState.collection['releases'] = {};
        this.appState.data.releases.forEach((item)=>{
            let item_cpy = structuredClone(item);
            item_cpy.basic_information.title = Utils.unifyName(item_cpy.basic_information.title);
            this.appState.collection['releases'][item.id] = item_cpy;
        });

        // Inject release details into releases
        this.appState.data.release_details.forEach((item)=>{
            let item_cpy = structuredClone(item);
            item_cpy.title = Utils.unifyName(item_cpy.title);
            item_cpy.artists_sort = Utils.unifyName(item_cpy.artists_sort);
            this.appState.collection['releases'][item.id]['details'] = item_cpy;
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
                    let list_item = ListRenderer.flattenItem(Page.LIST, context);
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
                Page.LIST.forEach(col=>{
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

                if ((Page._last_parent)&&(this.appState.ui.activeMenu.page==Page)) {
                    Page.render(Page._last_parent);
                }
                else {
                    let scores = this.appState.collection.list.map(row=>{
                        return [row.release_id, this.appState.collection.releases[row.release_id].score];
                    });
                    this.appState.score = scores.reduce((p,c)=>p+c[1], 0) / scores.length;
                    console.log("Collection average score: ", this.appState.score);
                }

                this.appState.rowCount = this.appState.data.releases.length;
                this.appState.progress();
                Page._working = false;
                uiFeedback.showStatus('Collection loaded', 'success');
            };
        };
        trackr();
    },

    finalize_download : function() {
        this.appState.data['timestamp'] = Date.now();
        this.appState.DB.set(this.appState.username, this.appState.data['timestamp']).then(()=>{
            this.appState.DB.set(this.appState.username+".folders", this.appState.data.folders).then(()=>{
                this.appState.DB.set(this.appState.username+".releases", this.appState.data.releases).then(()=>{
                    this.appState.DB.set(this.appState.username+".release_details", this.appState.data.release_details).then(()=>{
                        this.normaliseCollection();
                        Page.render(Page._last_parent);
                    });
                });
            });
        });
    },

    _download_release_info: function(update) {
        if (update) {
            this.appState.data['release_details'] = this.appState.data['release_details'] || [];
        } else {
            this.appState.data['release_details'] = [];
        };

        // increment: required details
        let available = {};
        this.appState.data['release_details'].forEach((item)=>{available[item.id] = 1});
        this.appState._needed = this.appState.data['releases'].reduce((p, c)=>{
            if (!(c.id in available)) {
                p.push(c.id);
            } else {
                delete available[c.id];
            };
            return p;
        }, []);

        // decrement: obsolete details
        if (Object.keys(available).length) {
            this.appState.data['release_details'] = this.appState.data['release_details'].filter(item=>!(item.id in available));
        };

        if (Object.keys(available).length||this.appState._needed.length)
            alert(`Pending updates: new = ${this.appState._needed.length} , deleted = ${Object.keys(available).length}`);

        this.appState.progress(0, this.appState._needed.length, "Loading release details");

        let getter = () => {
            let ix = this.appState._needed.length;
            let release_id = this.appState._needed.pop();
            this.appState.API.call(
                `https://api.discogs.com/releases/${release_id}`
                ,data => {
                    this.appState.data['release_details'].push(data);
                    this.appState.progress(ix);
                    if (this.appState._needed.length) {
                        setTimeout(getter, 400);
                    } else {
                        this.finalize_download();
                    }
                }
            );
        }
        if (this.appState._needed.length)
            getter();
        else
            this.finalize_download();
    },

    _download_releases : function(update) {
        this.appState.API.call(
            `https://api.discogs.com/users/${this.appState.username}/collection/folders/0/releases`
            ,data => {
                this.appState.data['releases'] = data.releases;
                setTimeout(()=>{this._download_release_info(update)}, 1000);
            }
            ,0
            ,(stage, stages)=>{
                this.appState.progress(stage, stages, "Loading releases");
            }
        );
    },

    _download_data : function(update) {
        if (!this.appState.username) {
            uiFeedback.showStatus("DB update works only if user name is provided!", "warning");
            return;
        };        
        this.appState.API.call(
            `https://api.discogs.com/users/${this.appState.username}/collection/folders`
            ,data => {
                this.appState.data['folders'] = data.folders;
                setTimeout(()=>{this._download_releases(update)}, 1000);                    
            }
            ,0
            ,(stage, stages)=>{
                this.appState.progress(stage, stages, "Loading folders");
            }
        );
    },
 
    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((this.appState.collection==undefined)||(this.appState.collection.list==undefined)) {
            return;
        }
        // Use ListRenderer for rendering, preserve filters
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
                this.appState.score = score;
                this.appState.rowCount = rows;
                this.appState.progress(-1);
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
        buttonReload.onclick = (e)=>this._download_data();
        controls.appendChild(buttonReload);

        let buttonUpdate = document.createElement("button");
        buttonUpdate.innerText = "Update";
        buttonUpdate.className = "settings-button";
        buttonUpdate.onclick = (e)=>this._download_data(true);
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