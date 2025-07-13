'use strict';

let Page = {
    App : null,
    init : function(App) {
        Page.App = App;
        let token = Page.App.Cookie.get("token");
        if (token) {
            Page.App.token = token;
        };
        let username = Page.App.Cookie.get("username");
        if (username) {
            Page.App.username = username;
        };
    },

    render : function(parent) {
        parent.innerHTML = "";

        // Discogs personal token value input
        parent.appendChild(document.createTextNode("Discogs access token:"));
        let i_token = document.createElement("input");
        i_token.type = "text";
        i_token.placeholder = "discogs personal acess token";
        i_token.value = Page.App.token || "";
        i_token.onchange = (e)=>{
            Page.App.token = e.target.value;
            Page.App.Cookie.set("token", e.target.value);
        };
        parent.appendChild(i_token);

        parent.appendChild(document.createElement("br"));
        parent.appendChild(document.createElement("br"));

        // Discogs user name value input
        parent.appendChild(document.createTextNode("User name:"));
        let i_username = document.createElement("input");
        i_username.type = "text";
        i_username.value = Page.App.username || "";
        i_username.onchange = (e)=>{
            Page.App.username = e.target.value;
            Page.App.Cookie.set("username", e.target.value);
        };
        parent.appendChild(i_username);

        parent.appendChild(document.createElement("br"));
        parent.appendChild(document.createElement("br"));

        // Discogs creds validity checkup
        let button = document.createElement("button");
        button.innerText = "Test credentials";
        button.onclick = (e) => {
            if ((Page.App.token)&&(!Page.App.username)) {
                Page.App.progress(0,1,"Testing access token");
                Page.App.API.call(
                    "https://api.discogs.com/oauth/identity"
                    ,data => {
                        Page.App.username = data.username;
                        Page.App.Cookie.set("username", data.username);
                        i_username.value = data.username;
                        Page.App.progress();
                        alert("Access token is valid, username found");
                    }
                );
            } else if (Page.App.username) {
                Page.App.progress(0,1,"Testing username");
                Page.App.API.call(
                    `https://api.discogs.com/users/${Page.App.username}/collection/folders/0/releases`
                    ,data => {
                        const items = (data.pagination && data.pagination.items) || data.releases.length;
                        Page.App.progress();
                        alert(`Username is valid, total items in collection size = ${items}`);
                    }
                    ,null
                );
            } else {
                alert("Specify access token or username at least");
            }
        };
        parent.appendChild(button);  
    }
}

export {Page};