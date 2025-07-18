// ListRenderer.js
// Generic list/table renderer with filtering and sorting

class ListRenderer {
    constructor({ data, columns, parent, onRowClick, compact, filters, onFiltersChange, onScore }) {
        this.data = data;
        this.columns = columns;
        this.parent = parent;
        this.onRowClick = onRowClick;
        this.compact = compact;
        this.onScore = onScore;
        // Use provided filters or default to columns' filter property
        this.filters = Array.isArray(filters) ? filters.slice() : columns.map(col => col.filter || '');
        this.onFiltersChange = onFiltersChange;
        this.sortedBy = null;
        this.sortedOrder = 1;
        this.render();
    }

    injectClicker(anchor) {
        if ((anchor.td==null)||(anchor.count==0))
            return;
        let id = anchor.id;
        let clicker = document.createElement("span");
        clicker.className = "clicker_symbol";
        clicker.innerHTML = "⊞";
        clicker.onclick = (e) => {
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

    setData(data) {
        this.data = data;
        this.render();
    }

    setColumns(columns) {
        this.columns = columns;
        this.filters = columns.map(col => col.filter || '');
        this.render();
    }

    setFilter(idx, value) {
        this.filters[idx] = value;
        if (this.onFiltersChange) this.onFiltersChange(this.filters);
        this.render();
    }

    sortBy(colIdx) {
        if (this.sortedBy === colIdx) {
            this.sortedOrder = -this.sortedOrder;
        } else {
            this.sortedBy = colIdx;
            this.sortedOrder = 1;
        }
        this.render();
    }

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

    createTableHeaders(table) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        // Row counter
        const th = document.createElement('th');
        th.textContent = '#';
        headerRow.appendChild(th);
        this.columns.forEach((col, colIdx) => {
            const th = document.createElement('th');
            const span = document.createElement('span');
            let sortIndicator = '';
            if (this.sortedBy === colIdx) {
                sortIndicator = this.sortedOrder === 1 ? ' ▲' : ' ▼';
            }
            span.textContent = sortIndicator + (col.name.split('_')[1] || col.name);
            span.style.cursor = 'pointer';
            span.onclick = () => this.sortBy(colIdx);
            th.appendChild(span);
            if (col.filter !== undefined) {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = this.filters[colIdx] || '';
                input.placeholder = '';
                input.onchange = (e) => {
                    this.setFilter(colIdx, e.target.value.trim());
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
            if (cells==null) {
                td.innerHTML = html;
            } else if (cells[ix]!=html) {
                td.innerHTML = html;
                cells[ix] = html;
                for(let j=ix + 1; j<this.columns.length; j++) cells[j]=null;
            } else {
                depth = ix + 1;
            }
            tr.appendChild(td);
        });
        if (this.onRowClick) {
            tr.onclick = (e) => {
                this.onRowClick(row, e.currentTarget);
            };
            tr.style.cursor = 'pointer';
        }
        return [idc, tr, depth];
    }

    render() {
        this.parent.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'collection-table';
        this.createTableHeaders(table);
        const filteredSorted = this.getFilteredSortedData();
        let idc=0, tr=0, depth=0;
        let anchor = { id:0, count:0, td:null };
        let seen_releases = {};
        let cells = this.compact?{}:null;
        let scores = [];
        filteredSorted.forEach((row, index) => {
            [idc, tr, depth] = this.createTableRow(row, index, seen_releases, cells);
            if (depth < 3) {
                this.injectClicker(anchor);
                anchor.id += 1;
                anchor.count = 0;
                anchor.td = idc;
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
        (this.onScore)&&(this.onScore(score));
    }

    static extract_list_value(context, path) {
        if (!Array.isArray(path)) 
            path = path.split('.').reverse();

        let key = path.pop();
        let value = context[key];
        if ((value==undefined)||(path.length==0))
            return value;
        else
            return ListRenderer.extract_list_value(value, path)
    }

    static flattenItem(columns, context) {
        let list_item = {};
        columns.forEach(col => {
            list_item[col.name] = ListRenderer.extract_list_value(context, col.path);
        });
        return list_item;
    }

}

export { ListRenderer };
