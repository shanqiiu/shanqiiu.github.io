# 03 — De-duplicate shared JS utilities

**What to build:** The utilities duplicated across the chat and main scripts (`cleanStr`, and optionally `escapeHtml`) live in one shared source loaded before both, so a fix to one no longer silently misses the other. Chat and knowledge-base behavior is unchanged. If extraction proves higher-risk than the duplication warrants, the fallback is to keep the copies with a cross-linking comment — single-source is preferred.

**Blocked by:** None — can start immediately.

**Status:** DONE — verified. `assets/js/util.js` is the single source (`window.SiteUtils`), loaded deferred in `head.html`; `chat.js`/`main.js` consume it. Build green; load order util→chat→main confirmed in built HTML.

- [ ] The shared utilities exist in exactly one source, loaded before the consumers.
- [ ] Chat send/render and knowledge-base config cleaning behave unchanged.
- [ ] `hugo --minify` builds successfully.
