/* Indicators page — search, filter, sort, paginate.
 *
 * Behaviour notes vs. the previous build:
 *  - filter state lives in the URL, so `indicators.html?cluster=energy` from the
 *    home page actually filters (it was read on the wrong page before) and any
 *    view can be linked or bookmarked;
 *  - the organisation filter is built from the data, and matches the parsed
 *    publisher instead of comparing an organisation name against a URL;
 *  - metadata and remarks are reachable through a per-card disclosure rather
 *    than being loaded and never shown.
 */
(function () {
    'use strict';

    const PER_PAGE = 20;

    const state = { q: '', cluster: '', org: '', sort: 'name', page: 1 };

    // Set once the reader touches the sort control, so a search does not
    // silently override an explicit choice.
    let sortChosen = false;

    let all = [];
    let visible = [];

    const el = {};

    function cache() {
        el.search = document.getElementById('indicatorSearch');
        el.clear = document.getElementById('indicatorSearchClear');
        el.cluster = document.getElementById('clusterFilter');
        el.org = document.getElementById('orgFilter');
        el.sort = document.getElementById('sortBy');
        el.list = document.getElementById('indicatorsList');
        el.count = document.getElementById('resultCount');
        el.chips = document.getElementById('activeFilters');
        el.pagination = document.getElementById('pagination');
        el.total = document.getElementById('statTotal');
        el.shown = document.getElementById('statShown');
        el.orgTotal = document.getElementById('statOrgs');
        el.export = document.getElementById('exportBtn');
    }

    async function init() {
        cache();
        OSAA.skeleton(el.list, 6);
        readURL();

        try {
            await window.dataLoader.loadIndicators();
        } catch (error) {
            console.error(error);
            OSAA.errorBanner(el.list, 'The indicator data could not be loaded. Please refresh the page.');
            return;
        }

        all = window.dataLoader.getIndicators();

        OSAA.fillSelect(
            el.cluster,
            OSAA.clusters.map(c => ({ value: c.key, label: c.name })),
            'All clusters'
        );
        OSAA.fillSelect(
            el.org,
            window.dataLoader.getIndicatorOrganisations()
                .map(o => ({ value: o.name, label: o.name + ' (' + o.count + ')' })),
            'All organisations'
        );

        if (el.total) el.total.textContent = OSAA.formatNumber(all.length);
        if (el.orgTotal) {
            el.orgTotal.textContent = OSAA.formatNumber(
                window.dataLoader.getIndicatorOrganisations().length
            );
        }

        syncControls();
        bind();
        window.CatalogExport.attach(el.export, () => ({
            basename: 'osaa-indicators',
            count: visible.length,
            noun: OSAA.plural(visible.length, 'indicator'),
            csv: { columns: window.CatalogExport.INDICATOR_COLUMNS, rows: visible },
            json: {
                exported: new Date().toISOString(),
                filters: { search: state.q, cluster: state.cluster, organisation: state.org },
                count: visible.length,
                indicators: visible.map(stripInternals)
            }
        }));
        apply();
    }

    /** Drop the fields the UI adds for its own use before exporting. */
    function stripInternals(indicator) {
        const copy = Object.assign({}, indicator);
        delete copy.doc;
        delete copy.searchText;
        return copy;
    }

    function readURL() {
        const p = OSAA.readParams();
        state.q = p.get('q') || '';
        state.cluster = p.get('cluster') || '';
        state.org = p.get('org') || '';
        state.sort = p.get('sort') || 'name';
        state.page = Math.max(1, parseInt(p.get('page'), 10) || 1);
    }

    function syncControls() {
        if (el.search) el.search.value = state.q;
        if (el.cluster) el.cluster.value = state.cluster;
        if (el.org) el.org.value = state.org;
        if (el.sort) el.sort.value = state.sort;
        if (el.clear) el.clear.hidden = !state.q;
    }

    function bind() {
        const onSearch = OSAA.debounce(() => {
            state.q = el.search.value;
            state.page = 1;
            if (!sortChosen) {
                state.sort = state.q.trim() ? 'relevance' : 'name';
                el.sort.value = state.sort;
            }
            el.clear.hidden = !state.q;
            apply();
        }, 200);

        el.search.addEventListener('input', onSearch);
        el.clear.addEventListener('click', () => {
            el.search.value = '';
            state.q = '';
            state.page = 1;
            el.clear.hidden = true;
            el.search.focus();
            apply();
        });

        [['cluster', el.cluster], ['org', el.org], ['sort', el.sort]].forEach(([key, node]) => {
            node.addEventListener('change', () => {
                state[key] = node.value;
                if (key === 'sort') sortChosen = true;
                else state.page = 1;
                apply();
            });
        });

        // Chips and pagination are delegated so re-renders keep working.
        el.chips.addEventListener('click', event => {
            const chip = event.target.closest('[data-clear]');
            if (!chip) return;
            const key = chip.dataset.clear;
            if (key === 'all') {
                state.q = state.cluster = state.org = '';
            } else {
                state[key] = '';
            }
            state.page = 1;
            syncControls();
            apply();
        });

        el.pagination.addEventListener('click', event => {
            const btn = event.target.closest('[data-page]');
            if (!btn) return;
            state.page = Number(btn.dataset.page);
            apply();
            el.list.scrollIntoView({ block: 'start' });
        });

        window.addEventListener('popstate', () => {
            readURL();
            syncControls();
            apply();
        });
    }

    function apply() {
        const query = state.q.trim();

        // Ranked search first, then the plain facets, so relevance order
        // survives when the reader has not chosen an explicit sort.
        visible = (query ? window.dataLoader.searchIndicators(query) : all.slice())
            .filter(i => {
                if (state.cluster && i.cluster !== state.cluster) return false;
                if (state.org && !i.organisations.includes(state.org)) return false;
                return true;
            });

        if (!(query && state.sort === 'relevance')) visible.sort(comparator(state.sort));

        const pages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
        if (state.page > pages) state.page = pages;

        OSAA.writeParams({
            q: state.q,
            cluster: state.cluster,
            org: state.org,
            sort: state.sort === 'name' ? '' : state.sort, // default, keep it out of the URL
            page: state.page
        });
        render(pages);
    }

    function comparator(sort) {
        if (sort === 'relevance') return () => 0;
        if (sort === 'cluster') {
            const order = OSAA.clusters.map(c => c.key);
            return (a, b) =>
                order.indexOf(a.cluster) - order.indexOf(b.cluster) ||
                a.name.localeCompare(b.name);
        }
        if (sort === 'org') {
            return (a, b) =>
                (a.organisations[0] || '').localeCompare(b.organisations[0] || '') ||
                a.name.localeCompare(b.name);
        }
        return (a, b) => a.name.localeCompare(b.name);
    }

    function render(pages) {
        renderChips();
        renderCount();

        if (el.shown) el.shown.textContent = OSAA.formatNumber(visible.length);

        if (!visible.length) {
            el.list.innerHTML =
                '<div class="empty-state">' +
                OSAA.icon('magnifying-glass') +
                '<h3>No indicators match these filters</h3>' +
                '<p>Try a broader search term, or clear the filters to see all ' +
                OSAA.formatNumber(all.length) + ' indicators.</p>' +
                '<button type="button" class="btn btn--secondary" data-clear="all">' +
                'Clear all filters</button></div>';
            el.pagination.innerHTML = '';
            return;
        }

        const start = (state.page - 1) * PER_PAGE;
        el.list.innerHTML = visible
            .slice(start, start + PER_PAGE)
            .map(card)
            .join('');

        renderPagination(pages);
    }

    function renderCount() {
        const shown = visible.length;
        el.count.innerHTML = shown === all.length
            ? 'Showing all <strong>' + OSAA.formatNumber(shown) + '</strong> indicators'
            : 'Showing <strong>' + OSAA.formatNumber(shown) + '</strong> of ' +
              OSAA.formatNumber(all.length) + ' indicators';
    }

    function renderChips() {
        const chips = [];
        if (state.q) chips.push(chip('q', 'Search: “' + state.q + '”'));
        if (state.cluster) chips.push(chip('cluster', OSAA.clusterShort(state.cluster)));
        if (state.org) chips.push(chip('org', state.org));

        el.chips.innerHTML = chips.length
            ? chips.join('') +
              '<button type="button" class="btn btn--ghost btn--sm" data-clear="all">Clear all</button>'
            : '';
    }

    function chip(key, label) {
        return '<button type="button" class="chip" data-clear="' + key + '">' +
            OSAA.escapeHTML(label) +
            '<span class="chip__x" aria-hidden="true">' + OSAA.icon('xmark') + '</span>' +
            '<span class="visually-hidden">Remove this filter</span></button>';
    }

    /** Escape, then mark the parts of the text the search actually matched. */
    function mark(text) {
        return window.CatalogSearch.highlight(text, state.q, OSAA.escapeHTML);
    }

    function card(indicator) {
        const e = OSAA.escapeHTML;
        const url = OSAA.safeURL(indicator.url);
        const orgs = indicator.organisations.length
            ? indicator.organisations.join(', ')
            : indicator.publisher;

        const details = (indicator.methodology || indicator.remarks || indicator.frequency)
            ? '<details class="disclosure">' +
                '<summary>' + OSAA.icon('chevron-right', { className: 'chev' }) + '' +
                'Methodology &amp; caveats</summary>' +
                '<div class="disclosure__body">' +
                  kv('Methodology', indicator.methodology) +
                  kv('Update frequency', indicator.frequency) +
                  kv('Caveats', indicator.remarks) +
                '</div></details>'
            : '';

        return '' +
            '<article class="indicator-card cluster-' + e(indicator.cluster) + '">' +
              '<div class="indicator-card__head">' +
                '<h3 class="indicator-card__title">' +
                  '<a href="indicator.html?id=' + encodeURIComponent(indicator.id) + '">' +
                  mark(indicator.name) + '</a></h3>' +
                '<span class="cluster-pill">' + e(OSAA.clusterShort(indicator.cluster)) + '</span>' +
              '</div>' +
              '<p class="indicator-card__desc">' + mark(indicator.description) + '</p>' +
              '<div class="meta-row">' +
                '<span class="meta-item">' + OSAA.icon('building-columns') + '' +
                  '<span class="visually-hidden">Published by </span><strong>' + mark(orgs) + '</strong></span>' +
                (indicator.theme
                    ? '<span class="meta-item">' + OSAA.icon('tag') + '' +
                      '<span class="visually-hidden">Theme: </span>' + mark(indicator.theme) + '</span>'
                    : '') +
                (indicator.frequency
                    ? '<span class="meta-item">' + OSAA.icon('rotate') + '' +
                      '<span class="visually-hidden">Updated: </span>' + e(indicator.frequency) + '</span>'
                    : '') +
              '</div>' +
              '<div class="card-actions">' +
                (url
                    ? '<a class="btn btn--secondary btn--sm" href="' + e(url) +
                      '" target="_blank" rel="noopener">' +
                      OSAA.icon('arrow-up-right-from-square') +
                      'Open dataset<span class="visually-hidden"> for ' + e(indicator.name) +
                      ' (opens in a new tab)</span></a>'
                    : '') +
                details +
              '</div>' +
            '</article>';
    }

    function kv(label, value) {
        if (!value) return '';
        return '<div class="kv"><span class="kv__k">' + OSAA.escapeHTML(label) + '</span>' +
            '<span class="kv__v">' + OSAA.escapeHTML(value) + '</span></div>';
    }

    function renderPagination(pages) {
        if (pages <= 1) {
            el.pagination.innerHTML = '';
            return;
        }

        const page = state.page;
        const parts = [
            '<button type="button" class="page-btn" data-page="' + (page - 1) + '"' +
            (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
            '' + OSAA.icon('chevron-left') + '</button>'
        ];

        const numbers = [];
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || Math.abs(i - page) <= 1) numbers.push(i);
        }

        let previous = 0;
        numbers.forEach(n => {
            if (n - previous > 1) parts.push('<span class="page-ellipsis">…</span>');
            parts.push(
                '<button type="button" class="page-btn" data-page="' + n + '"' +
                (n === page ? ' aria-current="page"' : '') +
                ' aria-label="Page ' + n + '">' + n + '</button>'
            );
            previous = n;
        });

        parts.push(
            '<button type="button" class="page-btn" data-page="' + (page + 1) + '"' +
            (page === pages ? ' disabled' : '') + ' aria-label="Next page">' +
            '' + OSAA.icon('chevron-right') + '</button>'
        );

        el.pagination.innerHTML = parts.join('');
    }

    // Empty-state "clear all" button lives outside #activeFilters.
    document.addEventListener('click', event => {
        const btn = event.target.closest('.empty-state [data-clear="all"]');
        if (!btn) return;
        state.q = state.cluster = state.org = '';
        state.page = 1;
        syncControls();
        apply();
    });

    document.addEventListener('DOMContentLoaded', init);
})();
