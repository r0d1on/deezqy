import { Utils } from './Utils.js';
/**
 * Generic list/table renderer with filtering and sorting.
 * @class ListRenderer
 */
class ListRenderer {
    /**
     * Create a ListRenderer instance.
     * @param {object} options - Renderer options.
     * @param {Array} options.data - Data to render.
     * @param {Array} options.columns - Column definitions.
     * @param {HTMLElement} options.parent - Parent DOM element.
     * @param {function} [options.onRowClick] - Row click handler.
     * @param {boolean} [options.compact] - Compact mode.
     * @param {Array} [options.filters] - Initial filter values.
     * @param {Array} [options.sort] - Initial sort column and order.
     * @param {function} [options.onFiltersChange] - Filters change handler.
     * @param {function} [options.onScore] - Score handler.
     * @param {function} [options.onRowDblClick] - Grouped Row double-click handler.
     */
    constructor({ data, columns, parent, onRowClick, compact, filters, sort, onFiltersChange, onScore, onRowDblCLick }) {
        this.data = data;
        this.columns = columns;
        this.parent = parent;
        this.onRowClick = onRowClick;
        this.compact = compact;
        this.onScore = onScore;
        this.onRowDblCLick = onRowDblCLick;
        // Use provided filters or default to columns' filter property
        this.filters = Array.isArray(filters) ? filters.slice() : columns.map(col => col.filter || '');
        this.onFiltersChange = onFiltersChange;
        this.sortedBy = (sort===undefined) ? null:Math.abs(sort);
        this.sortedOrder = (sort===undefined) ? 1:Math.sign(sort);
        this.precalc();
        this.render();
    }
    /**
     * Inject a clicker element for expandable rows.
     * @param {object} anchor - Anchor object with td and id.
     */
    injectClicker(anchor) {
        if ((anchor.td==null)||(anchor.count==0))
            return;
        let id = anchor.id;
        let clicker = document.createElement("span");
        clicker.className = "clicker_symbol";
        clicker.innerHTML = "⊞";
        clicker.switch = (e) => {
            Array.from(document.getElementsByClassName(`anc-${id}`)).forEach(
                el => {
                    if (el.style.display === 'none') {
                        el.style.display = '';
                    } else {
                        el.style.display = 'none';
                    }
                }
            );
            e.target.innerHTML = {"⊞": "⊟", "⊟": "⊞"}[e.target.innerHTML];
        };
        anchor.td.appendChild(clicker);
        anchor.td.className = "clicker";
    }
    /**
     * Set new data and re-render.
     * @param {Array} data - New data array.
     */
    setData(data) {
        this.data = data;
        this.render();
    }
    /**
     * Set new columns and re-render.
     * @param {Array} columns - New columns array.
     */
    setColumns(columns) {
        this.columns = columns;
        this.filters = columns.map(col => col.filter || '');
        this.render();
    }
    /**
     * Set a filter value and re-render.
     * @param {number} idx - Filter index.
     * @param {string} value - Filter value.
     */
    setFilter(idx, value) {
        this.filters[idx] = value;
        if (this.onFiltersChange) this.onFiltersChange(this.filters);
        this.render();
    }
    /**
     * Sort by a column and re-render.
     * @param {number} colIdx - Column index.
     */
    sortBy(colIdx) {
        if (this.sortedBy === colIdx) {
            this.sortedOrder = -this.sortedOrder;
        } else {
            this.sortedBy = colIdx;
            this.sortedOrder = 1;
        }
        if (this.onFiltersChange) this.onFiltersChange(this.filters, this.sortedBy*this.sortedOrder);
        this.render();
    }

    precalc() {
        // calculate (one off) pre-render properties
        this.data.forEach((row)=>{
            this.columns.filter(col=>col.post).forEach(col=>{
                row[col.name] = Utils.extractListValue(
                    {
                        "release": row['release'],
                        "row": row
                    },
                    col.path,
                    row
                )
            });
        });        
    }

    /**
     * Get filtered and sorted data.
     * @returns {Array} Filtered and sorted data.
     */
    getFilteredSortedData() {
        this.sorted = this.data || [];

        // sort dataset if needed
        let sort_code = `${this.sortedBy}:${this.sortedOrder}`;
        if ((this.sortedBy !== null) && (sort_code != this._sorted_by)) {
            const col = this.columns[this.sortedBy];
            this.sorted.sort((a, b) => {
                if (a[col.name] < b[col.name]) return -1 * this.sortedOrder;
                if (a[col.name] > b[col.name]) return 1 * this.sortedOrder;
                return 0;
            });
            this._sorted_by = sort_code;
        };

        // filter data only if any filters defined
        let filtered = [];
        if (!this.filters.every(value => value === undefined || value === '')) {
            filtered = this.sorted.filter(item => {
                return this.columns.every((col, idx) => {
                    return (
                        (this.filters[idx] === undefined || this.filters[idx].length === 0) ||
                        (
                            (item[col.name] !== undefined)
                            &&
                            (String(item[col.name]).toLowerCase().includes(this.filters[idx]))
                        )
                    );
                });
            });
        } else {
            filtered = this.sorted;
        };

        return filtered;
    }

