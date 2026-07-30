/* UN OSAA Data Catalog — data access layer.
 *
 * Loads data.json / reports.json and normalises them for the UI.
 *
 * The important normalisation: every indicator's `source` field is a URL, while
 * the human-readable publisher, methodology and update cadence are buried in a
 * single `metadata` string of the shape
 *
 *     "Source: World Bank WDI. Methodology: ... . Update frequency: Annual"
 *
 * The old UI printed the raw URL where a publisher name belonged, and the
 * "Filter by source" select compared "World Bank" against that URL — so it
 * matched almost nothing. Splitting the metadata string once, here, fixes the
 * display, the filter, and the search in one place.
 */
class DataLoader {
    constructor() {
        this.indicators = [];
        this.reports = [];
        this.loaded = false;
        this._promises = {};
    }

    /* Each dataset loads independently so a page only pays for what it renders:
       sources.html needs reports.json alone, and used to pull data.json's
       1,400 lines for nothing. Concurrent callers share one in-flight request. */

    loadIndicators() {
        if (!this._promises.indicators) {
            this._promises.indicators = this._fetchJSON('data.json')
                .then(data => {
                    this.indicators = (data.indicators || []).map(normaliseIndicator);
                    attachOrganisations(this.indicators);
                    return this.indicators;
                })
                .catch(error => {
                    delete this._promises.indicators; // allow a retry
                    throw error;
                });
        }
        return this._promises.indicators;
    }

    loadReports() {
        if (!this._promises.reports) {
            this._promises.reports = this._fetchJSON('reports.json')
                .then(data => {
                    this.reports = (data.reports || []).map(normaliseReport);
                    return this.reports;
                })
                .catch(error => {
                    delete this._promises.reports;
                    throw error;
                });
        }
        return this._promises.reports;
    }

    loadAll() {
        return Promise.all([this.loadIndicators(), this.loadReports()])
            .then(() => { this.loaded = true; return this; });
    }

    async _fetchJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error('Could not load ' + path + ' (HTTP ' + response.status + ')');
        }
        return response.json();
    }

    getIndicators() { return this.indicators; }
    getReports() { return this.reports; }
    getIndicatorsCount() { return this.indicators.length; }
    getReportsCount() { return this.reports.length; }

    getIndicatorById(id) {
        return this.indicators.find(i => i.id === id) || null;
    }

    getReportById(id) {
        return this.reports.find(r => r.id === id) || null;
    }

    getIndicatorsByCluster(cluster) {
        return this.indicators.filter(i => i.cluster === cluster);
    }

    /** Indicator count per cluster key, for the home page cards. */
    getClusterCounts() {
        return this.indicators.reduce((acc, i) => {
            acc[i.cluster] = (acc[i.cluster] || 0) + 1;
            return acc;
        }, {});
    }

    getClusters() {
        return [...new Set(this.indicators.map(i => i.cluster))];
    }

    /**
     * Publishing organisations present in the indicator set, with counts,
     * ordered by how much of the catalog each one supplies. Used to build the
     * "Filter by organisation" select from the data rather than a hand-kept
     * list that drifts out of sync.
     */
    getIndicatorOrganisations() {
        const counts = new Map();
        this.indicators.forEach(i => {
            i.organisations.forEach(org => counts.set(org, (counts.get(org) || 0) + 1));
        });
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ name, count }));
    }

    /** Distinct data-source names actually cited by the reports. */
    getReportSources() {
        const names = new Set();
        this.reports.forEach(r => {
            (r.sources || []).forEach(s => s.name && names.add(s.name));
        });
        return [...names].sort((a, b) => a.localeCompare(b));
    }

    getReportTags() {
        const tags = new Set();
        this.reports.forEach(r => (r.tags || []).forEach(t => tags.add(t)));
        return [...tags].sort((a, b) => a.localeCompare(b));
    }

    getReportClusters() {
        return [...new Set(this.reports.map(r => r.cluster).filter(Boolean))];
    }

    /* Ranked, acronym-aware search — see search.js. */

    searchIndicators(query) {
        if (!query || !query.trim()) return this.indicators.slice();
        return window.CatalogSearch.search(this.indicators, query, i => i.doc);
    }

    searchReports(query) {
        if (!query || !query.trim()) return this.reports.slice();
        return window.CatalogSearch.search(this.reports, query, r => r.doc);
    }
}

/* ------------------------------------------------------------------ helpers */

/** Pull "Source: X. Methodology: Y. Update frequency: Z" apart. */
function parseMetadata(metadata) {
    const text = String(metadata || '');
    const field = label => {
        const match = text.match(
            new RegExp(label + '\\s*:\\s*([\\s\\S]*?)(?=\\.\\s*(?:Source|Methodology|Update frequency)\\s*:|$)', 'i')
        );
        return match ? match[1].trim().replace(/\.\s*$/, '') : '';
    };
    return {
        publisher: field('Source'),
        methodology: field('Methodology'),
        frequency: field('Update frequency')
    };
}

