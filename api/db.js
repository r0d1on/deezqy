'use strict';

let IO = {
    _fetch_stream : function(stream) {
        const reader = stream.getReader();
        let result = [];
        function get_some({done, value}) {
            if (done)
                return result;
            result.push(value);
            return reader.read().then(get_some);
        }
        return reader.read().then(get_some);
    },

    _bytes_to_chars : function(chunk) {
        return chunk.reduce((a, v)=>{
            a.push(String.fromCharCode(v));
            return a;
        }, []).join('');
    },

    compress : function(data_str) {
        return this._fetch_stream(
            new Blob([data_str]).stream().pipeThrough(new CompressionStream('gzip')) // eslint-disable-line no-undef
        );
    },

    decompress : function(data_bytes) {
        return this._fetch_stream(
            (new Blob([data_bytes]))
                .stream()
                .pipeThrough(new DecompressionStream('gzip')) // eslint-disable-line no-undef
        ).then((chunks)=>{
            let data_str = chunks.reduce((r, chunk)=>{
                return r + this._bytes_to_chars(chunk);
            }, '');
            return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
                resolve(data_str);
            });
        });
    },

    waitfor : function(request) {
        return new Promise((resolve, reject) => {
            request.oncomplete = request.onsuccess = () => resolve(request.result);
            request.onabort = request.onerror = () => reject(request.error);
        });
    }
};

let STORE = ((store)=>{
    const db_request = indexedDB.open('deezqy');
    db_request.onupgradeneeded = (e) => {
        let db = e.target.result;
        db.createObjectStore(store);
    };
    const db_ready = IO.waitfor(db_request);
    return (mode, process)=>{
        return db_ready.then((db) => {
            return process(db.transaction(store, mode).objectStore(store));
        });
    };
})('store');

let DB = {
    App : null,

    init : function(App) {
        DB.App = App;
        return DB;
    },

    get: function(key) {
        return STORE('readonly', (store) => {
            return IO.waitfor(store.get(key)).then((chunks)=>{
                if (chunks===undefined) {
                    return new Promise((resolve, reject)=>{resolve(null);}); // eslint-disable-line no-unused-vars
                } else {
                    return IO.decompress(chunks);
                }
            });
        });
    },

    set: function(key, value) {
        if (value==null) {
            return STORE('readwrite', (store) => {
                store.delete(key);
                return IO.waitfor(store.transaction);
            });
        }

        return IO.compress(value).then((chunks)=>{
            return STORE('readwrite', (store) => {
                let arr = new Uint8Array(chunks.reduce((a, v) => a + v.length, 0));
                chunks.reduce((a, v)=>{
                    arr.set(v, a);
                    return a + v.length;
                }, 0);
                store.put(arr, key);
                return IO.waitfor(store.transaction);
            });
        });
    }
}


export {DB};
