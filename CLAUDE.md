# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is Willi Müller's personal portfolio site, hosted via GitHub Pages at `willi-mue.github.io`. It is a static site — plain HTML/CSS/vanilla JS, no build step, no bundler, no package.json. Pages are opened directly or served as static files; there is no dev server to start.

## Architecture

**Pages**: `index.html` at the root is the main page (skills, about-me, project grid, blog teaser cards). `posts/*.html` are standalone blog-style detail pages, one per project story (e.g. `minecraft-server.html`, `discord-management-bot.html`). Each post page duplicates the root's `<head>` link structure but with `../`-prefixed asset paths and its own subset of component stylesheets.

**i18n (German/English)**: All user-facing text goes through a custom translation layer, not hardcoded strings:
- Elements are marked with `data-i18n="some.key"` (sets `textContent`) or additionally `data-i18n-html` (sets `innerHTML` and is used for the *lookup key* when both are handled).
- Translation strings live in `translation/de/*.json` and `translation/en/*.json`, one JSON file per page context (`main-page.json`, plus one `blog-*.json` per post).
- `js/translation.js` fetches all JSON files for the current language, merges them into a single flat key→string map, and applies them to every `[data-i18n]` element on `DOMContentLoaded` and on language toggle. It always fetches from `../translation/${lang}/...` — this works from both `index.html` (root) and `posts/*.html` (one level deep) only because GitHub Pages clamps `../` at the site root; do not add pages nested more than one directory deep without adjusting this.
- The file list to fetch is hardcoded inside `fetchTranslations()` in `js/translation.js` — adding a new post page requires adding its translation JSON filename to that list (in both this file and any page that needs it).
- Current language and theme are persisted in `localStorage` (`lang`, `theme`) and applied immediately by `js/setup.js` (runs before other scripts to avoid a flash of wrong theme/lang).

**Projects grid**: `js/projects.js` (`loadProjects`) fetches `data/projects_Willi-Mue.json`, shuffles it, and renders flip-cards (front: name/languages badges, back: description/link) into `#projects` in batches of 4 with a "load more" button. Each project entry has both `description` (English) and `translation` (German) fields — `projects.js` picks the field to show based on the active language, not the general `data-i18n` mechanism.

