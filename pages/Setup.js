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

        let settingsContainer = document.createElement("div");
        settingsContainer.className = "settings-container";

        // Credentials group
        let credentialsGroup = document.createElement("div");
        credentialsGroup.className = "settings-group credentials-group";
        let tokenLabel = document.createElement("label");
        tokenLabel.textContent = "Discogs access token:";
        tokenLabel.className = "settings-label";
        credentialsGroup.appendChild(tokenLabel);
        let i_token = document.createElement("input");
        i_token.type = "text";
        i_token.placeholder = "discogs personal access token";
        i_token.value = Page.App.token || "";
        i_token.className = "settings-input";
        i_token.onchange = (e)=>{
            Page.App.token = e.target.value;
            Page.App.Cookie.set("token", e.target.value);
        };
        credentialsGroup.appendChild(i_token);
        let usernameLabel = document.createElement("label");
        usernameLabel.textContent = "User name:";
        usernameLabel.className = "settings-label";
        credentialsGroup.appendChild(usernameLabel);
        let i_username = document.createElement("input");
        i_username.type = "text";
        i_username.value = Page.App.username || "";
        i_username.className = "settings-input";
        i_username.onchange = (e)=>{
            Page.App.username = e.target.value;
            Page.App.Cookie.set("username", e.target.value);
        };
        credentialsGroup.appendChild(i_username);
        let button = document.createElement("button");
        button.innerText = "Test credentials";
        button.className = "settings-button";
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
        credentialsGroup.appendChild(button);
        settingsContainer.appendChild(credentialsGroup);

        // Other settings group
        let otherSettingsGroup = document.createElement("div");
        otherSettingsGroup.className = "settings-group other-settings-group";
        let matchTypeLabel = document.createElement("label");
        matchTypeLabel.textContent = "Track matching type:";
        matchTypeLabel.className = "settings-label";
        otherSettingsGroup.appendChild(matchTypeLabel);
        let switchContainer = document.createElement("div");
        switchContainer.className = "switch-container";
        let switchLabel = document.createElement("label");
        switchLabel.className = "switch-label";
        let switchInput = document.createElement("input");
        switchInput.type = "checkbox";
        switchInput.className = "switch-input";
        let slider = document.createElement("span");
        slider.className = "switch-slider";
        let knob = document.createElement("span");
        knob.className = "switch-knob";
        slider.appendChild(knob);
        let leftText = document.createElement("span");
        leftText.textContent = "author & title";
        leftText.className = "switch-left-text";
        let rightText = document.createElement("span");
        rightText.textContent = "title only";
        rightText.className = "switch-right-text";
        let matchType = Page.App.matching_type || "author_and_title";
        switchInput.checked = (matchType === "title_only");
        knob.style.left = switchInput.checked ? "30px" : "2px";
        Page.App.matching_type = switchInput.checked ? "title_only" : "author_and_title";
        switchInput.onchange = (e) => {
            knob.style.left = e.target.checked ? "30px" : "2px";
            Page.App.matching_type = e.target.checked ? "title_only" : "author_and_title";
            setTimeout(Page.App.Pages.Collection.normalise_collection, 1);
        };
        switchLabel.appendChild(leftText);
        switchLabel.appendChild(slider);
        switchLabel.appendChild(rightText);
        switchLabel.appendChild(switchInput);
        slider.onclick = (e) => {
            switchInput.checked = !switchInput.checked; 
            switchInput.onchange({target: switchInput});
            e.preventDefault();
            return false;
        };
        switchContainer.appendChild(switchLabel);
        otherSettingsGroup.appendChild(switchContainer);
        settingsContainer.appendChild(otherSettingsGroup);

        parent.appendChild(settingsContainer);
    }
}

export {Page};