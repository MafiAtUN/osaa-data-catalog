/* Reports page.
 *
 * Behaviour notes vs. the previous build:
 *  - filter options come from reports.json (the hard-coded lists had duplicate
 *    entries and offered four clusters that no report belongs to);
 *  - every report used to render fully expanded, so eight reports meant a page
 *    of 168 data points; the data points and source lists are now collapsible
 *    and closed by default, with the summary always visible;
 *  - each data point shows its recorded `value`, which the data has always
 *    carried but the reports view never displayed;
 *  - the report picker is a proper combobox: arrow keys, Enter, Escape.
 */
(function () {
    'use strict';

    const state = { q: '', cluster: '', source: '', tag: '', report: '' };

    let all = [];
    let visible = [];
    const el = {};

    function cache() {
        el.search = document.getElementById('reportSearch');
        el.clear = document.getElementById('reportSearchClear');
        el.cluster = document.getElementById('reportClusterFilter');
        el.source = document.getElementById('sourceFilter');
        el.tag = document.getElementById('tagFilter');
        el.combo = document.getElementById('reportCombo');
        el.comboInput = document.getElementById('reportComboInput');
        el.comboList = document.getElementById('reportComboList');
        el.comboToggle = document.getElementById('reportComboToggle');
        el.grid = document.getElementById('reportsGrid');
        el.count = document.getElementById('resultCount');
        el.chips = document.getElementById('activeFilters');
        el.statReports = document.getElementById('statReports');
        el.statPoints = document.getElementById('statPoints');
        el.statSources = document.getElementById('statSources');
        el.export = document.getElementById('exportBtn');
    }

    async function init() {
        cache();
        OSAA.skeleton(el.grid, 3);
        readURL();

        try {
            await window.dataLoader.loadReports();
        } catch (error) {
            console.error(error);
            OSAA.errorBanner(el.grid, 'The report data could not be loaded. Please refresh the page.');
            return;
        }

        all = window.dataLoader.getReports();

        const usedClusters = window.dataLoader.getReportClusters();
        OSAA.fillSelect(
            el.cluster,
            OSAA.clusters
                .filter(c => usedClusters.includes(c.key))
                .map(c => ({ value: c.key, label: c.name })),
            'All clusters'
        );
        OSAA.fillSelect(el.source, window.dataLoader.getReportSources(), 'All data sources');
        OSAA.fillSelect(el.tag, window.dataLoader.getReportTags(), 'All tags');

        if (el.statReports) el.statReports.textContent = OSAA.formatNumber(all.length);
        if (el.statPoints) {
            el.statPoints.textContent = OSAA.formatNumber(
                all.reduce((sum, r) => sum + r.indicators.length, 0)
            );
        }
        if (el.statSources) {
            el.statSources.textContent = OSAA.formatNumber(
                window.dataLoader.getReportSources().length
            );
        }

        renderCoverageNote(usedClusters);

        syncControls();
        bind();
        setupCombobox();
        window.CatalogExport.attach(el.export, () => {
            const rows = window.CatalogExport.flattenReports(visible);
            return {
                basename: 'osaa-report-data-points',
                count: rows.length,
                noun: OSAA.plural(rows.length, 'data point'),
                csv: { columns: window.CatalogExport.DATA_POINT_COLUMNS, rows: rows },
                json: {
                    exported: new Date().toISOString(),
                    filters: {
                        search: state.q, cluster: state.cluster,
                        source: state.source, tag: state.tag, report: state.report
                    },
                    count: visible.length,
                    reports: visible.map(r => {
                        const copy = Object.assign({}, r);
                        delete copy.doc;
                        delete copy.searchText;
                        return copy;
                    })
                }
            };
        });
        apply();
    }

    /**
     * All eight knowledge products sit in two of the six clusters. Empty
     * options are already kept out of the cluster filter, but a reader coming
     * from a cluster card on the home page deserves to be told why the other
     * four are missing rather than left to infer a bug.
     */
    function renderCoverageNote(usedClusters) {
        const slot = document.getElementById('coverageNote');
        if (!slot) return;

        const missing = OSAA.clusters.filter(c => !usedClusters.includes(c.key));
        if (!missing.length) {
            slot.innerHTML = '';
            return;
        }

        slot.innerHTML = '<p class="detail__note">' + OSAA.icon('circle-info') +
            '<span>The ' + all.length + ' knowledge products tracked so far cover ' +
            usedClusters.map(k => OSAA.escapeHTML(OSAA.clusterShort(k))).join(' and ') +
            '. No report has been catalogued yet for ' +
            missing.map(c => OSAA.escapeHTML(c.short)).join(', ') +
            ' — those indicators are in the ' +
            '<a href="indicators.html">catalog</a>, but no published report has cited them.' +
            '</span></p>';
    }

    function readURL() {
        const p = OSAA.readParams();
        state.q = p.get('q') || '';
        state.cluster = p.get('cluster') || '';
        state.source = p.get('source') || '';
        state.tag = p.get('tag') || '';
        state.report = p.get('report') || '';
    }

    function syncControls() {
        el.search.value = state.q;
        el.cluster.value = state.cluster;
        el.source.value = state.source;
        el.tag.value = state.tag;
        el.clear.hidden = !state.q;

        const picked = all.find(r => r.id === state.report);
        el.comboInput.value = picked ? picked.title : '';
    }

    function bind() {
        el.search.addEventListener('input', OSAA.debounce(() => {
            state.q = el.search.value;
            el.clear.hidden = !state.q;
            apply();
        }, 200));

        el.clear.addEventListener('click', () => {
            el.search.value = '';
            state.q = '';
            el.clear.hidden = true;
            el.search.focus();
            apply();
        });

        [['cluster', el.cluster], ['source', el.source], ['tag', el.tag]].forEach(([key, node]) => {
            node.addEventListener('change', () => {
                state[key] = node.value;
                apply();
            });
        });

        el.chips.addEventListener('click', event => {
            const target = event.target.closest('[data-clear]');
            if (!target) return;
            clearFilter(target.dataset.clear);
        });

        // Clicking a tag on a report card filters by it.
        el.grid.addEventListener('click', event => {
            const tag = event.target.closest('[data-tag]');
            if (!tag) return;
            state.tag = tag.dataset.tag;
            el.tag.value = state.tag;
            apply();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('popstate', () => {
            readURL();
            syncControls();
            apply();
        });
    }

    function clearFilter(key) {
        if (key === 'all') {
            state.q = state.cluster = state.source = state.tag = state.report = '';
        } else {
            state[key] = '';
        }
        syncControls();
        apply();
    }

    /* ------------------------------------------------------------ combobox */

    function setupCombobox() {
        let options = [];
        let active = -1;

        const open = () => {
            el.comboList.hidden = false;
            el.comboInput.setAttribute('aria-expanded', 'true');
        };
        const close = () => {
            el.comboList.hidden = true;
            el.comboInput.setAttribute('aria-expanded', 'false');
            active = -1;
        };

        function paint(filter) {
            const q = (filter || '').toLowerCase().trim();
            options = all.filter(r =>
                !q || r.title.toLowerCase().includes(q) || String(r.year).includes(q)
            );

            if (!options.length) {
                el.comboList.innerHTML = '<li class="combobox__empty">No reports match</li>';
                return;
            }

            el.comboList.innerHTML = options.map((r, i) =>
                '<li class="combobox__option" role="option" id="reportOpt' + i + '"' +
                ' aria-selected="' + (i === active) + '" data-id="' + OSAA.escapeHTML(r.id) + '">' +
                '<span class="combobox__option-title">' + OSAA.escapeHTML(r.title) + '</span>' +
                '<span class="combobox__option-meta">' + OSAA.escapeHTML(r.year) + ' · ' +
                r.indicators.length + ' data points</span></li>'
            ).join('');
        }

        function highlight(next) {
            active = next;
            Array.from(el.comboList.children).forEach((node, i) => {
                node.setAttribute('aria-selected', String(i === active));
            });
            const node = el.comboList.children[active];
            if (node) {
                node.scrollIntoView({ block: 'nearest' });
                el.comboInput.setAttribute('aria-activedescendant', node.id);
            }
        }

        function choose(id) {
            const report = all.find(r => r.id === id);
            if (!report) return;
            state.report = id;
            el.comboInput.value = report.title;
            close();
            apply();
        }

        el.comboInput.addEventListener('input', () => {
            if (state.report) {
                state.report = '';
            }
            paint(el.comboInput.value);
            open();
            apply();
        });

        el.comboInput.addEventListener('focus', () => {
            paint(state.report ? '' : el.comboInput.value);
            open();
        });

        el.comboToggle.addEventListener('click', () => {
            if (el.comboList.hidden) {
                paint('');
                open();
                el.comboInput.focus();
            } else {
                close();
            }
        });

        el.comboInput.addEventListener('keydown', event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (el.comboList.hidden) { paint(el.comboInput.value); open(); }
                if (!options.length) return;
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                highlight((active + delta + options.length) % options.length);
            } else if (event.key === 'Enter') {
                if (!el.comboList.hidden && active >= 0 && options[active]) {
                    event.preventDefault();
                    choose(options[active].id);
                }
            } else if (event.key === 'Escape') {
                if (!el.comboList.hidden) {
                    event.preventDefault();
                    close();
                } else if (state.report || el.comboInput.value) {
                    el.comboInput.value = '';
                    state.report = '';
                    apply();
                }
            }
        });

        el.comboList.addEventListener('mousedown', event => {
            const option = event.target.closest('[data-id]');
            if (!option) return;
            event.preventDefault();
            choose(option.dataset.id);
        });

        document.addEventListener('click', event => {
            if (!el.combo.contains(event.target)) close();
        });

        paint('');
    }

    /* ------------------------------------------------------------- filters */

    function apply() {
        const query = state.q.trim();
        const typed = el.comboInput.value.toLowerCase().trim();
        const ranked = query ? window.dataLoader.searchReports(query) : all.slice();

        visible = ranked.filter(report => {
            if (state.report) return report.id === state.report;
            // Free text in the picker narrows the grid even before a selection.
            if (typed && !report.title.toLowerCase().includes(typed) &&
                !String(report.year).includes(typed)) return false;
            if (state.cluster && report.cluster !== state.cluster) return false;
            if (state.tag && !report.tags.some(t => t === state.tag)) return false;
            if (state.source && !usesSource(report, state.source)) return false;
            return true;
        });

        // A search ranks by relevance; otherwise newest first.
        if (!query) {
            visible.sort((a, b) => String(b.year).localeCompare(String(a.year)) ||
                a.title.localeCompare(b.title));
        }

        OSAA.writeParams(state);
        render();
    }

    function usesSource(report, name) {
        const needle = name.toLowerCase();
        return report.sources.some(s => (s.name || '').toLowerCase() === needle) ||
            report.indicators.some(i => (i.source || '').toLowerCase().includes(needle));
    }

    function render() {
        renderChips();

        el.count.innerHTML = visible.length === all.length
            ? 'Showing all <strong>' + all.length + '</strong> knowledge products'
            : 'Showing <strong>' + visible.length + '</strong> of ' + all.length +
              ' knowledge products';

        if (!visible.length) {
            el.grid.innerHTML =
                '<div class="empty-state">' +
                OSAA.icon('file-circle-question') +
                '<h3>No reports match these filters</h3>' +
                '<p>Try a different combination, or clear the filters.</p>' +
                '<button type="button" class="btn btn--secondary" data-clear="all">' +
                'Clear all filters</button></div>';
            return;
        }

        // A single result is what the reader asked for — open it up.
        el.grid.innerHTML = visible.map(r => reportCard(r, visible.length === 1)).join('');
    }

    function renderChips() {
        const chips = [];
        const picked = all.find(r => r.id === state.report);
        if (picked) chips.push(chip('report', picked.title));
        if (state.q) chips.push(chip('q', 'Search: “' + state.q + '”'));
        if (state.cluster) chips.push(chip('cluster', OSAA.clusterShort(state.cluster)));
        if (state.source) chips.push(chip('source', state.source));
        if (state.tag) chips.push(chip('tag', state.tag));

        el.chips.innerHTML = chips.length
            ? chips.join('') +
              '<button type="button" class="btn btn--ghost btn--sm" data-clear="all">Clear all</button>'
            : '';
    }

    function chip(key, label) {
        const text = label.length > 46 ? label.slice(0, 44) + '…' : label;
        return '<button type="button" class="chip" data-clear="' + key + '">' +
            OSAA.escapeHTML(text) +
            '<span class="chip__x" aria-hidden="true">' + OSAA.icon('xmark') + '</span>' +
            '<span class="visually-hidden">Remove this filter</span></button>';
    }

    /* -------------------------------------------------------------- render */

    function mark(text) {
        return window.CatalogSearch.highlight(text, state.q, OSAA.escapeHTML);
    }

    function reportCard(report, expanded) {
        const e = OSAA.escapeHTML;
        const link = OSAA.safeURL(report.link);

        return '' +
            '<article class="report-card">' +
              '<div class="report-card__head">' +
                '<div class="report-card__topline">' +
                  '<span class="year-badge">' + e(report.year) + '</span>' +
                  (report.cluster
                      ? '<span class="cluster-pill cluster-' + e(report.cluster) + '">' +
                        e(OSAA.clusterShort(report.cluster)) + '</span>'
                      : '') +
                  '<span>' + report.indicators.length + ' data points · ' +
                    report.sources.length + ' sources</span>' +
                '</div>' +
                '<h3 class="report-card__title">' + mark(report.title) + '</h3>' +
                '<p class="report-card__summary">' + mark(report.summary) + '</p>' +
                '<div class="tag-row">' +
                  report.tags.map(t =>
                      '<button type="button" class="tag" data-tag="' + e(t) + '">' + e(t) + '</button>'
                  ).join('') +
                '</div>' +
                (link
                    ? '<p><a class="btn btn--primary btn--sm" href="' + e(link) +
                      '" target="_blank" rel="noopener">' +
                      OSAA.icon('arrow-up-right-from-square') +
                      'Read the report<span class="visually-hidden"> — ' + e(report.title) +
                      ' (opens in a new tab)</span></a></p>'
                    : '') +
              '</div>' +

              panel('Data points used', 'chart-line', report.indicators.length,
                  dataPoints(report), expanded) +

              panel('Key data sources', 'database', report.sources.length,
                  '<div class="source-list">' + report.sources.map(sourceItem).join('') + '</div>',
                  false) +
            '</article>';
    }

    function panel(title, icon, count, body, open) {
        return '<details class="report-card__panel"' + (open ? ' open' : '') + '>' +
            '<summary>' + OSAA.icon('chevron-right', { className: 'chev' }) + '' +
            OSAA.icon(icon) +
            OSAA.escapeHTML(title) +
            '<span class="count-badge">' + count + '</span></summary>' +
            '<div class="panel-body">' + body + '</div></details>';
    }

    function dataPoints(report) {
        const groups = new Map();
        report.indicators.forEach(point => {
            const key = point.cluster || 'other';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(point);
        });

        return Array.from(groups.entries()).map(([key, points]) =>
            '<section class="cluster-group">' +
              '<h4 class="cluster-group__head">' +
                '<span class="cluster-pill cluster-' + OSAA.escapeHTML(key) + '">' +
                  OSAA.escapeHTML(OSAA.clusterShort(key)) + '</span>' +
                points.length + ' ' + OSAA.plural(points.length, 'data point') +
              '</h4>' +
              '<ul class="point-list">' + points.map(pointItem).join('') + '</ul>' +
            '</section>'
        ).join('');
    }

    /** One "Dataset" button per source, labelled when we know which is which. */
    function datasetLinks(point) {
        return OSAA.pointLinks(point).map(entry =>
            '<a class="provenance-data-link" href="' + OSAA.escapeHTML(entry.url) +
            '" target="_blank" rel="noopener">' + OSAA.icon('database') +
            OSAA.escapeHTML(entry.label || 'Dataset') +
            '<span class="visually-hidden"> — ' + OSAA.escapeHTML(point.name) +
            ' (opens in a new tab)</span></a>'
        ).join('');
    }

    function pointItem(point) {
        const e = OSAA.escapeHTML;

        return '<li class="point">' +
            '<div class="point__main">' +
              '<span class="point__name">' + mark(point.name) + '</span>' +
              (point.value ? '<span class="point__value">' + e(point.value) + '</span>' : '') +
            '</div>' +
            (point.notes ? '<p class="point__notes">' + e(point.notes) + '</p>' : '') +
            '<div class="point__meta">' +
              '<span class="meta-item">' + OSAA.icon('quote-left') + '' +
                '<span class="visually-hidden">Source: </span>' + e(point.source || 'Unattributed') +
              '</span>' +
              datasetLinks(point) +
            '</div>' +
            '</li>';
    }

    function sourceItem(source) {
        const e = OSAA.escapeHTML;
        const link = OSAA.safeURL(source.link);
        const inner =
            '<span class="source-avatar" aria-hidden="true">' + e((source.name || '?').charAt(0)) + '</span>' +
            '<span class="source-item__body">' +
              '<span class="source-item__name">' + e(source.name) + '</span>' +
              (source.type ? '<span class="source-item__type">' + e(source.type) + '</span>' : '') +
            '</span>';

        return link
            ? '<a class="source-item" href="' + e(link) + '" target="_blank" rel="noopener">' +
              inner + '<span class="visually-hidden"> (opens in a new tab)</span></a>'
            : '<span class="source-item">' + inner + '</span>';
    }

    document.addEventListener('click', event => {
        if (event.target.closest('.empty-state [data-clear="all"]')) clearFilter('all');
    });

    document.addEventListener('DOMContentLoaded', init);
})();