**GitHub project data generation**: `tools/projects.py` is a standalone script (not run automatically) that hits the GitHub API for user `Willi-Mue`, pulls public repos (skipping ones in `BLACKLIST`, i.e. the profile repo and this site's own repo), extracts a README preview image, per-language byte counts, and writes/merges into `data/projects_Willi-Mue.json`. It preserves existing entries (keyed by repo name) so manually-added `translation` text isn't overwritten on re-run. Run with `python tools/projects.py` from inside `tools/`.

**Badges**: `js/badgeColors.js` (`window.BadgeUtils`) owns the icon/color mapping for language and tech badges used both on the project cards and on the blog post pages' static `<span class="badge">` markup. New languages/technologies need an entry in both `languageIcons` and `languageColors` there, or they fall back to a generic 💻 icon and gray background.

**Icons**: `js/icons.js` (`window.Icons`) is a separate SVG icon registry (skill rings, contact links, scroll-to-top, etc.) keyed by name in its `paths` table. Any element with `data-icon="some-name"` gets its `innerHTML` replaced with the matching inline `<svg>` on `DOMContentLoaded` (and via `Icons.apply()` for dynamically-inserted content). New icons need a new entry in `paths`; unknown names silently fall back to the `code` icon.

**Styling**: `styling/theme.css` defines light/dark CSS custom properties toggled via `body[data-theme]` (set by `js/theme.js`, persisted to `localStorage`). `styling/main_page.css` holds page-level layout; `styling/components/*.css` holds one stylesheet per reusable UI piece (cards, badges, contact list, top controls, etc.) — each HTML page only links the component stylesheets it actually uses. Fonts are self-hosted: `styling/fonts.css` declares `@font-face` rules for the `.woff2` files in `fonts/` (Fontsource, latin + latin-ext subsets). Do not re-add Google Fonts links — `datenschutz.html` states that no font provider is contacted.

**Animations**: `js/animations.js` + `styling/animations.css` form a cross-cutting motion layer loaded last on every page. The script adds `.anim-ready` to `<html>` (without it, nothing is hidden), draws a particle/code-glyph canvas into every `.glow-surface`, tags elements from its `REVEAL` selector list with `data-reveal` and reveals them via IntersectionObserver, scrambles headings, types the hero roles (pipe-separated in `main-page.hero-roles`), and adds tilt/spotlight to cards. Everything respects `prefers-reduced-motion`. New sections get reveal animations by adding their selector to `REVEAL`.

**Main-page extras**:
- `js/boot.js` + `styling/components/boot.css`: fake boot log, once per session (`sessionStorage.booted`), skipped with a URL hash or reduced motion. It must stay the first element in `<body>`. It exposes `window.bootReady`, which `animations.js` awaits before the hero intro.
- `js/terminal.js` + `styling/components/terminal.css`: terminal overlay, opened with `/`, Ctrl+K or any `[data-terminal-open]` element. Commands live in the `COMMANDS` object, and their prose comes from `main-page.term-*` translation keys (`term-help-<cmd>` for help lines).
- `js/theme.js` exposes `window.setTheme(theme, {x, y})`, which does a circular View Transition wipe from the given point.
- `js/easter-eggs.js` exposes `window.EasterEggs.{matrix, toast}`, which the terminal uses for `matrix` and `sudo hire willi`.
- Project filter chips are rendered by `renderFilters()` in `js/projects.js`. Cards are cached per render in `cardCache`, so FLIP animations can reuse the same elements. Language names in `FILTER_IGNORE` never get a chip.

## Adding a new blog post

1. Create `posts/<slug>.html` copying the structure of an existing post (same `<head>` link set, `../` asset paths, `js/setup.js` → `icons.js` → `theme.js` → `badgeColors.js` → `translation.js` → `post.js` script order, `data-i18n-file="blog-<slug>"` on `<body>`).
2. Create `translation/de/blog-<slug>.json` and `translation/en/blog-<slug>.json` with matching keys prefixed `blog-<slug>-...`, including the four `...-fact-<key>-label` / `...-fact-<key>` pairs for the fact strip.
3. Add a teaser `<article class="blog-post">` card to the `#blog` section in `index.html`, linking to `posts/<slug>.html`. The post header's lead (`main-page.blog-post-N-desc`) and the "next project" card (`main-page.blog-post-N-title`) reuse those teaser keys.
4. Fix the "next project" chain: the new post's `.post-next` points to the following post, and the previous post's `.post-next` now points to the new one (order = teaser order on `index.html`, wrapping around).

Post page structure (styled by `styling/components/article.css`): `header.post-hero` (path, title, lead, badges, icon tile) → `ul.post-facts` → `.post-layout` (`nav.post-toc` + `article.post-article`) → `nav.post-nav`. `js/post.js` fills the TOC from the `section > h2` headings and runs the scroll spy. Inside the article, `ul.checklist`, `ul.feature-grid`, `.about-panel` (code-style summary) and `section.post-conclusion` are the available section styles.

## Notes

- `GITHUB_README.md` / `GITHUB_README.en.md` at the repo root are the (German/English) templates for Willi-Mue's separate GitHub *profile* README, not for this site. They're kept here so the tech-stack list can be diffed against `index.html`'s skills section, then copied manually into the profile repo. Always edit both language versions together.
- No linter, formatter, test suite, or build/CI config exists in this repo — there's nothing to run before committing besides manually checking the pages in a browser.
- `.claude/settings.json` denies all mutating git operations (push, commit, pull, reset, etc.) for the Claude Code agent in this project — expect those to require explicit user action outside the agent.
