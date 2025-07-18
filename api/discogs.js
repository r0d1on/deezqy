'use strict';

function union(d0, d1) {
    let u = {};
    Object.keys(d0).forEach(key=>{
        console.log("paged ",key);
        if (key!='pagination') {
            u[key] = d0[key].concat(d1[key]);
        }
    });
    return u;
}

let API = {
    App : null,

    init : function(App) {
        API.App = App;
        return API;
    },
    
    call : function(url, callback, page, progress, errors) {
        let token = API.App.token;

        (progress)&&(!page)&&(progress(0, 1));

        fetch(url + (page?`?page=${page}`:""), {
            method : 'get',
            headers : {
                "Authorization" : `Discogs token=${token}` // pageLoad.App.
            },

        }).then(r => {
            console.log("Discogs responce:", r);
            if (!r.ok) throw new Error(`Response status: ${r.status}`);
            return r.json();

        }).then(data => {
            if ((data.pagination) && (page!==null) && (data.pagination.page < data.pagination.pages)) {
                (progress)&&(progress(data.pagination.page, data.pagination.pages));
                API.call(url, next => {
                    try {
                        callback(union(data, next));
                    } catch (error) {
                        console.error("Error while processing received data:", error)
                        console.trace();
                    }
                }, data.pagination.page + 1, progress);
            } else {
                (progress)&&(progress(1, 1));
                try {
                    callback(data);
                } catch (error) {
                    console.error("Error while processing received data:", error)
                    console.trace();
                }
            };

        }).catch(function (error) {
            console.log('API call failed for url', url, 'Error:', error);
            if ((errors||0) < 3) {
                API.App.progress(undefined , undefined, "Too many requests, cooling down");
                console.log("Retrying in 30 seconds");
                setTimeout(()=>{
                    API.call(url, callback, page, progress, (errors||0) + 1);
                }, 1000*30);
            } else {
                console.log("Failing the request");
            };
        });
    }
}

export {API};