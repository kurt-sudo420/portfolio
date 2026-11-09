// @ts-check
/* =========================================================
   COMMAND PALETTE
   Keyboard-first navigation and project search for every page.
   Open with Ctrl/Cmd+K, "/" (outside form fields), or the
   Search button this file adds to the header.

   Built on the native <dialog> element (focus trap, Escape and
   an inert page come for free) and the ARIA combobox pattern.
   No dependencies. Without JavaScript the button never appears,
   so there is nothing dead to click.

   To add an entry, append to ITEMS below. `href` is relative to
   the site root; tests/check_site.py verifies every one resolves.
   ========================================================= */
(function () {
  'use strict';

  /**
   * @typedef {Object} PaletteItem
   * @property {string} title    Shown as the main label
   * @property {string} hint     One-line description under the label
   * @property {string} group    Section heading in the result list
   * @property {string} [href]   Site-root-relative or absolute URL
   * @property {string} [action] Built-in action name instead of a link
   * @property {string} [keys]   Extra search terms (technologies, topics)
   */

  /** @type {PaletteItem[]} */
  var ITEMS = [
    { group: 'Projects', title: 'BadToken HYDRA', hint: 'Automated LLM red-teaming framework', href: 'projects/hydra.html', keys: 'llm ai red team garak pyrit vllm pytorch slurm a100 python scheduler evidence benchmark jailbreak abliteration weight editing research' },
    { group: 'Projects', title: 'WebRedTeam', hint: 'Browser-based prompt-injection testing', href: 'projects/webredteam.html', keys: 'llm ai web xss prompt injection browser automation black-box script execution hydra module' },
    { group: 'Projects', title: 'Ghostclick', hint: 'Record-and-replay Chrome extension with an on-device model', href: 'projects/ghostclick.html', keys: 'chrome extension browser automation webllm webgpu javascript privacy local on-device team' },
    { group: 'Projects', title: 'CyberToolkit', hint: 'Python network security utilities', href: 'projects/cybertoolkit.html', keys: 'python port scanner banner grabber sha-256 hash dns password sockets threadpool pytest cli tooling github' },
    { group: 'Projects', title: 'Embedded device and wireless lab', hint: 'RF and hardware testing on an air-gapped bench', href: 'projects/wireless-lab.html', keys: 'flipper zero marauder aircrack-ng kismet wifi sub-ghz rfid nfc badusb hid rogue ap evil twin offensive hardware' },
    { group: 'Projects', title: 'Security homelab', hint: 'TrueNAS, local LLM target, and monitoring', href: 'projects/homelab.html', keys: 'truenas zfs docker compose trivy pi-hole unbound nextcloud jellyfin sqlite monitoring infrastructure linux' },

    { group: 'Pages', title: 'Home', hint: 'Overview', href: 'index.html', keys: 'start landing' },
    { group: 'Pages', title: 'About', hint: 'Background, education, and skills', href: 'about.html', keys: 'bio story umass boston degree information technology video walkthrough' },
    { group: 'Pages', title: 'Experience', hint: 'NSOC analyst role and timeline', href: 'experience.html', keys: 'work job soc security operations resume timeline siem edr phishing vulnerability' },
    { group: 'Pages', title: 'Projects', hint: 'All projects with search and filters', href: 'projects.html', keys: 'work portfolio case studies' },
    { group: 'Pages', title: 'Research', hint: 'LLM security research lab', href: 'research.html', keys: 'machine psychology cyberpunk division threat model guardrails' },
    { group: 'Pages', title: 'Certifications', hint: 'CompTIA Security+ and Network+', href: 'certifications.html', keys: 'comptia sy0-701 n10-009 credly badge honors cissp' },
    { group: 'Pages', title: 'Contact', hint: 'Email, links, and FAQ', href: 'contact.html', keys: 'hire internship co-op message' },

    { group: 'Jump to', title: 'Case walkthroughs', hint: 'How I work an alert, on synthetic data', href: 'experience.html#walkthrough', keys: 'soc dashboard investigation triage phishing identity sign-in vulnerability demo' },
    { group: 'Jump to', title: 'Anatomy of a red-team run', hint: 'Six stages from target model to report', href: 'research.html#pipeline', keys: 'llm pipeline workflow target attack orchestration analysis metrics reporting' },
    { group: 'Jump to', title: 'Research status', hint: 'Completed, ongoing, and proposed work', href: 'research.html#status', keys: 'roadmap progress results' },
    { group: 'Jump to', title: 'Publications', hint: 'Anatomy of a Phishing Attack and work in preparation', href: 'research.html#publications', keys: 'paper writing manuscript pdf' },
    { group: 'Jump to', title: 'Threat model', hint: 'LLM attack classes and defenses', href: 'research.html#threat-model', keys: 'jailbreak prompt injection hallucination cross-modal' },
    { group: 'Jump to', title: 'Homelab video walkthrough', hint: 'Captioned video on the About page', href: 'about.html#walkthrough', keys: 'video intro' },

    { group: 'Actions', title: 'Copy email address', hint: 'manny.kurt@gmail.com', action: 'copy-email', keys: 'mail contact clipboard' },
    { group: 'Actions', title: 'Open GitHub profile', hint: 'github.com/kurt-sudo420', href: 'https://github.com/kurt-sudo420', keys: 'code repositories source' },
    { group: 'Actions', title: 'Open LinkedIn profile', hint: 'Kurt Sooknanan', href: 'https://www.linkedin.com/in/kurt-sooknanan-485494410/', keys: 'resume network' }
  ];

  var EMAIL = 'manny.kurt@gmail.com';

  /** Lower-case and strip punctuation so "Sub-GHz" matches "sub ghz". */
  /** @param {string} s */
  function norm(s) {
    return s.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
  }

  /**
   * Rank items for a query. Every word in the query must appear somewhere
   * in the item; matches in the title outrank matches in keywords.
   * @param {string} query
   * @param {PaletteItem[]} [items]
   * @returns {PaletteItem[]}
   */
  function search(query, items) {
    var list = items || ITEMS;
    var q = norm(query);
    if (!q) return list.slice();
    var words = q.split(' ');
    /** @type {{item: PaletteItem, score: number, order: number}[]} */
    var scored = [];
    list.forEach(function (item, order) {
      var title = norm(item.title);
      var rest = norm(item.hint + ' ' + (item.keys || '') + ' ' + item.group);
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (title.indexOf(w) === 0) score += 12;
        else if ((' ' + title).indexOf(' ' + w) !== -1) score += 8;
        else if (title.indexOf(w) !== -1) score += 5;
        else if ((' ' + rest).indexOf(' ' + w) !== -1) score += 3;
        else if (rest.indexOf(w) !== -1) score += 1;
        else return;
      }
      scored.push({ item: item, score: score, order: order });
    });
    scored.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    return scored.map(function (s) { return s.item; });
  }

  // Exposed for the browser tests and for anyone poking around in devtools.
  /** @type {any} */ (window).KSPalette = { items: ITEMS, search: search };

  if (typeof HTMLDialogElement === 'undefined') return;

  // Site root, derived from this file's own URL so links work from /projects/ too.
  var self = /** @type {HTMLScriptElement|null} */ (document.currentScript);
  var ROOT = self && self.src ? self.src.replace(/js\/palette\.js.*$/, '') : '';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');

  /**
   * @param {string} tag
   * @param {Record<string, string>} [attrs]
   * @param {string} [text]
   */
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
  }

  var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>';

  function build() {
    var navWrap = document.querySelector('.nav-wrap');
    if (!navWrap) return;

    /* Header trigger */
    var trigger = /** @type {HTMLButtonElement} */ (el('button', { type: 'button', 'class': 'cmdk-trigger', 'aria-haspopup': 'dialog', 'aria-keyshortcuts': 'Control+K Meta+K' }));
    trigger.innerHTML = SEARCH_ICON + '<span class="cmdk-trigger-label">Search</span><kbd aria-hidden="true">' + (IS_MAC ? '⌘K' : 'Ctrl K') + '</kbd>';
    trigger.setAttribute('aria-label', 'Search the site');
    navWrap.insertBefore(trigger, navWrap.querySelector('.nav-toggle'));

    /* Dialog */
    var dialog = /** @type {HTMLDialogElement} */ (el('dialog', { 'class': 'cmdk', 'aria-label': 'Search the site' }));
    var field = el('div', { 'class': 'cmdk-field' });
    field.innerHTML = SEARCH_ICON;
    var input = /** @type {HTMLInputElement} */ (el('input', {
      type: 'text', 'class': 'cmdk-input', role: 'combobox', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: 'Search projects, pages, tools',
      'aria-label': 'Search projects, pages, and technologies',
      'aria-expanded': 'true', 'aria-controls': 'cmdkList', 'aria-autocomplete': 'list'
    }));
    var close = el('button', { type: 'button', 'class': 'cmdk-close', 'aria-label': 'Close search' }, 'Esc');
    field.appendChild(input);
    field.appendChild(close);

    var list = el('div', { 'class': 'cmdk-list', id: 'cmdkList', role: 'listbox', 'aria-label': 'Results' });
    var status = el('p', { 'class': 'sr-only', role: 'status', 'aria-live': 'polite' });
    var foot = el('p', { 'class': 'cmdk-foot', 'aria-hidden': 'true' });
    foot.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span>';

    dialog.appendChild(field);
    dialog.appendChild(list);
    dialog.appendChild(status);
    dialog.appendChild(foot);
    document.body.appendChild(dialog);

    /** @type {PaletteItem[]} */
    var results = [];
    var active = 0;

    /** @param {number} index @param {boolean} [scroll] */
    function setActive(index, scroll) {
      var options = list.querySelectorAll('[role="option"]');
      if (!options.length) { input.removeAttribute('aria-activedescendant'); return; }
      active = (index + options.length) % options.length;
      options.forEach(function (o, i) { o.setAttribute('aria-selected', String(i === active)); });
      input.setAttribute('aria-activedescendant', options[active].id);
      if (scroll) options[active].scrollIntoView({ block: 'nearest' });
    }

    function render() {
      var query = input.value;
      results = search(query);
      list.textContent = '';

      if (!results.length) {
        var empty = el('div', { 'class': 'cmdk-empty' });
        empty.appendChild(el('p', {}, 'Nothing matches “' + query.trim() + '”.'));
        var link = el('a', { href: ROOT + 'projects.html?q=' + encodeURIComponent(query.trim()) }, 'Search inside project descriptions instead');
        empty.appendChild(link);
        list.appendChild(empty);
        status.textContent = 'No results.';
        input.removeAttribute('aria-activedescendant');
        return;
      }

      /** @type {Record<string, HTMLElement>} */
      var groups = {};
      results.forEach(function (item, i) {
        var group = groups[item.group];
        if (!group) {
          group = groups[item.group] = el('div', { 'class': 'cmdk-group', role: 'group', 'aria-label': item.group });
          group.appendChild(el('p', { 'class': 'cmdk-group-label', 'aria-hidden': 'true' }, item.group));
          list.appendChild(group);
        }
        var option = el('div', { 'class': 'cmdk-option', role: 'option', id: 'cmdk-o-' + i, 'aria-selected': 'false', 'data-index': String(i) });
        var text = el('span', { 'class': 'cmdk-option-text' });
        text.appendChild(el('b', {}, item.title));
        text.appendChild(el('span', {}, item.hint));
        option.appendChild(text);
        option.appendChild(el('span', { 'class': 'cmdk-option-kind', 'aria-hidden': 'true' }, item.action ? 'Run' : (item.href && /^https?:/.test(item.href) ? 'External' : 'Open')));
        group.appendChild(option);
      });
      status.textContent = results.length + (results.length === 1 ? ' result.' : ' results.');
      setActive(0);
    }

    /** @param {PaletteItem} item */
    function run(item) {
      if (item.action === 'copy-email') {
        var done = function () { status.textContent = 'Email address copied.'; hide(); flash('Email copied'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(EMAIL).then(done, function () { window.location.href = 'mailto:' + EMAIL; });
        } else {
          window.location.href = 'mailto:' + EMAIL;
        }
        return;
      }
      if (!item.href) return;
      hide();
      if (/^https?:/.test(item.href)) window.open(item.href, '_blank', 'noopener');
      else window.location.href = ROOT + item.href;
    }

    /** Brief confirmation on the trigger itself, where the user's eye returns. */
    /** @param {string} message */
    function flash(message) {
      var found = trigger.querySelector('.cmdk-trigger-label');
      if (!found) return;
      var label = found;
      label.textContent = message;
      trigger.classList.add('is-flashing');
      setTimeout(function () { label.textContent = 'Search'; trigger.classList.remove('is-flashing'); }, 1800);
    }

    function show() {
      if (dialog.open) return;
      input.value = '';
      render();
      dialog.showModal();
      input.focus();
    }
    function hide() { if (dialog.open) dialog.close(); }

    trigger.addEventListener('click', show);
    close.addEventListener('click', hide);
    dialog.addEventListener('close', function () { trigger.focus(); });
    // A click on the backdrop lands on the dialog element itself.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) hide(); });
    input.addEventListener('input', render);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1, true); }
      else if (e.key === 'Home' && results.length) { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End' && results.length) { e.preventDefault(); setActive(results.length - 1, true); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[active]) run(results[active]);
        else if (input.value.trim()) window.location.href = ROOT + 'projects.html?q=' + encodeURIComponent(input.value.trim());
      }
    });

    list.addEventListener('click', function (e) {
      var target = /** @type {HTMLElement} */ (e.target);
      var option = /** @type {HTMLElement|null} */ (target.closest('[role="option"]'));
      if (option) run(results[Number(option.dataset.index)]);
    });
    list.addEventListener('pointermove', function (e) {
      var target = /** @type {HTMLElement} */ (e.target);
      var option = /** @type {HTMLElement|null} */ (target.closest('[role="option"]'));
      if (option && Number(option.dataset.index) !== active) setActive(Number(option.dataset.index));
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.open) hide(); else show();
        return;
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || dialog.open) return;
      var t = /** @type {HTMLElement|null} */ (e.target);
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // On the Projects page "/" belongs to the on-page project search.
      var pageSearch = document.getElementById('projectSearch');
      e.preventDefault();
      if (pageSearch) pageSearch.focus(); else show();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
