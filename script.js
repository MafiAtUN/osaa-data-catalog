// Global variables
let indicators = [];
let filteredIndicators = [];
let reports = [];
let filteredReports = [];
let currentView = 'indicators';
let currentPage = 1;
let itemsPerPage = 20;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadIndicators();
    loadReports();
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const clusterParam = urlParams.get('cluster');
    
    if (clusterParam) {
        // Wait for elements to be available
        setTimeout(() => {
            const clusterFilter = document.getElementById('clusterFilter');
            if (clusterFilter) {
                clusterFilter.value = clusterParam;
                handleFilter();
            }
        }, 200);
    } else {
        renderClusters();
    }
    
    updateStats();
});

// Load indicators from data.js
function loadIndicators() {
    indicators = window.indicatorsData || [];
    filteredIndicators = [...indicators];
}

// Load reports from reports-data.js
function loadReports() {
    reports = window.reportsData || [];
    filteredReports = [...reports];
}

// Setup event listeners
function setupEventListeners() {
    // Wait for elements to be available
    setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        const clusterFilter = document.getElementById('clusterFilter');
        const addForm = document.getElementById('addIndicatorForm');
        const indicatorsView = document.getElementById('indicatorsView');
        const reportsView = document.getElementById('reportsView');
        const reportSearch = document.getElementById('reportSearch');
        const reportClusterFilter = document.getElementById('reportClusterFilter');
        const sourceFilter = document.getElementById('sourceFilter');
        const tagFilter = document.getElementById('tagFilter');
        
        // New indicator search elements
        const indicatorSearch = document.getElementById('indicatorSearch');
        const indicatorClusterFilter = document.getElementById('indicatorClusterFilter');
        const indicatorSourceFilter = document.getElementById('indicatorSourceFilter');
        
        // Report dropdown elements
        const reportDropdown = document.getElementById('reportDropdown');
        const reportDropdownMenu = document.getElementById('reportDropdownMenu');

        if (searchInput) searchInput.addEventListener('input', handleSearch);
        if (clusterFilter) clusterFilter.addEventListener('change', handleFilter);
        if (addForm) addForm.addEventListener('submit', handleAddIndicator);
        
        // View toggle
        if (indicatorsView) indicatorsView.addEventListener('click', () => switchView('indicators'));
        if (reportsView) reportsView.addEventListener('click', () => switchView('reports'));
        
        // Reports filtering
        if (reportSearch) reportSearch.addEventListener('input', handleReportSearch);
        if (reportClusterFilter) reportClusterFilter.addEventListener('change', handleReportFilter);
        if (sourceFilter) sourceFilter.addEventListener('change', handleReportFilter);
        if (tagFilter) tagFilter.addEventListener('change', handleReportFilter);
        
        // New indicator filtering
        if (indicatorSearch) indicatorSearch.addEventListener('input', handleIndicatorSearch);
        if (indicatorClusterFilter) indicatorClusterFilter.addEventListener('change', handleIndicatorFilter);
        if (indicatorSourceFilter) indicatorSourceFilter.addEventListener('change', handleIndicatorFilter);
        
        // Report dropdown functionality
        if (reportDropdown) {
            reportDropdown.addEventListener('input', handleReportDropdownSearch);
            reportDropdown.addEventListener('focus', showReportDropdown);
            reportDropdown.addEventListener('blur', hideReportDropdown);
        }
    }, 100);
}

// Handle search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const clusterFilter = document.getElementById('clusterFilter');
    const clusterValue = clusterFilter ? clusterFilter.value : '';
    
    filteredIndicators = indicators.filter(indicator => {
        const matchesSearch = !searchTerm || 
            indicator.name.toLowerCase().includes(searchTerm) ||
            indicator.theme.toLowerCase().includes(searchTerm) ||
            indicator.description.toLowerCase().includes(searchTerm) ||
            indicator.cluster.toLowerCase().includes(searchTerm);
        
        const matchesCluster = !clusterFilter || indicator.cluster === clusterFilter;
        
        return matchesSearch && matchesCluster;
    });
    
    renderClusters();
    updateStats();
}

