# Kurt Sooknanan — Portfolio

Personal portfolio for security operations, network security, and AI/LLM security research.
Live at https://kurt-sudo420.github.io/portfolio/ (GitHub Pages, served from `main`).

## Structure

```
index.html              Home: hero, specializations, featured work, NSOC, skills, research, certifications, contact
about.html              Story, education, skill table and bars, homelab video, interests
experience.html         NSOC role and full timeline
projects.html           Project exhibition with category filters
projects/*.html         Case studies: hydra, webredteam, cybertoolkit, wireless-lab, homelab
research.html           Research tracks, current experiment, threat model, publications, protocol
certifications.html     CompTIA Security+ and Network+, certification pathway, honors
contact.html            Contact links, mailto form, jQuery Mobile FAQ
academics.html          Redirects to certifications.html (keeps old links working)
css/styles.css          Design tokens and every component style
js/script.js            Navigation, reveals, typing effect, filters, tabs, form, tilt and magnetic effects
js/visuals.js           Canvas scenes (3D core, perspective floor, neural net, port sweep, radar)
tests/check_site.py     Static checks; standard library only
```

There is no build step. Every page is plain HTML, so edits go straight into the files above.
The header and footer are repeated on each page; change them on all pages together.

## Design and motion

- Fonts: Archivo (expanded, display), IBM Plex Sans (body), IBM Plex Mono (technical), from Google Fonts.
- No animation or 3D libraries. Canvas scenes in `js/visuals.js` share one animation loop, render only
  while on screen, cap pixel density at 2x, and draw a single still frame under `prefers-reduced-motion`.
- Page transitions use the browser's cross-document View Transitions where supported.
- Content stays visible without JavaScript; scroll reveals only hide content once the script is running.
- Add a canvas scene anywhere with `<canvas data-visual="core|floor|neural|ports|radar">` inside a sized container
  and include `js/visuals.js`.

## Dependencies

- jQuery 3.7.1 (mobile nav) and jQuery Mobile 1.4.5 (contact FAQ), loaded from code.jquery.com.
  jQuery Mobile predates jQuery 3, so `contact.html` restores the three APIs it still calls before loading it.

## Things to fill in

- **Certification verification:** paste your Credly or CompTIA URLs into the empty `href=""` of the
  `cert-verify` links (Security+ in `index.html` and `certifications.html`, Network+ in `certifications.html`).
  Each button appears automatically once its link is filled in.
- **Official badges (optional):** see the HTML comments above the credential cards in `certifications.html`.
- **Phishing case study link:** paste the published URL into the empty `href=""` of the `pub-link` button in
  the Publications section of `research.html`. The "Read the case study" button appears once it's filled in.
- **Search indexing** is off by design (`<meta name="robots" content="noindex, ...">` on every page).
  Remove that line from each page to make the site searchable.

## Checks

```bash
python3 tests/check_site.py
```

Verifies titles, descriptions, canonical URLs, one `<h1>` per page, the seven-item nav with one active link,
internal links and anchors, image alt text, `rel="noopener"` on new-tab links, no committed secrets, and the
content rules (Network+ N10-009 and Security+ SY0-701 shown as earned, only those two marked earned, no "Working knowledge" levels).
