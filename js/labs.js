// @ts-check
/* =========================================================
   STEPPERS
   Turns an ordered list of stages into a one-at-a-time
   walkthrough: a rail of stage buttons (ARIA tabs), a panel
   per stage, and Previous / Next controls.

   Used by the case walkthroughs on experience.html and the
   red-team run anatomy on research.html.

   Markup contract:
     <div data-stepper="Accessible name for the stage list">
       <ol>
         <li data-label="Short rail label"> ...stage content... </li>
       </ol>
     </div>

   Without JavaScript the list simply shows every stage in
   order, so nothing is hidden from readers or crawlers.
   ========================================================= */
(function () {
  'use strict';

  var uid = 0;

  /** @param {HTMLElement} root */
  function enhance(root) {
    var listEl = root.querySelector('ol');
    if (!listEl) return;
    var steps = /** @type {HTMLElement[]} */ (Array.prototype.slice.call(listEl.children));
    if (steps.length < 2) return;
    var base = 'stp' + (uid++);
    var current = 0;

    var rail = document.createElement('div');
    rail.className = 'stepper-rail';
    rail.setAttribute('role', 'tablist');
    rail.setAttribute('aria-label', root.getAttribute('data-stepper') || 'Stages');

    /** @type {HTMLButtonElement[]} */
    var tabs = steps.map(function (step, i) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'stepper-tab';
      tab.id = base + '-t' + i;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', base + '-p' + i);
      var num = document.createElement('span');
      num.className = 'stepper-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(i + 1);
      var label = document.createElement('span');
      label.className = 'stepper-label';
      label.textContent = step.getAttribute('data-label') || 'Stage ' + (i + 1);
      tab.appendChild(num);
      tab.appendChild(label);
      rail.appendChild(tab);

      step.id = base + '-p' + i;
      step.setAttribute('role', 'tabpanel');
      step.setAttribute('aria-labelledby', tab.id);
      step.tabIndex = 0;

      tab.addEventListener('click', function () { select(i, false); });
      tab.addEventListener('keydown', function (e) {
        var next = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % steps.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + steps.length) % steps.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = steps.length - 1;
        if (next !== -1) { e.preventDefault(); select(next, true); }
      });
      return tab;
    });

    var controls = document.createElement('div');
    controls.className = 'stepper-controls';
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn btn--ghost btn--sm';
    prev.textContent = 'Previous';
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn--ghost btn--sm';
    next.textContent = 'Next stage';
    var count = document.createElement('p');
    count.className = 'stepper-count';
    count.setAttribute('role', 'status');
    controls.appendChild(prev);
    controls.appendChild(next);
    controls.appendChild(count);

    prev.addEventListener('click', function () { select(current - 1, false); });
    next.addEventListener('click', function () { select(current + 1, false); });

    /** @param {number} index @param {boolean} focus */
    function select(index, focus) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach(function (step, i) {
        var on = i === current;
        step.hidden = !on;
        tabs[i].setAttribute('aria-selected', String(on));
        tabs[i].tabIndex = on ? 0 : -1;
        tabs[i].classList.toggle('is-done', i < current);
      });
      prev.disabled = current === 0;
      next.disabled = current === steps.length - 1;
      count.textContent = 'Stage ' + (current + 1) + ' of ' + steps.length;
      if (focus) tabs[current].focus();
    }

    root.insertBefore(rail, listEl);
    root.appendChild(controls);
    root.classList.add('is-enhanced');
    select(0, false);
  }

  function init() {
    document.querySelectorAll('[data-stepper]').forEach(function (node) {
      enhance(/** @type {HTMLElement} */ (node));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
