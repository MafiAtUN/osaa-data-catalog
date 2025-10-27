// UN OSAA Data Catalog - Data Loader
// Modern approach: Load data from JSON files instead of inline JavaScript

class DataLoader {
    constructor() {
        this.indicators = [];
        this.reports = [];
        this.loaded = false;
        this.loading = false;
        this.error = null;
    }

    async loadAll() {
        if (this.loading) {
            return;
        }
        
        this.loading = true;
        this.error = null;
        
        try {
            await Promise.all([
                this.loadIndicators(),
                this.loadReports()
            ]);
            this.loaded = true;
            console.log('Data loaded successfully');
        } catch (error) {
            this.error = error;
            console.error('Error loading data:', error);
            throw error;
        } finally {
            this.loading = false;
        }
    }

    async loadIndicators() {
        try {
            // Try to load from JSON first (new approach)
            const response = await fetch('data.json');
            if (response.ok) {
                const data = await response.json();
                this.indicators = data.indicators || [];
                console.log(`Loaded ${this.indicators.length} indicators from JSON`);
                return;
            }
        } catch (error) {
            console.log('JSON file not available, falling back to JavaScript file');
        }

        // Fallback to JavaScript file (current approach)
        if (typeof window.indicatorsData !== 'undefined') {
            this.indicators = window.indicatorsData;
            console.log(`Loaded ${this.indicators.length} indicators from JavaScript`);
        }
    }

    async loadReports() {
        try {
            // Try to load from JSON first (new approach)
            const response = await fetch('reports.json');
            if (response.ok) {
                const data = await response.json();
                this.reports = data.reports || [];
                console.log(`Loaded ${this.reports.length} reports from JSON`);
                return;
            }
        } catch (error) {
            console.log('JSON file not available, falling back to JavaScript file');
        }

        // Fallback to JavaScript file (current approach)
        if (typeof window.reportsData !== 'undefined') {
            this.reports = window.reportsData;
            console.log(`Loaded ${this.reports.length} reports from JavaScript`);
        }
    }

    getIndicators() {
        return this.indicators;
    }

    getReports() {
        return this.reports;
    }

    getIndicatorsByCluster(cluster) {
        return this.indicators.filter(ind => ind.cluster === cluster);
    }

    searchIndicators(query) {
        const lowerQuery = query.toLowerCase();
        return this.indicators.filter(ind => 
            ind.name.toLowerCase().includes(lowerQuery) ||
            ind.description.toLowerCase().includes(lowerQuery) ||
            ind.theme.toLowerCase().includes(lowerQuery) ||
            ind.source.toLowerCase().includes(lowerQuery)
        );
    }

    searchReports(query) {
        const lowerQuery = query.toLowerCase();
        return this.reports.filter(rep => 
            rep.title.toLowerCase().includes(lowerQuery) ||
            rep.summary.toLowerCase().includes(lowerQuery) ||
            rep.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    // Utility methods
    getIndicatorsCount() {
        return this.indicators.length;
    }

    getReportsCount() {
        return this.reports.length;
    }

    getClusters() {
        const clusters = [...new Set(this.indicators.map(ind => ind.cluster))];
        return clusters;
    }

    getYears() {
        const years = [...new Set(this.reports.map(rep => rep.year))];
        return years.sort();
    }

    isLoaded() {
        return this.loaded;
    }

    isLoading() {
        return this.loading;
    }

    getError() {
        return this.error;
    }
}

// Create global instance
window.dataLoader = new DataLoader();
