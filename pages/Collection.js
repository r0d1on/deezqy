'use strict';

let Page = {
    App : null,
    init : function(App) {
        Page.App = App;
        Page.App.data = {};
        (Page.App.username)&&Page.App.DB.get(Page.App.username).then((data)=>{
            Page.App.data = JSON.parse(data)||{};
            Page.normalise_collection();
        });
    },

    LIST : [
        {name: "release_folder", path: "folder.name", filter:"", maxwidth:"150px"},

        {name: "release_id", path: "release.id", filter:"", maxwidth:"90px"},
        {name: "release_format", path: "release.format", filter:"", maxwidth:"65px"},
        {name: "release_artist", path: "release.details.artists_sort", filter:"", maxwidth:"150px"},
        {name: "release_title", path: "release.details.title", filter:"", maxwidth:"250px"},
        {name: "release_rating", path: "release.rating", filter:"", maxwidth:"80px"},
        {name: "release_score", path: "release.score", post:true, maxwidth:"80px"},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "track_artist", path: "raw_track.artist", filter:"", maxwidth:"150px"},
        {name: "track_position", path: "raw_track.position", maxwidth:"80px"},
        {name: "track_name", path: "track.title", filter:"", maxwidth:"250px"},
        {name: "track_time", path: "raw_track.duration", maxwidth:"80px"},

        {name: "track_seen", path: "track.refs", render: (td, row)=>{
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
            td.innerHTML = html;
        }},

    ],

    render_list : function(parent_div) {
        parent_div.innerHTML = '';

        if ((Page.App.collection==undefined)||(Page.App.collection.list==undefined)) {
            return;
        }

        const table = document.createElement('table');
        table.className = 'collection-table';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // add row counter
        const th = document.createElement('th');
        th.textContent = "#";
        headerRow.appendChild(th);

        // parsable columns
        Page.LIST.forEach((col, colIdx) => {
            const th = document.createElement('th');
            const span = document.createElement('span');

            let sortIndicator = '';
            if (Page.App.collection.list_sorted_by === col.name) {
                sortIndicator = Page.App.collection.list_sorted_order === 1 ? ' ▲' : ' ▼';
            }
            span.textContent = sortIndicator + col.name.split("_")[1];
            span.style.cursor = 'pointer';
            span.onclick = () => {
                if (Page.App.collection.list_sorted_by === col.name) {
                    Page.App.collection.list_sorted_order = -Page.App.collection.list_sorted_order;
                } else {
                    Page.App.collection.list_sorted_by = col.name;
                    Page.App.collection.list_sorted_order = 1;
                }
                Page.render_list(parent_div);
            };
            th.appendChild(span);

            if (col.filter !== undefined) {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = col.filter.trim();
                input.placeholder = '';
                input.onchange = (e) => {
                    Page.LIST[colIdx].filter = e.target.value.trim();
                    Page.render_list(parent_div);
                    Page.App.progress(-1);
                };
                th.appendChild(input);
            }
            if (col.maxwidth)
                th.style = `max-width:${col.maxwidth};overflow-x:auto;`;

            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Sort collection inplace if needed
        const sortedColName = Page.App.collection.list_sorted_by;
        const sortedOrder = Page.App.collection.list_sorted_order || 1;
        if (sortedColName) {
            Page.App.collection.list.sort((a, b) => {
                if (a[sortedColName] < b[sortedColName]) return -1 * sortedOrder;
                if (a[sortedColName] > b[sortedColName]) return 1 * sortedOrder;
                return 0;
            });
        }

        // Filter collection
        const filteredCollection = Page.App.collection.list.filter(item => {
            return Page.LIST.every(col => {
                if (col.filter && col.filter.length > 0) {
                    return (item[col.name] !== undefined && String(item[col.name]).toLowerCase().includes(col.filter.toLowerCase()));
                }
                return true;
            });
        });

        let scores = filteredCollection.map(row=>{
            return [row.release_id, Page.App.collection.releases[row.release_id].score];
        });
        Page.App.score = scores.reduce((p,c)=>p+c[1], 0) / scores.length;
        console.log("List average score: ", Page.App.score);

        // Fill table rows
        let seen_releases = {};
        const tbody = document.createElement('tbody');
        filteredCollection.forEach((row, index) => {
            const tr = document.createElement('tr');

            // add row number
            const td = document.createElement('td');
            if (!(row.release_id in seen_releases)) {
                seen_releases[row.release_id] = 1;
                td.innerHTML = `<b id="${row.release_id}">${index+1}</b>`;
            } else {
                td.textContent = index + 1;
            };
            tr.appendChild(td);

            // add parsable columns
            Page.LIST.forEach((col, ix) => {
                const td = document.createElement('td');
                if (col.render)
                    col.render(td, row)
                else {
                    if (col.maxwidth)
                        td.innerHTML = `<div style="max-width:${col.maxwidth};overflow-x:auto;">${row[col.name] !== undefined ? row[col.name] : ''}</div>`;
                    else
                        td.innerHTML = row[col.name] !== undefined ? row[col.name] : '';
                }
                    
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        parent_div.appendChild(table);
    },

    extract_list_value : function(context, path) {
        if (!Array.isArray(path)) 
            path = path.split('.').reverse();

        let key = path.pop();
        let value = context[key];
        if ((value==undefined)||(path.length==0))
            return value;
        else
            return Page.extract_list_value(value, path)
    },

    unify_track_name : function(title) {
        let replacements = [
            [/["ÃÂãâ!\|]/g, ''],
            [/[\,\.\(\)\-\/\?\\]/g],
            ["in'( |$)", 'ing '], [/'t /g, "t "], [/'s /g, " is "],
            [/'re /g, " are "], [/'m /g, " am "], [/'ll /g, " will "],
            [/ +/g]
        ];
        let result = title.trim().toLowerCase();
        replacements.forEach(r => {
            result = result.replaceAll(r[0], ((r.length==2)?r[1]:" "));
        });
        return result.trim();
    },

    unify_name : function(name) {
        return (
                name
                .replaceAll(/[ÃÂãâ¶]+/g,'')
                .replaceAll('&',' and ')
                .replaceAll(/ +/g,' ')
            ).trim();
    },

    normalise_collection : function() {
        if ((Page.App.data==undefined)||(Page.App.data.release_details==undefined)) {
            return;
        }

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
            item_cpy.basic_information.title = Page.unify_name(item_cpy.basic_information.title);
            Page.App.collection['releases'][item.id] = item_cpy;
        });

        // Inject release details into releases
        Page.App.data.release_details.forEach((item)=>{
            let item_cpy = structuredClone(item);
            item_cpy.title = Page.unify_name(item_cpy.title);
            item_cpy.artists_sort = Page.unify_name(item_cpy.artists_sort);
            Page.App.collection['releases'][item.id]['details'] = item_cpy;
        });

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        Page.App.progress(0, Object.keys(App.collection.releases).length, "Normalising the collection");
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
                        ((raw_track.artists||[]).map(item=>item.name)).join(',')||
                        release.details.artists_sort
                    );
                    raw_track.artist = track_artist;

                    let track_title = Page.unify_track_name(raw_track.title);
                    let track_code = track_title.toLowerCase();

                    if (Page.App.matching_type=="author_and_title")
                        track_code = `${Page.unify_track_name(track_artist).toLowerCase()}:${track_code}`;

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
                    let list_item = {};
                    Page.LIST.forEach(col=>{
                        list_item[col.name] = Page.extract_list_value(
                            {
                                "folder": Page.App.collection.folders[release.folder_id],
                                "release": release,
                                "track": track,
                                "raw_track": raw_track
                            },
                            col.path
                        )
                    });
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
                            row[col.name] = Page.extract_list_value(
                                {
                                    "release": release
                                },
                                col.path
                            )                            
                        });
                    };
                });

                if (Page._last_parent)
                    Page.render(Page._last_parent);
                else {
                    let scores = Page.App.collection.list.map(row=>{
                        return [row.release_id, Page.App.collection.releases[row.release_id].score];
                    });
                    Page.App.score = scores.reduce((p,c)=>p+c[1], 0) / scores.length;
                    console.log("Collection average score: ", Page.App.score);
                }

                Page.App.progress();
            };
        };
        trackr();
    },

    finalize_download : function() {
        Page.App.data['timestamp'] = Date.now();
        Page.App.DB.set(Page.App.username, JSON.stringify(Page.App.data)).then(()=>{
            Page.normalise_collection();
            Page.render(Page._last_parent);
        });
    },

    _download_release_info: function(update) {
        if (update) {
            Page.App.data['release_details'] = Page.App.data['release_details']||[];
            Page.App.progress(0, Page.App.data['releases'].length - Page.App.data['release_details'].length, "Updating release details");
        } else {
            Page.App.data['release_details'] = [];
            Page.App.progress(0, Page.App.data['releases'].length, "Loading release details");
        };

        let getter = function() {
            let ix = Page.App.data['release_details'].length;
            // let master_id = Page.App.data.releases[ix].basic_information.master_id;
            let release_id = Page.App.data.releases[ix].basic_information.id;

            Page.App.API.call(
                //`https://api.discogs.com/masters/${master_id}`
                `https://api.discogs.com/releases/${release_id}`
                ,data => {
                    Page.App.data['release_details'].push(data);
                    Page.App.progress(ix + 1);

                    const details_loaded = Page.App.data['release_details'].length;
                    const total_releases = Page.App.data['releases'].length;

                    if (details_loaded < total_releases) {
                        setTimeout(getter, 400);
                    } else {
                        Page.finalize_download();
                    }
                }
            );
        }
        getter();
    },

    _download_releases : function() {
        Page.App.API.call(
            `https://api.discogs.com/users/${Page.App.username}/collection/folders/0/releases`
            ,data => {
                Page.App.data['releases'] = data.releases;
                setTimeout(Page._download_release_info, 1000);
            }
            ,0
            ,(stage, stages)=>{
                Page.App.progress(stage, stages, "Loading releases");
            }
        );
    },

    _update_release_info: function () {
        Page.App.data.timestamp = Page.App.data.timestamp||(Date.now())
        let last_update = (new Date(Page.App.data.timestamp)).toISOString();

        // check out newly added releases
        let new_releases = Page._releases.filter((release)=>{
            return (new Date(Date.parse(release.date_added))).toISOString() >= last_update;
        });

        // find deleted releases
        let available_releases = {};
        Page._releases.forEach(item=>{available_releases[item.id]=1});
        Page.App.data['release_details'] = Page.App.data['release_details']||[];
        let was_details = Page.App.data['release_details'].length;
        Page.App.data['release_details'] = Page.App.data['release_details'].filter(item=>item.id in available_releases)
        let deleted = Math.max(0, was_details - Page.App.data['release_details'].length);
        
        if (new_releases.length||deleted)
            alert(`Pending updates: new = ${new_releases.length} , deleted = ${deleted}`);

        // set new vresion of releases (new ratings, all new changes etc..)
        Page.App.data['releases'] = Page._releases;

        if (new_releases.length) {
            // drop new releases
            available_releases = {};
            new_releases.forEach(item=>{available_releases[item.id]=1});
            Page.App.data['releases'] = Page.App.data['releases'].filter(item=>!(item.id in available_releases))

            // add them back to the end of the list
            new_releases.forEach((release)=>{
                Page.App.data['releases'].push(release);
            });
            Page._download_release_info(true);
        } else if (deleted > 0) {
            Page.finalize_download();
        } else {
            alert("No new releases detected");
        };
    },

    _update_releases() {
        Page.App.API.call(
            `https://api.discogs.com/users/${Page.App.username}/collection/folders/0/releases`
            ,data => {
                Page._releases = data.releases;
                setTimeout(Page._update_release_info, 1000);
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
                if (update) 
                    setTimeout(Page._update_releases, 1000);
                else
                    setTimeout(Page._download_releases, 1000);                    
            }
            ,0
            ,(stage, stages)=>{
                Page.App.progress(stage, stages, "Loading folders");
            }
        );
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