# UN OSAA Data Catalog

A comprehensive data tracking and catalog system created for the **United Nations Office of the Special Adviser on Africa (UN OSAA)** to monitor data usage across published reports and serve as a centralized data catalog for Africa's sustainable development agenda.

## 🎯 Purpose

This system serves two primary functions:
1. **Data Tracking**: Monitor and catalog all data sources and indicators used in UN OSAA reports
2. **Data Catalog**: Provide easy access to development indicators across six thematic clusters

## 📊 Current Status

- **8+ Reports** tracked with comprehensive data sources
- **260+ Indicators** across all thematic areas
- **50+ Data Sources** from international organizations
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

- **Multi-Page Interface**: Home, Indicators, and Reports pages
- **Advanced Search**: Search by indicator name, cluster, source, or tags
- **Report Tracking**: Complete catalog of UN OSAA reports with data sources
- **Filtering System**: Filter by cluster, source, tags, and year
- **Responsive Design**: Works on all devices
- **GitHub Integration**: Easy maintenance and updates

## 📈 Tracked Reports

1. **NEPAD 2025** - SDG Financing (30+ indicators)
2. **NEPAD 2022** - COVID-19 Recovery (23+ indicators)
3. **NEPAD 2024** - Debt Solutions (14+ indicators)
4. **NEPAD 2023** - Development Paradoxes (16+ indicators)
5. **CoC 2025** - Peace & Development (21+ indicators)
6. **CoC 2022** - Governance & Conflict (19+ indicators)
7. **CoC 2023** - Peace & Development (19+ indicators)
8. **CoC 2024** - Migration & Justice (24+ indicators)

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Data Storage**: JSON format (`data.js`, `reports-data.js`)
- **Hosting**: GitHub Pages
- **Icons**: Font Awesome
- **Architecture**: Multi-page with shared components

## 📋 Data Structure

Each indicator includes:
- **Name & Description**: Clear indicator identification
- **Cluster & Theme**: Thematic classification
- **Source & Metadata**: Original data source and methodology
- **Usage Context**: How it's used in specific reports
- **Direct Links**: Access to original datasets

## 🚀 Quick Start

1. **View Live Site**: [https://mafiatun.github.io/osaa-data-catalog/](https://mafiatun.github.io/osaa-data-catalog/)
2. **Browse Indicators**: Use search and filters to find specific data
3. **Explore Reports**: View comprehensive report data and sources
4. **Access Sources**: Click through to original datasets

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

### For Reports:
1. Add report data to `reports-data.js`
2. Include all indicators and sources used
3. Update filter options in `reports.html`

### For Indicators:
1. Add indicator data to `data.js`
2. Ensure proper cluster classification
3. Include complete metadata and source links

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
