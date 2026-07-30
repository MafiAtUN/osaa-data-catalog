/* Inline SVG icon set.
 *
 * Replaces the Font Awesome CDN link, which cost ~70KB of CSS plus a webfont
 * download from a third-party host to draw about forty glyphs on a UN site.
 * These are hand-drawn on a 24x24 grid with a 2px stroke, so they inherit
 * `currentColor` and stay crisp at any size with no font loading at all.
 *
 * Usage:  OSAA.icon('search')  ->  '<svg class="icon" …>…</svg>'
 * Decorative by default (aria-hidden); pass a label for a meaningful icon.
 */
(function (global) {
    'use strict';

    // Every path is drawn inside viewBox="0 0 24 24".
    const PATHS = {
        /* navigation & chrome */
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>',
        chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
        report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
        database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
        graph: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M6.6 8l4 8"/><path d="M17.4 8l-4 8"/>',
        menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
        close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
        moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',

        /* actions */
        search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L21 21"/>',
        plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
        filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
        download: '<path d="M12 3v11"/><path d="M8 10.5l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
        check: '<path d="M4.5 12.5l5 5 10-11"/>',
        external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
        link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
        unlink: '<path d="M9.5 14.5l-1.2 1.2a3.5 3.5 0 0 1-5-5l1.2-1.2"/><path d="M14.5 9.5l1.2-1.2a3.5 3.5 0 0 1 5 5l-1.2 1.2"/><path d="M3 3l18 18"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
        github: '<path d="M9 19.5c-4.5 1.4-4.5-2.3-6-2.8m12 5.3v-3.6a3 3 0 0 0-.9-2.4c2.9-.3 6-1.4 6-6.5a5 5 0 0 0-1.4-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.3 12.3 0 0 0-6.4 0C6.1 1.7 5 2 5 2a4.7 4.7 0 0 0-.1 3.5A5 5 0 0 0 3.5 9c0 5 3.1 6.2 6 6.5a3 3 0 0 0-.9 2.3V22"/>',

        /* chevrons */
        'chevron-right': '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
        'chevron-left': '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
        'chevron-down': '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
        'arrow-right': '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',

        /* metadata */
        tag: '<path d="M3 11.5V4.5a1.5 1.5 0 0 1 1.5-1.5h7l9.5 9.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z"/><circle cx="7.8" cy="7.8" r="1.4"/>',
        refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L3.5 9"/><path d="M4 13a8 8 0 0 0 14 4.5L20.5 15"/><path d="M3.5 4.5V9H8"/><path d="M20.5 19.5V15H16"/>',
        institution: '<path d="M3.5 9.5L12 4l8.5 5.5"/><path d="M5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7"/><path d="M3.5 20.5h17"/>',
        layers: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12.5L12 17l9-4.5"/><path d="M3 17L12 21.5 21 17"/>',
        users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.5a6 6 0 0 1 3 5.5"/>',
        recycle: '<path d="M8.5 4.5l2-3.2 2 3.2"/><path d="M10.5 1.3 6 9l3 1.7"/><path d="M20.7 14.6l.6 3.7-3.7-.5"/><path d="M21.3 18.3 17 11l-3 1.7"/><path d="M5.6 20.9 2.7 18.5l3.1-2.2"/><path d="M2.7 18.5H12v-3.4"/>',
        quote: '<path d="M9.5 6.5C6.5 7.8 5 10 5 13v4.5h5.5V12H8c0-2 .5-3.3 2.3-4z"/><path d="M18.5 6.5c-3 1.3-4.5 3.5-4.5 6.5v4.5h5.5V12H17c0-2 .5-3.3 2.3-4z"/>',

        /* clusters */
        money: '<path d="M12 3v18"/><path d="M16.5 7.2C15.6 6 14 5.3 12 5.3c-2.5 0-4.2 1.2-4.2 3s1.5 2.6 4.4 3.2c3 .6 4.6 1.5 4.6 3.4 0 2-1.9 3.3-4.6 3.3-2.2 0-3.9-.7-4.9-2"/>',
        shield: '<path d="M12 3l8 3v6c0 4.4-3.2 8.2-8 9.5C7.2 20.2 4 16.4 4 12V6z"/>',
        chip: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><path d="M10 4v3.5M14 4v3.5M10 16.5V20M14 16.5V20M4 10h3.5M4 14h3.5M16.5 10H20M16.5 14H20"/>',
        factory: '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/><path d="M7 21v-3.5M12 21v-3.5M17 21v-3.5"/>',
        leaf: '<path d="M4.5 19.5c-1.5-7 2-12.5 9-14 2.5-.5 5-.3 7 .5.5 7-3 13-10 14.5-2.5.5-4.5.3-6-1z"/><path d="M4.5 19.5C7.5 14 11.5 10.5 16.5 8.5"/>',

        /* status */
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.5"/>',
        warning: '<path d="M12 3.5 22 20H2z"/><path d="M12 10v4.5"/><path d="M12 17.5v.4"/>',
        'circle-check': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
        'file-question': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M10.2 12.6a1.8 1.8 0 1 1 2.6 1.7c-.5.3-.8.7-.8 1.2v.3"/><path d="M12 18.2v.3"/>'
    };

    // Names carried over from the Font Awesome markup so call sites read the same.
    const ALIASES = {
        'magnifying-glass': 'search',
        xmark: 'close',
        bars: 'menu',
        'chart-line': 'chart',
        'file-lines': 'report',
        'file-circle-question': 'file-question',
        'diagram-project': 'graph',
        'arrow-up-right-from-square': 'external',
        'link-slash': 'unlink',
        'building-columns': 'institution',
        'layer-group': 'layers',
        'earth-africa': 'globe',
        africa: 'globe',
        'dollar-sign': 'money',
        'shield-halved': 'shield',
        microchip: 'chip',
        industry: 'factory',
        rotate: 'refresh',
        'quote-left': 'quote',
        'quote-right': 'quote',
        'circle-info': 'info',
        'triangle-exclamation': 'warning'
    };

    function resolve(name) {
        const key = String(name || '').replace(/^fas?\s+/, '').replace(/^fa-/, '');
        return PATHS[key] ? key : (ALIASES[key] || null);
    }

    /**
     * @param {string} name   icon name (Font Awesome names still work)
     * @param {object} [opts] { label, className, size }
     */
    function icon(name, opts) {
        const options = opts || {};
        const key = resolve(name);
        if (!key) {
            if (name) console.warn('Unknown icon:', name);
            return '';
        }

        const labelled = !!options.label;
        return '<svg class="icon' + (options.className ? ' ' + options.className : '') + '"' +
            ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
            ' stroke-linecap="round" stroke-linejoin="round"' +
            (options.size ? ' width="' + options.size + '" height="' + options.size + '"' : '') +
            (labelled
                ? ' role="img" aria-label="' + String(options.label).replace(/"/g, '&quot;') + '"'
                : ' aria-hidden="true" focusable="false"') +
            '>' + PATHS[key] + '</svg>';
    }

    /**
     * Fill `<span class="icon" data-icon="chart-line"></span>` placeholders in
     * static markup. The span reserves the box in CSS, so swapping in the SVG
     * costs no layout shift, and the HTML stays readable.
     */
    function upgradeStaticIcons(root) {
        (root || document).querySelectorAll('[data-icon]').forEach(node => {
            const svg = icon(node.dataset.icon, {
                className: node.className.replace(/\bicon\b/, '').trim() || undefined
            });
            if (!svg) return;
            node.outerHTML = svg;
        });
    }

    global.CatalogIcons = { icon: icon, upgradeStaticIcons: upgradeStaticIcons, PATHS: PATHS };
})(typeof window !== 'undefined' ? window : globalThis);
