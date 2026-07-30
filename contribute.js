/* "Propose an indicator" dialog.
 *
 * The previous version pushed the new indicator into an in-memory array and
 * told the user "Indicator added successfully!". Nothing was persisted — this
 * is a static site with no backend — so the record vanished on refresh and the
 * catalog silently disagreed with data.json.
 *
 * The dialog now does what it can honestly do: validate the input, produce the
 * exact data.json entry, and hand it over via clipboard or a pre-filled GitHub
 * issue so a maintainer can commit it.
 */
(function () {
    'use strict';

    const REPO_ISSUE_URL = 'https://github.com/MafiAtUN/osaa-data-catalog/issues/new';

    function dialogHTML() {
        const clusterOptions = OSAA.clusters
            .map(c => '<option value="' + c.key + '">' + OSAA.escapeHTML(c.name) + '</option>')
            .join('');

        return '' +
        '<div class="modal" id="contributeModal" role="dialog" aria-modal="true"' +
        ' aria-labelledby="contributeTitle" hidden>' +
          '<div class="modal__panel">' +
            '<div class="modal__head">' +
              '<h2 id="contributeTitle">Propose an indicator</h2>' +
              '<button type="button" class="icon-btn" data-close-dialog aria-label="Close dialog">' +
                '' + OSAA.icon('xmark') + '</button>' +
            '</div>' +
            '<form id="contributeForm" novalidate>' +
              '<div class="modal__body">' +
                '<p class="modal__note">' +
                  OSAA.icon('circle-info') +
                  '<span>This catalog is a static site, so submissions are not saved here. ' +
                  'Fill this in and we will generate the <code>data.json</code> entry for you ' +
                  'to copy or send as a GitHub issue.</span>' +
                '</p>' +

                '<div class="form-grid form-grid--2">' +
                  field('name', 'Indicator name', true,
                      '<input class="input" id="ci-name" name="name" required>') +
                  field('cluster', 'Cluster', true,
                      '<select class="select" id="ci-cluster" name="cluster" required>' +
                      '<option value="">Select a cluster</option>' + clusterOptions + '</select>') +
                  field('theme', 'Theme', false,
                      '<input class="input" id="ci-theme" name="theme" placeholder="e.g. Tax revenue">') +
                '</div>' +

                '<div class="form-grid">' +
                  field('description', 'Description', true,
                      '<textarea class="textarea" id="ci-description" name="description" rows="3" required></textarea>',
                      'One or two sentences on what the indicator measures.') +
                '</div>' +

                '<div class="form-grid form-grid--2">' +
                  field('publisher', 'Publishing organisation', true,
                      '<input class="input" id="ci-publisher" name="publisher" required placeholder="e.g. World Bank">') +
                  field('frequency', 'Update frequency', false,
                      '<input class="input" id="ci-frequency" name="frequency" placeholder="e.g. Annual">') +
                  field('url', 'Dataset URL', false,
                      '<input class="input" id="ci-url" name="url" type="url" placeholder="https://…">') +
                '</div>' +

                '<div class="form-grid">' +
                  field('methodology', 'Methodology', false,
                      '<textarea class="textarea" id="ci-methodology" name="methodology" rows="2"></textarea>') +
                  field('remarks', 'Caveats', false,
                      '<textarea class="textarea" id="ci-remarks" name="remarks" rows="2"></textarea>',
                      'Coverage gaps, comparability issues, anything a reader should know.') +
                '</div>' +
              '</div>' +
              '<div class="modal__foot">' +
                '<button type="button" class="btn btn--ghost" data-close-dialog>Cancel</button>' +
                '<button type="submit" class="btn btn--secondary" value="copy" name="action">' +
                  '' + OSAA.icon('copy') + 'Copy JSON entry</button>' +
                '<button type="submit" class="btn btn--primary" value="issue" name="action">' +
                  '' + OSAA.icon('github') + 'Open a GitHub issue</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>';
    }

    function field(id, label, required, control, hint) {
        const full = (id === 'name' || id === 'url') ? ' field--full' : '';
        return '<div class="field' + full + '">' +
            '<label for="ci-' + id + '">' + OSAA.escapeHTML(label) +
            (required ? ' <span class="req" aria-hidden="true">*</span>' +
                '<span class="visually-hidden"> (required)</span>' : '') +
            '</label>' + control +
            (hint ? '<span class="field__hint">' + OSAA.escapeHTML(hint) + '</span>' : '') +
            '</div>';
    }

    function buildEntry(form) {
        const get = name => (form.elements[name].value || '').trim();
        const metadata = [
            get('publisher') ? 'Source: ' + get('publisher') : '',
            get('methodology') ? 'Methodology: ' + get('methodology') : '',
            get('frequency') ? 'Update frequency: ' + get('frequency') : ''
        ].filter(Boolean).join('. ');

        return {
            id: (get('cluster').slice(0, 3) || 'new') + '_XXX',
            name: get('name'),
            cluster: get('cluster'),
            theme: get('theme'),
            description: get('description'),
            source: get('url'),
            metadata: metadata,
            remarks: get('remarks')
        };
    }

    function copy(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return Promise.reject(new Error('clipboard unavailable'));
    }

    function mount() {
        if (document.getElementById('contributeModal')) return;
        document.body.insertAdjacentHTML('beforeend', dialogHTML());

        const form = document.getElementById('contributeForm');
        let action = 'copy';

        form.querySelectorAll('button[type="submit"]').forEach(btn => {
            btn.addEventListener('click', () => { action = btn.value; });
        });

        document.querySelectorAll('[data-close-dialog]').forEach(btn => {
            btn.addEventListener('click', () => OSAA.closeDialog('contributeModal'));
        });

        form.addEventListener('submit', event => {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const entry = buildEntry(form);
            const json = JSON.stringify(entry, null, 2);

            if (action === 'issue') {
                const url = REPO_ISSUE_URL +
                    '?title=' + encodeURIComponent('New indicator: ' + entry.name) +
                    '&body=' + encodeURIComponent(
                        'Proposed entry for `data.json`:\n\n```json\n' + json + '\n```\n');
                window.open(url, '_blank', 'noopener');
                OSAA.closeDialog('contributeModal');
                return;
            }

            copy(json).then(() => {
                OSAA.toast('JSON entry copied — paste it into data.json');
                OSAA.closeDialog('contributeModal');
            }).catch(() => {
                OSAA.toast('Could not reach the clipboard — check the console', 'triangle-exclamation');
                console.info('Proposed data.json entry:\n' + json);
            });
        });
    }

    function open() {
        mount();
        OSAA.openDialog('contributeModal');
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-open-contribute]').forEach(btn => {
            btn.addEventListener('click', open);
        });
    });

    window.OSAAContribute = { open: open };
})();
