# Deezqy

Deezqy is a browser-based personal media collection manager for music and video. It combines a Discogs music collection with TMDB list data for DVDs, movies, and TV shows. The application provides sortable collection tables, filtering, search, track matching, uniqueness scoring, and collection analytics.

Deezqy is a single-page application built with browser-native JavaScript modules. It does not require a backend server or a build step for local development.

## Features

### Music collection

- Load and update a Discogs collection.
- Browse releases and tracks in a sortable, filterable table.
- Match tracks by artist and title or by title only.
- Calculate a release uniqueness score based on overlapping tracks.
- Show release details, tracklists, notes, formats, ratings, and prices.
- Maintain a separate wanted list.

### Video collection

- Authenticate with TMDB and load TMDB lists as DVD folders.
- Browse movies and TV shows with posters, ratings, runtime, genres, notes, and release dates.
- View budget, revenue, and return-on-investment information when provided by TMDB.
- Filter and sort video items by folder, media type, title, rating, and other fields.

### Search and analytics

- Search Discogs by title, artist, track, country, format, or barcode.
- Compare search results with the music collection and wanted list.
- Analyze the music collection by folder, artist, media type, genre, or week added.
- Analyze the video collection by folder, media type, genre, or release year.
- Select analytics values such as release count, tracks, ratings, prices, runtime, budget, and ROI.
- Display analytics as both a table and a Plotly bar chart.

### Application features

- Persistent browser-side caching for collection data.
- IndexedDB storage for larger collection data and local storage for saved credentials/settings.
- Progress and status feedback for API calls and normalization tasks.
- Responsive interface with installable Progressive Web App support.
- No application account or Deezqy-hosted database.

## Getting started

1. Open the deployed application or serve the repository with a static web server.
2. Open **Setup**.
3. Enter a Discogs personal access token and username, or test the token to retrieve the account details.
4. Optionally enter TMDB credentials to enable the **DVD** page and video analytics.
5. Load the music collection from **Collection** or the video lists from **DVD**.
6. Use **Analytics** to switch between the Music collection and Video collection sources.

Discogs access is required for music features. TMDB credentials and list data are required for video features. API data is fetched directly by the browser from the corresponding service.

## Privacy and storage

Collection data is cached in the browser using IndexedDB. Credential and application settings are stored locally using browser storage. Deezqy does not send collection data to its own server, but it does communicate with Discogs and TMDB when loading, searching, or updating data.

Clearing the site's browser data removes the local cache and saved settings.

## Technologies

- HTML5
- CSS3
- Modern JavaScript with ES modules
- IndexedDB for local database storage
- `localStorage` for locally saved settings and cookie-like values
- Discogs API for music collections and search
- TMDB API for video lists and metadata
- Plotly 2.35 for analytics charts
- Service Worker and Web App Manifest for offline caching and installation

## Project structure

```text
.
├── index.html              Application shell and external chart script
├── app.js                  Application state, navigation, storage, and rendering
├── appState.js             Shared application state
├── style.css               Global layout and component styles
├── manifest.webmanifest    Progressive Web App metadata
├── service-worker.js       Static asset caching
├── api/
│   ├── cookie.js           Local credential/settings storage
│   ├── db.js               IndexedDB wrapper
│   ├── discogs.js          Discogs API client
│   └── tmdb.js             TMDB API client
├── misc/
│   ├── listRenderer.js     Reusable table, sorting, and filtering logic
│   ├── uiFeedback.js       Status and error notifications
│   └── Utils.js            Normalization and track-matching utilities
├── pages/
│   ├── Setup.js            Credentials and matching settings
│   ├── Collection.js       Discogs collection normalization and display
│   ├── Wanted.js           Wanted releases display
│   ├── DVD.js              TMDB video collection normalization and display
│   ├── Search.js           Discogs search and result matching
│   ├── Analytics.js        Music and video analytics
│   └── Help.js             In-app usage guidance
├── deploy_info/            Deployment metadata templates and variables
├── _deploy.sh              Deployment helper
├── _subst.sh               Deployment substitution helper
└── _version_bump.sh        Version update helper
```

## Development

No package installation is required. Because the application uses ES modules, run it through a local HTTP server instead of opening `index.html` directly. For example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

The application is static and can be hosted by any web server that serves HTML, CSS, JavaScript, and the accompanying assets.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for the license text.

## Links

- [GitHub repository](https://github.com/r0d1on/deezqy)