    /**
     * Create table headers.
     * @param {HTMLElement} table - Table element.
     */
    createTableHeaders(table) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        // Row counter
        const th = document.createElement('th');
        th.innerHTML = '<span style="font-size: 35px;font-weight: 100;">⚄</span>';
        let that=this;
        th.onclick=(e)=>{
            that.random();
        };
        headerRow.appendChild(th);
        this.columns.forEach((col, colIdx) => {
            if (col.render==false)
                return;
            const th = document.createElement('th');
            const span = document.createElement('span');
            span.innerHTML = (col.name.split('_')[1] || col.name);

            let sortIndicator = null;
            if (col.sortable) {
                sortIndicator = document.createElement('span');
                sortIndicator.innerHTML = "&nbsp;🞕";
                if (this.sortedBy === colIdx)
                    sortIndicator.innerHTML = this.sortedOrder === 1 ? '&nbsp;▲' : '&nbsp;▼';
                sortIndicator.style.cursor = 'pointer';
                sortIndicator.onclick = () => this.sortBy(colIdx);
                span.appendChild(sortIndicator);
            };

            th.appendChild(span);
            if (col.filter !== undefined) {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = this.filters[colIdx] || '';
                input.placeholder = '';
                input.onchange = (e) => {
                    e.target.value = e.target.value.trim().toLowerCase();
                    this.setFilter(colIdx, e.target.value);
                };
                th.appendChild(input);
            }
            if (col.maxwidth)
                th.style = `max-width:${col.maxwidth};overflow-x:auto;`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
    }
    /**
     * Create a table row.
     * @param {object} row - Row data.
     * @param {number} index - Row index.
     * @param {object} seen_releases - Seen releases tracker.
     * @param {Array} cells - Cached cell values.
     * @returns {Array} Contains idc, tr, and depth.
     */
    createTableRow(row, index, seen_releases, cells) {
        const tr = document.createElement('tr');
        // add row number
        const td = document.createElement('td');
        let idc;
        if (row.release_id && !(row.release_id in seen_releases)) {
            seen_releases[row.release_id] = 1;
            td.innerHTML = `<small><b id="${row.release_id}">${index+1}</b></small>`;
        } else {
            td.textContent = index+1;
        }
        tr.appendChild(td);
        idc = td;

        let depth = 0;
        this.columns.forEach((col, ix) => {
            if (col.render === false) 
                return;

            const td = document.createElement('td');
            let html = '';
            if (col.render)
                html = col.render(row);
            else {
                if (col.maxwidth)
                    html = `<div style="max-width:${col.maxwidth};overflow-x:auto;">${row[col.name] !== undefined ? row[col.name] : ''}</div>`;
                else
                    html = row[col.name] !== undefined ? row[col.name] : '';
            }
            if (cells == null) {
                td.innerHTML = html;
            } else if (cells[ix] != html) {
                td.innerHTML = html;
                cells[ix] = html;
                for(let j = ix + 1; j < this.columns.length; j++) cells[j] = null;
            } else {
                depth = ix + 1;
            }
            tr.appendChild(td);
        });
        return [idc, tr, depth];
    }

    random() {
        const filteredSorted = this.getFilteredSortedData();
        let releases = filteredSorted.reduce((p , c)=>{
            if (!(c.release_id in p[1])) {
                p[1][c.release_id] = true;
                p[0].push(c.release_id);
            };
            return p;
        }, [[],{}])[0];

        let l = 0;
        let r = releases.length;
        let p = (r-l)>>1;
        while(l < r-1) {
            if (Math.random()>0.5) {
                r=p;
            } else {
                l=p;
            }
            p = (r+l)>>1;
        };
        this.setFilter(this.columns.map(i=>i.name).indexOf("release_id"), releases[l]);
    }

    /**
     * Render the list/table.
     */
    render() {
        this.parent.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'collection-table';
        this.createTableHeaders(table);
        const filteredSorted = this.getFilteredSortedData();
        let idc=0, tr=0, depth=0;
        let anchor = {id:0, count:0, td:null, row:null};
        let seen_releases = {};
        let cells = this.compact?{}:null;
        let scores = [];
        filteredSorted.forEach((row, index) => {
            [idc, tr, depth] = this.createTableRow(row, index, seen_releases, cells);
            if (this.onRowClick) {
                tr.onclick = (e) => {
                    this.onRowClick(row, e.currentTarget);
                };
                tr.style.cursor = 'pointer';
            }
            if (this.onRowDblCLick) {
                tr.ondblclick = (e) => {
                    this.onRowDblCLick(row, e.currentTarget);
                };
                tr.style.cursor = 'pointer';
            };

            if (depth < 3) {
                this.injectClicker(anchor);
                anchor.id += 1;
                anchor.count = 0;
                anchor.td = idc;
                anchor.row = row;
                scores.push(row['release_score']);
            } else {
                tr.className = `anc-${anchor.id}`;
                tr.style.display = "none";
                anchor.count += 1;
            }
            table.appendChild(tr);
        });
        this.injectClicker(anchor);
        this.parent.appendChild(table);

        let score = scores.reduce((p, c)=>p + c, 0) / scores.length;
        (this.onScore)&&(this.onScore(score, scores.length));
    }
    /**
     * Extract list value from context using a path.
     * @param {object} context - Context object.
     * @param {string|function} path - Path or function to extract value.
     * @param {object} row - Row data.
     * @returns {any} Extracted value.
     */
    static extractListValue(context, path, row) {
        if (path===undefined) 
            return undefined;

        if (typeof(path)=='function')
            return path(row, context)

        if (typeof(path)=='string')
            path = path.split('.').reverse();

        let key = path.pop();
        let value = context[key];
        if ((value==undefined)||(path.length==0))
            return value;
        else
            return ListRenderer.extractListValue(value, path)
    }
    /**
     * Flatten an item into a list item object.
     * @param {Array} columns - Column definitions.
     * @param {object} context - Context object.
     * @returns {object} Flattened list item.
     */
    static flattenItem(columns, context, post = false) {
        let list_item = {};
        columns.forEach(col => {
            if (post == (col.post||false))
                list_item[col.name] = Utils.extractListValue(context, col.path, list_item);
        });
        return list_item;
    }

}

export { ListRenderer };
