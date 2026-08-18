# 02 — Delete dead static/js/main.js

**What to build:** The stale, unreferenced `static/js/main.js` is removed so there is exactly one `main.js` source of truth (the pipeline-processed `assets/js/main.js`). The site builds and behaves identically.

**Blocked by:** None — can start immediately.

**Status:** DONE — verified (`static/js/main.js` removed; clean `hugo --minify` build does not regenerate `/js/main.js`).

- [ ] No layout references the removed file.
- [ ] `hugo --minify` builds successfully.
- [ ] The built site loads the fingerprinted `assets` main.js exactly as before.
