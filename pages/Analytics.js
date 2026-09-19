'use strict';

import { Utils } from '../misc/Utils.js';
import { uiFeedback } from '../misc/uiFeedback.js';
import { ListRenderer } from '../misc/listRenderer.js';

/**
 * Analytics Page Module
 * @module PageAnalytics
 */
const Page = {
    /** @type {object} */
    appState: null,

    /** Aggregates */
    AGG: {
        "total" : p => p.sum,
        "average" : p => {
            if (p.sum==0) return 0;
            if (p.count==0) return 0;
            return (p.sum / p.count);
        },
        "count" : p => p.count
    },

    /** Music analytics value definitions */
    MUSIC_VALUES: [
        {
            name: 'duplicates', 
            label: 'Duplicate tracks',
            field: 'release',
            aggregations: ['total', 'average'],
            transform: (r) => [(1.0 - (r.score / 100)) * r.details.tracklist.length, r.details.tracklist.length]
        },
        {
            name: 'tracks', 
            label: 'Tracks',
            field: 'release.details.tracklist',
            aggregations: ['count'],
            transform: (r) => [r.length, r.length]
        },
        {
            name: 'score', 
            label: 'Release uniqueness Score',
            field: 'release.score',
            aggregations: ['average'],
            transform: (r) => [r, 1]
        },
        {
            name: 'rating',
            label: 'Release rating',
            field: 'release.rating',
            aggregations: ['average'],
            transform: (r) => [r, 1]
        },
        {
            name: 'price', 
            label: 'Release price (lowest)',
            field: 'release.details.lowest_price',
            aggregations: ['total', 'average'],
            transform: (r) => [r, 1]
        },
        {
            name: 'duration', 
            label: 'Track duration',
            field: 'release',
            aggregations: ['total', 'average'],
            transform: (r) => {
                let tracks = r.details.tracklist;
                return [
                    tracks.reduce((p, c) => {
                        let duration = Utils.durationDiff(c.duration, "0:0");
                        return p + (duration == 1/0)?0:duration / 60;
                    }, 0),
                    tracks.reduce((p, c) => {
                        let duration = Utils.durationDiff(c.duration, "0:0");
                        return p + (duration == 1/0)?0:1;
                    }, 0)
                ];
            }
        },
        {
            name: 'date-added', 
            label: 'Release week added',
            field: 'release.date_added',
            aggregations: ['average'],
            transform: (val) => {
                let dt = new Date(val);
                var start = new Date(dt.getFullYear(), 0, 0);
                return [Math.floor((dt - start) / (7 * 1000 * 60 * 60 * 24)), 1];
            }
        },
        {
            name: 'count', 
            label: 'Release count',
            field: 'release',
            aggregations: ['count'],
            transform: (val) => {
                return [1, 1];
            }
        }
    ],

    /** Music analytics grouping definitions */
    MUSIC_GROUPS: [
        {
            name: 'folder',
            label: 'By Folder',
            field: 'release.folder_id',
            transform: (val) => (Page.appState.collection.folders[val]||{}).name||"?"
        },
        {
            name: 'author',
            label: 'By Artist',
            field: 'release.details.artists_sort'
        },
        {
            name: 'type',
            label: 'By Media Type',
            field: 'release.format',
            transform: (val) => val // .split('|')[0].trim()
        },
        {
            name: 'genre',
            label: 'By Genre',
            field: 'release.details.genres',
            transform: (val) => val[0]
        },
        {
            name: 'week',
            label: 'By Week added',
            field: 'release.date_added',
            transform: (val) => {
                let dt = new Date(val);
                dt.setHours(0);
                dt.setMinutes(0);
                dt.setSeconds(0);
                dt.setMilliseconds(0);
                dt = new Date(dt.valueOf() - (dt.getDay()-1)*24*60*60*1000);
                return dt.toISOString().slice(0,10);
            }
        }
    ],

    /** DVD analytics value definitions */
    DVD_VALUES: [
        {
            name: 'count',
            label: 'DVD count',
            field: 'film',
            aggregations: ['count'],
            transform: () => [1, 1]
        },
        {
            name: 'rating',
            label: 'Average rating',
            field: 'film.vote_average',
            aggregations: ['average'],
            transform: (value) => [value || 0, value ? 1 : 0]
        },
        {
            name: 'runtime',
            label: 'Runtime (minutes)',
            field: 'details.runtime',
            aggregations: ['total', 'average'],
            transform: (value) => [value || 0, value ? 1 : 0]
        },
        {
            name: 'budget',
            label: 'Budget',
            field: 'details.budget',
            aggregations: ['total', 'average'],
            transform: (value) => [value || 0, value ? 1 : 0]
        },
        {
            name: 'roi',
            label: 'Return on investment',
            field: 'details',
            aggregations: ['average'],
            transform: (details) => {
                if (!details || !details.budget)
                    return [0, 0];
                return [details.revenue / details.budget, 1];
            }
        }
    ],

    /** DVD analytics grouping definitions */
    DVD_GROUPS: [
        {
            name: 'folder',
            label: 'By Folder',
            field: 'film.folders',
            transform: (folders) => Object.keys(folders || {}).map((id) =>
                (Page.appState.films.folders[id] || {}).name || '?'
            ).join('; ') || 'Unknown'
        },
        {
            name: 'type',
            label: 'By Media Type',
            field: 'film.media_type'
        },
        {
            name: 'genre',
            label: 'By Genre',
            field: 'details.genres',
            transform: (value) => (value || 'Unknown').split(' ; ')[0]
        },
        {
            name: 'year',
            label: 'By Release Year',
            field: 'film.release_date',
            transform: (value) => value ? value.slice(0, 4) : 'Unknown'
        }
    ],

    /**
     * Initialize the page with appState
     * @param {object} appState - Centralized application state
     */
    init(appState) {
        this.appState = appState;
        this.folder = 'music';
        this._setDefinitions();
    },

    _setDefinitions() {
        this.VALUES = this.folder === 'dvd' ? this.DVD_VALUES : this.MUSIC_VALUES;
        this.GROUPS = this.folder === 'dvd' ? this.DVD_GROUPS : this.MUSIC_GROUPS;
        this.selectedValue = this.VALUES[0];
        this.selectedGroup = this.GROUPS[0];
        this.selectedAggregation = this.selectedValue.aggregations[0];
    },

    /**
     * Create a dropdown select element
     * @private
     */
    _createSelect(options, selectedValue, onChange) {
        const select = document.createElement('select');
        select.className = 'analytics-select';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.name;
            option.textContent = opt.label;
            option.selected = opt.name === selectedValue;
            select.appendChild(option);
        });
        select.onchange = onChange;
        return select;
    },

    /**
     * Generate the analytics report
     * @private
     */
    _generateReport() {
        const source = this._getSource();
        if (!source) {
            uiFeedback.showError('No collection data available');
            return;
        }

        const valueField = this.selectedValue.field;
        const groupField = this.selectedGroup.field;

        // Group and aggregate data
        const groups = {};
        source.items.forEach(item => {
            if (!(source.id(item) in this.visible_releases))
                return;
            if (!source.countable(item))
                return;

            let groupKey = Utils.extractListValue(source.context(item), groupField);
            groupKey = this.selectedGroup.transform ? 
                this.selectedGroup.transform(groupKey) : 
                groupKey || 'Unknown';

            const value = this.selectedValue.transform(
                Utils.extractListValue(source.context(item), valueField)
            );

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    sum: 0,
                    count: 0
                };
            }

            if (value!==null) {
                groups[groupKey].sum += value[0];
                groups[groupKey].count += value[1];
            };
        });

        // Prepare plot data
        let rawData = (
            Object.entries(groups)
            .map(p => [p[0], Page.AGG[this.selectedAggregation](p[1])])
            .sort((a, b) => (((b[1]==1/0) || (a[1]==1/0))?1 :(b[1] - a[1])))
            .filter(a=>a[0]!='various')
        );

        // generate table with the data
        new ListRenderer({
            data: rawData.reduce(
                (p, c)=>{
                    let o = {};
                    o[this.selectedGroup.name] = c[0];
                    o[`${this.selectedAggregation} ${this.selectedValue.name}`] =  Math.trunc(c[1]*100)/100;
                    p.push(o);
                    return p;
                }, []
            ),
            columns: [
                {name: `${this.selectedGroup.name}`, sortable:true},
                {name: `${this.selectedAggregation} ${this.selectedValue.name}`, sortable:true, maxwidth:"90px"},
            ],
            compact: false
        }).render(this._listArea);

        // generate plot with the data
        const plotData = {
            x: rawData.map(a=>a[0]),
            y: rawData.map(a=>a[1]),
            type: 'bar',
            marker: {
                color: '#e52e71'
            }
        };

        // Create plot
        const layout = {
            title: `${this.selectedValue.label} (${this.selectedAggregation}) ${this.selectedGroup.label}`,
            font: { size: 14 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: {
                tickangle: -45
            }
        };

        Plotly&&Plotly.newPlot(this._plotArea, [plotData], layout);
    },

    _getSource() {
        if (this.folder === 'dvd') {
            if (!this.appState.films || !this.appState.films.list)
                return null;
            return {
                items: this.appState.films.list,
                id: (item) => item.id,
                context: (item) => ({film: item.film, details: item.details}),
                countable: (item) => true,
            };
        }
        if (!this.appState.collection || !this.appState.collection.list)
            return null;
        return {
            items: this.appState.collection.list,
            id: (item) => item.id,
            context: (item) => item,
            countable: (item) => item.first_track,
        };
    },

    /**
     * Render the analytics page
     * @param {HTMLElement} parent - Parent DOM element
     */
    render(parent) {
        parent.innerHTML = '';

        // Controls group
        const controls = document.createElement('div');
        controls.className = 'analytics-controls';

        const folderGroup = document.createElement('div');
        folderGroup.className = 'analytics-control-group';
        const folderSelect = this._createSelect([
            {name: 'music', label: 'Music collection'},
            {name: 'dvd', label: 'Video collection'}
        ], this.folder, (e) => {
            this.folder = e.target.value;
            this._setDefinitions();
            this.render(parent);
        });
        folderGroup.appendChild(folderSelect);
        controls.appendChild(folderGroup);

        // Value select
        const valueGroup = document.createElement('div');
        valueGroup.className = 'analytics-control-group';
        valueGroup.appendChild(this._createSelect(
            this.VALUES,
            this.selectedValue.name,
            (e) => {
                this.selectedValue = this.VALUES.find(v => v.name === e.target.value);
                // Update aggregation options
                aggregationSelect.innerHTML = '';
                this.selectedValue.aggregations.forEach(agg => {
                    const option = document.createElement('option');
                    option.value = agg;
                    option.textContent = agg.charAt(0).toUpperCase() + agg.slice(1);
                    option.selected = agg === this.selectedAggregation;
                    aggregationSelect.appendChild(option);
                });
                this.selectedAggregation = this.selectedValue.aggregations[0];
                this._generateReport();
            }
        ));
        controls.appendChild(valueGroup);

        // Group select
        const groupGroup = document.createElement('div');
        groupGroup.className = 'analytics-control-group';
        groupGroup.appendChild(this._createSelect(
            this.GROUPS,
            this.selectedGroup.name,
            (e) => {
                this.selectedGroup = this.GROUPS.find(g => g.name === e.target.value);
                this._generateReport();
            }
        ));
        controls.appendChild(groupGroup);

        // Aggregation select
        const aggregationGroup = document.createElement('div');
        aggregationGroup.className = 'analytics-control-group';
        const aggregationSelect = document.createElement('select');
        aggregationSelect.className = 'analytics-select';
        this.selectedValue.aggregations.forEach(agg => {
            const option = document.createElement('option');
            option.value = agg;
            option.textContent = agg.charAt(0).toUpperCase() + agg.slice(1);
            option.selected = agg === this.selectedAggregation;
            aggregationSelect.appendChild(option);
        });
        aggregationSelect.onchange = (e) => {
            this.selectedAggregation = e.target.value;
            this._generateReport();
        };
        aggregationGroup.appendChild(aggregationSelect);
        controls.appendChild(aggregationGroup);

        parent.appendChild(controls);

        // Plot area
        const plotArea = document.createElement('div');
        plotArea.className = 'analytics-plot';
        plotArea.id = 'analytics-plot';
        parent.appendChild(plotArea);
        this._plotArea = plotArea;

        const listArea = document.createElement('div');
        listArea.className = 'analytics-list';
        listArea.id = 'analytics-list';
        parent.appendChild(listArea);
        this._listArea = listArea;

        const source = this._getSource();
        if (!source)
            return;

        const page = this.folder === 'dvd' ? Page.appState.Pages.DVD : Page.appState.Pages.Collection;
        let renderer = new ListRenderer({
            data: source.items,
            columns: page.LIST,
            compact: false,
            filters: page.listFilters,
        });
        renderer.render({fake:true});

        this.visible_releases = renderer._filteredSorted.reduce((p, c)=>{
            p[source.id(c)]=true;
            return p
        },{});

        // Generate initial report
        if (source) {
            this._generateReport();
        }

    }
};

export { Page };
