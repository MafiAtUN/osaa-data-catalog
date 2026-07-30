# UN OSAA Data Catalog

A comprehensive data tracking and catalog system created for the **United Nations Office of the Special Adviser on Africa (UN OSAA)** to monitor data usage across published reports and serve as a centralized data catalog for Africa's sustainable development agenda.

## 🎯 Purpose

This system serves two primary functions:
1. **Data Tracking**: Monitor and catalog all data sources and indicators used in UN OSAA reports
2. **Data Catalog**: Provide easy access to development indicators across six thematic clusters

## 📊 Current Status

- **8 Reports** tracked with comprehensive data sources
- **145 Indicators** in the catalog, plus **168 report-level data points**
- **72 Data Sources** resolved from 107 free-text attributions
- **6 Thematic Clusters** covering Africa's development priorities

## 🏗️ Thematic Clusters

### 1. Financing for Development

Mobilizing resources, reversing illicit financial flows, maximizing remittances, and expanding capital market access.

### 2. Addressing Drivers of Conflict

Linking peace, governance, and development through inclusive institutions and socioeconomic transformation.

### 3. Democracy, Resilience, and Human Capital

Strengthening governance, inclusion, and social protection with focus on women, youth, and vulnerable groups.

### 4. Science, Technology, and Innovation (STI)

Leveraging technology for Africa's transformation, post-COVID recovery, and sustainability.

### 5. Industrialization, Demographic Dividend, and AfCFTA

Accelerating structural transformation, trade integration, and harnessing demographic dividends.

### 6. Sustainable Energy Future and Climate Change

Advancing green growth, climate resilience, and renewable energy solutions.

## 🔍 Key Features

- **Multi-Page Interface**: Home, Indicators, Reports, and Sources pages
- **Source Provenance Index**: Trace any data source to the knowledge products that used it
- **Advanced Search**: Search by indicator name, cluster, organisation, or tags
- **Shareable Views**: Every filter, search term and page is reflected in the URL
- **Report Tracking**: Complete catalog of UN OSAA reports with data sources
- **Derived Filters**: Filter options are built from the JSON at load, never hand-maintained
- **Responsive Design**: Single compact header with a collapsing menu on small screens
- **Light & Dark Themes**: Follows the OS preference, with a manual override that persists
- **Accessible**: Skip link, keyboard-navigable comboboxes and dialogs, WCAG AA contrast

## 🎨 Front-end architecture

| File | Responsibility |
| --- | --- |
| `styles.css` | Design tokens (colour, type, space, radius) plus all components. Dark mode is a token swap. |
| `icons.js` | Inline SVG icon set and `OSAA.icon()`. No icon font, no CDN. |
| `layout.js` | Renders the shared header/footer, active nav state, mobile menu, theme toggle, dialog focus trap, and shared helpers on `window.OSAA`. |
| `search.js` | Ranked, acronym-aware matching and match highlighting. |
| `data-loader.js` | Fetches and normalises `data.json` / `reports.json`; derives publisher names and organisations. |
| `catalog-graph.js` | Links indicators to the report data points that share a publisher. |
| `export.js` | CSV / JSON download of whatever the current filters have selected. |
| `home-page.js` | Home stats, global search, cluster cards. |
| `indicators-page.js` | Indicator search, filter, sort, pagination, URL state. |
| `indicator-page.js` | Single-indicator permalink page. |
| `reports-page.js` | Report combobox, filters, collapsible data-point panels. |
| `sources-index.js` | Builds the source → knowledge product reverse index (pure logic, also usable in Node). |
| `sources-page.js` | Renders that index. |
| `contribute.js` | "Propose an indicator" dialog — generates a `data.json` entry to copy or file as an issue. |
| `scripts/validate.js` | Data integrity checks; run by `npm test` and by CI. |

Each page loads only the JSON it renders: `indicators.html` fetches `data.json`,
`reports.html` and `sources.html` fetch `reports.json`, and only the home page
and the indicator detail page need both.