// Handle cluster filter
function handleFilter(event) {
    const clusterFilter = event.target.value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredIndicators = indicators.filter(indicator => {
        const matchesSearch = !searchTerm || 
            indicator.name.toLowerCase().includes(searchTerm) ||
            indicator.theme.toLowerCase().includes(searchTerm) ||
            indicator.description.toLowerCase().includes(searchTerm) ||
            indicator.cluster.toLowerCase().includes(searchTerm);
        
        const matchesCluster = !clusterFilter || indicator.cluster === clusterFilter;
        
        return matchesSearch && matchesCluster;
    });
    
    renderClusters();
    updateStats();
}

// Handle indicator search
function handleIndicatorSearch(event) {
    currentPage = 1;
    filterIndicators();
}

// Handle indicator filtering
function handleIndicatorFilter() {
    currentPage = 1;
    filterIndicators();
}

// Filter indicators based on search and filter criteria
function filterIndicators() {
    const searchTerm = document.getElementById('indicatorSearch')?.value.toLowerCase() || '';
    const clusterFilter = document.getElementById('indicatorClusterFilter')?.value || '';
    const sourceFilter = document.getElementById('indicatorSourceFilter')?.value || '';
    
    filteredIndicators = indicators.filter(indicator => {
        const matchesSearch = !searchTerm || 
            indicator.name.toLowerCase().includes(searchTerm) ||
            indicator.description.toLowerCase().includes(searchTerm) ||
            indicator.source.toLowerCase().includes(searchTerm);
        
        const matchesCluster = !clusterFilter || indicator.cluster === clusterFilter;
        const matchesSource = !sourceFilter || indicator.source.toLowerCase().includes(sourceFilter.toLowerCase());
        
        return matchesSearch && matchesCluster && matchesSource;
    });
    
    renderIndicatorsList();
}

