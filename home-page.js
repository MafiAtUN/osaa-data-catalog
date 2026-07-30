/* Home page — headline stats, global search, cluster entry points.
 *
 * The search results are anchors rather than click-handled divs, so they are
 * keyboard reachable, and each one deep-links into the filtered indicators or
 * reports view instead of dropping the reader on an unfiltered list.
 */
(function () {
    'use strict';

    const el = {};
    let ready = false;

    function cache() {
        el.search = document.getElementById('homeSearch');
        el.clear = document.getElementById('homeSearchClear');
        el.results = document.getElementById('homeSearchResults');
        el.status = document.getElementById('homeSearchStatus');
        el.clusters = document.getElementById('clusterGrid');
        el.indicatorCount = document.getElementById('statIndicators');
        el.reportCount = document.getElementById('statReports');
        el.sourceCount = document.getElementById('statSources');
    }

    async function init() {
        cache();
        renderClusters({});
        bind();

        try {
            await window.dataLoader.loadAll();
        } catch (error) {
            console.error(error);
            el.search.placeholder = 'Search is unavailable — data failed to load';
            el.search.disabled = true;
            return;
        }

        ready = true;
        const counts = window.dataLoader.getClusterCounts();

        el.indicatorCount.textContent = OSAA.formatNumber(window.dataLoader.getIndicatorsCount());
        el.reportCount.textContent = OSAA.formatNumber(window.dataLoader.getReportsCount());
        el.sourceCount.textContent = OSAA.formatNumber(
            window.SourceIndex.buildSourceIndex(window.dataLoader.getReports()).length
        );

        renderClusters(counts);
    }

    function renderClusters(counts) {
        el.clusters.innerHTML = OSAA.clusters.map(cluster => {
            const count = counts[cluster.key];
            return '' +
                '<article class="cluster-card cluster-' + cluster.key + '">' +
                  '<span class="cluster-card__icon" aria-hidden="true">' +
                    OSAA.icon(cluster.icon) + '</span>' +
                  '<h3>' + OSAA.escapeHTML(cluster.name) + '</h3>' +
                  '<p>' + OSAA.escapeHTML(cluster.blurb) + '</p>' +
                  '<div class="cluster-card__foot">' +
                    '<a class="cluster-card__link" href="indicators.html?cluster=' + cluster.key + '">' +
                      'Browse indicators' +
                      '' + OSAA.icon('arrow-right') + '</a>' +
                    '<span class="cluster-card__count">' +
                      (count == null ? '' : count + ' indicators') + '</span>' +
                  '</div>' +
                '</article>';
        }).join('');
    }

    function bind() {
        el.search.addEventListener('input', OSAA.debounce(runSearch, 180));

        el.clear.addEventListener('click', () => {
            el.search.value = '';
            el.clear.hidden = true;
            hide();
            el.search.focus();
        });

        // Enter with nothing highlighted goes to the full indicators search.
        el.search.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                hide();
                return;
            }
            if (event.key === 'ArrowDown') {
                const first = el.results.querySelector('.search-item');
                if (first) { event.preventDefault(); first.focus(); }
                return;
            }
            if (event.key === 'Enter' && el.search.value.trim()) {
                window.location.href = 'indicators.html?q=' +
                    encodeURIComponent(el.search.value.trim());
            }
        });

        el.results.addEventListener('keydown', event => {
            const items = Array.from(el.results.querySelectorAll('.search-item'));
            const index = items.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' && index < items.length - 1) {
                event.preventDefault();
                items[index + 1].focus();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (index <= 0) el.search.focus();
                else items[index - 1].focus();
            } else if (event.key === 'Escape') {
                hide();
                el.search.focus();
            }
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.home-search')) hide();
        });
    }

    function hide() {
        el.results.hidden = true;
        el.status.textContent = '';
    }

    function runSearch() {
        const term = el.search.value.trim();
        el.clear.hidden = !term;

        if (!ready || term.length < 2) {
            hide();
            return;
        }

        const indicators = window.dataLoader.searchIndicators(term).slice(0, 6);
        const reports = window.dataLoader.searchReports(term).slice(0, 3);
        const total = indicators.length + reports.length;

        if (!total) {
            el.results.innerHTML = '<p class="search-empty">No matches for “' +
                OSAA.escapeHTML(term) + '”</p>';
            el.results.hidden = false;
            el.status.textContent = 'No results';
            return;
        }

        let html = '';

        if (indicators.length) {
            html += '<p class="search-group__label">Indicators</p>';
            html += indicators.map(i =>
                '<a class="search-item" href="indicators.html?q=' +
                encodeURIComponent(i.name) + '">' +
                '<span class="search-item__title">' + OSAA.escapeHTML(i.name) + '</span>' +
                '<span class="search-item__meta">' + OSAA.escapeHTML(OSAA.clusterShort(i.cluster)) +
                ' · ' + OSAA.escapeHTML(i.organisations[0] || i.publisher) + '</span></a>'
            ).join('');
        }

        if (reports.length) {
            html += '<p class="search-group__label">Knowledge products</p>';
            html += reports.map(r =>
                '<a class="search-item" href="reports.html?report=' +
                encodeURIComponent(r.id) + '">' +
                '<span class="search-item__title">' + OSAA.escapeHTML(r.title) + '</span>' +
                '<span class="search-item__meta">' + OSAA.escapeHTML(r.year) + ' · ' +
                r.indicators.length + ' data points</span></a>'
            ).join('');
        }

        html += '<a class="search-item" href="indicators.html?q=' +
            encodeURIComponent(term) + '"><span class="search-item__title">' +
            'See all matches for “' + OSAA.escapeHTML(term) + '” →</span></a>';

        el.results.innerHTML = html;
        el.results.hidden = false;
        el.status.textContent = total + ' ' + OSAA.plural(total, 'result') + ' found';
    }

    document.addEventListener('DOMContentLoaded', init);
})();