### Search

`search.js` ranks rather than filters. A record matches when every query token
matches some field; the rank is the sum of the best per-token score, weighted by
field, so a hit in the name outranks one buried in a description. Tokens also
match against the *initials* of a field, which is why `IFF` reaches "Illicit
Financial Flows" and `HDI` reaches "Human Development Index" — neither worked
under the previous substring matcher. Literal matches are wrapped in `<mark>`;
acronym matches deliberately are not, since there is no substring to point at.

### Linking indicators to reports

`data.json` and `reports.json` describe different things: an indicator is a
metric, a report data point is one figure a report quoted. Matching them by name
was measured and rejected — only 7 of the 168 data points come near an indicator
name and none match exactly, so an automatic join would mostly be invention.

`catalog-graph.js` builds two links instead:

- **Curated** — a data point may carry `indicatorId` pointing at a `data.json`
  entry. Exact, and labelled "Used in knowledge products". None exist yet; add
  them as you verify them and `npm test` will check the id resolves.
- **Derived** — an indicator and a data point that resolve to the same
  publishing organisation. Presented as "related evidence in knowledge
  products", never as the same figure. Covers 91 of the 145 indicators across
  22 organisations.

### Icons

`icons.js` holds ~40 hand-drawn 24×24 stroke icons that inherit `currentColor`.
Static markup uses `<span class="icon" data-icon="chart-line"></span>`, which
CSS sizes so the swap costs no layout shift; JS-generated markup calls
`OSAA.icon('chart-line')`. The old Font Awesome names still resolve through an
alias table. Adding an icon means adding one path to `PATHS`.

Header and footer markup lives in `layout.js` and is injected during parsing.
There is no `shared/` directory any more: the previous approach fetched two HTML
partials on every page, which duplicated the loader four times, caused a visible
header flash, and did not work over `file://`.

### Indicator metadata

`data.json` stores each indicator's publisher, methodology and update cadence in
one `metadata` string:

```text
"Source: World Bank WDI. Methodology: …. Update frequency: Annual"
```

`data-loader.js` splits that into `publisher` / `methodology` / `frequency`, and
folds dataset-qualified publishers into their parent body (`World Bank Global
Findex` → `World Bank`) to produce the `organisations` array that drives the
organisation filter. Add an acronym or long form to `PUBLISHER_ALIASES` in
`data-loader.js` if a new source resolves incorrectly.

## 📈 Tracked Reports

1. **NEPAD 2025** - SDG Financing (31 indicators)
2. **NEPAD 2022** - COVID-19 Recovery (24 indicators)
3. **NEPAD 2024** - Debt Solutions (14 indicators)
4. **NEPAD 2023** - Development Paradoxes (16 indicators)
5. **CoC 2025** - Peace & Development (21 indicators)
6. **CoC 2022** - Governance & Conflict (19 indicators)
7. **CoC 2023** - Peace & Development (19 indicators)
8. **CoC 2024** - Migration & Justice (24 indicators)

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+) — no framework, no build step
- **Data Storage**: JSON (`data.json`, `reports.json`), loaded at runtime by `data-loader.js`
- **Hosting**: GitHub Pages
- **Icons**: Inline SVG (`icons.js`) — no icon font and no third-party CDN
- **Dependencies**: none at runtime; `npm test` needs only Node
- **CI**: `.github/workflows/ci.yml` validates the data on every push and PR

## 🔗 Data Provenance

The catalog tracks data usage in **both directions**:

**Report → data** (`reports.json`, rendered on `reports.html`)
Each of the 8 reports lists every data point it used. All 168 carry a value, a
source attribution, a link to the dataset, and a usage note recording where in the
report it appeared (e.g. *"Used in Figures I & II for incident trends (2019–2023)"*).

