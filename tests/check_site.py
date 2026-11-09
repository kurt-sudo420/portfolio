#!/usr/bin/env python3
"""Static checks for the portfolio. Standard library only.

Run from the repository root:
    python3 tests/check_site.py

Checks every HTML page for: title, meta description, canonical URL, one <h1>,
the seven-item primary nav with exactly one active link, working internal links
and #anchors, image alt text, rel="noopener" on new-tab links, and accidental
secrets. Also checks the social preview image, that the command palette is
loaded on every page and each of its entries resolves, and that interactive
steppers have labelled stages. Content rules: Network+ (N10-009) and Security+ (SY0-701)
shown as earned, only those two marked as earned, and no "Working knowledge"
skill levels.
Exits non-zero if anything fails.
"""
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAV = ["index.html", "about.html", "experience.html", "projects.html",
       "research.html", "certifications.html", "contact.html"]
REDIRECTS = {"academics.html"}
SITE = "https://kurt-sudo420.github.io/portfolio/"
SECRET_PATTERNS = [r"AKIA[0-9A-Z]{16}", r"ghp_[A-Za-z0-9]{36}", r"sk-[A-Za-z0-9]{32,}", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.imgs, self.blank = set(), [], [], []
        self.h1 = 0
        self.title = ""
        self._in_title = False
        self.meta = {}
        self.canonical = None
        self.nav_links, self.active = [], []
        self._in_nav = 0
        self.prop = {}
        self.scripts = []
        self.steppers = 0
        self.stepper_items = []
        self._stepper_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self._in_title = True
        if tag == "meta" and "name" in a:
            self.meta[a["name"]] = a.get("content", "")
        if tag == "meta" and "property" in a:
            self.prop[a["property"]] = a.get("content", "")
        if tag == "script" and a.get("src"):
            self.scripts.append(a["src"])
        if "data-stepper" in a:
            self.steppers += 1
            self._stepper_depth = 1
            if not (a.get("data-stepper") or "").strip():
                self.stepper_items.append(None)
        elif self._stepper_depth:
            if tag not in ("br", "img", "input", "meta", "link", "hr"):
                self._stepper_depth += 1
            # <div data-stepper> > <ol> > <li>: stage items sit two levels down
            if tag == "li" and self._stepper_depth == 3:
                self.stepper_items.append(a.get("data-label"))
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
        if tag == "ul" and a.get("id") == "navLinks":
            self._in_nav = 1
        if tag == "a":
            href = a.get("href")
            if href is not None:
                self.links.append(href)
                if self._in_nav:
                    self.nav_links.append(href)
                    if a.get("aria-current") == "page":
                        self.active.append(href)
            if a.get("target") == "_blank" and "noopener" not in (a.get("rel") or ""):
                self.blank.append(href)
        if tag in ("img", "source", "track", "script", "link") and tag != "link":
            src = a.get("src")
            if src:
                self.links.append(src)
        if tag == "img" and "alt" not in a:
            self.imgs.append(a.get("src"))

    def handle_endtag(self, tag):
        if self._stepper_depth and tag not in ("br", "img", "input", "meta", "link", "hr"):
            self._stepper_depth -= 1
        if tag == "title":
            self._in_title = False
        if tag == "ul" and self._in_nav:
            self._in_nav = 0

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def strip_comments(html):
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


def main():
    pages = sorted(
        os.path.relpath(os.path.join(d, f), ROOT)
        for d, _, fs in os.walk(ROOT)
        for f in fs
        if f.endswith(".html") and "/." not in d and "node_modules" not in d
    )
    parsed, raw, errors = {}, {}, []
    for rel in pages:
        html = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        raw[rel] = html
        p = Page()
        p.feed(strip_comments(html))
        parsed[rel] = p

    for rel, p in parsed.items():
        def err(msg):
            errors.append(f"{rel}: {msg}")
        if not p.title.strip():
            err("missing <title>")
        if len(p.meta.get("description", "")) < 50:
            err("meta description missing or too short")
        if not p.canonical:
            err("missing canonical link")
        if rel in REDIRECTS:
            continue
        if p.h1 != 1:
            err(f"expected exactly one <h1>, found {p.h1}")
        depth = rel.count("/")
        prefix = "../" * depth
        if [h.replace(prefix, "", 1) for h in p.nav_links] != NAV:
            err(f"primary nav should be {NAV}, got {p.nav_links}")
        if len(p.active) != 1:
            err(f"expected one active nav link, found {p.active}")
        for src in p.imgs:
            err(f"<img> without alt: {src}")
        for href in p.blank:
            err(f'target="_blank" link without rel="noopener": {href}')
        base = os.path.dirname(os.path.join(ROOT, rel))
        for href in p.links:
            if re.match(r"^(https?:|mailto:|data:|#$)", href) or href == "":
                continue
            path, _, frag = href.partition("#")
            target = os.path.normpath(os.path.join(base, path)) if path else os.path.join(ROOT, rel)
            trel = os.path.relpath(target, ROOT)
            if not os.path.exists(target):
                err(f"broken link: {href}")
            elif frag and trel in parsed and frag not in parsed[trel].ids:
                err(f"broken anchor: {href}")
        for pat in SECRET_PATTERNS:
            if re.search(pat, raw[rel]):
                err(f"possible secret matching {pat}")
        if "Working knowledge" in raw[rel]:
            err('skill level "Working knowledge" should not appear')
        image = p.prop.get("og:image", "")
        if not image.startswith(SITE):
            err("og:image missing or not an absolute URL on this site")
        elif not os.path.exists(os.path.join(ROOT, image[len(SITE):])):
            err(f"og:image file not found: {image}")
        if p.meta.get("twitter:card") != "summary_large_image":
            err("twitter:card should be summary_large_image")
        if not any(src.endswith("js/palette.js") for src in p.scripts):
            err("command palette script (js/palette.js) not loaded")
        if p.steppers and not any(src.endswith("js/labs.js") for src in p.scripts):
            err("page has a stepper but does not load js/labs.js")
        if any(not label for label in p.stepper_items):
            err("every stepper needs a name and every stage a data-label")

    # Every command palette entry must point at a real page and anchor.
    palette = open(os.path.join(ROOT, "js", "palette.js"), encoding="utf-8").read()
    targets = re.findall(r"href: '([^']+)'", palette)
    if len(targets) < 10:
        errors.append("js/palette.js: could not read the palette entries")
    for href in targets:
        if href.startswith("http"):
            continue
        path, _, frag = href.partition("#")
        if path not in parsed:
            errors.append(f"js/palette.js: entry points at a missing page: {href}")
        elif frag and frag not in parsed[path].ids:
            errors.append(f"js/palette.js: entry points at a missing anchor: {href}")

    for rel in ("index.html", "certifications.html"):
        html = raw.get(rel, "")
        for needed in ("CompTIA", "Network+", "N10-009", "October 2026", "Security+", "SY0-701", "November 2026"):
            if needed not in html:
                errors.append(f"{rel}: certification details missing '{needed}'")
    certs = strip_comments(raw.get("certifications.html", ""))
    earned_blocks = re.findall(r'<li class="done[^"]*"[^>]*>.*?</li>', certs, flags=re.S)
    earned = sorted(n for n in ("Network+", "Security+") for b in earned_blocks if f"<h3>{n}</h3>" in b)
    if len(earned_blocks) != 2 or earned != ["Network+", "Security+"]:
        errors.append("certifications.html: only Network+ and Security+ should be marked as earned")

    print(f"Checked {len(pages)} pages.")
    if errors:
        print(f"{len(errors)} problem(s):")
        for e in errors:
            print("  -", e)
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
