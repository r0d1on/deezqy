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
        let token = this.appState.Cookie.get("token");
        if (token) {
            this.appState.token = token;
        }
        let username = this.appState.Cookie.get("username");
        if (username) {
            this.appState.username = username;
        }
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
        settingsContainer.appendChild(this.renderOtherSettingsGroup());

        parent.appendChild(settingsContainer);
    },

    renderCredentialsGroup: function() {
        let credentialsGroup = document.createElement("div");
        credentialsGroup.className = "settings-group credentials-group";
        const creds = [
            {
                label: "Discogs access token:",
                placeholder: "discogs personal access token",
                value: this.appState.token || "",
                onChange: (e) => {
                    this.appState.token = e.target.value;
                    this.appState.Cookie.set("token", e.target.value);
                }
            },
            {
                id: "username_input",
                label: "User name:",
                placeholder: "",
                value: this.appState.username || "",
                onChange: (e) => {
                    this.appState.username = e.target.value;
                    this.appState.Cookie.set("username", e.target.value);
                    this.appState.Pages.Collection.init();
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
        button.innerText = "Test credentials";
        button.className = "settings-button";
        button.onclick = (e) => {
            if ((this.appState.token)&&(!this.appState.username)) {
                this.appState.progress(0,1,"Testing access token");
                this.appState.API.call(
                    "https://api.discogs.com/oauth/identity"
                    ,data => {
                        this.username_input.value = data.username;
                        this.username_input.onchange({target:this.username_input});
                        this.appState.progress();
                    }
                );
            } else if (this.appState.username) {
                this.appState.progress(0,1,"Testing username");
                this.appState.API.call(
                    `https://api.discogs.com/users/${this.appState.username}/collection/folders/0/releases`
                    ,data => {
                        const items = (data.pagination && data.pagination.items) || data.releases.length;
                        this.appState.progress();
                        uiFeedback.showStatus(`Username is valid, total items in collection size = ${items}`, 'success');
                    }
                    ,null
                );
            } else {
                uiFeedback.showStatus("Specify access token or username at least", "warning");
            }
            // uiFeedback.showStatus('Testing credentials', 'success');
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
        let matchType = this.appState.matching_type || "author_and_title";
        switchInput.checked = (matchType === "title_only");
        knob.style.left = switchInput.checked ? "30px" : "2px";
        this.appState.matching_type = switchInput.checked ? "title_only" : "author_and_title";
        switchInput.onchange = (e) => {
            knob.style.left = e.target.checked ? "30px" : "2px";
            this.appState.matching_type = e.target.checked ? "title_only" : "author_and_title";
            if (e.target.checked) {
                rightText.classList.add("switch-active-text")
                leftText.classList.remove("switch-active-text")
            } else {
                leftText.classList.add("switch-active-text")
                rightText.classList.remove("switch-active-text")
            }
            setTimeout(this.appState.Pages.Collection.normaliseCollection, 100);
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

export { Page };