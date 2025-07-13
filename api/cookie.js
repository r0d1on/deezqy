let Cookie = {
    App : null,
    cookies : null,
    storageKey: 'deezqy_cookies',

    _refresh : function() {
        const stored = localStorage.getItem(Cookie.storageKey);
        Cookie.cookies = stored ? JSON.parse(stored) : {};
    },

    _save : function() {
        localStorage.setItem(Cookie.storageKey, JSON.stringify(Cookie.cookies));
    },

    init : function(App) {
        Cookie.App = App;
        Cookie._refresh();
        return Cookie;
    },
    
    get : function(key, dflt) {
        return Cookie.cookies[key] || dflt;
    },

    set : function(key, value) {
        Cookie.cookies[key] = value;
        Cookie._save();
    }
}

export {Cookie};
