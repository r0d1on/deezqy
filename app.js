'use strict';

import {Page as PageSetup} from './pages/Setup.js';
import {Page as PageCollection} from './pages/Collection.js';
import {Page as PageSearch} from './pages/Search.js';
import {Page as PageHelp} from './pages/Help.js';

import {API} from './api/discogs.js';
import {Cookie} from './api/cookie.js';
import {DB} from './api/db.js';

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

const App = {
    activeMenu : menuItems[0],
    activeSubmenu : null,
    matching_type: "author_and_title"
};

// Overlay element for processing indication
function createOverlay() {
    let overlay = document.createElement('div');
    overlay.id = 'app-overlay';
    overlay.className = 'app-overlay';
    overlay.innerHTML = `<img src="loader.gif" alt="Processing..." class="app-overlay-gif">`;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
}

App.showOverlay = function() {
    let overlay = document.getElementById('app-overlay');
    if (!overlay) createOverlay();
    overlay = document.getElementById('app-overlay');
    overlay.style.display = 'flex';
};

App.hideOverlay = function() {
    let overlay = document.getElementById('app-overlay');
    if (overlay) overlay.style.display = 'none';
};

App.progress =  function(stage, stages, name) {
    function idle() {
        progressSection.innerHTML = 'Idle';
        if (App.data) {
            progressSection.innerHTML += " | DB timestamp: " + (new Date(App.data.timestamp)).toISOString();
            progressSection.innerHTML += " | Releases: " + (App.data.releases||[]).length;
            progressSection.innerHTML += " | Uniqueness score: " + ((Math.round(App.score*100)/100)||"-")+"%";
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

App.init = function() {
    setTimeout(()=>{
        App.API = API.init(App);
        App.Cookie = Cookie.init(App);
        App.DB = DB.init(App);

        App.Pages = {};
        menuItems.forEach(item => {
            if (item.page) {
                item.page.init(App);
                App.Pages[item.name] = item.page;
            };
            if (item.submenu) {
                item.submenu.forEach(sub => {
                    if (sub.page) {
                        sub.page.init(App);
                        App.Pages[item.name + ":" + item.submenu] = sub.page;
                    };
                });
            };
        });
        renderMenu();
        renderContent();
    }, 1);
}

function renderMenu(skipSubmenus = false) {
    const menu = document.querySelector('.menu');
    menu.innerHTML = '';
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item' + (App.activeMenu === item ? ' active' : '');
        menuItem.textContent = item.name;
        menuItem.onclick = () => {
            App.activeMenu = item;
            App.activeSubmenu = null;
            renderMenu();
            renderContent();
        };
        if (item.submenu) {
            menuItem.classList.toggle('show-submenu', (App.activeMenu === item)&&(!skipSubmenus));
            const submenu = document.createElement('div');
            submenu.className = 'submenu';
            item.submenu.forEach(sub => {
                const subItem = document.createElement('div');
                subItem.className = 'submenu-item' + (App.activeSubmenu === sub ? ' active' : '');
                subItem.textContent = sub;
                subItem.onclick = (e) => {
                    e.stopPropagation();
                    App.activeMenu = item;
                    App.activeSubmenu = sub;
                    renderContent();
                    renderMenu(true); // Hide submenus when submenu item is clicked
                };
                submenu.appendChild(subItem);
            });
            menuItem.appendChild(submenu);
        }
        menu.appendChild(menuItem);
    });
}

function renderContent() {
    const content = document.querySelector('.app-content');
    if (App.activeMenu && App.activeMenu.submenu && App.activeSubmenu) {
        content.textContent = `test ${App.activeSubmenu}`;
    } else {
        if (App.activeMenu.page) {
            App.activeMenu.page.render(content);
        } else {
            content.textContent = `test ${App.activeMenu.name}`;
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
    window.App = App;
});
