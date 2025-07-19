// appState.js
// Centralized application state for Deezqy

/**
 * @typedef {Object} AppState
 * @property {Object} API - API interface
 * @property {Object} Cookie - Cookie interface
 * @property {Object} DB - Database interface
 * @property {Object} Pages - Registered page modules
 * @property {Object} data - Main data object (collection, releases, etc.)
 * @property {Object} collection - Normalized collection data
 * @property {string} token - Discogs API token
 * @property {string} username - Discogs username
 * @property {string} matchingType - Track matching mode
 * @property {Object} ui - UI state (activeMenu, activeSubmenu, etc.)
 * @property {number} score - Collection uniqueness score
 */

const appState = {
  API: null,
  Cookie: null,
  DB: null,
  Pages: {},
  data: {},
  collection: {},
  token: '',
  username: '',
  matchingType: 'author_and_title',
  ui: {
    activeMenu: null,
    activeSubmenu: null
  },
  score: 0
};

export default appState;
