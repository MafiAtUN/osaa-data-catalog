/* Data sources page — renders the source → knowledge product reverse index
 * built by sources-index.js.
 *
 * Each source card can carry dozens of data points, so the per-report groups
 * are collapsed by default and open automatically when a filter has narrowed
 * the page to a single knowledge product.
 */
(function () {
    'use strict';

    const state = { q: '', report: '', sort: 'reports' };

    let index = [];
    let reports = [];
    const el = {};

    function cache() {
        el.search = document.getElementById('sourceSearch');
        el.clear = document.getElementById('sourceSearchClear');
        el.report = document.getElementById('sourceReportFilter');
        el.sort = document.getElementById('sourceSort');
        el.list = document.getElementById('sourcesList');
        el.count = document.getElementById('sourcesResultCount');
        el.chips = document.getElementById('activeFilters');
        el.export = document.getElementById('exportBtn');
    }

    async function init() {
        cache();
        OSAA.skeleton(el.list, 4);
        readURL();

        try {
            await window.dataLoader.loadReports(); // this page never needs data.json
        } catch (error) {
            console.error(error);
            OSAA.errorBanner(el.list, 'The report data could not be loaded, so the source index could not be built.');
            return;
        }

        reports = window.dataLoader.getReports();
        index = window.SourceIndex.buildSourceIndex(reports);

        renderStats();
        fillReportFilter();
        syncControls();
        bind();
        window.CatalogExport.attach(el.export, () => {
            const rows = filtered();
            return {
                basename: 'osaa-data-sources',
                count: rows.length,
                noun: OSAA.plural(rows.length, 'data source'),
                csv: { columns: window.CatalogExport.SOURCE_COLUMNS, rows: rows },
                json: {
                    exported: new Date().toISOString(),
                    filters: { search: state.q, report: state.report },
                    count: rows.length,
                    sources: rows
                }
            };
        });
        render();
    }

    function readURL() {
        const p = OSAA.readParams();
        state.q = p.get('q') || '';
        state.report = p.get('report') || '';
        state.sort = p.get('sort') || 'reports';
    }

    function syncControls() {
        el.search.value = state.q;
        el.report.value = state.report;
        el.sort.value = state.sort;
        el.clear.hidden = !state.q;
    }

    function renderStats() {
        const links = index.reduce((total, s) => total + s.reports.length, 0);
        const points = reports.reduce((total, r) => total + (r.indicators || []).length, 0);
        const reused = index.filter(s => s.reports.length > 1).length;

        document.getElementById('sourceCount').textContent = OSAA.formatNumber(index.length);
        document.getElementById('linkCount').textContent = OSAA.formatNumber(links);
        document.getElementById('pointCount').textContent = OSAA.formatNumber(points);
        document.getElementById('reusedCount').textContent = OSAA.formatNumber(reused);
    }

    function fillReportFilter() {
        OSAA.fillSelect(
            el.report,
            reports
                .slice()
                .sort((a, b) => String(b.year).localeCompare(String(a.year)))
                .map(r => ({
                    value: r.id,
                    label: r.title.length > 64 ? r.title.slice(0, 61) + '…' : r.title
                })),
            'All knowledge products'
        );
        el.report.value = state.report;
    }

    function bind() {
        el.search.addEventListener('input', OSAA.debounce(() => {
            state.q = el.search.value;
            el.clear.hidden = !state.q;
            render();
        }, 200));

        el.clear.addEventListener('click', () => {
            el.search.value = '';
            state.q = '';
            el.clear.hidden = true;
            el.search.focus();
            render();
        });

        el.report.addEventListener('change', () => { state.report = el.report.value; render(); });
        el.sort.addEventListener('change', () => { state.sort = el.sort.value; render(); });

        el.chips.addEventListener('click', event => {
            const target = event.target.closest('[data-clear]');
            if (!target) return;
            const key = target.dataset.clear;
            if (key === 'all') { state.q = ''; state.report = ''; }
            else state[key] = '';
            syncControls();
            render();
        });

        el.list.addEventListener('click', event => {
            const btn = event.target.closest('.copy-ref-btn');
            if (btn) { copyReference(btn); return; }
            if (event.target.closest('.empty-state [data-clear="all"]')) {
                state.q = ''; state.report = '';
                syncControls();
                render();
            }
        });
    }

    function filtered() {
        const term = state.q.toLowerCase().trim();

        let list = index.filter(source => {
            if (state.report && !source.reports.some(r => r.id === state.report)) return false;
            if (!term) return true;
            if (source.name.toLowerCase().includes(term)) return true;
            if (source.attributions.some(a => a.toLowerCase().includes(term))) return true;
            return source.reports.some(report =>
                report.title.toLowerCase().includes(term) ||
                String(report.year).includes(term) ||
                report.dataPoints.some(p =>
                    (p.name || '').toLowerCase().includes(term) ||
                    (p.notes || '').toLowerCase().includes(term) ||
                    (p.value || '').toLowerCase().includes(term))
            );
        });

        // Filtering to one report should also hide the other reports' rows.
        if (state.report) {
            list = list.map(source => Object.assign({}, source, {
                reports: source.reports.filter(r => r.id === state.report)
            }));
        }

        const byName = (a, b) => a.name.localeCompare(b.name);
        if (state.sort === 'name') list.sort(byName);
        else if (state.sort === 'points') {
            list.sort((a, b) => b.dataPointCount - a.dataPointCount || byName(a, b));
        } else {
            list.sort((a, b) =>
                b.reports.length - a.reports.length ||
                b.dataPointCount - a.dataPointCount || byName(a, b));
        }

        return list;
    }

    function render() {
        const list = filtered();

        OSAA.writeParams({
            q: state.q,
            report: state.report,
            sort: state.sort === 'reports' ? '' : state.sort // default
        });
        renderChips();

        el.count.innerHTML = list.length === index.length
            ? 'Showing all <strong>' + OSAA.formatNumber(list.length) + '</strong> data sources'
            : 'Showing <strong>' + OSAA.formatNumber(list.length) + '</strong> of ' +
              OSAA.formatNumber(index.length) + ' data sources';

        if (!list.length) {
            el.list.innerHTML =
                '<div class="empty-state">' +
                OSAA.icon('magnifying-glass') +
                '<h3>No sources found</h3>' +
                '<p>Try a different search term, or clear the filters.</p>' +
                '<button type="button" class="btn btn--secondary" data-clear="all">' +
                'Clear all filters</button></div>';
            return;
        }

        // With one report in view, or a single source, show the detail up front.
        const expand = !!state.report || list.length === 1;
        el.list.innerHTML = list.map(source => sourceCard(source, expand)).join('');
    }

    function renderChips() {
        const chips = [];
        if (state.q) chips.push(chip('q', 'Search: “' + state.q + '”'));
        if (state.report) {
            const report = reports.find(r => r.id === state.report);
            if (report) chips.push(chip('report', report.title));
        }
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

    function sourceCard(source, expand) {
        const e = OSAA.escapeHTML;
        const link = OSAA.safeURL(source.link);
        const reportCount = source.reports.length;

        const reportsHTML = source.reports.map(report => {
            const reportLink = OSAA.safeURL(report.link);
            return '<details class="provenance-report"' + (expand ? ' open' : '') + '>' +
                '<summary>' +
                  OSAA.icon('chevron-right', { className: 'chev' }) +
                  '<span class="year-badge">' + e(report.year) + '</span>' +
                  '<span class="provenance-report__title">' + e(report.title) + '</span>' +
                  '<span class="count-badge">' + report.dataPoints.length + '</span>' +
                '</summary>' +
                '<div class="provenance-body">' +
                  (reportLink
                      ? '<p><a class="knowledge-product-link" href="' + e(reportLink) +
                        '" target="_blank" rel="noopener">' +
                        OSAA.icon('arrow-up-right-from-square') +
                        'Open knowledge product<span class="visually-hidden"> — ' + e(report.title) +
                        ' (opens in a new tab)</span></a></p>'
                      : '<p><span class="knowledge-product-link is-missing">' +
                        OSAA.icon('link-slash') +
                        'No report link on file</span></p>') +
                  '<ul class="point-list">' +
                    report.dataPoints.map(p => pointHTML(p, report)).join('') +
                  '</ul>' +
                '</div></details>';
        }).join('');

        return '' +
            '<article class="source-index-card' + (source.unattributed ? ' is-unattributed' : '') + '">' +
              '<header class="source-index-head">' +
                '<div class="source-index-title">' +
                  '<span class="source-avatar" aria-hidden="true">' +
                    e(source.name.charAt(0)) + '</span>' +
                  '<div>' +
                    '<h3>' + e(source.name) + '</h3>' +
                    '<div class="source-badges">' +
                      '<span class="badge badge-primary">' +
                        OSAA.icon('file-lines') +
                        reportCount + ' ' + OSAA.plural(reportCount, 'knowledge product') + '</span>' +
                      '<span class="badge">' +
                        OSAA.icon('chart-line') +
                        source.dataPointCount + ' ' +
                        OSAA.plural(source.dataPointCount, 'data point') + '</span>' +
                      (source.sharedCount
                          ? '<span class="badge badge-muted" title="Data points where this source ' +
                            'is cited alongside others">' +
                            OSAA.icon('users') +
                            source.sharedCount + ' co-attributed</span>'
                          : '') +
                    '</div>' +
                  '</div>' +
                '</div>' +
                (link
                    ? '<a class="source-home-link" href="' + e(link) + '" target="_blank" rel="noopener">' +
                      '' + OSAA.icon('globe') + 'Source website' +
                      '<span class="visually-hidden"> for ' + e(source.name) +
                      ' (opens in a new tab)</span></a>'
                    : '') +
              '</header>' +

              (source.unattributed
                  ? '<p class="source-warning">' +
                    OSAA.icon('circle-info') +
                    '<span>These data points cite no named institution in the source record. ' +
                    'They need a proper attribution before they can be traced.</span></p>'
                  : '') +

              attributionsHTML(source) +

              '<div class="provenance-reports">' + reportsHTML + '</div>' +
            '</article>';
    }

    /* Heavily reused sources such as the World Bank are cited two dozen
       different ways. Showing them all inline buried the actual provenance,
       so anything past a handful goes behind a disclosure. */
    function attributionsHTML(source) {
        const list = source.attributions;
        if (list.length < 2) return '';

        const codes = list.map(a => '<code>' + OSAA.escapeHTML(a) + '</code>').join(' ');

        if (list.length <= 4) {
            return '<p class="source-attributions">' +
                '<strong>Cited in the reports as:</strong> ' + codes + '</p>';
        }

        return '<details class="disclosure">' +
            '<summary>' + OSAA.icon('chevron-right', { className: 'chev' }) + '' +
            'Cited ' + list.length + ' different ways in the reports</summary>' +
            '<p class="source-attributions">' + codes + '</p></details>';
    }

    function pointHTML(point, report) {
        const e = OSAA.escapeHTML;
        const reference = window.SourceIndex.formatReference(point.attribution, point, report);
        const link = OSAA.safeURL(point.link);

        return '<li class="point">' +
            '<div class="point__main">' +
              '<span class="point__name">' + e(point.name) + '</span>' +
              (point.value ? '<span class="point__value">' + e(point.value) + '</span>' : '') +
            '</div>' +
            (point.notes ? '<p class="point__notes">' + e(point.notes) + '</p>' : '') +
            '<div class="point__meta">' +
              (point.cluster
                  ? '<span class="provenance-cluster cluster-' + e(point.cluster) + '">' +
                    e(OSAA.clusterShort(point.cluster)) + '</span>'
                  : '') +
              (point.coSources.length
                  ? '<span class="provenance-co">with ' + e(point.coSources.join(', ')) + '</span>'
                  : '') +
              (link
                  ? '<a class="provenance-data-link" href="' + e(link) +
                    '" target="_blank" rel="noopener">' +
                    '' + OSAA.icon('database') + 'Dataset' +
                    '<span class="visually-hidden"> for ' + e(point.name) +
                    ' (opens in a new tab)</span></a>'
                  : '') +
              '<button type="button" class="copy-ref-btn" data-reference="' + e(reference) + '">' +
                '' + OSAA.icon('quote-right') + 'Copy citation' +
              '</button>' +
            '</div></li>';
    }

    function copyReference(button) {
        const text = button.getAttribute('data-reference');
        const done = () => {
            const original = button.innerHTML;
            button.innerHTML = '' + OSAA.icon('check') + 'Copied';
            button.classList.add('is-copied');
            setTimeout(() => {
                button.innerHTML = original;
                button.classList.remove('is-copied');
            }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }

    function fallbackCopy(text, done) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'absolute';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); done(); } catch (e) { console.error('Copy failed', e); }
        document.body.removeChild(area);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
