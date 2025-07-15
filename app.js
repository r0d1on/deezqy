'use strict';

import {Page as PageSetup} from './pages/Setup.js';
import {Page as PageCollection} from './pages/Collection.js';
import {Page as PageHelp} from './pages/Help.js';

import {API} from './api/discogs.js';
import {Cookie} from './api/cookie.js';
import {DB} from './api/db.js';

const menuItems = [
    { name: 'Setup', page: PageSetup},
    { name: 'Collection',  page: PageCollection},
    /*
    { name: 'Analytics', submenu: [
        'growth over time',
        'statistics',
        'duplicates'
    ] },
    */
    { name: 'Help', page: PageHelp}
];

let activeMenu = menuItems[0];
let activeSubmenu = null;

let App = {
    matching_type: "author_and_title",

    progress: function(stage, stages, name) {
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
};

App.API = API.init(App);
App.Cookie = Cookie.init(App);
App.DB = DB.init(App);

function initApp() {
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
}

function renderMenu(skipSubmenus = false) {
    const menu = document.querySelector('.menu');
    menu.innerHTML = '';
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item' + (activeMenu === item ? ' active' : '');
        menuItem.textContent = item.name;
        menuItem.onclick = () => {
            activeMenu = item;
            activeSubmenu = null;
            renderMenu();
            renderContent();
        };
        if (item.submenu) {
            menuItem.classList.toggle('show-submenu', (activeMenu === item)&&(!skipSubmenus));
            const submenu = document.createElement('div');
            submenu.className = 'submenu';
            item.submenu.forEach(sub => {
                const subItem = document.createElement('div');
                subItem.className = 'submenu-item' + (activeSubmenu === sub ? ' active' : '');
                subItem.textContent = sub;
                subItem.onclick = (e) => {
                    e.stopPropagation();
                    activeMenu = item;
                    activeSubmenu = sub;
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
    if (activeMenu && activeMenu.submenu && activeSubmenu) {
        content.textContent = `test ${activeSubmenu}`;
    } else {
        if (activeMenu.page) {
            activeMenu.page.render(content);
        } else {
            content.textContent = `test ${activeMenu.name}`;
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    renderMenu();
    renderContent();
    window.App = App;
});