/* Acronyms and long forms that should resolve to one canonical organisation.
   Matched against the whole atom or as a leading word. */
const PUBLISHER_ALIASES = [
    ['afdb', 'African Development Bank'],
    ['uneca', 'UN ECA'],
    ['un eca', 'UN ECA'],
    ['un desa', 'UN DESA'],
    ['un women', 'UN Women'],
    ['un-women', 'UN Women'],
    ['un department of peace operations', 'UN DPO'],
    ['un sdg', 'UN SDG Database'],
    ['scopus', 'Scopus / Web of Science'],
    ['web of science', 'Scopus / Web of Science']
];

/**
 * Turn a publisher string such as
 *   "World Bank Migration and Remittances Database"
 *   "Moody's, S&P, Fitch"
 * into the organisations behind it. Splitting happens on commas only — "and"
 * and "&" appear inside real organisation and dataset names.
 */
function publisherAtoms(publisher) {
    return String(publisher || '')
        .split(/\s*,\s*/)
        .map(part => part.trim())
        .filter(Boolean)
        .map(applyAlias);
}

function applyAlias(atom) {
    const key = atom.toLowerCase();
    for (const [prefix, name] of PUBLISHER_ALIASES) {
        if (key === prefix || key.startsWith(prefix + ' ')) return name;
    }
    return atom;
}

/**
 * Fold dataset-qualified names into their parent body: if "World Bank" appears
 * on its own anywhere in the catalog, then "World Bank Global Findex" is that
 * same organisation. Short atoms are excluded as prefixes so that "UN" does not
 * swallow "UN Women", "UN DESA" and friends.
 */
function attachOrganisations(indicators) {
    const atomSet = new Set();
    indicators.forEach(i => publisherAtoms(i.publisher).forEach(a => atomSet.add(a)));

    const prefixes = [...atomSet]
        .filter(a => a.length >= 4)
        .sort((a, b) => a.length - b.length);

    const fold = atom => {
        const key = atom.toLowerCase();
        for (const candidate of prefixes) {
            if (candidate !== atom && key.startsWith(candidate.toLowerCase() + ' ')) {
                return candidate;
            }
        }
        return atom;
    };

    indicators.forEach(i => {
        i.organisations = [...new Set(publisherAtoms(i.publisher).map(fold))];
        i.searchText += ' ' + i.organisations.join(' ').toLowerCase();

        i.doc = window.CatalogSearch.buildDocument({
            name: i.name,
            theme: i.theme,
            organisation: i.organisations,
            description: i.description,
            other: [i.methodology, i.remarks, i.frequency, i.cluster].join(' ')
        });
    });
}

/** Fall back to a readable host name when metadata has no publisher. */
function hostLabel(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
        return '';
    }
}

function normaliseIndicator(raw) {
    const parsed = parseMetadata(raw.metadata);
    const url = /^https?:\/\//i.test(raw.source || '') ? raw.source : '';

    const indicator = {
        id: raw.id || '',
        name: raw.name || '',
        cluster: raw.cluster || '',
        theme: raw.theme || '',
        description: raw.description || '',
        url: url,
        publisher: parsed.publisher || hostLabel(url) || (url ? '' : raw.source || ''),
        methodology: parsed.methodology,
        frequency: parsed.frequency,
        metadata: raw.metadata || '',
        remarks: raw.remarks || '',
        organisations: [] // filled by attachOrganisations once the set is known
    };

    indicator.searchText = [
        indicator.name, indicator.theme, indicator.description,
        indicator.publisher, indicator.cluster, indicator.remarks, indicator.methodology
    ].join(' ').toLowerCase();

    return indicator;
}

function normaliseReport(raw) {
    const report = Object.assign({}, raw, {
        indicators: raw.indicators || [],
        sources: raw.sources || [],
        tags: raw.tags || []
    });

    report.searchText = [
        report.title, report.summary, report.year,
        report.tags.join(' '),
        report.indicators.map(i => [i.name, i.source, i.value, i.notes].join(' ')).join(' '),
        report.sources.map(s => s.name).join(' ')
    ].join(' ').toLowerCase();

    report.doc = window.CatalogSearch.buildDocument({
        name: report.title,
        theme: report.tags,
        organisation: report.sources.map(s => s.name),
        description: report.summary,
        other: [
            report.year,
            report.indicators.map(i => [i.name, i.value, i.notes].join(' ')).join(' ')
        ].join(' ')
    });

    return report;
}

window.dataLoader = new DataLoader();
