'use strict';

import { uiFeedback } from "../misc/uiFeedback.js";

function union(d0, d1) {
    let u = {};
    Object.keys(d0).forEach(key=>{
        if (Array.isArray(d0[key])) {
            u[key] = d0[key].concat(d1[key]);
        } else if (d0[key]===null) {
        } else if (typeof(d0[key])=="object") {
            u[key] = d0[key];
            Object.keys(d1[key]).map((k)=>{
                u[key][k] = d1[key][k];
            });
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
    
    call : function(url, method, query, progress, page, errors) {
        let token = API.App.tmdb_token;

        (progress)&&(!page)&&(progress(0, 1));

        let the_call = null;

        if ((method === "GET")||(method === "DELETE")) {
            
            let squery = "";
            if (query !== undefined)
                squery =  (Object.keys(query).map((k)=>{return `${k}=${query[k]}`})).join("&");
            squery += ((squery.length)?"&":"") + (page?`page=${page}`:"")
            squery = ((squery.length)?"?":"") + squery;

            the_call = fetch(url + squery, {
                method : method,
                headers : {
                    "Authorization" : `Bearer ${token}`,
                    "accept": "application/json",
                },
            })
        } else if (method === "POST") {
            the_call = fetch(url, {
                method : method,
                body: JSON.stringify(query),
                headers : {
                    "Authorization" : `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })
        };

        return the_call.then(r => {
            console.log("TMDB responce:", r);
            if (!r.ok) throw new Error(`Response status: ${r.status}`);
            return r.json();

        }).then(data => {
            console.log("TMDB data:", data);
            if ((data.total_pages) && (page!==null) && (data.page < data.total_pages)) {
                (progress)&&(progress(data.page, data.total_pages));
                return API.call(
                    url, method, query, progress, data.page + 1, errors
                ).then(v=>{
                    return new Promise((r, d)=>{setTimeout(()=>{r(v)},100)})
                }).then((next)=>{
                    return new Promise((resolve, reject)=>{
                        (progress)&&(progress(data.page, data.total_pages));
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
                API.App.progress("Too many requests, cooling down", 1, 1);
                console.log("Retrying in 30 seconds");
                return (new Promise((r, d)=>{setTimeout(()=>{r()}, 1000*30)})).then(()=>{
                    return API.call(url, method, query, progress, page, (errors||0) + 1);
                })
            } else {
                uiFeedback("API request failed", "warning");
            };
        });
    }
}

export {API};