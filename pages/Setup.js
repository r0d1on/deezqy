'use strict';

const Page = {
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

        settingsContainer.appendChild(Page.renderCredentialsGroup());
        settingsContainer.appendChild(Page.renderOtherSettingsGroup());

        parent.appendChild(settingsContainer);
    },

    renderCredentialsGroup: function() {
        let credentialsGroup = document.createElement("div");
        credentialsGroup.className = "settings-group credentials-group";
        const creds = [
            {
                label: "Discogs access token:",
                placeholder: "discogs personal access token",
                value: Page.App.token || "",
                onChange: (e) => {
                    Page.App.token = e.target.value;
                    Page.App.Cookie.set("token", e.target.value);
                }
            },
            {
                id: "username_input",
                label: "User name:",
                placeholder: "",
                value: Page.App.username || "",
                onChange: (e) => {
                    Page.App.username = e.target.value;
                    Page.App.Cookie.set("username", e.target.value);
                }
            }
        ];
        creds.forEach((c, i) => {
            let label = document.createElement("label");
            label.textContent = c.label;
            label.className = "settings-label";
            credentialsGroup.appendChild(label);
            let input = document.createElement("input");
            input.type = "text";
            input.placeholder = c.placeholder;
            input.value = c.value;
            input.className = "settings-input";
            input.onchange = c.onChange;
            credentialsGroup.appendChild(input);
            if (c.id) Page[c.id] = input;
        });
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
                        Page.username_input.value = data.username;
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
        return credentialsGroup;
    },

    renderOtherSettingsGroup: function() {
        let otherSettingsGroup = document.createElement("div");
        otherSettingsGroup.className = "settings-group other-settings-group";
        let matchTypeLabel = document.createElement("label");
        matchTypeLabel.textContent = "Track match by:";
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
            if (e.target.checked) {
                rightText.classList.add("switch-active-text")
                leftText.classList.remove("switch-active-text")
            } else {
                leftText.classList.add("switch-active-text")
                rightText.classList.remove("switch-active-text")
            }
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
        return otherSettingsGroup;
    }
}

export {Page};