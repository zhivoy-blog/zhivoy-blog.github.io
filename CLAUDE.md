# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build, no-framework website for **«Живой ИИ»** (zhivoy-ai.ru), a Russian-language blog about AI tools/tests/prompts, hosted on GitHub Pages (`CNAME` → `zhivoy-ai.ru`). There is no bundler, package manager, dependency list, linter, or test suite in this repo — everything is hand-written HTML/CSS/vanilla JS served directly, plus a hidden internal PWA and a Google Apps Script backend. "Development" here means editing static files and committing; there is no build/lint/test command to run.

## Repository structure

- `index.html` — home page: feed of article cards, tag filter, search, theme toggle, animated canvas background. Fetches `articles/manifest.json` client-side to render the list (no server-side rendering).
- `article-template.html` — single generic template for *every* article. Reads `?article=<slug>` from the query string, fetches `articles/<slug>/data.json`, injects `data.content` into the DOM, rewrites relative image/video `src` to `articles/<slug>/...`, and sets a dynamic `<title>` and `<link rel="canonical">` per article (important for SEO — avoids duplicate-content issues across all articles sharing one HTML file).
- `article-script.js` — shared behavior for rendered articles (copy-prompt buttons, reactions, share buttons, "read more" blocks, styles injected via JS so article pages don't need extra `<link>` tags).
- `article-style.css` — shared article typography/layout (color tokens via CSS custom properties, light/dark theme via `[data-theme="light"]`).
- `articles/` — one subfolder per article, folder name is the URL slug (e.g. `articles/promt-skulptor/`). Each folder contains:
  - `data.json` — the article's only data file: `title`, `date`, `tag`, `excerpt`, `content` (raw HTML string).
  - Media files (`.jpg`, `.webp`, `.mp4`, ...) referenced from `data.json`/`content` by **bare filename only** (e.g. `src="1.jpg"`), never a full path — `article-template.html` prefixes `articles/<slug>/` at render time.
  - Some folders are date-named instead of topic-named (e.g. `articles/2026-08-03/`) — both are valid slugs, just pick something short and readable.
- `articles/manifest.json` — flat JSON array driving `index.html`'s article feed (`slug`, `title`, `date`, `tag`, `excerpt`). **This is the site's index — a new article is invisible on the home page until it has an entry here**, even though the article page itself works via direct URL once `data.json` exists.
- `sitemap.xml` — manually maintained list of article URLs (`article-template.html?article=<slug>`) for SEO; updated in the same commit as new articles/manifest entries (see git history).
- `robots.txt` — disallows `/shtab-d14558/` (the internal app) from crawling; allows everything else.
- `tools.html` — standalone client-side image toolbox (compress/resize/crop/rotate/convert/overlay text), self-contained, no server round-trip.
- `pack-articles.html` — a one-off admin utility (uses the GitHub API directly from the browser with a user-supplied token) to help sort loose uploaded media files into the correct `articles/<slug>/` folders before publishing.
- `404.html` — custom GitHub Pages 404 page.
- `shtab-d14558/` — a hidden PWA ("«Живой ИИ»: Контроль", intentionally excluded from `robots.txt` and site navigation) used as a personal content-ops tracker: pulls candidate posts from Gmail (via the Apps Script backend), lets the author edit/rewrite drafts, and tracks Telegram/VK publishing and subscriber counters. See `CONTROL-APP-SETUP.md` for the full setup story.
  - `index.html`, `app.css`, `app.js` — the PWA UI/logic.
  - `github-store.js` — thin client around the GitHub Contents API; reads/writes `posts.json`/`counters.json` in a **separate private repo** `zhivoy-blog/zi-control-data` (never in this repo). All calls go straight from the browser to `api.github.com` using a token stored only in that device's `localStorage`.
  - `manifest.webmanifest`, `sw.js`, `icons/` — standard PWA installability plumbing.
- `apps-script/` — Google Apps Script backend (`Code.gs`) deployed separately (not part of this site's deploy) under a personal Google account; reads Gmail for post drafts by subject line and can post subscriber-count lookups to Telegram/VK APIs. See `apps-script/README.md` for deployment steps. Changes to `Code.gs` in this repo do **not** take effect until manually redeployed via the Apps Script UI ("Deploy → Manage deployments → New version").
- `CONTROL-APP-SETUP.md` — end-user setup instructions (Russian) for the `shtab-d14558` app + Apps Script backend + required GitHub tokens.

## How the site actually works (read this before editing article code)

- **No build step.** GitHub Pages serves the repo as-is. A commit to the default branch (via a merged PR) is a deploy.
- **Articles are pure data + one template**, not one HTML file per post. `data.json.content` is a raw HTML string injected via `innerHTML` — write it as you would hand-authored article HTML (headings, `<p>`, `<img>` with bare filenames, prompt boxes, etc.), matching the structure/classes other `articles/*/data.json` files already use (see `article-style.css`/`article-script.js` for the classes those files rely on, e.g. `.prompt-wrapper`, `.prompt-box`, `.article-date`).
- **Publishing a new article requires touching multiple files together** — there is a strict checklist (mirrors the `publikaciya-stati-na-sait` skill):
  1. Create `articles/<slug>/` (latin slug, short, no spaces).
  2. Add `data.json` with `title`, `date`, `tag`, `excerpt`, `content`.
  3. Add the article's media files into the same folder.
  4. Reference media in `content`/`data.json` by bare filename only (`src="imya-fayla.jpg"`), never a full path.
  5. Add a matching entry to `articles/manifest.json` — this is what makes the article appear on `index.html`.
  6. Add a `<url>` entry to `sitemap.xml`.
  7. Verify on the live site: article opens, images load, no broken links.
- **Data for the internal `shtab-d14558` app lives outside this repo** (in the private `zi-control-data` repo) — never look for `posts.json`/`counters.json` here.
- **Cache-busting**: `index.html` and `article-template.html` fetch their JSON with `?v=' + Date.now()` and `cache: 'no-store'` — this is intentional so GitHub Pages' CDN caching doesn't serve stale article lists/content; keep that pattern when touching those fetches.
- Light/dark theme is done via a `[data-theme="light"]` attribute on the root element plus CSS custom properties (`--bg-color`, `--card-bg`, `--accent-blue`, ...) defined in both `index.html`'s inline `<style>` and `article-style.css`/`tools.html` — keep new color usage consistent with these tokens rather than hardcoding colors.

## Working in this repo

- There's no `npm install`/build/lint/test command — validate changes by opening the HTML files directly (or a local static server) in a browser and checking the relevant page(s) (`index.html` for feed/manifest changes, `article-template.html?article=<slug>` for article content, `tools.html`/`pack-articles.html` for those utilities).
- Keep edits to `shtab-d14558/` and `apps-script/Code.gs` mindful that they're a separate, personal-use system with its own private data repo and manual Apps Script deploy step — a code change alone does not deploy the backend.
- Don't invent paths to article media beyond the current article's own folder; the template only rewrites `src`/`href` that don't already start with `http` or `articles/`.
