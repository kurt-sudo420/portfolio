/* =========================================================
   KURT SOOKNANAN — PORTFOLIO SCRIPT (v3)
   jQuery for the mobile nav (course requirement: show both),
   vanilla JS for everything else. Canvas scenes live in
   visuals.js. All motion respects prefers-reduced-motion.
   ========================================================= */

var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

/* RUBRIC #15: Last modified date + current year (vanilla JS) */
document.addEventListener('DOMContentLoaded', function () {
  var lastModifiedEl = document.getElementById('lastModified');
  if (lastModifiedEl) {
    var d = new Date(document.lastModified);
    lastModifiedEl.textContent = isNaN(d) ? document.lastModified : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/* RUBRIC #13: jQuery — mobile nav toggle.
   Guarded so a blocked CDN can't take the rest of this file down with it. */
if (window.jQuery) $(document).ready(function () {
  var $toggle = $('#navToggle');
  var $links = $('#navLinks');
  var $root = $(document.documentElement);

  function setMenu(open) {
    $links.toggleClass('nav-links--open', open);
    $root.toggleClass('menu-open', open);
    $toggle.toggleClass('nav-toggle--active', open)
      .attr('aria-expanded', String(open))
      .attr('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) $links.find('a').first().trigger('focus');
  }

  $toggle.on('click', function () { setMenu($toggle.attr('aria-expanded') !== 'true'); });
  $links.find('a').on('click', function () { setMenu(false); });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $toggle.attr('aria-expanded') === 'true') {
      setMenu(false);
      $toggle.trigger('focus');
    }
  });
  $(window).on('resize', function () {
    if (window.innerWidth > 1080 && $toggle.attr('aria-expanded') === 'true') setMenu(false);
  });
});

/* Header gains a solid backdrop once the page scrolls */
(function headerState() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var ticking = false;
  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

/* Split headline text into characters for the entrance animation.
   The element keeps its full text as an aria-label; the spans are hidden. */
(function splitText() {
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.classList.add('split');
    el.querySelectorAll('.line').forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(text, function (c) {
        var span = document.createElement('span');
        span.className = 'ch';
        span.style.setProperty('--i', i++);
        span.textContent = c === ' ' ? ' ' : c;
        line.appendChild(span);
      });
    });
  });
  function ready() { document.documentElement.classList.add('is-ready'); }
  if (document.fonts && document.fonts.ready) {
    var done = false;
    document.fonts.ready.then(function () { if (!done) { done = true; ready(); } });
    setTimeout(function () { if (!done) { done = true; ready(); } }, 900);
  } else ready();
})();

/* RUBRIC #12/13: Typing effect for the hero tagline (vanilla JS) */
(function typingEffect() {
  var el = document.getElementById('typedRole');
  if (!el) return;
  var roles = [
    'Junior Security Analyst',
    'LLM Security Researcher',
    'Security+ and Network+ certified',
    'Python security tooling'
  ];
  if (REDUCE) { el.textContent = roles[0]; return; }

  var roleIndex = 0, charIndex = 0, deleting = false;
  function tick() {
    var current = roles[roleIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) { deleting = true; setTimeout(tick, 1600); return; }
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; }
    }
    setTimeout(tick, deleting ? 35 : 75);
  }
  setTimeout(tick, 1200);
})();

/* RUBRIC #12: Scroll reveal animation (vanilla JS + IntersectionObserver).
   Also marks [data-inview] blocks so CSS can start their own sequences. */
(function scrollReveal() {
  var items = document.querySelectorAll('.reveal, [data-inview]');
  if (!items.length) return;
  function show(el) { el.classList.add(el.classList.contains('reveal') ? 'reveal--visible' : 'is-in'); }
  if (!('IntersectionObserver' in window) || REDUCE) { items.forEach(function (el) { show(el); el.classList.add('is-in'); }); return; }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        show(entry.target);
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (item) { observer.observe(item); });
})();

/* RUBRIC #12: Animated skill bars (vanilla JS) */
(function skillBars() {
  var bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;
  if (!('IntersectionObserver' in window)) {
    bars.forEach(function (bar) { bar.style.width = bar.dataset.level + '%'; });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.level + '%';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(function (bar) { observer.observe(bar); });
})();

/* Pointer effects: hero spotlight, 3D tilt, magnetic buttons (fine pointers only) */
(function pointerFx() {
  if (REDUCE || !FINE_POINTER) return;

  document.querySelectorAll('[data-spot]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  document.querySelectorAll('[data-tilt]').forEach(function (el) {
    var max = parseFloat(el.getAttribute('data-tilt')) || 6;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () {
      el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    });
  });

  document.querySelectorAll('[data-magnetic]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
      el.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--bx', '0px'); el.style.setProperty('--by', '0px');
    });
  });
})();

/* Projects page: category filters combined with free-text search.
   A project is shown when it matches the active category AND every word
   typed in the search box. Both are mirrored into the URL (?cat=&q=) so a
   filtered view can be linked to; the command palette relies on ?q=. */
