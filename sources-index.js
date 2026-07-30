// UN OSAA Data Catalog - Source Reverse Index
// Builds a source -> knowledge product index from reports.json at runtime, so the
// index can never drift from the report data it is derived from.
//
// The `source` field on a report data point is free text and comes in four shapes:
//   1. a single organisation            "IMF"
//   2. several co-sources               "IMF, OECD, ATAF, WDI"  /  "IOM & African Union"
//   3. an organisation plus a dataset   "World Bank - Remittance Prices Worldwide"
//   4. an unattributed placeholder      "Academic research sources"
// Splitting naively on separators breaks organisation names that contain "and" or "&"
// (e.g. "Institute for Economics and Peace"), so those are protected first.

(function (global) {
    'use strict';

    // Organisation names containing a separator word/char. Protected before splitting.
    const PROTECTED_NAMES = [
        'Institute for Economics and Peace',
        'Institute for Economics & Peace',
        'Oxford Poverty and Human Development Initiative',
        'Education in Emergencies Working Group',
        'Kenya National Bureau of Statistics',
        'International Development Law Organization',
        'Sustainable Development Solutions Network',
        'Uppsala Conflict Data Programme',
        'AU Summit on Industrialization and Economic Diversification',
        'Global Tax Expenditures Database',
        'World Federation of Exchanges',
        'International Survey on Revenue Administration',
        'Country Policy and Institutional Assessment',
        'Ibrahim Index of African Governance',
        'German Development Institute',
        'World Food Programme',
        'African Development Bank',
        'International Energy Agency',
        'UN Statistics Division',
        'Remittance Prices Worldwide',
        'School Meals Coalition',
        'University of Kentucky',
        'Population Division',
        'Franklin Templeton',
        'Nature Food Study',
        'Powell & Thyne',
        'UMass Amherst',
        'Scholarly Studies',
        'Academic Sources',
        'Academic research sources',
        'Historical & Legal Sources',
        'OSAA staff calculations',
        'OSAA calculations',
        'INFF Platform',
        'Dublin University Press',
        'Cambridge University Press',
        'IIAG combined analysis',
        'Global Forum'
    ];

    // Variant / acronym / dataset -> canonical organisation.
    const CANONICAL = {
        'world bank': 'World Bank',
        'wdi': 'World Bank',
        'knomad': 'World Bank',
        'cmps': 'World Bank',
        'remittance prices worldwide': 'World Bank',
        'country policy and institutional assessment': 'World Bank',
        'imf': 'IMF',
        'isora': 'IMF',
        'isora data': 'IMF',
        'isora 2023': 'IMF',
        'international survey on revenue administration': 'IMF',
        'ra-fit': 'IMF',
        'imf working paper sdn/2023/006': 'IMF',
        'afdb': 'African Development Bank',
        'african development bank': 'African Development Bank',
        'adb': 'Asian Development Bank',
        'au': 'African Union',
        'african union': 'African Union',
        'au commission': 'African Union',
        'african union commission': 'African Union',
        'aprm': 'African Union',
        'auda': 'AUDA-NEPAD',
        'au summit on industrialization and economic diversification': 'African Union',
        'un eca': 'UN ECA',
        'uneca': 'UN ECA',
        'eca': 'UN ECA',
        'un desa': 'UN DESA',
        'united nations desa': 'UN DESA',
        'population division': 'UN DESA',
        'un women': 'UN Women',
        'un-women': 'UN Women',
        'wfp': 'World Food Programme (WFP)',
        'world food programme': 'World Food Programme (WFP)',
        'school meals coalition': 'World Food Programme (WFP)',
        'iea': 'International Energy Agency (IEA)',
        'international energy agency': 'International Energy Agency (IEA)',
        'iep': 'Institute for Economics and Peace',
        'institute for economics and peace': 'Institute for Economics and Peace',
        'institute for economics & peace': 'Institute for Economics and Peace',
        'sdsn': 'SDSN',
        'sustainable development solutions network': 'SDSN',
        'ucdp': 'UCDP',
        'uppsala conflict data programme': 'UCDP',
        'unsd': 'UN Statistics Division',
        'un statistics division': 'UN Statistics Division',
        'idlo': 'IDLO',
        'international development law organization': 'IDLO',
        'peri': 'PERI (UMass Amherst)',
        'umass amherst': 'PERI (UMass Amherst)',
        'ilo': 'ILO',
        'ilostat': 'ILO',
        'mo ibrahim foundation': 'Mo Ibrahim Foundation',
        'iiag': 'Mo Ibrahim Foundation',
        'ibrahim index of african governance': 'Mo Ibrahim Foundation',
        'iiag combined analysis': 'Mo Ibrahim Foundation',
        'oecd': 'OECD',
        'oecd-dac': 'OECD',
        'oecd dac': 'OECD',
        'global forum': 'OECD',
        'swac': 'OECD',
        'un': 'United Nations',
        'un sdg': 'United Nations',
        'osaa': 'UN OSAA',
        'un osaa': 'UN OSAA',
        'osaa staff calculations': 'UN OSAA',
        'osaa calculations': 'UN OSAA',
        'undp': 'UNDP',
        'inff platform': 'UNDP',
        'ictd': 'ICTD',
        'german development institute': 'German Development Institute (DIE)',
        'die': 'German Development Institute (DIE)',
        'unctad': 'UNCTAD',
        'unodc': 'UNODC',
        'unhcr': 'UNHCR',
        'unicef': 'UNICEF',
        'unesco': 'UNESCO',
        'who': 'WHO',
        'fao': 'FAO',
        'ifad': 'IFAD',
        'iom': 'IOM',
        'ocha': 'OCHA',
        'idmc': 'IDMC',
        'acled': 'ACLED',
        'afrobarometer': 'Afrobarometer',
        'ataf': 'ATAF',
        'un dpo': 'UN DPO',
        'ifc': 'IFC',
        'swfi': 'SWFI',
        'ecb': 'European Central Bank',
        'european central bank': 'European Central Bank',
        'u.s. treasury': 'U.S. Treasury',
        'us treasury': 'U.S. Treasury',
        'afreximbank': 'Afreximbank',
        'pwc': 'PWC',
        'odi': 'ODI',
        'g20': 'G20',
        'gi hub': 'GI Hub',
        'fsd africa': 'FSD Africa',
        'statista': 'Statista',
        'brookings': 'Brookings',
        'msu': 'Michigan State University',
        'university of kentucky': 'University of Kentucky',
        'powell & thyne': 'University of Kentucky',
        'kenya national bureau of statistics': 'Kenya National Bureau of Statistics',
        'world federation of exchanges': 'World Federation of Exchanges',
        'franklin templeton': 'Franklin Templeton',
        'ipfa': 'IPFA',
        'google': 'Google',
        'nature food study': 'Nature Food',
        'education in emergencies working group': 'Education in Emergencies Working Group',
        'cambridge university press': 'Cambridge University Press',
        'dublin university press': 'Dublin University Press',
        'oxford poverty and human development initiative': 'OPHI',
        'global tax expenditures database': 'Global Tax Expenditures Database'
    };

    // Placeholders that name no institution - grouped and flagged rather than
    // presented as if they were a citable organisation.
    const UNATTRIBUTED = new Set([
        'academic research sources',
        'academic sources',
        'historical & legal sources',
        'scholarly studies'
    ]);

    const UNATTRIBUTED_LABEL = 'Unattributed / general sources';

    function stripParenthetical(name) {
        // "African Development Bank (AfDB)" -> "African Development Bank"
        // "PERI (UMass Amherst)"            -> "PERI"
        const stripped = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
        return stripped || name.trim();
    }

    function canonicalise(atom) {
        let name = atom.trim().replace(/\s+/g, ' ');
        if (!name) return null;

        if (UNATTRIBUTED.has(name.toLowerCase())) {
            return { name: UNATTRIBUTED_LABEL, unattributed: true };
        }

        // A dash introduces a dataset qualifier, not a co-source:
        // "World Bank - Remittance Prices Worldwide" -> parent org is "World Bank"
        const dashed = name.split(/\s+[–—-]\s+/);
        if (dashed.length > 1) name = dashed[0].trim();

        const direct = CANONICAL[name.toLowerCase()];
        if (direct) return { name: direct, unattributed: false };

        const bare = stripParenthetical(name);
        const viaBare = CANONICAL[bare.toLowerCase()];
        if (viaBare) return { name: viaBare, unattributed: false };

        return { name: bare, unattributed: false };
    }

    // Split a free-text attribution into canonical organisations.
    function parseSourceString(raw) {
        if (!raw || !raw.trim()) return [];

        let working = raw.trim();

        // Protect organisation names that contain a separator before splitting.
        const shields = [];
        PROTECTED_NAMES.forEach(phrase => {
            const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            working = working.replace(re, match => {
                shields.push(match);
                return ' ' + (shields.length - 1) + ' ';
            });
        });

        const atoms = working
            .split(/\s*(?:\/|,|&|\band\b)\s*/i)
            .map(part => part.replace(/ (\d+) /g, (_, i) => shields[Number(i)]))
            .map(part => part.trim())
            .filter(Boolean);

        const seen = new Set();
        const out = [];
        atoms.forEach(atom => {
            const c = canonicalise(atom);
            if (c && !seen.has(c.name)) {
                seen.add(c.name);
                out.push(c);
            }
        });
        return out;
    }

    // Best known homepage for a source, harvested from the reports' own `sources` arrays.
    function buildLinkLookup(reports) {
        const lookup = new Map();
        reports.forEach(report => {
            (report.sources || []).forEach(s => {
                if (!s || !s.name || !s.link) return;
                parseSourceString(s.name).forEach(c => {
                    if (!lookup.has(c.name)) lookup.set(c.name, s.link);
                });
            });
        });
        return lookup;
    }

    /**
     * Build the reverse index: which knowledge products used each data source.
     * Returns an array sorted by number of knowledge products, then data points.
     */
    function buildSourceIndex(reports) {
        const links = buildLinkLookup(reports);
        const index = new Map();

        reports.forEach(report => {
            (report.indicators || []).forEach(point => {
                const orgs = parseSourceString(point.source);
                orgs.forEach(org => {
                    if (!index.has(org.name)) {
                        index.set(org.name, {
                            name: org.name,
                            unattributed: !!org.unattributed,
                            link: links.get(org.name) || null,
                            reports: new Map(),
                            clusters: new Set(),
                            attributions: new Set(),
                            dataPointCount: 0,
                            sharedCount: 0
                        });
                    }
                    const entry = index.get(org.name);
                    entry.dataPointCount += 1;
                    entry.attributions.add(point.source);
                    if (point.cluster) entry.clusters.add(point.cluster);
                    if (orgs.length > 1) entry.sharedCount += 1;

                    if (!entry.reports.has(report.id)) {
                        entry.reports.set(report.id, {
                            id: report.id,
                            title: report.title,
                            year: report.year,
                            link: report.link,
                            dataPoints: []
                        });
                    }
                    entry.reports.get(report.id).dataPoints.push({
                        name: point.name,
                        value: point.value,
                        notes: point.notes,
                        link: point.link,
                        links: point.links,
                        cluster: point.cluster,
                        attribution: point.source,
                        coSources: orgs.filter(o => o.name !== org.name).map(o => o.name)
                    });
                });
            });
        });

        return Array.from(index.values())
            .map(entry => ({
                ...entry,
                clusters: Array.from(entry.clusters),
                attributions: Array.from(entry.attributions).sort(),
                reports: Array.from(entry.reports.values())
                    .sort((a, b) => String(b.year).localeCompare(String(a.year)) ||
                                    a.title.localeCompare(b.title))
            }))
            .sort((a, b) =>
                b.reports.length - a.reports.length ||
                b.dataPointCount - a.dataPointCount ||
                a.name.localeCompare(b.name));
    }

    /**
     * A citation for a single use of a data point in a knowledge product.
     */
    function formatReference(sourceAttribution, point, report) {
        const bits = [];
        bits.push(sourceAttribution + '.');
        bits.push('"' + point.name + '"' + (point.value ? ': ' + point.value : '') + '.');
        bits.push('Cited in UN OSAA, ' + report.title + ' (' + report.year + ')');
        bits.push(point.notes ? '— ' + point.notes : '');
        const trail = [];
        if (report.link) trail.push('Knowledge product: ' + report.link);
        if (point.link) trail.push('Data: ' + point.link);
        return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() +
               (trail.length ? ' ' + trail.join(' | ') : '');
    }

    const api = { buildSourceIndex, parseSourceString, formatReference, UNATTRIBUTED_LABEL };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.SourceIndex = api;
})(typeof window !== 'undefined' ? window : globalThis);
