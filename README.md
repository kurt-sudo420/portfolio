# Kurt Sooknanan — Portfolio

Personal portfolio for security operations, network security, and AI/LLM security research.
Live at https://kurt-sudo420.github.io/portfolio/ (GitHub Pages, served from `main`).

## Structure

```
index.html              Home: hero, specializations, featured work, NSOC, skills, research, certifications, contact
about.html              Story, education, skill table and bars, homelab video, interests
experience.html         NSOC role, case walkthroughs (synthetic data), full timeline
projects.html           Project exhibition with search and category filters
projects/*.html         Case studies: hydra, webredteam, ghostclick, cybertoolkit, wireless-lab, homelab
research.html           Research tracks, status board, run anatomy, current experiment, threat model, publications, protocol
certifications.html     CompTIA Security+ and Network+, certification pathway, honors
contact.html            Contact links, mailto form, jQuery Mobile FAQ
academics.html          Redirects to certifications.html (keeps old links working)
css/styles.css          Design tokens and every component style
js/script.js            Navigation, reveals, typing effect, project finder, tabs, form, tilt and magnetic effects
js/visuals.js           Canvas scenes (3D core, perspective floor, neural net, port sweep, radar)
js/palette.js           Command palette (Ctrl/Cmd+K or "/"): site navigation and project search
js/labs.js              Stepper used by the case walkthroughs and the red-team run anatomy
images/og.png           1200x630 social preview image
tests/check_site.py     Static checks; standard library only
tests/e2e.test.js       Browser tests (Playwright)
package.json            Development tooling only; nothing here ships to visitors
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

## Interactive features

- **Command palette** (`js/palette.js`). Opens with Ctrl/Cmd+K, `/`, or the Search button it adds to the header.
  Entries live in the `ITEMS` array at the top of the file; add a line there for a new page or project.
  It uses the native `<dialog>` element, so focus trapping and Escape are handled by the browser.
- **Project finder** (`projects.html`). The search box matches each card's own text plus its optional
  `data-keywords` attribute, and combines with the category buttons. The view is mirrored into the URL
  (`projects.html?cat=llm&q=pyrit`), so filtered views can be linked.
- **Steppers** (`js/labs.js`). Any `<div data-stepper="Name"><ol><li data-label="Stage">…</li></ol></div>`
  becomes a stage-by-stage walkthrough. Without JavaScript it stays a plain list of every stage.
- **Case walkthroughs** (`experience.html#walkthrough`) use invented data only. Keep it that way: reserved
  `.example` domains, documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), no real hostnames.
- **Research status board** (`research.html#status`). Move an item between Completed, Ongoing, and Proposed
  only when its status really changes; nothing planned belongs under Completed.

## Dependencies

- jQuery 3.7.1 (mobile nav) and jQuery Mobile 1.4.5 (contact FAQ), loaded from code.jquery.com.
  jQuery Mobile predates jQuery 3, so `contact.html` restores the three APIs it still calls before loading it.

## Things to fill in

- **Certification verification:** paste your Credly or CompTIA URLs into the empty `href=""` of the
  `cert-verify` links (Security+ in `index.html` and `certifications.html`, Network+ in `certifications.html`).
  Each button appears automatically once its link is filled in.
- **Official badges (optional):** see the HTML comments above the credential cards in `certifications.html`.
- **Search indexing** is off by design (`<meta name="robots" content="noindex, ...">` on every page).
  Remove that line from each page to make the site searchable.

- **Ghostclick case study** (`projects/ghostclick.html`): the Role field says "Team member". Replace it with
  what you built, and add a repository link if the team publishes one.

## Checks

```bash
python3 tests/check_site.py        # static checks, no install needed

npm install                        # once, for the two commands below
npx playwright install chromium    # once
npm run typecheck                  # type-checks js/palette.js and js/labs.js from their JSDoc
npm run test:e2e                   # browser tests; starts its own server, needs no network
npm test                           # all three
```

The browser tests cover the command palette (keyboard, ranking, navigation from sub-pages, copy email), the
project finder, both steppers, the no-JavaScript fallback, the phone layout, and a sweep of every page at
1440px and 390px for script errors and sideways scrolling.

The static checks are described below.

Verifies titles, descriptions, canonical URLs, one `<h1>` per page, the seven-item nav with one active link,
internal links and anchors, the social preview image, the palette script on every page with every palette entry
resolving, labelled stepper stages, image alt text, `rel="noopener"` on new-tab links, no committed secrets, and the
content rules (Network+ N10-009 and Security+ SY0-701 shown as earned, only those two marked earned, no "Working knowledge" levels).
