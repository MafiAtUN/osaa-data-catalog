/* Single-indicator page — the citable permalink for a catalog entry.
 *
 * Until now an indicator could only be reached as `indicators.html?q=<its
 * name>`, which is neither stable nor quotable. `indicator.html?id=fin_001`
 * is.
 *
 * The page also carries the indicator → knowledge product connection built in
 * catalog-graph.js, which is why loading both JSON files here is justified.
 */
(function () {
    'use strict';

    let graph = null;

    async function init() {
        const container = document.getElementById('indicatorDetail');
        const id = OSAA.readParams().get('id');

        if (!id) {
            notFound(container, 'No indicator was specified.');
            return;
        }

        OSAA.skeleton(container, 3);

        try {
            await window.dataLoader.loadAll();
        } catch (error) {
            console.error(error);
            OSAA.errorBanner(container, 'The catalog data could not be loaded. Please refresh the page.');
            return;
        }

        const indicator = window.dataLoader.getIndicatorById(id);
        if (!indicator) {
            notFound(container, 'No indicator in the catalog has the id “' + id + '”.');
            return;
        }

        graph = window.CatalogGraph.build(
            window.dataLoader.getIndicators(),
            window.dataLoader.getReports()
        );

        document.title = indicator.name + ' — UN OSAA Data Catalog';
        document.getElementById('crumbCurrent').textContent = indicator.name;

        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', indicator.description);

        render(container, indicator);
        bind(container, indicator);
    }

    function notFound(container, message) {
        document.getElementById('crumbCurrent').textContent = 'Not found';
        container.innerHTML =
            '<div class="empty-state">' +
            OSAA.icon('file-circle-question') +
            '<h3>Indicator not found</h3>' +
            '<p>' + OSAA.escapeHTML(message) + '</p>' +
            '<a class="btn btn--primary" href="indicators.html">Browse all indicators</a></div>';
    }

    function render(container, indicator) {
        const e = OSAA.escapeHTML;
        const url = OSAA.safeURL(indicator.url);
        const links = graph.forIndicator(indicator);
        const related = relatedIndicators(indicator);

        container.innerHTML = '' +
            '<article class="detail cluster-' + e(indicator.cluster) + '">' +

              '<header class="detail__head">' +
                '<a class="cluster-pill" href="indicators.html?cluster=' + e(indicator.cluster) + '">' +
                  e(OSAA.clusterName(indicator.cluster)) + '</a>' +
                '<h1>' + e(indicator.name) + '</h1>' +
                '<p class="detail__lede">' + e(indicator.description) + '</p>' +
                '<div class="detail__actions">' +
                  (url
                      ? '<a class="btn btn--primary" href="' + e(url) + '" target="_blank" rel="noopener">' +
                        OSAA.icon('arrow-up-right-from-square') +
                        'Open dataset<span class="visually-hidden"> (opens in a new tab)</span></a>'
                      : '') +
                  '<button type="button" class="btn btn--secondary" id="copyCitation">' +
                    OSAA.icon('quote-right') + 'Copy citation</button>' +
                  '<button type="button" class="btn btn--secondary" id="copyLink">' +
                    OSAA.icon('link') + 'Copy link</button>' +
                '</div>' +
              '</header>' +

              '<dl class="fact-grid">' +
                fact('Catalog ID', indicator.id, true) +
                fact('Publishing organisation', indicator.organisations.join(', ') || indicator.publisher) +
                fact('Theme', indicator.theme) +
                fact('Update frequency', indicator.frequency) +
              '</dl>' +

              section('Methodology', 'chart-line', indicator.methodology) +
              section('Caveats and coverage', 'circle-info', indicator.remarks) +

              knowledgeProducts(indicator, links) +
              relatedSection(related) +

            '</article>';
    }

    function fact(label, value, mono) {
        if (!value) return '';
        return '<div class="fact">' +
            '<dt>' + OSAA.escapeHTML(label) + '</dt>' +
            '<dd' + (mono ? ' class="mono"' : '') + '>' + OSAA.escapeHTML(value) + '</dd>' +
            '</div>';
    }

    function section(title, iconName, body) {
        if (!body) return '';
        return '<section class="detail__section">' +
            '<h2>' + OSAA.icon(iconName) + OSAA.escapeHTML(title) + '</h2>' +
            '<p>' + OSAA.escapeHTML(body) + '</p></section>';
    }

    /**
     * Report data points that share this indicator's publishing organisation.
     * Deliberately framed as "also drawn from" rather than "this indicator was
     * used", because the join is on the publisher, not on the figure itself.
     */
    function knowledgeProducts(indicator, links) {
        const e = OSAA.escapeHTML;

        if (links.curated.length) {
            return '<section class="detail__section">' +
                '<h2>' + OSAA.icon('file-lines') + 'Used in knowledge products</h2>' +
                '<ul class="point-list">' +
                links.curated.map(entry =>
                    '<li class="point"><div class="point__main">' +
                    '<span class="point__name">' + e(entry.point.name) + '</span>' +
                    (entry.point.value
                        ? '<span class="point__value">' + e(entry.point.value) + '</span>' : '') +
                    '</div><div class="point__meta">' +
                    '<a href="reports.html?report=' + encodeURIComponent(entry.report.id) + '">' +
                    e(entry.report.title) + '</a></div></li>'
                ).join('') +
                '</ul></section>';
        }

        if (!links.derived.length) {
            return '<section class="detail__section">' +
                '<h2>' + OSAA.icon('file-lines') + 'Knowledge products</h2>' +
                '<p class="detail__note">No UN OSAA report in the catalog has yet cited ' +
                (indicator.organisations.length
                    ? e(indicator.organisations.join(' or ')) + ' as a data source.'
                    : 'this indicator’s publisher as a data source.') +
                '</p></section>';
        }

        const total = links.derivedCount;

        return '<section class="detail__section">' +
            '<h2>' + OSAA.icon('file-lines') + 'Related evidence in knowledge products</h2>' +
            '<p class="detail__note">' + OSAA.icon('circle-info') +
              '<span>These are the <strong>' + total + '</strong> data ' +
              OSAA.plural(total, 'point') + ' that UN OSAA reports drew from the same ' +
              'publisher' + (links.organisations.length > 1 ? 's' : '') + ' (' +
              e(links.organisations.join(', ')) + '). They are related evidence from the ' +
              'same body — not necessarily this exact indicator.</span></p>' +

            '<div class="provenance-reports">' +
            links.derived.map(group =>
                '<details class="provenance-report">' +
                  '<summary>' +
                    OSAA.icon('chevron-right', { className: 'chev' }) +
                    '<span class="year-badge">' + e(group.report.year) + '</span>' +
                    '<span class="provenance-report__title">' + e(group.report.title) + '</span>' +
                    '<span class="count-badge">' + group.points.length + '</span>' +
                  '</summary>' +
                  '<div class="provenance-body">' +
                    '<p><a class="knowledge-product-link" href="reports.html?report=' +
                      encodeURIComponent(group.report.id) + '">' +
                      OSAA.icon('file-lines') + 'See this report in the catalog</a></p>' +
                    '<ul class="point-list">' +
                    group.points.map(entry => {
                        const link = OSAA.safeURL(entry.point.link);
                        return '<li class="point"><div class="point__main">' +
                          '<span class="point__name">' + e(entry.point.name) + '</span>' +
                          (entry.point.value
                              ? '<span class="point__value">' + e(entry.point.value) + '</span>' : '') +
                          '</div>' +
                          (entry.point.notes
                              ? '<p class="point__notes">' + e(entry.point.notes) + '</p>' : '') +
                          '<div class="point__meta"><span class="meta-item">' +
                            OSAA.icon('quote-left') + e(entry.point.source || 'Unattributed') +
                          '</span>' +
                          (link
                              ? '<a class="provenance-data-link" href="' + e(link) +
                                '" target="_blank" rel="noopener">' + OSAA.icon('database') +
                                'Dataset</a>'
                              : '') +
                          '</div></li>';
                    }).join('') +
                    '</ul>' +
                  '</div></details>'
            ).join('') +
            '</div></section>';
    }

    /** Same cluster, sharing a theme or an organisation, closest first. */
    function relatedIndicators(indicator) {
        return window.dataLoader.getIndicators()
            .filter(other => other.id !== indicator.id && other.cluster === indicator.cluster)
            .map(other => {
                let score = 0;
                if (other.theme && other.theme === indicator.theme) score += 3;
                if (other.organisations.some(o => indicator.organisations.includes(o))) score += 2;
                return { indicator: other, score: score };
            })
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score || a.indicator.name.localeCompare(b.indicator.name))
            .slice(0, 6)
            .map(entry => entry.indicator);
    }

    function relatedSection(related) {
        if (!related.length) return '';
        const e = OSAA.escapeHTML;
        return '<section class="detail__section">' +
            '<h2>' + OSAA.icon('layer-group') + 'Related indicators</h2>' +
            '<ul class="related-list">' +
            related.map(other =>
                '<li><a class="related-item" href="indicator.html?id=' +
                encodeURIComponent(other.id) + '">' +
                '<span class="related-item__name">' + e(other.name) + '</span>' +
                '<span class="related-item__meta">' +
                  e(other.organisations[0] || other.publisher) +
                  (other.theme ? ' · ' + e(other.theme) : '') + '</span>' +
                OSAA.icon('arrow-right') + '</a></li>'
            ).join('') +
            '</ul></section>';
    }

    function citation(indicator) {
        const org = indicator.organisations.join(', ') || indicator.publisher;
        return [
            org + '.',
            '“' + indicator.name + '”.',
            'UN OSAA Data Catalog, ' + OSAA.clusterName(indicator.cluster) + '.',
            indicator.frequency ? 'Updated ' + indicator.frequency.toLowerCase() + '.' : '',
            indicator.url ? 'Dataset: ' + indicator.url : '',
            'Catalog entry: ' + permalink(indicator)
        ].filter(Boolean).join(' ');
    }

    function permalink(indicator) {
        return window.location.origin + window.location.pathname +
            '?id=' + encodeURIComponent(indicator.id);
    }

    function bind(container, indicator) {
        const copy = (text, message) => {
            const done = () => OSAA.toast(message);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() =>
                    OSAA.toast('Could not reach the clipboard', 'triangle-exclamation'));
            } else {
                OSAA.toast('Clipboard is unavailable in this browser', 'triangle-exclamation');
            }
        };

        const citeBtn = container.querySelector('#copyCitation');
        const linkBtn = container.querySelector('#copyLink');

        if (citeBtn) citeBtn.addEventListener('click', () => copy(citation(indicator), 'Citation copied'));
        if (linkBtn) linkBtn.addEventListener('click', () => copy(permalink(indicator), 'Link copied'));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
