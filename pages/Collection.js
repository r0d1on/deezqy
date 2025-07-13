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
        {name: "release_folder", path: "folder.name", filter:""},

        {name: "release_id", path: "release.id", filter:""},
        {name: "release_format", path: "release.format", filter:""},
        {name: "release_artist", path: "release.details.artists_sort", filter:""},
        {name: "release_title", path: "release.details.title", filter:""},
        {name: "release_rating", path: "release.rating", filter:""},
        {name: "release_score", path: "release.score", post:true},

        //{name: "track_id", path: "track.id", filter:""},
        {name: "track_artist", path: "raw_track.artist", filter:""},
        {name: "track_position", path: "raw_track.position"},
        {name: "track_name", path: "track.title", filter:""},
        {name: "track_time", path: "raw_track.duration"},

        {name: "track_seen", path: "track.refs", filter:""},
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
                };
                th.appendChild(input);
            }
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
        console.log("List average score: ", scores.reduce((p,c)=>p+c[1], 0) / scores.length);

        // Fill table rows
        const tbody = document.createElement('tbody');
        filteredCollection.forEach((row, index) => {
            const tr = document.createElement('tr');

            // add row number
            const td = document.createElement('td');
            td.textContent = index+1;
            tr.appendChild(td);

            // add parsable columns
            Page.LIST.forEach(col => {
                const td = document.createElement('td');
                if (Array.isArray(row[col.name])) {
                    let first = true;
                    row[col.name].filter(ref=>{
                        return !ref.includes(`${row["release_format"]}:${row["release_title"]}`);
                    }).forEach((ref)=>{
                        const text = ref;
                        (!first)&&td.appendChild(document.createElement("hr"));
                        td.appendChild(document.createTextNode(ref));
                        first = false;
                    })
                }
                else
                    td.textContent = row[col.name] !== undefined ? row[col.name] : '';

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
        if (path.length)
            return Page.extract_list_value(value, path)
        else
            return value;
    },

    unify_track_name : function(title) {
        return (             
            title               
            .replaceAll('"','')
            .replaceAll("in' ",'ing ')
            .replaceAll("|",'')
            .replaceAll("ÃÂ","")
            .trim()
            .toLowerCase()
        );
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
            Page.App.collection['releases'][item.id] = structuredClone(item)
        });

        // Inject release details into releases
        Page.App.data.release_details.forEach((item)=>{
            Page.App.collection['releases'][item.id]['details'] = structuredClone(item);
        });

        // Extract and normalize all tracks for all releases, cross-reference links between tracks and releases
        Page.App.progress(0, Object.keys(App.collection.releases).length, "Normalising the collection");
        Page.App.collection.tracks_by_name = {};
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

                release.details.tracklist.forEach((raw_track)=>{
                    if (raw_track.type_!='heading') {
                        let track_artist = (
                            ((raw_track.artists||[]).map(item=>item.name)).join(',')||
                            release.details.artists_sort
                        );
                        raw_track.artist = track_artist;

                        let track_title = Page.unify_track_name(raw_track.title);
                        // p[name] = (p[name]||0) + 1;
                        
                        let id = Page.App.collection.tracks_by_name[track_title];
                        if (id === undefined) {
                            id = Object.keys(Page.App.collection.tracks_by_name).length + 1
                            Page.App.collection.tracks_by_name[track_title] = id;
                            Page.App.collection.tracks[id] = {
                                id: id,
                                title: track_title,
                                releases: [],
                                refs : []
                            };
                        };
                        let track = Page.App.collection.tracks[id];
                        
                        track.releases.push(release_id);
                        track.refs.push(
                            `${format}:${release.details.title} [${track_artist}] (${raw_track.duration})`
                        );

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

                Page.App.progress();
            };
        };
        trackr();
    },

    finalize_download : function() {
        Page.App.progress();
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

        let new_releases = Page._releases.filter((release)=>{
            return (new Date(Date.parse(release.date_added))).toISOString() >= last_update;
        });

        console.log("New releases detected: ", new_releases.length);
        if (new_releases.length) {
            Page.App.data['releases'] = Page.App.data['releases']||[];
            new_releases.forEach((release)=>{
                Page.App.data['releases'].push(release);
            });
            Page._download_release_info(true);
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
        let button = document.createElement("button");
        button.innerText = "Reload";
        button.onclick = (e)=>Page._download_data();
        parent.appendChild(button);

        parent.appendChild(document.createTextNode("  "));

        button = document.createElement("button");
        button.innerText = "Update";
        button.onclick = (e)=>Page._download_data(true);
        parent.appendChild(button);


        parent.appendChild(document.createElement("hr"));

        let list_view = document.createElement("div");
        parent.appendChild(list_view);
        Page.render_list(list_view);
    }

}

export {Page};