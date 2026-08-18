# 02 — Salt the visitor IP hash

**What to build:** The visitor-counter hashes the client IP together with a server-side secret salt (from an env var), so the stored hashes can't be reversed by enumerating the IP space. The daily unique count is unchanged. If the salt env var is absent, the endpoint falls back to current behavior and still returns a count. IP and salt never reach the browser.

**Blocked by:** None — can start immediately.

**Status:** DONE (code) — `api/today-visitor.js` now hashes `salt + 'v1:' + ip` with salt from `VISITOR_HASH_SALT`. Needs the env var set in Vercel to take effect; falls back gracefully (empty salt) if unset.

- [ ] The IP hash incorporates a server-side secret salt read from config.
- [ ] Same IP + same salt produces a stable hash; a different salt produces a different hash.
- [ ] Missing salt falls back gracefully and still returns a count.
- [ ] Hashing stays server-side only.
