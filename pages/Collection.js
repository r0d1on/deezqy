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

        {name: "release_id", path: "release.id", filter:"", maxwidth:"90px", render: (row)=>{
            return `<a href="https://www.discogs.com/release/${row['release_id']}" target="_blank">${row['release_id']}</a>`;
        }},
        {name: "release_format", path: "release.format", filter:"", maxwidth:"65px"},
        {name: "release_thumb", path: "release.basic_information.thumb", maxwidth:"65px", render: (row)=>{
            return `<img style="width:60px;" src="${App.collection.releases[row['release_id']].basic_information.thumb}"/>`
        }},
        {name: "release_artist", path: "release.details.artists_sort", filter:"", maxwidth:"150px"},
        {name: "release_title", path: "release.details.title", filter:"", maxwidth:"250px"},
        {name: "release_rating", path: "release.rating", filter:"", maxwidth:"80px"},
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

    createTableHeaders: function(table, parent_div) {
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
    },

    create_row: function(table, row, index, seen_releases, cells) {
        const tr = document.createElement('tr');
        // add row number
        const td = document.createElement('td');
        if (!(row.release_id in seen_releases)) {
            seen_releases[row.release_id] = 1;
            td.innerHTML = `<small><b id="${row.release_id}">${index+1}</b></small>`;
        } else {
            td.textContent = index+1;
        };
        tr.appendChild(td);
        let idc = td;

        let depth = 0;
        // add parsable columns
        Page.LIST.forEach((col, ix) => {
            const td = document.createElement('td');
            let html = "";
            if (col.render)
                html = col.render(row)
            else {
                if (col.maxwidth)
                    html = `<div style="max-width:${col.maxwidth};overflow-x:auto;">${row[col.name] !== undefined ? row[col.name] : ''}</div>`;
                else
                    html = row[col.name] !== undefined ? row[col.name] : '';
            };

            if (cells==null) {
                td.innerHTML = html;
            } else if (cells[ix]!=html) {
                td.innerHTML = html;
                cells[ix] = html;
                for(let j=ix + 1; j<Page.LIST.length; j++) cells[j]=null;
            } else {
                depth = ix + 1;
            };
            tr.appendChild(td);
        });
        return [idc, tr, depth];
    },

    inject_clicker: function(td, id) {
        let clicker = document.createElement("span");
        clicker.className="clicker_symbol";
        clicker.innerHTML = "⊞";
        clicker.onclick=(e)=>{
                Array.from(document.getElementsByClassName(`anc-${id}`)).forEach(
                    Page.swap_visibility
                );
                e.target.innerHTML = {"⊞":"⊟","⊟":"⊞"}[e.target.innerHTML];
        }
        td.appendChild(clicker);
        td.className="clicker";
    },

    render_list : function(parent_div) {
        parent_div.innerHTML = '';
        if ((Page.App.collection==undefined)||(Page.App.collection.list==undefined)) {
            return;
        }
        const table = document.createElement('table');
        table.className = 'collection-table';
        Page.createTableHeaders(table, parent_div);

        // Sort collection inplace if needed
        const sortedColName = Page.App.collection.list_sorted_by;
        const sortedOrder = Page.App.collection.list_sorted_order || 1;
        if ((sortedColName)&&(`${sortedColName}-${sortedOrder}`!=Page.App.collection._list_sorted_by)) {
            Page.App.collection.list.sort((a, b) => {
                if (a[sortedColName] < b[sortedColName]) return -1 * sortedOrder;
                if (a[sortedColName] > b[sortedColName]) return 1 * sortedOrder;
                return 0;
            });
            Page.App.collection._list_sorted_by = `${sortedColName}-${sortedOrder}`;
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
        let idc=0, tr=0, depth=0;
        let anchor = {
            id:0,
            count:0,
            td:null
        };
        let seen_releases = {};
        let cells = (Page.App.collection._list_sorted_by) ? null : {};
        filteredCollection.forEach((row, index) => {
            [idc, tr, depth] = Page.create_row(table, row, index, seen_releases, cells);
            if (depth < 3) {
                if ((anchor.td!==null)&&(anchor.count>0))
                    Page.inject_clicker(anchor.td, anchor.id);
                anchor.id += 1;
                anchor.count = 0;
                anchor.td = idc;
            } else {
                tr.className = `anc-${anchor.id}`;
                tr.style.display="none";
                anchor.count+=1;
            };
            table.appendChild(tr);
        });
        if ((anchor.td!==null)&&(anchor.count>0))
            Page.inject_clicker(anchor.td, anchor.id);
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
                .toLowerCase()
                .replaceAll(/[ÃÂãâ¶]+/g,'')
                .replaceAll('&',' and ')
                .replaceAll(", the"," ")
                .replaceAll("the "," ")
                .replaceAll(/ +/g,' ')
            ).trim();
    },

    swap_visibility : function(el) {
        if (el.style.display === 'none') {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
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
                        Page.unify_name(((raw_track.artists||[]).map(item=>item.name)).join(' and '))||
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