'use strict';

import {Page as PageSetup} from './pages/Setup.js';
import {Page as PageCollection} from './pages/Collection.js';
import {Page as PageSearch} from './pages/Search.js';
import {Page as PageHelp} from './pages/Help.js';

import {API} from './api/discogs.js';
import {Cookie} from './api/cookie.js';
import {DB} from './api/db.js';

import appState from './appState.js';

const menuItems = [
    { name: 'Setup', page: PageSetup},
    { name: 'Collection',  page: PageCollection},
    { name: 'Search',  page: PageSearch},
    /*
    { name: 'Analytics', submenu: [
        'growth over time',
        'statistics',
        'duplicates'
    ] },
    */
    { name: 'Help', page: PageHelp}
];

appState.ui.activeMenu = menuItems[0];
appState.ui.activeSubmenu = null;
appState.matchingType = "author_and_title";

// Overlay element for processing indication
function createOverlay() {
    let overlay = document.createElement('div');
    overlay.id = 'app-overlay';
    overlay.className = 'app-overlay';
    overlay.innerHTML = `<img src="loader.gif" alt="Processing..." class="app-overlay-gif">`;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
}

appState.showOverlay = function() {
    let overlay = document.getElementById('app-overlay');
    if (!overlay) createOverlay();
    overlay = document.getElementById('app-overlay');
    overlay.style.display = 'flex';
};

appState.hideOverlay = function() {
    let overlay = document.getElementById('app-overlay');
    if (overlay) overlay.style.display = 'none';
};

appState.progress =  function(stage, stages, name) {
    function idle() {
        progressSection.innerHTML = 'Idle';
        if (appState.data) {
            progressSection.innerHTML += " | DB: " + (new Date(appState.data.timestamp||0)).toISOString();
            progressSection.innerHTML += " | Items: " + appState.rowCount||"-";
            progressSection.innerHTML += " | Score: " + ((Math.round(appState.score*100)/100)||"-")+"%";
        };
    };

    const progressSection = document.getElementById('footer-progress');
    if (!progressSection) return;

    if (stage < 0) {
        idle();
        return;
    };

    if (((stage===undefined)&&(stages===undefined)&&(name===undefined))||(stage > stages)) {
        this._stage = undefined;
        this._stages = undefined;
        this._name = undefined;
        idle();
        return;
    }

    if ((stages !== undefined)&&(name !== undefined)) {
        this._stages = stages;
        this._name = name;
    }

    if (stage !== undefined) {
        this._stage = stage;
    }

    stage = stage||this._stage;
    stages = stages||this._stages;
    name = name||this._name;

    const percent = Math.round(Math.min(1.0, stage / stages) * 100);
    progressSection.innerHTML = `<span>${name}</span> <div class='progress-bar'><div class='progress-bar-fill' style='width:${percent}%;'></div></div> <span>${percent}%</span>`;
}

appState.init = async function() {
    appState.showOverlay();

    appState.API = API.init(appState);
    appState.Cookie = Cookie.init(appState);
    appState.DB = DB.init(appState, false);

    appState.Pages = {};
    menuItems.forEach(item => {
        if (item.page) {
            item.page.init(appState);
            appState.Pages[item.name] = item.page;
        };
        if (item.submenu) {
            item.submenu.forEach(sub => {
                if (sub.page) {
                    sub.page.init(appState);
                    appState.Pages[item.name + ":" + item.submenu] = sub.page;
                };
            });
        };
    });
    renderMenu();
    renderContent();

    appState.hideOverlay();
}

/**
 * Application menu item definition.
 * @typedef {Object} MenuItem
 * @property {string} name - Menu item name.
 * @property {Object} [page] - Associated page module.
 * @property {Array<string|Object>} [submenu] - Submenu items.
 */

/**
 * Render the main menu and submenus.
 * @param {boolean} [skipSubmenus=false] - If true, hides submenus after click.
 */
function renderMenu(skipSubmenus = false) {
    const menu = document.querySelector('.menu');
    menu.innerHTML = '';
    menuItems.forEach(item => {
        menu.appendChild(createMenuItem(item, skipSubmenus));
    });
}

/**
 * Create a menu item DOM element, including submenus if present.
 * @param {MenuItem} item - The menu item definition.
 * @param {boolean} skipSubmenus - Whether to skip showing submenus.
 * @returns {HTMLElement} The menu item element.
 */
function createMenuItem(item, skipSubmenus) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item' + (appState.ui.activeMenu === item ? ' active' : '');
    menuItem.textContent = item.name;
    menuItem.onclick = () => {
        appState.ui.activeMenu = item;
        appState.ui.activeSubmenu = null;
        renderMenu();
        renderContent();
    };
    if (item.submenu) {
        menuItem.classList.toggle('show-submenu', (appState.ui.activeMenu === item) && (!skipSubmenus));
        menuItem.appendChild(createSubmenu(item, skipSubmenus));
    }
    return menuItem;
}

/**
 * Create a submenu DOM element for a menu item.
 * @param {MenuItem} item - The menu item with submenu.
 * @param {boolean} skipSubmenus - Whether to skip showing submenus.
 * @returns {HTMLElement} The submenu element.
 */
function createSubmenu(item, skipSubmenus) {
    const submenu = document.createElement('div');
    submenu.className = 'submenu';
    item.submenu.forEach(sub => {
        const subItem = document.createElement('div');
        subItem.className = 'submenu-item' + (appState.ui.activeSubmenu === sub ? ' active' : '');
        subItem.textContent = sub;
        subItem.onclick = (e) => {
            e.stopPropagation();
            appState.ui.activeMenu = item;
            appState.ui.activeSubmenu = sub;
            renderContent();
            renderMenu(true); // Hide submenus when submenu item is clicked
        };
        submenu.appendChild(subItem);
    });
    return submenu;
}

/**
 * Render the main content area based on the active menu and submenu.
 */
function renderContent() {
    const content = document.querySelector('.app-content');
    if (appState.ui.activeMenu && appState.ui.activeMenu.submenu && appState.ui.activeSubmenu) {
        content.textContent = `test ${appState.ui.activeSubmenu}`;
    } else {
        if (appState.ui.activeMenu.page) {
            appState.ui.activeMenu.page.render(content);
        } else {
            content.textContent = `test ${appState.ui.activeMenu.name}`;
        }
    }
}

/**
 * Initialize the application after DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    window.appState = appState;
    appState.init();
});
