# 02 — Server-side profanity masking

**What to build:** Profanity is masked in the stored message by the server, so bypassing the browser filter (calling the write path directly) still results in masked text in the database — not raw profanity.

**Blocked by:** 01 — Server-authoritative chat write path.

**Status:** DONE (code) — profanity masking is part of the `chat_message_guard` trigger (masks each bad word to equal-length asterisks, case-insensitive). Needs `schema.sql` re-run in Supabase.

- [ ] A message containing profanity submitted directly to the write path is stored masked.
- [ ] Masking uses the shared vocabulary source of truth.
- [ ] Clean messages pass through unchanged.
