/* Ranked search with acronym support.
 *
 * The previous matcher was a plain `searchText.includes(query)`, so "IFF" found
 * nothing even though "Illicit Financial Flows" is in the catalog, and results
 * came back in whatever order the JSON happened to be in.
 *
 * A record is matched when EVERY query token matches it somehow; the record's
 * rank is the sum of its best per-token scores, so a hit in the title outranks
 * a hit buried in a description.
 */
(function (global) {
    'use strict';

    const FIELD_WEIGHT = {
        name: 100,
        theme: 55,
        organisation: 50,
        description: 25,
        other: 15
    };

    const STOP = new Set(['the', 'and', 'for', 'per', 'with', 'from', 'of', 'in', 'to', 'as', 'a']);

    function normalise(text) {
        return String(text == null ? '' : text).toLowerCase();
    }

    /**
     * Initials of the significant words, so "IFF" can reach
     * "Illicit Financial Flows" and "GII" can reach "Global Innovation Index".
     * Digits are kept in place ("SDG7" still matches "Sustainable Development
     * Goal 7").
     */
    function initials(text) {
        return normalise(text)
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word && !STOP.has(word))
            .map(word => (/^\d+$/.test(word) ? word : word[0]))
            .join('');
    }

    /** Precompute everything a record needs, once, at load time. */
    function buildDocument(fields) {
        const doc = { fields: {}, initials: {} };
        Object.keys(fields).forEach(key => {
            const value = Array.isArray(fields[key]) ? fields[key].join(' ') : fields[key];
            doc.fields[key] = normalise(value);
            doc.initials[key] = initials(value);
        });
        return doc;
    }

    function tokenise(query) {
        return normalise(query).trim().split(/\s+/).filter(Boolean);
    }

    /** Best score for one token against one field, or 0 for no match. */
    function scoreToken(token, text, acronym, weight) {
        if (!text) return 0;

        const at = text.indexOf(token);
        if (at === 0) return weight * 1.5;                       // field starts with it
        if (at > 0) {
            // A match on a word boundary beats one inside a word.
            return /[\s(\-/]/.test(text[at - 1]) ? weight * 1.2 : weight;
        }

        // Acronym: "iff" -> "illicit financial flows"
        if (token.length >= 2 && acronym && acronym.includes(token)) {
            return weight * 0.9;
        }

        return 0;
    }

    function scoreDocument(doc, tokens) {
        let total = 0;

        for (const token of tokens) {
            let best = 0;
            for (const key of Object.keys(doc.fields)) {
                const weight = FIELD_WEIGHT[key] || FIELD_WEIGHT.other;
                const score = scoreToken(token, doc.fields[key], doc.initials[key], weight);
                if (score > best) best = score;
            }
            if (!best) return 0; // every token must match something
            total += best;
        }

        return total;
    }

    /**
     * Rank `records` against `query`.
     * `getDoc` returns the precomputed document for a record.
     */
    function search(records, query, getDoc) {
        const tokens = tokenise(query);
        if (!tokens.length) return records.slice();

        const scored = [];
        for (const record of records) {
            const score = scoreDocument(getDoc(record), tokens);
            if (score > 0) scored.push({ record, score });
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.map(entry => entry.record);
    }

    /**
     * Wrap literal matches in <mark>. Acronym hits are deliberately not
     * highlighted — there is no substring to point at, and inventing one
     * would misrepresent why the record matched.
     * Returns escaped HTML.
     */
    function highlight(text, query, escapeHTML) {
        const source = String(text == null ? '' : text);
        const tokens = tokenise(query)
            .filter(token => token.length >= 2 && source.toLowerCase().includes(token))
            .sort((a, b) => b.length - a.length);

        if (!tokens.length) return escapeHTML(source);

        const lower = source.toLowerCase();
        const covered = new Array(source.length).fill(false);

        tokens.forEach(token => {
            let from = 0;
            let at = lower.indexOf(token, from);
            while (at !== -1) {
                for (let i = at; i < at + token.length; i++) covered[i] = true;
                from = at + token.length;
                at = lower.indexOf(token, from);
            }
        });

        let html = '';
        let run = '';
        let marking = false;

        const flush = () => {
            if (!run) return;
            html += marking ? '<mark>' + escapeHTML(run) + '</mark>' : escapeHTML(run);
            run = '';
        };

        for (let i = 0; i < source.length; i++) {
            if (covered[i] !== marking) {
                flush();
                marking = covered[i];
            }
            run += source[i];
        }
        flush();

        return html;
    }

    const api = { buildDocument, search, highlight, initials, tokenise };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.CatalogSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