// Render indicators list with pagination
function renderIndicatorsList() {
    const container = document.getElementById('indicatorsList');
    const paginationContainer = document.getElementById('pagination');
    
    if (!container) return;
    
    if (filteredIndicators.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>No indicators found</h3>
                <p>Try adjusting your search terms or filters</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredIndicators.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageIndicators = filteredIndicators.slice(startIndex, endIndex);
    
    // Render indicators
    container.innerHTML = pageIndicators.map(indicator => createIndicatorCardHTML(indicator)).join('');
    
    // Render pagination
    if (paginationContainer) {
        renderPagination(totalPages);
    }
}

// Create indicator card HTML
function createIndicatorCardHTML(indicator) {
    return `
        <div class="indicator-card">
            <div class="indicator-header">
                <h3 class="indicator-name">${indicator.name}</h3>
                <span class="indicator-cluster cluster-${indicator.cluster}">${getClusterDisplayName(indicator.cluster)}</span>
            </div>
            <div class="indicator-content">
                <p class="indicator-description">${indicator.description}</p>
                <div class="indicator-meta">
                    <div class="indicator-source">
                        <i class="fas fa-database"></i>
                        <span>${indicator.source}</span>
                    </div>
                    ${indicator.theme ? `<div class="indicator-theme">
                        <i class="fas fa-tag"></i>
                        <span>${indicator.theme}</span>
                    </div>` : ''}
                </div>
                ${indicator.source ? `<a href="${indicator.source}" target="_blank" class="indicator-link">
                    <i class="fas fa-external-link-alt"></i>
                    View Source
                </a>` : ''}
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-controls">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    paginationHTML += '</div>';
    
    // Add page info
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredIndicators.length);
    paginationHTML += `<div class="pagination-info">
        Showing ${startIndex}-${endIndex} of ${filteredIndicators.length} indicators
    </div>`;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    renderIndicatorsList();
}

// Render clusters (legacy function for compatibility)
function renderClusters() {
    renderIndicatorsList();
}

// Group indicators by cluster
function groupIndicatorsByCluster(indicators) {
    const clusters = {};
    
    indicators.forEach(indicator => {
        if (!clusters[indicator.cluster]) {
            clusters[indicator.cluster] = {
                name: getClusterDisplayName(indicator.cluster),
                theme: getClusterTheme(indicator.cluster),
                goals: getClusterGoals(indicator.cluster),
                indicators: []
            };
        }
        clusters[indicator.cluster].indicators.push(indicator);
    });
    
    return clusters;
}

// Get cluster display name
function getClusterDisplayName(clusterKey) {
    const names = {
        'financing': 'Financing for Development',
        'conflict': 'Addressing Drivers of Conflict for Sustainable Development',
        'democracy': 'Democracy, Resilience, and Human Capital',
        'sti': 'Science, Technology, and Innovation (STI)',
        'industrialization': 'Industrialization, Demographic Dividend, and AfCFTA',
        'energy': 'Sustainable Energy Future and Climate Change'
    };
    return names[clusterKey] || clusterKey;
}

// Get cluster theme
function getClusterTheme(clusterKey) {
    const themes = {
        'financing': 'Mobilizing and managing resources for Africa\'s sustainable development',
        'conflict': 'Linking peace, governance, and development',
        'democracy': 'Strengthening governance, inclusion, and social protection',
        'sti': 'Leveraging technology for Africa\'s transformation',
        'industrialization': 'Accelerating structural transformation and trade integration',
        'energy': 'Advancing green growth and climate resilience'
    };
    return themes[clusterKey] || '';
}

// Get cluster goals
function getClusterGoals(clusterKey) {
    const goals = {
        'financing': [
            'Reversing illicit financial flows (IFFs) and promoting international tax cooperation',
            'Maximizing remittances as a source of development finance',
            'Addressing credit rating agency bias and expanding access to capital markets'
        ],
        'conflict': [
            'Promoting inclusive institutional practices',
            'Tackling conflict economies through socioeconomic transformation',
            'Building cohesive and diverse societies'
        ],
        'democracy': [
            'Centering human capital in policy-making',
            'Enhancing participation of women and youth',
            'Protecting vulnerable groups (children, refugees, minorities)'
        ],
        'sti': [
            'Advancing post-COVID recovery through science and innovation',
            'Promoting sustainability via STI',
            'Overcoming intellectual-property barriers'
        ],
        'industrialization': [
            'Expanding Africa\'s role in global and regional value chains',
            'Harnessing the demographic dividend through education and jobs',
            'Implementing AfCFTA for industrial diversification'
        ],
        'energy': [
            'Investing in energy access and sustainability',
            'Balancing energy needs and climate commitments',
            'Expanding off-grid and renewable energy solutions'
        ]
    };
    return goals[clusterKey] || [];
}

// Create cluster HTML
function createClusterHTML(clusterKey, cluster) {
    const indicatorsHTML = cluster.indicators.map(indicator => `
        <div class="indicator-card">
            <div class="indicator-header">
                <h4 class="indicator-name">${indicator.name}</h4>
            </div>
            ${indicator.theme ? `<p class="indicator-theme"><strong>Theme:</strong> ${indicator.theme}</p>` : ''}
            ${indicator.description ? `<p class="indicator-description">${indicator.description}</p>` : ''}
            ${indicator.source ? `<p class="indicator-source"><strong>Source:</strong> <a href="${indicator.source}" target="_blank">${indicator.source}</a></p>` : ''}
            ${indicator.metadata ? `<div class="indicator-metadata"><strong>Metadata:</strong> ${indicator.metadata}</div>` : ''}
            ${indicator.remarks ? `<p class="indicator-remarks"><strong>Remarks:</strong> ${indicator.remarks}</p>` : ''}
        </div>
    `).join('');
    
    return `
        <div class="cluster-card cluster-${clusterKey}">
            <div class="cluster-header">
                <h2>${cluster.name}</h2>
                <p class="cluster-theme">${cluster.theme}</p>
                <div class="cluster-goals">
                    <strong>Main Goals / Focus Areas:</strong>
                    <ul>
                        ${cluster.goals.map(goal => `<li>${goal}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="cluster-content">
                <h3>Indicators (${cluster.indicators.length})</h3>
                <div class="indicators-grid">
                    ${indicatorsHTML}
                </div>
            </div>
        </div>
    `;
}

// Update statistics
function updateStats() {
    const totalIndicators = document.getElementById('totalIndicators');
    if (totalIndicators) {
        totalIndicators.textContent = filteredIndicators.length;
    }
}

// Show add form modal
function showAddForm() {
    const modal = document.getElementById('addModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Hide add form modal
function hideAddForm() {
    const modal = document.getElementById('addModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('addIndicatorForm').reset();
}

// Handle add indicator form submission
function handleAddIndicator(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const newIndicator = {
        id: Date.now().toString(),
        name: document.getElementById('indicatorName').value,
        cluster: document.getElementById('indicatorCluster').value,
        theme: document.getElementById('indicatorTheme').value,
        description: document.getElementById('indicatorDescription').value,
        source: document.getElementById('indicatorSource').value,
        metadata: document.getElementById('indicatorMetadata').value,
        remarks: document.getElementById('indicatorRemarks').value
    };
    
    // Add to indicators array
    indicators.push(newIndicator);
    
    // Update filtered indicators
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const clusterFilter = document.getElementById('clusterFilter').value;
    
    if ((!searchTerm || newIndicator.name.toLowerCase().includes(searchTerm) ||
         newIndicator.theme.toLowerCase().includes(searchTerm) ||
         newIndicator.description.toLowerCase().includes(searchTerm) ||
         newIndicator.cluster.toLowerCase().includes(searchTerm)) &&
        (!clusterFilter || newIndicator.cluster === clusterFilter)) {
        filteredIndicators.push(newIndicator);
    }
    
    // Re-render
    renderClusters();
    updateStats();
    
    // Hide modal
    hideAddForm();
    
    // Show success message
    alert('Indicator added successfully!');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addModal');
    if (event.target === modal) {
        hideAddForm();
    }
}

// Export functionality (for future enhancement)
function exportData() {
    const dataStr = JSON.stringify(indicators, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'un-osaa-indicators.json';
    link.click();
    URL.revokeObjectURL(url);
}

// View switching functionality
function switchView(view) {
    currentView = view;
    const indicatorsView = document.getElementById('indicatorsView');
    const reportsView = document.getElementById('reportsView');
    const clustersContainer = document.getElementById('clustersContainer');
    const reportsSection = document.getElementById('reportsSection');
    
    if (view === 'indicators') {
        indicatorsView.classList.add('active');
        reportsView.classList.remove('active');
        clustersContainer.style.display = 'block';
        reportsSection.style.display = 'none';
        renderClusters();
    } else {
        indicatorsView.classList.remove('active');
        reportsView.classList.add('active');
        clustersContainer.style.display = 'none';
        reportsSection.style.display = 'block';
        renderReports();
    }
}

// Handle report search
function handleReportSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    filterReports();
}

// Handle report filtering
function handleReportFilter() {
    filterReports();
}

// Filter reports based on all criteria
function filterReports() {
    const searchTerm = document.getElementById('reportSearch').value.toLowerCase();
    const clusterFilter = document.getElementById('reportClusterFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value;
    const tagFilter = document.getElementById('tagFilter').value;
    
    filteredReports = reports.filter(report => {
        const matchesSearch = !searchTerm || 
            report.title.toLowerCase().includes(searchTerm) ||
            report.summary.toLowerCase().includes(searchTerm) ||
            report.indicators.some(ind => ind.name.toLowerCase().includes(searchTerm)) ||
            report.indicators.some(ind => ind.source.toLowerCase().includes(searchTerm));
        
        const matchesCluster = !clusterFilter || report.cluster === clusterFilter;
        
        const matchesSource = !sourceFilter || 
            report.indicators.some(ind => ind.source.toLowerCase().includes(sourceFilter.toLowerCase()));
        
        const matchesTag = !tagFilter || 
            report.tags.some(tag => tag.toLowerCase() === tagFilter.toLowerCase());
        
        return matchesSearch && matchesCluster && matchesSource && matchesTag;
    });
    
    renderReports();
}

// Handle report dropdown search
function handleReportDropdownSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const dropdownMenu = document.getElementById('reportDropdownMenu');
    const container = document.querySelector('.dropdown-container');
    
    if (searchTerm.length > 0) {
        container.classList.add('active');
        populateReportDropdown(searchTerm);
    } else {
        container.classList.remove('active');
    }
}

// Show report dropdown
function showReportDropdown() {
    const container = document.querySelector('.dropdown-container');
    const dropdown = document.getElementById('reportDropdown');
    
    if (dropdown.value.length > 0) {
        container.classList.add('active');
        populateReportDropdown(dropdown.value);
    }
}

// Hide report dropdown
function hideReportDropdown() {
    // Delay to allow clicking on dropdown items
    setTimeout(() => {
        const container = document.querySelector('.dropdown-container');
        container.classList.remove('active');
    }, 200);
}

// Populate report dropdown
function populateReportDropdown(searchTerm = '') {
    const dropdownMenu = document.getElementById('reportDropdownMenu');
    if (!dropdownMenu) return;
    
    const filteredReports = reports.filter(report => 
        !searchTerm || 
        report.title.toLowerCase().includes(searchTerm) ||
        report.summary.toLowerCase().includes(searchTerm) ||
        report.year.includes(searchTerm)
    );
    
    if (filteredReports.length === 0) {
        dropdownMenu.innerHTML = '<div class="dropdown-item">No reports found</div>';
        return;
    }
    
    dropdownMenu.innerHTML = filteredReports.map(report => `
        <div class="dropdown-item" onclick="selectReport('${report.id}')">
            <div class="dropdown-item-title">${report.title}</div>
            <div class="dropdown-item-year">${report.year}</div>
            <div class="dropdown-item-summary">${report.summary.substring(0, 100)}...</div>
            <div class="dropdown-item-indicators">${report.indicators.length} indicators</div>
        </div>
    `).join('');
}

// Select report from dropdown
function selectReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    const dropdown = document.getElementById('reportDropdown');
    dropdown.value = report.title;
    
    // Filter to show only this report
    filteredReports = [report];
    renderReports();
    
    // Hide dropdown
    const container = document.querySelector('.dropdown-container');
    container.classList.remove('active');
}

// Render reports
function renderReports() {
    const container = document.getElementById('reportsGrid');
    
    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>No reports found</h3>
                <p>Try adjusting your search terms or filters</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredReports.map(report => createReportHTML(report)).join('');
}

// Create report HTML
function createReportHTML(report) {
    const indicatorsByCluster = groupIndicatorsByCluster(report.indicators);
    const clustersHTML = Object.keys(indicatorsByCluster).map(clusterKey => {
        const cluster = indicatorsByCluster[clusterKey];
        return `
            <div class="cluster-indicators">
                <h5>${getClusterDisplayName(clusterKey)} (${cluster.indicators.length})</h5>
                <div class="indicators-list">
                    ${cluster.indicators.map(indicator => `
                        <div class="indicator-item">
                            <div class="indicator-name">${indicator.name}</div>
                            <div class="indicator-source">Source: ${indicator.source}</div>
                            ${indicator.link ? `<a href="${indicator.link}" target="_blank" class="indicator-link">${indicator.link}</a>` : ''}
                            ${indicator.notes ? `<div class="indicator-notes">${indicator.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="report-card">
            <div class="report-header">
                <h3 class="report-title">${report.title}</h3>
                <div class="report-year">${report.year}</div>
                <a href="${report.link}" target="_blank" class="report-link">
                    <i class="fas fa-external-link-alt"></i>
                    View Report
                </a>
                <div class="report-tags">
                    ${report.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="report-content">
                <div class="report-summary">${report.summary}</div>
                
                <div class="indicators-section">
                    <h4>
                        <i class="fas fa-chart-line"></i>
                        Indicators & Data Sources
                        <span class="indicators-count">${report.indicators.length}</span>
                    </h4>
                    ${clustersHTML}
                </div>
                
                <div class="sources-section">
                    <h4>
                        <i class="fas fa-database"></i>
                        Key Data Sources
                    </h4>
                    <div class="sources-list">
                        ${report.sources.map(source => `
                            <div class="source-item">
                                <div class="source-icon">${source.name.charAt(0)}</div>
                                <div class="source-name">${source.name}</div>
                                <a href="${source.link}" target="_blank" class="source-link">Visit</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Group indicators by cluster for reports
function groupIndicatorsByCluster(indicators) {
    const clusters = {};
    
    indicators.forEach(indicator => {
        if (!clusters[indicator.cluster]) {
            clusters[indicator.cluster] = {
                name: getClusterDisplayName(indicator.cluster),
                indicators: []
            };
        }
        clusters[indicator.cluster].indicators.push(indicator);
    });
    
    return clusters;
}