**Data → report** (`sources.html`, built at runtime by `sources-index.js`)
The reverse index resolves the 107 free-text source strings on those data points
into **72 canonical organisations**, then shows, for each one, which knowledge
products cited it and exactly which figures they drew. Every entry links out to
the official UN document for the report and offers a copy-ready citation.

The reverse index is **derived at page load rather than stored**, so it cannot
drift from `reports.json`. Adding a report automatically extends the index.

Source strings are messy by nature, so the parser handles four shapes:

| Shape | Example | Resolves to |
| --- | --- | --- |
| Single organisation | `IMF` | IMF |
| Co-sources | `IMF, OECD, ATAF, WDI` | IMF + OECD + ATAF + World Bank |
| Dataset qualifier | `World Bank – Remittance Prices Worldwide` | World Bank |
| Unattributed | `Academic research sources` | flagged for follow-up |

Organisation names containing a separator (`Institute for Economics and Peace`,
`University of Kentucky (Powell & Thyne)`) are protected before splitting, and
acronyms and dataset names are folded into their parent body (`AfDB` → African
Development Bank, `ILOSTAT` → ILO, `IIAG` → Mo Ibrahim Foundation). To add a
mapping, edit `CANONICAL` or `PROTECTED_NAMES` in `sources-index.js`.

## 📋 Data Structure

Each indicator includes:

- **Name & Description**: Clear indicator identification
- **Cluster & Theme**: Thematic classification
- **Source & Metadata**: Original data source and methodology
- **Usage Context**: How it's used in specific reports
- **Direct Links**: Access to original datasets

## 🚀 Quick Start

1. **View Live Site**: [https://mafiatun.github.io/osaa-data-catalog/](https://mafiatun.github.io/osaa-data-catalog/)
2. **Browse Indicators**: Search, filter and sort; every view has its own URL
3. **Open an Indicator**: `indicator.html?id=fin_001` is a citable permalink
4. **Explore Reports**: See each report's data points, values and sources
5. **Trace Sources**: Follow any data source back to the reports that cited it
6. **Export**: Download the current filtered view as CSV or JSON

## 🔧 Local Development

```bash
# Clone repository
git clone https://github.com/MafiAtUN/osaa-data-catalog.git

# Serve locally
python3 -m http.server 8000

# Open browser
open http://localhost:8000
```

## 📝 Adding New Data

### Adding a report

1. Add the report object to the `reports` array in `reports.json`
2. Include all indicators and sources used
3. Bump `metadata.totalReports` and `metadata.lastUpdated`

The cluster, data-source and tag filters on `reports.html` are built from the
JSON at load, so there is nothing to update by hand.

### Adding an indicator

1. Add the indicator object to the `indicators` array in `data.json`
2. Ensure proper cluster classification (one of the six `metadata.clusters` values)
3. Include complete metadata and source links
4. Bump `metadata.totalIndicators` and `metadata.lastUpdated`

After either change run `npm test`. It checks far more than "does this parse":
declared totals against actual array lengths, duplicate ids, unknown cluster
keys, missing required fields, malformed URLs, metadata strings the UI cannot
split, and any `indicatorId` that points at an entry which does not exist.
Warnings do not fail; errors exit non-zero, and CI runs the same command.

## 🌐 Data Sources

Comprehensive coverage from:

- **UN Agencies**: UNDP, UNCTAD, UNHCR, UNICEF, WHO, UNESCO, etc.
- **Financial Institutions**: World Bank, IMF, AfDB
- **Research Organizations**: Mo Ibrahim Foundation, ACLED, SDSN, Afrobarometer
- **Regional Organizations**: African Union, UN ECA
- **Specialized Agencies**: ILO, WIPO, IEA, IRENA, UNODC

## 📞 Contact

**Developed by**: Mafizul Islam, SMU Data Team  
**Maintained by**: UN OSAA team and global development community

For questions or contributions, please open an issue in this repository.

---

*© 2025 United Nations Office of the Special Adviser on Africa. All rights reserved.*
