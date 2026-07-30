/* Links the two halves of the catalog: the 145 indicators in data.json and the
 * 168 report data points in reports.json.
 *
 * These are different kinds of record — an indicator is a metric ("Illicit
 * Financial Flows as % of GDP"), a data point is one figure a report quoted
 * ("$88.6 billion"). Matching them on name was tested and is not viable: only
 * 7 of 168 data points come close to an indicator name and none match exactly,
 * so an automatic name-based join would be mostly invention.
 *
 * Two honest links are built instead:
 *
 *   1. CURATED — a report data point may carry `indicatorId` pointing at an
 *      entry in data.json. This is exact and is labelled as such. None exist
 *      yet; the field is read wherever a maintainer adds one.
 *
 *   2. DERIVED — an indicator and a data point that resolve to the same
 *      publishing organisation are related evidence from the same body. This
 *      is presented as "also cited in", never as "this is the same figure".
 *      It covers 91 of the 145 indicators across 22 organisations.
 */
(function (global) {
    'use strict';

    function canonicalOrgs(names) {
        const out = new Set();
        (names || []).forEach(name => {
            global.SourceIndex.parseSourceString(name).forEach(org => {
                if (!org.unattributed) out.add(org.name);
            });
        });
        return out;
    }

    /**
     * Build the index once per page.
     * Returns { forIndicator(indicator), forDataPoint(point), stats }.
     */
    function build(indicators, reports) {
        // organisation -> [{ report, point }]
        const byOrg = new Map();
        // indicatorId -> [{ report, point }]
        const byCuratedId = new Map();

        reports.forEach(report => {
            (report.indicators || []).forEach(point => {
                const entry = { report: report, point: point };

                if (point.indicatorId) {
                    if (!byCuratedId.has(point.indicatorId)) byCuratedId.set(point.indicatorId, []);
                    byCuratedId.get(point.indicatorId).push(entry);
                }

                canonicalOrgs([point.source]).forEach(org => {
                    if (!byOrg.has(org)) byOrg.set(org, []);
                    byOrg.get(org).push(entry);
                });
            });
        });

        // Indicator organisations run through the same canonicaliser so both
        // sides of the join speak one vocabulary.
        const orgsOf = new Map();
        indicators.forEach(indicator => {
            orgsOf.set(indicator.id, canonicalOrgs(indicator.organisations));
        });

        function forIndicator(indicator) {
            const curated = byCuratedId.get(indicator.id) || [];

            const seen = new Set(curated.map(e => e.report.id + '|' + e.point.name));
            const derived = [];
            const orgs = orgsOf.get(indicator.id) || new Set();

            orgs.forEach(org => {
                (byOrg.get(org) || []).forEach(entry => {
                    const key = entry.report.id + '|' + entry.point.name;
                    if (seen.has(key)) return;
                    seen.add(key);
                    derived.push(Object.assign({ via: org }, entry));
                });
            });

            return {
                curated: curated,
                derived: groupByReport(derived),
                organisations: [...orgs],
                derivedCount: derived.length
            };
        }

        function groupByReport(entries) {
            const groups = new Map();
            entries.forEach(entry => {
                if (!groups.has(entry.report.id)) {
                    groups.set(entry.report.id, { report: entry.report, points: [] });
                }
                groups.get(entry.report.id).points.push(entry);
            });
            return [...groups.values()].sort((a, b) =>
                String(b.report.year).localeCompare(String(a.report.year)) ||
                a.report.title.localeCompare(b.report.title));
        }

        const linkedIndicators = indicators.filter(i => {
            const orgs = orgsOf.get(i.id) || new Set();
            return [...orgs].some(org => byOrg.has(org)) || byCuratedId.has(i.id);
        });

        return {
            forIndicator: forIndicator,
            stats: {
                linkedIndicators: linkedIndicators.length,
                totalIndicators: indicators.length,
                curatedLinks: [...byCuratedId.values()].reduce((n, list) => n + list.length, 0),
                bridgingOrganisations: [...byOrg.keys()]
                    .filter(org => indicators.some(i => (orgsOf.get(i.id) || new Set()).has(org)))
                    .length
            }
        };
    }

    const api = { build: build, canonicalOrgs: canonicalOrgs };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.CatalogGraph = api;
})(typeof window !== 'undefined' ? window : globalThis);
