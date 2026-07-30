// UN OSAA Data Catalog - Data Sources page
// Renders the source -> knowledge product reverse index built by sources-index.js.

let sourceIndex = [];
let allReports = [];

const CLUSTER_NAMES = {
    financing: 'Financing for Development',
    conflict: 'Addressing Drivers of Conflict',
    democracy: 'Democracy, Resilience, and Human Capital',
    sti: 'Science, Technology, and Innovation',
    industrialization: 'Industrialization and AfCFTA',
    energy: 'Sustainable Energy and Climate Change'
};

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function initSourcesPage() {
    try {
        await window.dataLoader.loadAll();
        allReports = window.dataLoader.getReports();
        sourceIndex = window.SourceIndex.buildSourceIndex(allReports);

        renderStats();
        populateReportFilter();
        renderSources();

        document.getElementById('sourceSearch').addEventListener('input', renderSources);
        document.getElementById('sourceReportFilter').addEventListener('change', renderSources);
        document.getElementById('sourceSort').addEventListener('change', renderSources);
    } catch (error) {
        console.error('Error building source index:', error);
        document.getElementById('sourcesList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Could not load the source index</h3>
                <p>The report data failed to load. Please refresh and try again.</p>
            </div>`;
    }
}

function renderStats() {
    const links = sourceIndex.reduce((total, s) => total + s.reports.length, 0);
    const points = allReports.reduce((total, r) => total + (r.indicators || []).length, 0);
    const reused = sourceIndex.filter(s => s.reports.length > 1).length;

    document.getElementById('sourceCount').textContent = sourceIndex.length;
    document.getElementById('linkCount').textContent = links;
    document.getElementById('pointCount').textContent = points;
    document.getElementById('reusedCount').textContent = reused;
}

function populateReportFilter() {
    const select = document.getElementById('sourceReportFilter');
    allReports
        .slice()
        .sort((a, b) => String(b.year).localeCompare(String(a.year)))
        .forEach(report => {
            const option = document.createElement('option');
            option.value = report.id;
            option.textContent = report.title.length > 70
                ? report.title.slice(0, 67) + '...'
                : report.title;
            select.appendChild(option);
        });
}

function getFilteredSources() {
    const term = (document.getElementById('sourceSearch').value || '').toLowerCase().trim();
    const reportId = document.getElementById('sourceReportFilter').value;
    const sort = document.getElementById('sourceSort').value;

    let list = sourceIndex.filter(source => {
        if (reportId && !source.reports.some(r => r.id === reportId)) return false;
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

    // When filtering to one report, only show that report's rows.
    if (reportId) {
        list = list.map(source => ({
            ...source,
            reports: source.reports.filter(r => r.id === reportId)
        }));
    }

    if (sort === 'name') {
        list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'points') {
        list.sort((a, b) => b.dataPointCount - a.dataPointCount || a.name.localeCompare(b.name));
    } else {
        list.sort((a, b) =>
            b.reports.length - a.reports.length ||
            b.dataPointCount - a.dataPointCount ||
            a.name.localeCompare(b.name));
    }
    return list;
}

function renderSources() {
    const container = document.getElementById('sourcesList');
    const list = getFilteredSources();
    const counter = document.getElementById('sourcesResultCount');

    counter.textContent = list.length === sourceIndex.length
        ? `Showing all ${list.length} data sources`
        : `Showing ${list.length} of ${sourceIndex.length} data sources`;

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-magnifying-glass"></i>
                <h3>No sources found</h3>
                <p>Try a different search term or clear the filters.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map(createSourceCard).join('');
}

function createSourceCard(source) {
    const reportCount = source.reports.length;
    const productWord = reportCount === 1 ? 'knowledge product' : 'knowledge products';
    const pointWord = source.dataPointCount === 1 ? 'data point' : 'data points';

    const reportsHTML = source.reports.map(report => `
        <div class="provenance-report">
            <div class="provenance-report-head">
                <div class="provenance-report-meta">
                    <span class="provenance-year">${escapeHTML(report.year)}</span>
                    <h4>${escapeHTML(report.title)}</h4>
                </div>
                ${report.link ? `
                    <a href="${escapeHTML(report.link)}" target="_blank" rel="noopener"
                       class="knowledge-product-link">
                        <i class="fas fa-up-right-from-square"></i>
                        Open knowledge product
                    </a>` : `
                    <span class="knowledge-product-link is-missing">
                        <i class="fas fa-link-slash"></i> No report link on file
                    </span>`}
            </div>
            <ul class="provenance-points">
                ${report.dataPoints.map(point => createPointHTML(point, report)).join('')}
            </ul>
        </div>
    `).join('');

    return `
        <article class="source-index-card${source.unattributed ? ' is-unattributed' : ''}">
            <header class="source-index-head">
                <div class="source-index-title">
                    <div class="source-avatar">${escapeHTML(source.name.charAt(0))}</div>
                    <div>
                        <h3>${escapeHTML(source.name)}</h3>
                        <div class="source-badges">
                            <span class="badge badge-primary">
                                <i class="fas fa-file-alt"></i>
                                ${reportCount} ${productWord}
                            </span>
                            <span class="badge">
                                <i class="fas fa-chart-line"></i>
                                ${source.dataPointCount} ${pointWord}
                            </span>
                            ${source.sharedCount ? `
                                <span class="badge badge-muted" title="Data points where this source is cited alongside others">
                                    <i class="fas fa-users"></i>
                                    ${source.sharedCount} co-attributed
                                </span>` : ''}
                        </div>
                    </div>
                </div>
                ${source.link ? `
                    <a href="${escapeHTML(source.link)}" target="_blank" rel="noopener"
                       class="source-home-link">
                        <i class="fas fa-globe"></i> Source website
                    </a>` : ''}
            </header>

            ${source.unattributed ? `
                <p class="source-warning">
                    <i class="fas fa-circle-info"></i>
                    These data points cite no named institution in the source record.
                    They need a proper attribution before they can be traced.
                </p>` : ''}

            ${source.attributions.length > 1 ? `
                <p class="source-attributions">
                    <strong>Cited in the reports as:</strong>
                    ${source.attributions.map(a => `<code>${escapeHTML(a)}</code>`).join(' ')}
                </p>` : ''}

            <div class="provenance-reports">${reportsHTML}</div>
        </article>
    `;
}

function createPointHTML(point, report) {
    const reference = window.SourceIndex.formatReference(point.attribution, point, report);
    const clusterName = CLUSTER_NAMES[point.cluster] || point.cluster || '';

    return `
        <li class="provenance-point">
            <div class="provenance-point-main">
                <span class="provenance-point-name">${escapeHTML(point.name)}</span>
                ${point.value ? `<span class="provenance-value">${escapeHTML(point.value)}</span>` : ''}
            </div>
            ${point.notes ? `<div class="provenance-notes">${escapeHTML(point.notes)}</div>` : ''}
            <div class="provenance-point-foot">
                ${clusterName ? `<span class="provenance-cluster cluster-${escapeHTML(point.cluster)}">${escapeHTML(clusterName)}</span>` : ''}
                ${point.coSources.length ? `
                    <span class="provenance-co">with ${escapeHTML(point.coSources.join(', '))}</span>` : ''}
                ${point.link ? `
                    <a href="${escapeHTML(point.link)}" target="_blank" rel="noopener"
                       class="provenance-data-link">
                        <i class="fas fa-database"></i> Dataset
                    </a>` : ''}
                <button type="button" class="copy-ref-btn"
                        data-reference="${escapeHTML(reference)}"
                        onclick="copyReference(this)">
                    <i class="fas fa-quote-right"></i> Copy citation
                </button>
            </div>
        </li>
    `;
}

function copyReference(button) {
    const text = button.getAttribute('data-reference');
    const done = () => {
        const original = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied';
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
