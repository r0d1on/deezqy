'use strict';

import { ListRenderer } from '../misc/listRenderer.js';
import { Utils } from '../misc/Utils.js';

let Page = {
    App : null,
    listFilters: [], // Store filter values for ListRenderer
    init : function(App) {
        Page.App = App;
        Page.App.data = {};
        Page.App.showOverlay();
        if (Page.App.username) {
            Page.App.progress(0, 4, "Cache decompression");
            Page.App.DB.get(Page.App.username).then((timestamp)=>{
                Page.App.progress(1);
                Page.App.data['timestamp'] = 1*timestamp;
                Page.App.DB.get(Page.App.username + ".folders").then((folders)=>{
                    Page.App.progress(2);
                    Page.App.data.folders = JSON.parse(folders)||[];
                    Page.App.DB.get(Page.App.username + ".releases").then((releases)=>{
                        Page.App.progress(3);
                        Page.App.data.releases = JSON.parse(releases)||[];
                        Page.App.DB.get(Page.App.username + ".release_details").then((release_details)=>{
                            Page.App.progress(4);
                            Page.App.data.release_details = JSON.parse(release_details)||[];
                            Page.normalise_collection();
                            Page.App.hideOverlay();
                        });
                    });
                });
            });
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
            return `<img style="width:60px;" src="${Page.App.collection.releases[row['release_id']].basic_information.thumb}"/>`
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

    normalise_collection : function() {
        if ((Page.App.data==undefined)||(Page.App.data.release_details==undefined)) {
            return;
        }

        if (Page._working) {
            setTimeout(Page.normalise_collection, 500);
            return;
        };
        Page._working = true;

        Page.App.collection={};

        // Normalise forlders
        Page.App.collection['folders'] = {};
        Page.App.data.folders.forEach((item)=>{
            Page.App.collection['folders'][item.id] = structuredClone(item)
        });

        // Normalise releases
        Page.App.collection['releases'] = {};
        Page.App.data.releases.forEach((item)=>{
            let item_cpy = structuredClone(item);
            item_cpy.basic_information.title = Utils.unify_name(item_cpy.basic_information.title);
            Page.App.collection['releases'][item.id] = item_cpy;
        });

        // Inject release details into releases
        Page.App.data.release_details.forEach((item)=>{
            let item_cpy = structuredClone(item);
            item_cpy.title = Utils.unify_name(item_cpy.title);
            item_cpy.artists_sort = Utils.unify_name(item_cpy.artists_sort);
            Page.App.collection['releases'][item.id]['details'] = item_cpy;
        });

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        Page.App.progress(0, Object.keys(Page.App.collection.releases).length, "Normalising the collection");
        Page.App.collection.tracks_by_code = {};
        Page.App.collection.tracks = {};
        Page.App.collection.list = [];

        let i=0;
        let trackr = function() {
            let r_ids = Object.keys(Page.App.collection.releases);
            if (i < r_ids.length) {
                Page.App.progress(i);
                let release_id = r_ids[i];
                let release = Page.App.collection.releases[release_id];
                let format = release.basic_information.formats.map(e=>e.name).join("|")
                release.format = format;

                let loadTrack = (raw_track)=>{
                    let track_artist = (
                        Utils.unify_name(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
                        release.details.artists_sort
                    );
                    raw_track.artist = track_artist;

                    let track_title = raw_track.title;
                    let track_code = Utils.getTrackCode(track_artist, track_title, Page.App.matching_type);

                    let id = Page.App.collection.tracks_by_code[track_code];
                    if (id === undefined) {
                        id = Object.keys(Page.App.collection.tracks_by_code).length + 1
                        Page.App.collection.tracks_by_code[track_code] = id;
                        Page.App.collection.tracks[id] = {
                            id: id,
                            title: track_title,
                            artist: track_artist,
                            code: track_code,
                            releases: [],
                            refs : []
                        };
                    };
                    let track = Page.App.collection.tracks[id];
                    
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
                        "folder": Page.App.collection.folders[release.folder_id],
                        "release": release,
                        "track": track,
                        "raw_track": raw_track
                    };
                    let list_item = ListRenderer.flattenItem(Page.LIST, context);
                    Page.App.collection.list.push(list_item);
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
                Object.keys(Page.App.collection.releases).forEach(release_id=>{
                    let release = Page.App.collection.releases[release_id];
                    let scores = release.details.tracklist.map((track)=>{
                        if (!(track.id in Page.App.collection.tracks)) {
                            return 1;
                        } else {
                            return (Page.App.collection.tracks[track.id].releases.length == 1)*1
                        };
                    });
                    release.score = scores.reduce((p,c)=>p+c, 0) / release.details.tracklist.length;
                    release.score = Math.round(release.score*1000)/10;
                });

                // add "post" columns to the list
                Page.LIST.forEach(col=>{
                    if (col.post) {
                        Page.App.collection.list.forEach((row)=>{
                            let release = Page.App.collection.releases[row.release_id];
                            row[col.name] = ListRenderer.extract_list_value(
                                {
                                    "release": release
                                },
                                col.path
                            )                            
                        });
                    };
                });

                if ((Page._last_parent)&&(Page.App.activeMenu.page==Page)) {
                    Page.render(Page._last_parent);
                }
                else {
                    let scores = Page.App.collection.list.map(row=>{
                        return [row.release_id, Page.App.collection.releases[row.release_id].score];
                    });
                    Page.App.score = scores.reduce((p,c)=>p+c[1], 0) / scores.length;
                    console.log("Collection average score: ", Page.App.score);
                }

                Page.App.progress();
                Page._working = false;
            };
        };
        trackr();
    },

    finalize_download : function() {
        Page.App.data['timestamp'] = Date.now();
        Page.App.DB.set(Page.App.username, JSON.stringify(Page.App.data['timestamp'])).then(()=>{
            Page.App.DB.set(Page.App.username+".folders", JSON.stringify(Page.App.data.folders)).then(()=>{
                Page.App.DB.set(Page.App.username+".releases", JSON.stringify(Page.App.data.releases)).then(()=>{
                    Page.App.DB.set(Page.App.username+".release_details", JSON.stringify(Page.App.data.release_details)).then(()=>{
                        Page.normalise_collection();
                        Page.render(Page._last_parent);
                    });
                });
            });
        });
    },

    _download_release_info: function(update) {
        if (update) {
            Page.App.data['release_details'] = Page.App.data['release_details'] || [];
        } else {
            Page.App.data['release_details'] = [];
        };

        // increment: required details
        let available = {};
        Page.App.data['release_details'].forEach((item)=>{available[item.id] = 1});
        Page.App._needed = Page.App.data['releases'].reduce((p, c)=>{
            if (!(c.id in available)) {
                p.push(c.id);
            } else {
                delete available[c.id];
            };
            return p;
        }, []);

        // decrement: obsolete details
        if (Object.keys(available).length) {
            Page.App.data['release_details'] = Page.App.data['release_details'].filter(item=>!(item.id in available));
        };

        if (available.length||Page.App._needed.length)
            alert(`Pending updates: new = ${Page.App._needed.length} , deleted = ${Object.keys(available).length}`);

        Page.App.progress(0, Page.App._needed.length, "Loading release details");

        let getter = function() {
            let ix = Page.App._needed.length;
            let release_id = Page.App._needed.pop();
            Page.App.API.call(
                //`https://api.discogs.com/masters/${master_id}`
                `https://api.discogs.com/releases/${release_id}`
                ,data => {
                    Page.App.data['release_details'].push(data);
                    Page.App.progress(ix);
                    if (Page.App._needed.length) {
                        setTimeout(getter, 400);
                    } else {
                        Page.finalize_download();
                    }
                }
            );
        }
        if (Page.App._needed.length)
            getter();
        else
            Page.finalize_download();
    },

    _download_releases : function(update) {
        Page.App.API.call(
            `https://api.discogs.com/users/${Page.App.username}/collection/folders/0/releases`
            ,data => {
                Page.App.data['releases'] = data.releases;
                setTimeout(()=>{Page._download_release_info(update)}, 1000);
            }
            ,0
            ,(stage, stages)=>{
                Page.App.progress(stage, stages, "Loading releases");
            }
        );
    },

    _download_data : function(update) {
        Page.App.API.call(
            `https://api.discogs.com/users/${Page.App.username}/collection/folders`
            ,data => {
                Page.App.data['folders'] = data.folders;
                setTimeout(()=>{Page._download_releases(update)}, 1000);                    
            }
            ,0
            ,(stage, stages)=>{
                Page.App.progress(stage, stages, "Loading folders");
            }
        );
    },
 
    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((Page.App.collection==undefined)||(Page.App.collection.list==undefined)) {
            return;
        }
        // Use ListRenderer for rendering, preserve filters
        new ListRenderer({
            data: Page.App.collection.list,
            columns: Page.LIST,
            parent: parent_div,
            compact: true,
            filters: Page.listFilters,
            onFiltersChange: (filters) => {
                Page.listFilters = filters.slice();
            },
            onScore: (score)=>{
                Page.App.score = score;
                Page.App.progress(-1);
                console.log("List average score: ", score);
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
        buttonReload.onclick = (e)=>Page._download_data();
        controls.appendChild(buttonReload);

        let buttonUpdate = document.createElement("button");
        buttonUpdate.innerText = "Update";
        buttonUpdate.className = "settings-button";
        buttonUpdate.onclick = (e)=>Page._download_data(true);
        controls.appendChild(buttonUpdate);

        parent.appendChild(controls);
        parent.appendChild(document.createElement("hr"));

        let list_view = document.createElement("div");
        list_view.className="collection-container";
        Page.render_list(list_view);
        parent.appendChild(list_view);
    }

}

export {Page};