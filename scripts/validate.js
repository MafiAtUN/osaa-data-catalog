#!/usr/bin/env node
/* Data integrity checks for data.json and reports.json.
 *
 * Written because the declared counts had already drifted from the arrays they
 * describe, and because a broken cluster key or a duplicate id fails silently
 * in the browser — the record simply stops appearing in a filter.
 *
 * Exit code 1 on any error; warnings do not fail the build.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLUSTERS = ['financing', 'conflict', 'democracy', 'sti', 'industrialization', 'energy'];

const errors = [];
const warnings = [];

const fail = message => errors.push(message);
const warn = message => warnings.push(message);

function readJSON(name) {
    const file = path.join(ROOT, name);
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        fail(name + ' is not valid JSON: ' + error.message);
        return null;
    }
}

function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value);
}

/* ------------------------------------------------------------- indicators */

function checkIndicators(data) {
    if (!data) return 0;

    const list = data.indicators;
    if (!Array.isArray(list)) {
        fail('data.json: "indicators" must be an array');
        return 0;
    }

    const meta = data.metadata || {};
    if (meta.totalIndicators != null && meta.totalIndicators !== list.length) {
        fail('data.json: metadata.totalIndicators is ' + meta.totalIndicators +
            ' but the array holds ' + list.length);
    }

    if (Array.isArray(meta.clusters)) {
        const unknown = meta.clusters.filter(c => !CLUSTERS.includes(c));
        if (unknown.length) fail('data.json: metadata.clusters has unknown keys: ' + unknown.join(', '));
    }

    const ids = new Set();
    const required = ['id', 'name', 'cluster', 'description', 'source', 'metadata'];

    list.forEach((indicator, i) => {
        const at = 'data.json indicator[' + i + ']' +
            (indicator && indicator.id ? ' (' + indicator.id + ')' : '');

        required.forEach(key => {
            if (!indicator[key] || !String(indicator[key]).trim()) {
                fail(at + ': missing "' + key + '"');
            }
        });

        if (indicator.id) {
            if (ids.has(indicator.id)) fail(at + ': duplicate id');
            ids.add(indicator.id);
        }

        if (indicator.cluster && !CLUSTERS.includes(indicator.cluster)) {
            fail(at + ': unknown cluster "' + indicator.cluster + '"');
        }

        if (indicator.source && !isHttpUrl(indicator.source)) {
            warn(at + ': "source" is not an http(s) URL — the card will have no dataset link');
        }

        // The UI splits this string to show the publisher and cadence.
        if (indicator.metadata && !/(^|\.\s*)Source\s*:/i.test(indicator.metadata)) {
            warn(at + ': metadata has no "Source:" segment, so no publisher can be shown');
        }
    });

    return list.length;
}

/* ---------------------------------------------------------------- reports */

function checkReports(data, indicatorIds) {
    if (!data) return 0;

    const list = data.reports;
    if (!Array.isArray(list)) {
        fail('reports.json: "reports" must be an array');
        return 0;
    }

    const meta = data.metadata || {};
    if (meta.totalReports != null && meta.totalReports !== list.length) {
        fail('reports.json: metadata.totalReports is ' + meta.totalReports +
            ' but the array holds ' + list.length);
    }

    let points = 0;
    const ids = new Set();

    list.forEach((report, i) => {
        const at = 'reports.json report[' + i + ']' +
            (report && report.id ? ' (' + report.id + ')' : '');

        ['id', 'title', 'year', 'summary'].forEach(key => {
            if (!report[key] || !String(report[key]).trim()) fail(at + ': missing "' + key + '"');
        });

        if (report.id) {
            if (ids.has(report.id)) fail(at + ': duplicate id');
            ids.add(report.id);
        }

        if (report.cluster && !CLUSTERS.includes(report.cluster)) {
            fail(at + ': unknown cluster "' + report.cluster + '"');
        }

        if (report.link && !isHttpUrl(report.link)) warn(at + ': "link" is not an http(s) URL');
        if (!Array.isArray(report.tags) || !report.tags.length) warn(at + ': no tags');

        (report.indicators || []).forEach((point, j) => {
            points += 1;
            const pat = at + ' data point[' + j + ']';

            if (!point.name || !String(point.name).trim()) fail(pat + ': missing "name"');
            if (!point.source || !String(point.source).trim()) fail(pat + ': missing "source"');
            if (point.cluster && !CLUSTERS.includes(point.cluster)) {
                fail(pat + ': unknown cluster "' + point.cluster + '"');
            }
            /* A data point may cite several datasets. That is modelled with a
               labelled `links` array, never by comma-joining URLs into `link`
               — which silently produced a dead href for everything after the
               first. `link` repeats links[0] so older consumers keep working;
               the check below stops the two drifting apart. */
            if (point.link && !isHttpUrl(point.link)) {
                fail(pat + (/,/.test(point.link)
                    ? ': "link" holds several URLs — use a "links" array instead'
                    : ': "link" is not an http(s) URL'));
            }

            if (point.links !== undefined) {
                if (!Array.isArray(point.links) || !point.links.length) {
                    fail(pat + ': "links" must be a non-empty array');
                } else {
                    point.links.forEach((entry, k) => {
                        if (!entry || !isHttpUrl(entry.url)) {
                            fail(pat + ' links[' + k + ']: "url" is not an http(s) URL');
                        }
                        if (!entry || !entry.label) {
                            warn(pat + ' links[' + k + ']: no "label", so the button reads "Dataset"');
                        }
                    });
                    if (point.links.length === 1) {
                        warn(pat + ': "links" holds one entry — plain "link" is enough');
                    }
                    if (point.link && point.links[0] && point.link !== point.links[0].url) {
                        fail(pat + ': "link" must repeat links[0].url (they have drifted)');
                    }
                }
            }

            // Optional curated link into data.json — see catalog-graph.js.
            if (point.indicatorId && !indicatorIds.has(point.indicatorId)) {
                fail(pat + ': indicatorId "' + point.indicatorId + '" is not in data.json');
            }
        });

        (report.sources || []).forEach((source, j) => {
            const sat = at + ' source[' + j + ']';
            if (!source.name) fail(sat + ': missing "name"');
            if (source.link && !isHttpUrl(source.link)) warn(sat + ': "link" is not an http(s) URL');
        });
    });

    if (meta.totalDataPoints != null && meta.totalDataPoints !== points) {
        fail('reports.json: metadata.totalDataPoints is ' + meta.totalDataPoints +
            ' but the reports hold ' + points);
    }

    return points;
}

/* ------------------------------------------------------------------- run */

const indicatorData = readJSON('data.json');
const reportData = readJSON('reports.json');

const indicatorIds = new Set(
    ((indicatorData && indicatorData.indicators) || []).map(i => i.id).filter(Boolean)
);

const indicatorCount = checkIndicators(indicatorData);
const pointCount = checkReports(reportData, indicatorIds);
const reportCount = ((reportData && reportData.reports) || []).length;

console.log('Catalog: ' + indicatorCount + ' indicators, ' + reportCount + ' reports, ' +
    pointCount + ' data points');

warnings.forEach(w => console.warn('  warning  ' + w));

if (errors.length) {
    errors.forEach(e => console.error('  error    ' + e));
    console.error('\n' + errors.length + ' error' + (errors.length === 1 ? '' : 's') + ' found.');
    process.exit(1);
}

console.log(warnings.length
    ? '\nOK with ' + warnings.length + ' warning' + (warnings.length === 1 ? '' : 's') + '.'
    : '\nAll checks passed.');
