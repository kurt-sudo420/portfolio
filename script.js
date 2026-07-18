/* =========================================================
   KURT SOOKNANAN — PORTFOLIO SCRIPT
   Mix of jQuery (mobile nav) and vanilla JS (everything else)
   per the Web Design course requirement to show both.
   ========================================================= */

/* RUBRIC #15: Last modified date + current year (vanilla JS) */
document.addEventListener('DOMContentLoaded', function () {
  var lastModifiedEl = document.getElementById('lastModified');
  if (lastModifiedEl) {
    lastModifiedEl.textContent = document.lastModified;
  }
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});

/* RUBRIC #13: jQuery — mobile nav toggle */
$(document).ready(function () {
  $('#navToggle').on('click', function () {
    $('#navLinks').toggleClass('nav-links--open');
    $(this).toggleClass('nav-toggle--active');
    var expanded = $(this).attr('aria-expanded') === 'true';
    $(this).attr('aria-expanded', String(!expanded));
  });

  // Close mobile menu when a link is tapped
  $('#navLinks a').on('click', function () {
    $('#navLinks').removeClass('nav-links--open');
    $('#navToggle').removeClass('nav-toggle--active').attr('aria-expanded', 'false');
  });
});

/* RUBRIC #12/13: Typing effect for the hero tagline (vanilla JS) */
(function typingEffect() {
  var el = document.getElementById('typedRole');
  if (!el) return;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var roles = [
    'Security Analyst',
    'IT Student @ UMass Boston',
    'Homelab Builder',
    'Aspiring Cloud Security Engineer'
  ];

  if (prefersReduced) {
    el.textContent = roles[0];
    return;
  }

  var roleIndex = 0;
  var charIndex = 0;
  var deleting = false;

  function tick() {
    var current = roles[roleIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(tick, 1500);
        return;
      }
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }
    setTimeout(tick, deleting ? 35 : 75);
  }
  tick();
})();

/* RUBRIC #12: Scroll reveal animation (vanilla JS + IntersectionObserver) */
(function scrollReveal() {
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (item) { item.classList.add('reveal--visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(function (item) { observer.observe(item); });
})();

/* RUBRIC #12: Animated skill bars (vanilla JS) */
(function skillBars() {
  var bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;

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

    if (!name.value.trim()) {
      showError(name, 'Please enter your name.');
      valid = false;
    }
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) {
      showError(email, 'Please enter a valid email address.');
      valid = false;
    }
    if (!message.value.trim() || message.value.trim().length < 10) {
      showError(message, 'Message should be at least 10 characters.');
      valid = false;
    }

    if (!valid) {
      statusEl.textContent = 'Please fix the highlighted fields.';
      statusEl.className = 'form-status form-status--error';
      return;
    }

    // No backend is connected on a static site, so this builds a
    // pre-filled mailto: link. Swap in a real form service (Formspree,
    // Netlify Forms, etc.) later if you want submissions without opening
    // the visitor's email client.
    var subject = encodeURIComponent('Portfolio contact from ' + name.value.trim());
    var body = encodeURIComponent(
      message.value.trim() + '\n\n— ' + name.value.trim() + ' (' + email.value.trim() + ')'
    );
    statusEl.textContent = 'Looks good — opening your email client...';
    statusEl.className = 'form-status form-status--success';
    window.location.href = 'mailto:manny.kurt@gmail.com?subject=' + subject + '&body=' + body;
    form.reset();
  });

  function showError(field, msg) {
    field.classList.add('input-error');
    var errorEl = document.getElementById(field.id + 'Error');
    if (errorEl) errorEl.textContent = msg;
  }
  function clearError(field) {
    field.classList.remove('input-error');
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

    var done = function () {
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = original; }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(function () {
        fallback();
        done();
      });
    } else {
      fallback();
      done();
    }
  });
})();
