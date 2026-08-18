# Spec: Minor Correctness & Quality Fixes

> Status: DONE (code). C1 verified via hugo build; C2 needs `VISITOR_HASH_SALT` env in Vercel; C3 needs `schema.sql` re-run in Supabase. Publishing to a tracker still blocked — see Further Notes.

## Problem Statement

As the developer, the analysis surfaced a few small, low-severity issues worth
tidying. Dynamic knowledge cards without a real link still get a
`target="_blank"` and an `href="#"`, which is a dead attribute and slightly odd
behavior. The visitor-counter hashes the raw client IP with no secret salt, so
the "anonymized" hashes are brute-force reversible across the (small) IP space.
And the `daily_visitors` table grows without bound because old days are never
cleaned up. None of these break the site, but each is a real rough edge.

## Solution

Tighten each: only give link-bearing cards a new-tab target, add a server-side
secret salt to the IP hash so the anonymization is meaningful, and add a
retention policy for old visitor rows.

## User Stories

1. As a visitor, I want a knowledge card with no external link to open the in-site detail panel, so that clicking it behaves consistently with static cards.
2. As a visitor, I want link-bearing cards to open in a new tab as before, so that outbound links still behave as expected.
3. As a developer, I don't want dead `target="_blank"` attributes on link-less cards, so that the markup reflects actual behavior.
4. As a site owner, I want visitor IPs hashed with a secret salt, so that the stored hashes cannot be trivially reversed by enumerating the IP space.
5. As a site owner, I want the salt read from server-side config, so that it is never exposed to the browser.
6. As a site owner, I want the visitor count to remain correct across the change, so that the daily unique count is unaffected.
7. As a site owner, I want old `daily_visitors` rows pruned, so that the table doesn't grow unbounded over time.
8. As a maintainer, I want each fix to degrade gracefully if its config is absent, so that the site keeps working without the new settings.

## Implementation Decisions

- **Link-less card behavior.** In `renderDynamicItem`, only set `href` to the real
  link, `target="_blank"`, and `rel="noopener noreferrer"` when the item actually
  has a link. Cards without a link should not carry a new-tab target and should
  route to the existing in-site detail panel (matching static-card handling).
- **Salted IP hash.** In `api/today-visitor.js`, incorporate a server-side secret
  salt into the digest (e.g. `sha256(salt + 'v1:' + ip)`), read from an env var.
  If the salt is absent, fall back to current behavior so the endpoint still
  works. The hash stays server-side only; the browser never sees IP or salt.
- **Retention.** Add a retention mechanism for `daily_visitors` — a cleanup SQL
  that deletes rows older than a configured window, optionally scheduled (e.g.
  pg_cron). The daily count logic is unchanged; only historical rows are pruned.

## Testing Decisions

- **What makes a good test:** assert behavior at each seam, not internals —
  given inputs, assert the observable output/state.
- **Modules tested:**
  - Card construction (`renderDynamicItem`, jsdom): an item *with* a link yields an
    anchor that opens a new tab; an item *without* a link yields no new-tab target
    and opens the detail panel on click.
  - Visitor hash (`api/today-visitor.js`): same IP + same salt yields a stable
    hash; a different salt yields a different hash — assert the relationship, not a
    hard-coded digest. Missing salt still returns a count.
  - Retention query: removes only rows older than the window and leaves current
    rows intact.
- **Prior art:** `scripts/check-*.ps1` structural checks; jsdom driving of built
  pages as described in `.workbuddy/memory`.

## Out of Scope

- Redesigning visitor analytics or moving off IP-based unique counting.
- The chat-room security work (covered by its own spec).
- The repo-hygiene / cleanup work (covered by its own spec).

## Further Notes

- These are independent, low-risk fixes and can ship separately or together.
- **Publishing blocked:** `docs/agents/issue-tracker.md` is missing, so this spec
  could not be posted to the project tracker or labeled `ready-for-agent`. Run
  `/setup-matt-pocock-skills`, then publish and label.
