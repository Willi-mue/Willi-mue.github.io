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

**Styling**: `styling/theme.css` defines light/dark CSS custom properties toggled via `body[data-theme]` (set by `js/theme.js`, persisted to `localStorage`). `styling/main_page.css` holds page-level layout; `styling/components/*.css` holds one stylesheet per reusable UI piece (cards, badges, contact list, top controls, etc.) — each HTML page only links the component stylesheets it actually uses.

## Adding a new blog post

1. Create `posts/<slug>.html` copying the structure of an existing post (same `<head>` link set, `../` asset paths, `js/setup.js` → `theme.js` → `badgeColors.js` → `translation.js` script order).
2. Create `translation/de/blog-<slug>.json` and `translation/en/blog-<slug>.json` with matching keys prefixed `blog-<slug>-...`.
3. Add the new JSON filename to the `files` array in `fetchTranslations()` in `js/translation.js`.
4. Add a teaser `<article class="blog-post">` card to the `#blog` section in `index.html`, linking to `posts/<slug>.html`.

## Notes

- No linter, formatter, test suite, or build/CI config exists in this repo — there's nothing to run before committing besides manually checking the pages in a browser.
- `.claude/settings.json` denies all mutating git operations (push, commit, pull, reset, etc.) for the Claude Code agent in this project — expect those to require explicit user action outside the agent.
