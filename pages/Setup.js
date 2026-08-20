'use strict';

/**
 * Setup Page Module
 * @module PageSetup
 */
import { uiFeedback } from '../misc/uiFeedback.js';

const Page = {
    /** @type {object} */
    appState: null,
    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState;
    },
    /**
     * Render the setup page
     * @param {HTMLElement} parent - Parent DOM element
     */
    render(parent) {
        parent.innerHTML = "";

        let settingsContainer = document.createElement("div");
        settingsContainer.className = "settings-container";

        settingsContainer.appendChild(this.renderCredentialsGroup());
        settingsContainer.appendChild(this.renderSwitch(
            "Track match by:",
            ["author & title", "title only"],
            "matching_type",
            true
        ));
        settingsContainer.appendChild(this.renderSwitch(
            "Columns set:",
            ["basic", "extended"],
            "columns_set",
            true
        ));

        parent.appendChild(settingsContainer);

        if (window.location.href.endsWith("&approved=true")) {
            if (this.appState.tmdb_session.startsWith("R::")) {
                this.appState.TMDB.call(
                    "https://api.themoviedb.org/3/authentication/session/new", 
                    "POST", { "request_token": this.appState.tmdb_session.replace("R::", "") }
                ).then(data => {
                    uiFeedback.showStatus("Created user session : " + data.session_id);
                    this.tmdb_session_input.value = data.session_id;
                    this.tmdb_session_input.onchange({target:this.tmdb_session_input});
                    this.appState.progress(-1);
                    setTimeout(()=>{
                        window.location.href = window.location.origin + "/";
                    }, 700);
                });
            } else {
                this.tmdb_session_input.value = "";
                this.tmdb_session_input.onchange({target:this.tmdb_session_input});
                this.tmdb_username_input.value = "";
                this.tmdb_username_input.onchange({target:this.tmdb_username_input});
                setTimeout(()=>{
                    window.location.href = window.location.origin + "/";
                }, 700);
            }
        } else if (this.appState.tmdb_session !="") {
            this.appState.TMDB.call(
                "https://api.themoviedb.org/3/account", 
                "GET", {"session_id": this.appState.tmdb_session}
            ).then(data => {
                uiFeedback.showStatus("Authorised on TMDB as: " + data.username);
                this.tmdb_username_input.value = data.username + ":" + data.id;
                this.tmdb_username_input.onchange({target:this.tmdb_username_input});
            });
        };
    },

    renderCredentialsGroup: function() {
        let credentialsGroup = document.createElement("div");
        credentialsGroup.className = "settings-group credentials-group";
        const creds = [
            {
                label: "Discogs token:",
                placeholder: "discogs personal access token",
                value: this.appState.token || "",
                onChange: (e) => {
                    this.appState.token = e.target.value;
                    this.appState.Cookie.set("token", e.target.value);
                }
            },
            {
                id: "username_input",
                label: "Discogs user name:",
                placeholder: "",
                value: this.appState.username || "",
                onChange: (e) => {
                    this.appState.username = e.target.value;
                    this.appState.Cookie.set("username", e.target.value);
                    this.appState.Pages.Collection.init();
                }
            },
            {
                label: "TMDB token:",
                placeholder: "TMDB read access token",
                value: this.appState.tmdb_token || "",
                onChange: (e) => {
                    this.appState.tmdb_token = e.target.value;
                    this.appState.Cookie.set("tmdb_token", e.target.value);
                }
            },
            {
                id: "tmdb_session_input",
                label: "TMDB user session:",
                placeholder: "TMDB session id",
                value: this.appState.tmdb_session || "",
                onChange: (e) => {
                    this.appState.tmdb_session = e.target.value;
                    this.appState.Cookie.set("tmdb_session", e.target.value);
                }
            },
            {
                id: "tmdb_username_input",
                label: "TMDB user name:",
                placeholder: "",
                value: this.appState.tmdb_username || "",
                onChange: (e) => {
                    this.appState.tmdb_username = e.target.value;
                    this.appState.Cookie.set("tmdb_username", e.target.value);
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
            if (c.id) this[c.id] = input;
        });

        let button = document.createElement("button");
        button.innerText = "Test Discogs credentials";
        button.className = "settings-button";
        button.onclick = (e) => {
            if ((this.appState.token)&&(!this.appState.username)) {
                this.appState.progress("Testing access token", 0, 1);
                this.appState.API.call(
                    "https://api.discogs.com/oauth/identity"
                ).then(data => {
                    this.username_input.value = data.username;
                    this.username_input.onchange({target:this.username_input});
                    this.appState.progress("Testing access token");
                });
            } else if (this.appState.username) {
                this.appState.API.call(
                    `https://api.discogs.com/users/${this.appState.username}/collection/folders/0/releases`
                    ,(stage, stages) => {
                        this.appState.progress("Testing Discogs username", stage, stages);
                    }                    
                ).then(data => {
                    const items = (data.pagination && data.pagination.items) || data.releases.length;
                    this.appState.progress("Testing Discogs username");
                    uiFeedback.showStatus(`Discogs username is valid, total items in collection = ${items}`, 'success');
                });
            } else {
                uiFeedback.showStatus("Specify Discogs access token or username at least", "warning");
            };
            // uiFeedback.showStatus('Testing credentials', 'success');
        };
        credentialsGroup.appendChild(button);

        button = document.createElement("button");
        button.innerText = "Authenticate on TMDB";
        button.className = "settings-button";
        button.onclick = (e) => {
            if (this.appState.tmdb_token) {
                this.appState.progress("Requesting new user token", 0, 1);
                this.appState.TMDB.call(
                    "https://api.themoviedb.org/3/authentication/token/new", "GET"
                ).then(data => {
                    uiFeedback.showStatus("user token expires " + data.expires_at, "warning");
                    this.tmdb_session_input.value = `R::${data.request_token}`;
                    this.tmdb_session_input.onchange({target:this.tmdb_session_input});
                    this.appState.progress("Requesting new user token");
                    setTimeout(()=>{
                        window.location.href = `https://www.themoviedb.org/authenticate/${data.request_token}?redirect_to=${window.location.href}`;
                    },500)
                });
            } else {
                uiFeedback.showStatus("Specify TMDB app token", "warning");
            };
            // uiFeedback.showStatus('Testing credentials', 'success');
        };
        credentialsGroup.appendChild(button);

        return credentialsGroup;
    },

    renderSwitch: function(label, text, value_key, renormalize) {
        let switchGroup = document.createElement("div");
        switchGroup.className = "settings-group other-settings-group";
        let matchTypeLabel = document.createElement("label");
        matchTypeLabel.textContent = label;
        matchTypeLabel.className = "settings-label";
        switchGroup.appendChild(matchTypeLabel);
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
        leftText.textContent = text[0];
        leftText.className = "switch-left-text";
        let rightText = document.createElement("span");
        rightText.textContent = text[1];
        rightText.className = "switch-right-text";
        switchInput.checked = ((this.appState[value_key] || text[0]) === text[1]);

        knob.style.left = switchInput.checked ? "30px" : "2px";

        this.appState[value_key] = text[switchInput.checked*1];
        switchInput.onchange = (e) => {
            knob.style.left = e.target.checked ? "30px" : "2px";
            this.appState[value_key] = text[e.target.checked*1];
            if (e.target.checked) {
                rightText.classList.add("switch-active-text")
                leftText.classList.remove("switch-active-text")
            } else {
                leftText.classList.add("switch-active-text")
                rightText.classList.remove("switch-active-text")
            }
            if (renormalize)
                setTimeout(this.appState.Pages.Collection.normalise(), 100);
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
        switchGroup.appendChild(switchContainer);
        return switchGroup;
    }
}

export { Page };