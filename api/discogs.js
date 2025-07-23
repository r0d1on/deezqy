'use strict';

import { uiFeedback } from "../misc/uiFeedback.js";

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
    
    call : function(url, progress, page, errors) {
        let token = API.App.token;

        (progress)&&(!page)&&(progress(0, 1));

        return fetch(url + (page?`?page=${page}`:""), {
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
                return API.call(
                    url, progress, data.pagination.page + 1
                ).then(v=>{
                    return new Promise((r, d)=>{setTimeout(()=>{r(v)},100)})
                }).then((next)=>{
                    return new Promise((resolve, reject)=>{
                        (progress)&&(progress(data.pagination.page, data.pagination.pages));
                        resolve(union(data, next));
                    });                        
                });
            } else {
                (progress)&&(progress(1, 1));
                return new Promise((resolve, reject)=>{
                    resolve(data);
                });
            };

        }).catch(function (error) {
            console.log('API call failed for url', url, 'Error:', error);
            if ((errors||0) < 3) {
                API.App.progress(undefined , undefined, "Too many requests, cooling down");
                console.log("Retrying in 30 seconds");
                setTimeout(()=>{
                    API.call(url, progress, page, (errors||0) + 1);
                }, 1000*30);
            } else {
                uiFeedback("API request failed", "warning");
            };
        });
    }
}

export {API};