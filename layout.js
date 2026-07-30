/* UN OSAA Data Catalog — shared chrome and small UI utilities.
 *
 * Loaded synchronously at the top of <body> so the header paints with the rest
 * of the page. The previous build fetched shared/header.html on every page,
 * which meant four copies of the same loader, a visible header flash, and a
 * site that did not work from the file:// protocol.
 */
(function () {
    'use strict';

    /* ---------------------------------------------------------------- utils */

    /** Inline SVG icons — see icons.js. */
    const icon = (name, opts) => window.CatalogIcons.icon(name, opts);

    function escapeHTML(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Only allow links we are willing to render as href targets.
     *
     * A few `link` fields in reports.json hold a comma-separated list of URLs
     * rather than one; those used to be dropped into href verbatim, producing a
     * dead link. Take the first and let `safeURLs` expose the rest.
     */
    function safeURL(value) {
        return safeURLs(value)[0] || '';
    }

    function safeURLs(value) {
        const raw = String(value == null ? '' : value).trim();
        if (!raw) return [];

        return raw
            .split(/[,\s]+(?=https?:\/\/)|\s*,\s*/)
            .map(part => part.trim().replace(/[,;]+$/, ''))
            .filter(part => {
                if (!part) return false;
                if (/^(https?:|mailto:)/i.test(part)) return true;
                return /^[\w./?#-]+$/.test(part) && !part.includes(':');
            });
    }

    /**
     * The datasets behind one data point. Most cite one; a few cite several,
     * in which case reports.json carries a labelled `links` array and `link`
     * repeats the first for readers that only know the original field.
     */
    function pointLinks(point) {
        if (Array.isArray(point.links) && point.links.length) {
            return point.links
                .map(entry => ({ url: safeURL(entry.url), label: entry.label || '' }))
                .filter(entry => entry.url);
        }
        return safeURLs(point.link).map(url => ({ url: url, label: '' }));
    }

    function debounce(fn, wait) {
        let timer;
        return function () {
            const args = arguments;
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function formatNumber(n) {
        return Number(n || 0).toLocaleString('en-US');
    }

    function plural(count, one, many) {
        return count === 1 ? one : (many || one + 's');
    }

    /* --------------------------------------------------------------- theme */

    const THEME_KEY = 'osaa-theme';

    function storedTheme() {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    }

    function applyTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        const dark = resolvedTheme() === 'dark';
        btn.innerHTML = icon(dark ? 'sun' : 'moon');
        btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
        btn.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    function resolvedTheme() {
        const explicit = document.documentElement.getAttribute('data-theme');
        if (explicit) return explicit;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function toggleTheme() {
        const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
        applyTheme(next);
    }

    // Apply before first paint to avoid a light flash on dark-mode machines.
    applyTheme(storedTheme());

    /* -------------------------------------------------------------- header */

    const NAV = [
        { id: 'home', href: 'index.html', icon: 'house', label: 'Home' },
        { id: 'indicators', href: 'indicators.html', icon: 'chart-line', label: 'Indicators' },
        { id: 'reports', href: 'reports.html', icon: 'file-lines', label: 'Reports' },
        { id: 'sources', href: 'sources.html', icon: 'database', label: 'Sources' }
    ];

    function headerHTML(active) {
        const links = NAV.map(item =>
            '<a class="nav-link" href="' + item.href + '"' +
            (item.id === active ? ' aria-current="page"' : '') + '>' +
            icon(item.icon) +
            escapeHTML(item.label) + '</a>'
        ).join('');

        return '' +
            '<a class="skip-link" href="#main">Skip to main content</a>' +
            '<header class="site-header">' +
              '<div class="container site-header__inner">' +
                '<a class="brand" href="index.html">' +
                  '<img class="brand__mark" src="OSAA identifier color.svg" alt="">' +
                  '<span class="brand__text">' +
                    '<span class="brand__title">UN OSAA Data Catalog</span>' +
                    '<span class="brand__subtitle">Office of the Special Adviser on Africa</span>' +
                  '</span>' +
                '</a>' +
                '<nav class="site-nav" id="siteNav" aria-label="Primary">' + links + '</nav>' +
                '<button type="button" class="icon-btn" id="themeToggle"></button>' +
                '<button type="button" class="icon-btn nav-toggle" id="navToggle"' +
                  ' aria-controls="siteNav" aria-expanded="false" aria-label="Open menu">' +
                  icon('bars') +
                '</button>' +
              '</div>' +
            '</header>';
    }

    function footerHTML() {
        return '' +
            '<footer class="site-footer">' +
              '<div class="container site-footer__inner">' +
                '<p>&copy; 2025 United Nations Office of the Special Adviser on Africa. ' +
                  'Built by Mafizul Islam, SMU Data Team.</p>' +
                '<p class="site-footer__links">' +
                  '<a href="https://www.un.org/osaa/" target="_blank" rel="noopener">UN OSAA</a>' +
                  '<a href="https://github.com/MafiAtUN/osaa-data-catalog" target="_blank" rel="noopener">Source &amp; issues</a>' +
                '</p>' +
              '</div>' +
            '</footer>';
    }

    function upgradeIcons() {
        if (document.body) window.CatalogIcons.upgradeStaticIcons(document.body);
    }

    function mountFooter() {
        const footer = document.getElementById('footer-placeholder');
        if (footer) footer.outerHTML = footerHTML();
    }

    function mountHeader() {
        const header = document.getElementById('header-placeholder');
        if (!header) return;

        header.outerHTML = headerHTML((document.body && document.body.dataset.page) || '');
        applyTheme(storedTheme());

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        const navToggle = document.getElementById('navToggle');
        const nav = document.getElementById('siteNav');
        if (navToggle && nav) {
            const mq = window.matchMedia('(max-width: 860px)');
            const sync = () => {
                if (mq.matches) {
                    nav.hidden = navToggle.getAttribute('aria-expanded') !== 'true';
                } else {
                    nav.hidden = false;
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            };
            navToggle.addEventListener('click', () => {
                const open = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', String(!open));
                navToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
                navToggle.innerHTML = icon(open ? 'bars' : 'xmark');
                sync();
            });
            mq.addEventListener('change', sync);
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
                    navToggle.click();
                }
            });
            sync();
        }
    }

    /* ------------------------------------------------------------- dialogs */

    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]),' +
        ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let lastFocused = null;

    function openDialog(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        lastFocused = document.activeElement;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const first = modal.querySelector(FOCUSABLE);
        if (first) first.focus();
        modal.addEventListener('keydown', trapFocus);
    }

    function closeDialog(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = '';
        modal.removeEventListener('keydown', trapFocus);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function trapFocus(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDialog(event.currentTarget.id);
            return;
        }
        if (event.key !== 'Tab') return;

        const items = Array.from(event.currentTarget.querySelectorAll(FOCUSABLE))
            .filter(el => el.offsetParent !== null);
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    // Backdrop click closes whichever dialog is open.
    document.addEventListener('click', event => {
        if (event.target.classList && event.target.classList.contains('modal')) {
            closeDialog(event.target.id);
        }
    });

    /* --------------------------------------------------------------- toast */

    let toastTimer;
    function toast(message, iconName) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.innerHTML = icon(iconName || 'circle-check') +
            '<span>' + escapeHTML(message) + '</span>';
        document.body.appendChild(el);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.remove(), 3200);
    }

    function errorBanner(container, message) {
        if (!container) return;
        container.innerHTML =
            '<div class="error-banner" role="alert">' +
            icon('triangle-exclamation') +
            '<span>' + escapeHTML(message) + '</span></div>';
    }

    function skeleton(container, rows) {
        if (!container) return;
        let html = '<div class="skeleton-list" aria-hidden="true">';
        for (let i = 0; i < (rows || 5); i++) html += '<div class="skeleton"></div>';
        container.innerHTML = html + '</div>';
    }

    /* --------------------------------------------------------- query string */

    function readParams() {
        return new URLSearchParams(window.location.search);
    }

    /** Reflect state in the URL so a filtered view can be linked or bookmarked. */
    function writeParams(state) {
        const params = new URLSearchParams();
        Object.keys(state).forEach(key => {
            const value = state[key];
            if (value !== '' && value != null && value !== 1) params.set(key, value);
        });
        const query = params.toString();
        const url = window.location.pathname + (query ? '?' + query : '');
        window.history.replaceState(null, '', url);
    }

    /* ------------------------------------------------------------- clusters */

    const CLUSTERS = [
        {
            key: 'financing',
            name: 'Financing for Development',
            short: 'Financing',
            icon: 'dollar-sign',
            blurb: "Mobilising and managing resources for Africa's sustainable development."
        },
        {
            key: 'conflict',
            name: 'Addressing Drivers of Conflict',
            short: 'Conflict',
            icon: 'shield-halved',
            blurb: 'Linking peace, governance and development.'
        },
        {
            key: 'democracy',
            name: 'Democracy, Resilience and Human Capital',
            short: 'Democracy',
            icon: 'users',
            blurb: 'Strengthening governance, inclusion and social protection.'
        },
        {
            key: 'sti',
            name: 'Science, Technology and Innovation',
            short: 'STI',
            icon: 'microchip',
            blurb: "Leveraging technology for Africa's transformation."
        },
        {
            key: 'industrialization',
            name: 'Industrialization and AfCFTA',
            short: 'Industrialization',
            icon: 'industry',
            blurb: 'Accelerating structural transformation and trade integration.'
        },
        {
            key: 'energy',
            name: 'Sustainable Energy and Climate Change',
            short: 'Energy & Climate',
            icon: 'leaf',
            blurb: 'Advancing green growth and climate resilience.'
        }
    ];

    const CLUSTER_BY_KEY = CLUSTERS.reduce((acc, c) => { acc[c.key] = c; return acc; }, {});

    function clusterName(key) {
        return (CLUSTER_BY_KEY[key] && CLUSTER_BY_KEY[key].name) || key || 'Uncategorised';
    }

    function clusterShort(key) {
        return (CLUSTER_BY_KEY[key] && CLUSTER_BY_KEY[key].short) || clusterName(key);
    }

    /** Populate a <select> from values found in the data, not a hand-kept list. */
    function fillSelect(select, values, allLabel) {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">' + escapeHTML(allLabel) + '</option>' +
            values.map(v => {
                const value = typeof v === 'string' ? v : v.value;
                const label = typeof v === 'string' ? v : v.label;
                return '<option value="' + escapeHTML(value) + '">' + escapeHTML(label) + '</option>';
            }).join('');
        if (current) select.value = current;
    }

    /* --------------------------------------------------------------- expose */

    window.OSAA = {
        icon: icon,
        escapeHTML: escapeHTML,
        safeURL: safeURL,
        safeURLs: safeURLs,
        pointLinks: pointLinks,
        debounce: debounce,
        formatNumber: formatNumber,
        plural: plural,
        openDialog: openDialog,
        closeDialog: closeDialog,
        toast: toast,
        errorBanner: errorBanner,
        skeleton: skeleton,
        readParams: readParams,
        writeParams: writeParams,
        clusters: CLUSTERS,
        clusterName: clusterName,
        clusterShort: clusterShort,
        fillSelect: fillSelect,
        toggleTheme: toggleTheme
    };

    // layout.js is loaded from <head> so the stored theme applies before first
    // paint (no light flash on dark machines). Both mounts are idempotent —
    // they no-op once their placeholder has been replaced.
    mountHeader();
    mountFooter();
    upgradeIcons();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            mountHeader();
            mountFooter();
            upgradeIcons();
        });
    }
})();
