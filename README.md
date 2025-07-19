# Deezqy: Discogs Collection Analytics

Deezqy is a lightweight, browser-based tool for analyzing and managing your Discogs music collection. It provides a sortable and filterable table view, local caching, a uniqueness score for each release, and advanced search and track matching features. The app is built as a single-page application using vanilla JavaScript, HTML, and CSS.

## Features

- **Setup Page**: Enter your Discogs private token and test credentials to automatically retrieve your username, or enter a username to access public releases. Choose your preferred track matching mode ("author & title" or "title only").
- **Collection Page**: Load and update your collection, which is cached locally for fast access. The collection is displayed as a sortable and filterable table. Track uniqueness is calculated based on your selected matching mode.
- **Advanced Search Page**: Search Discogs releases by multiple parameters (title, artist, track, country, format, barcode). Results are shown in a table with sorting and filtering. You can match search results against your collection to see which releases you already have or want.
- **Table View**: Sort and filter any column. Sorting is toggled by clicking column headers, with visual indicators for sort direction. Filter inputs are available under each column name.
- **Uniqueness Score**: Each release (album) is assigned a score representing its uniqueness within your collection, shown in the `score` column.
- **Track Matching Mode**: Switch between "author & title" and "title only" matching for track uniqueness and deduplication.
- **Release Info & Tracklist**: View detailed release information and tracklists, including cross-references to your collection for each track.
- **Progress Bar**: The footer displays the current process and progress bar for long-running operations.
- **Privacy**: All data is stored locally in your browser and is not shared externally.
- **Navigation**: Use the menu at the top to switch between setup, collection, search, and help sections.
- **Help Page**: Provides a clear guide for using the application.
- **Support**: For more information or to report issues, visit the [GitHub](https://github.com/r0d1on/deezqy) page.

## Usage

1. **Setup**
   - Go to the Setup page.
   - Enter your Discogs access token and click "Test credentials" to retrieve your username automatically.
   - Alternatively, enter a username to access public releases.
   - Select your preferred track matching mode for collection uniqueness analysis.

2. **Loading & Updating**
   - Use the Collection tab to load or update your collection.
   - The collection is cached locally for faster access on future visits.

3. **Table View**
   - Your collection is displayed as a sortable and filterable table.
   - Click column headers to sort; click again to reverse sort order.
   - Enter filter values under column names to filter the collection.

4. **Advanced Search**
   - Use the Search page to find releases by title, artist, track, country, format, or barcode.
   - Results are shown in a sortable/filterable table.
   - Click a result to view detailed release info and see if it matches any tracks in your collection.

5. **Track Matching Mode**
   - Switch between "author & title" and "title only" matching in Setup to control how tracks are deduplicated and scored for uniqueness.

6. **Uniqueness Score**
   - Each release is assigned a score representing its uniqueness within your collection, based on the selected matching mode.

7. **Progress & Status**
   - The footer displays the current process and progress bar for long-running operations.

8. **Privacy**
   - All data is stored locally in your browser and is not shared externally.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6 modules)
- Discogs API

## Project Structure

- `index.html` — Main HTML file, includes header, main area, and footer.
- `style.css` — Styles for layout, table, menu, and help section.
- `app.js` — Main application logic, menu handling, progress bar, and page rendering.
- `pages/Setup.js` — Setup page logic and rendering.
- `pages/Collection.js` — Collection page logic, table rendering, sorting, filtering, and normalization.
- `pages/Search.js` — Advanced search page, release info, and collection matching.
- `pages/Help.js` — Help page rendering.
- `api/discogs.js` — Discogs API integration and data fetching.
- `misc/listRenderer.js` — Generic table rendering, sorting, and filtering logic.
- `misc/Utils.js` — Utility functions for normalization and track code generation.
- `favicon.svg` — Favicon depicting a CD.

## Development

- The app is a single-page application and does not require a backend server.
- All data is stored in the browser using local storage and cookies.
- The app was "vibecoded" on a weekend for fun and utility.

## License

This project is released under the MIT License.

p.s.: Copilot/GPT-4.1 decided to go with MIT licence, I'm gonna play along. This is the only piece of text I wrote myself in this Readme.md.