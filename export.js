/* Download the current filtered view as CSV or JSON.
 *
 * The old build had an `exportData()` that dumped every indicator and was never
 * wired to a control. Exporting what is actually on screen is the useful
 * version: filter down to what you need, then take it away.
 */
(function (global) {
    'use strict';

    function csvCell(value) {
        const text = value == null ? '' : String(value);
        // Excel reads a leading =, +, - or @ as a formula. Prefix with a quote.
        const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
        return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
    }

    function toCSV(columns, rows) {
        const head = columns.map(c => csvCell(c.label)).join(',');
        const body = rows.map(row =>
            columns.map(c => csvCell(c.value(row))).join(',')
        );
        // BOM so Excel opens UTF-8 correctly.
        return '﻿' + [head].concat(body).join('\r\n') + '\r\n';
    }

    function download(filename, text, mime) {
        const blob = new Blob([text], { type: mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function stamp() {
        // Filenames only, so a local date is what a reader expects.
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function exportCSV(basename, columns, rows) {
        download(basename + '-' + stamp() + '.csv', toCSV(columns, rows), 'text/csv');
    }

    function exportJSON(basename, payload) {
        download(basename + '-' + stamp() + '.json',
            JSON.stringify(payload, null, 2), 'application/json');
    }

    /* ---------------------------------------------------------- column sets */

    const INDICATOR_COLUMNS = [
        { label: 'ID', value: i => i.id },
        { label: 'Name', value: i => i.name },
        { label: 'Cluster', value: i => global.OSAA.clusterName(i.cluster) },
        { label: 'Theme', value: i => i.theme },
        { label: 'Description', value: i => i.description },
        { label: 'Organisation(s)', value: i => i.organisations.join('; ') },
        { label: 'Publisher (as recorded)', value: i => i.publisher },
        { label: 'Methodology', value: i => i.methodology },
        { label: 'Update frequency', value: i => i.frequency },
        { label: 'Caveats', value: i => i.remarks },
        { label: 'Dataset URL', value: i => i.url }
    ];

    // One row per data point — the useful grain for analysis, and it keeps the
    // report context on every row.
    const DATA_POINT_COLUMNS = [
        { label: 'Report ID', value: r => r.report.id },
        { label: 'Report', value: r => r.report.title },
        { label: 'Year', value: r => r.report.year },
        { label: 'Report cluster', value: r => global.OSAA.clusterName(r.report.cluster) },
        { label: 'Data point', value: r => r.point.name },
        { label: 'Value', value: r => r.point.value },
        { label: 'Source (as cited)', value: r => r.point.source },
        { label: 'Point cluster', value: r => global.OSAA.clusterName(r.point.cluster) },
        { label: 'Usage note', value: r => r.point.notes },
        {
            label: 'Dataset URL(s)',
            value: r => global.OSAA.pointLinks(r.point).map(l => l.url).join(' | ')
        },
        { label: 'Report URL', value: r => r.report.link }
    ];

    const SOURCE_COLUMNS = [
        { label: 'Source', value: s => s.name },
        { label: 'Knowledge products', value: s => s.reports.length },
        { label: 'Data points', value: s => s.dataPointCount },
        { label: 'Co-attributed points', value: s => s.sharedCount },
        { label: 'Cited as', value: s => s.attributions.join('; ') },
        { label: 'Reports', value: s => s.reports.map(r => r.title).join('; ') },
        { label: 'Website', value: s => s.link || '' },
        { label: 'Unattributed', value: s => (s.unattributed ? 'yes' : 'no') }
    ];

    function flattenReports(reports) {
        const rows = [];
        reports.forEach(report => {
            (report.indicators || []).forEach(point => rows.push({ report: report, point: point }));
        });
        return rows;
    }

    /* ------------------------------------------------------------- controls */

    /**
     * Wire an export menu.
     * `getData()` must return { basename, csv: {columns, rows}, json }.
     */
    function attach(button, getData) {
        if (!button) return;

        button.addEventListener('click', () => {
            const menu = button.nextElementSibling;
            if (menu) menu.hidden = !menu.hidden;
            button.setAttribute('aria-expanded', String(!(menu && menu.hidden)));
        });

        const menu = button.nextElementSibling;
        if (!menu) return;

        menu.addEventListener('click', event => {
            const item = event.target.closest('[data-format]');
            if (!item) return;
            const data = getData();
            if (item.dataset.format === 'csv') {
                exportCSV(data.basename, data.csv.columns, data.csv.rows);
            } else {
                exportJSON(data.basename, data.json);
            }
            menu.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            global.OSAA.toast('Download started — ' + data.count + ' ' + data.noun);
        });

        document.addEventListener('click', event => {
            if (!button.parentElement.contains(event.target)) {
                menu.hidden = true;
                button.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !menu.hidden) {
                menu.hidden = true;
                button.setAttribute('aria-expanded', 'false');
                button.focus();
            }
        });
    }

    global.CatalogExport = {
        attach: attach,
        exportCSV: exportCSV,
        exportJSON: exportJSON,
        flattenReports: flattenReports,
        INDICATOR_COLUMNS: INDICATOR_COLUMNS,
        DATA_POINT_COLUMNS: DATA_POINT_COLUMNS,
        SOURCE_COLUMNS: SOURCE_COLUMNS
    };
})(typeof window !== 'undefined' ? window : globalThis);
