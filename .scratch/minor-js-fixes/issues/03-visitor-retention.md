# 03 — daily_visitors retention

**What to build:** Old `daily_visitors` rows are pruned on a configurable window so the table doesn't grow without bound. The daily unique-count logic is untouched; only historical rows beyond the window are removed.

**Blocked by:** None — can start immediately.

**Status:** DONE (code) — `prune_daily_visitors(p_keep_days)` added to `schema.sql` with an optional pg_cron schedule (commented). Needs `schema.sql` re-run in Supabase; schedule/manual call is the user's choice.

- [ ] A cleanup mechanism removes rows older than the configured window.
- [ ] Current-window rows and the daily count are unaffected.
- [ ] The mechanism is documented (and optionally scheduled).
