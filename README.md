# DatabaseVerse

The developer's database atlas. 24 databases, 7 categories, 3 live query engines, 6 dev tools, and a full study guide.

## Structure

```
.
├── index.html          Homepage — all 24 DB cards, comparator, quiz, use cases
├── playground.html     SQLite WASM + MongoDB sim + Redis sim
├── tools.html          Schema Designer, Conn Builder, Regex, JSONPath, Data Types, Index Advisor
├── learn.html          Glossary, Interview Q&A, Benchmarks, Migration Guides
├── 404.html            Custom error page
├── favicon.svg         Amber DB cylinder mark
├── robots.txt
├── sitemap.xml
│
├── css/
│   ├── tokens.css      All design tokens (colors, type, spacing, motion)
│   ├── base.css        Reset, nav, footer, shared components — loaded by all pages
│   ├── home.css        Hero, cards, comparator, quiz, use cases
│   ├── playground.css  Editor panels, engine tabs, output panes
│   ├── tools.css       All 6 tool UIs
│   └── learn.css       Glossary, Q&A, benchmarks, migrations
│
├── js/
│   ├── nav.js          initNav, showToast, copyText, initNewsletter
│   ├── db-data.js      DB_META (24 DBs), CATEGORIES, USE_CASES — single source of truth
│   ├── home.js         initCards, initSearch, initComparator, initQuiz, initUseCases
│   ├── playground.js   Real SQLite WASM + MongoDB aggregation sim + Redis 60+ commands
│   ├── tools.js        Schema Designer, Conn Builder, Regex, JSONPath, Data Types, Index Advisor
│   └── learn.js        Glossary, Interview Q&A, Benchmarks, Migrations
│
└── components/
    ├── head.html        <head> template (reference — copy into each page)
    ├── nav.html         Nav markup (reference)
    └── footer.html      Footer + newsletter markup (reference)
```

## Deploy

Drop all files onto any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

```bash
# GitHub Pages (gh-pages branch)
git subtree push --prefix . origin gh-pages

# Vercel
vercel --prod

# Netlify drag-and-drop
# Zip the root folder and drag to netlify.com/drop
```

No build step. No dependencies. Pure ES modules loaded via `type="module"` script tags.

## Tech

- Space Grotesk + Fira Code (Google Fonts)
- SQLite via sql.js (WebAssembly, loaded from cdnjs at runtime on the Playground page)
- Everything else is vanilla HTML, CSS, and JavaScript