(function projectFinder() {
  var group = document.querySelector('[data-filter-group]');
  if (!group) return;
  var buttons = group.querySelectorAll('[data-filter]');
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));
  var status = document.getElementById('filterStatus');
  var input = document.getElementById('projectSearch');
  var empty = document.getElementById('finderEmpty');
  var reset = document.getElementById('finderReset');
  var state = { cat: 'all', q: '' };

  function normalize(text) { return text.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim(); }

  // Searchable text is the card's own visible copy plus optional data-keywords.
  var haystacks = items.map(function (item) {
    return ' ' + normalize(item.textContent + ' ' + (item.getAttribute('data-keywords') || ''));
  });

  function apply() {
    var words = normalize(state.q).split(' ').filter(Boolean);
    var shown = 0;
    items.forEach(function (item, i) {
      var inCat = state.cat === 'all' || item.getAttribute('data-cat').split(' ').indexOf(state.cat) !== -1;
      var inText = words.every(function (w) { return haystacks[i].indexOf(w) !== -1; });
      if (inCat && inText) {
        shown++;
        if (item.classList.contains('is-hidden')) {
          item.classList.remove('is-hidden');
          item.classList.add('is-filtering');
          requestAnimationFrame(function () { requestAnimationFrame(function () { item.classList.remove('is-filtering'); }); });
        }
        // Filtered-in cards may never have scrolled into view; don't leave them transparent.
        if (state.cat !== 'all' || words.length) item.classList.add('reveal--visible');
      } else {
        item.classList.add('is-hidden');
      }
    });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === state.cat)); });
    // Rows that lost every card would otherwise leave an empty gap in the grid.
    document.querySelectorAll('.ex-row').forEach(function (row) {
      row.hidden = !row.querySelector('[data-cat]:not(.is-hidden)');
    });
    if (status) status.textContent = shown + (shown === 1 ? ' project' : ' projects');
    if (empty) empty.hidden = shown !== 0;

    if (window.history && history.replaceState) {
      var params = new URLSearchParams();
      if (state.cat !== 'all') params.set('cat', state.cat);
      if (state.q.trim()) params.set('q', state.q.trim());
      var query = params.toString();
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { state.cat = b.getAttribute('data-filter'); apply(); });
  });
  if (input) {
    input.addEventListener('input', function () { state.q = input.value; apply(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; state.q = ''; apply(); }
    });
  }
  if (reset) reset.addEventListener('click', function () {
    state.cat = 'all'; state.q = '';
    if (input) { input.value = ''; input.focus(); }
    apply();
  });

  try {
    var initial = new URLSearchParams(window.location.search);
    var cat = initial.get('cat');
    if (cat && group.querySelector('[data-filter="' + cat.replace(/[^a-z]/g, '') + '"]')) state.cat = cat;
    state.q = (initial.get('q') || '').slice(0, 80);
    if (input) input.value = state.q;
  } catch (err) { /* URLSearchParams unavailable: start unfiltered */ }
  apply();
})();

/* Accessible tabs (skills, threat model): click + arrow keys */
(function tabs() {
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });
})();

/* Research: "won't vs can't" hypothesis toggle */
(function explainer() {
  document.querySelectorAll('[data-explainer]').forEach(function (box) {
    var btns = box.querySelectorAll('[data-mode]');
    var caption = box.querySelector('[data-mode-caption]');
    function set(mode) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      box.querySelectorAll('.meter i').forEach(function (bar) { bar.style.setProperty('--w', bar.getAttribute('data-' + mode)); });
      if (caption) caption.textContent = caption.getAttribute('data-' + mode);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-mode')); }); });
    set('before');
  });
})();

/* Sticky storytelling: highlight the step in view and its stage in the diagram */
(function story() {
  var root = document.querySelector('[data-story]');
  if (!root || !('IntersectionObserver' in window)) return;
  var steps = root.querySelectorAll('.story-step');
  var stages = root.querySelectorAll('[data-stage]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      steps.forEach(function (s) { s.classList.toggle('is-active', s === e.target); });
      var key = e.target.getAttribute('data-step');
      stages.forEach(function (st) { st.classList.toggle('is-lit', st.getAttribute('data-stage').split(' ').indexOf(key) !== -1); });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(function (s) { io.observe(s); });
})();

/* RUBRIC #10/13: Contact form validation (vanilla JS) */
(function contactForm() {
  var form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;
    var name = document.getElementById('name');
    var email = document.getElementById('email');
    var message = document.getElementById('message');
    var statusEl = document.getElementById('formStatus');

    [name, email, message].forEach(clearError);

    if (!name.value.trim()) { showError(name, 'Please enter your name.'); valid = false; }
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) { showError(email, 'Please enter a valid email address.'); valid = false; }
    if (!message.value.trim() || message.value.trim().length < 10) { showError(message, 'Message should be at least 10 characters.'); valid = false; }

    if (!valid) {
      statusEl.textContent = 'Please fix the highlighted fields.';
      statusEl.className = 'form-status form-status--error';
      return;
    }

    // Static site: build a pre-filled mailto: link rather than posting to a backend.
    var subject = encodeURIComponent('Portfolio contact from ' + name.value.trim());
    var body = encodeURIComponent(message.value.trim() + '\n\n— ' + name.value.trim() + ' (' + email.value.trim() + ')');
    statusEl.textContent = 'Opening your email app with the message filled in.';
    statusEl.className = 'form-status form-status--success';
    window.location.href = 'mailto:manny.kurt@gmail.com?subject=' + subject + '&body=' + body;
    form.reset();
  });

  function showError(field, msg) {
    field.classList.add('input-error');
    field.setAttribute('aria-invalid', 'true');
    var errorEl = document.getElementById(field.id + 'Error');
    if (errorEl) errorEl.textContent = msg;
  }
  function clearError(field) {
    field.classList.remove('input-error');
    field.removeAttribute('aria-invalid');
    var errorEl = document.getElementById(field.id + 'Error');
    if (errorEl) errorEl.textContent = '';
  }
})();

/* RUBRIC #13/14: Copy email button (vanilla JS) */
(function copyEmail() {
  var btn = document.getElementById('copyEmailBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var email = btn.dataset.email;
    var original = btn.textContent;
    function fallback() {
      var temp = document.createElement('input');
      temp.value = email;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    function done() {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = original; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(function () { fallback(); done(); });
    } else { fallback(); done(); }
  });
})();
