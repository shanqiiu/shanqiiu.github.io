# 01 — Server-authoritative chat write path

**What to build:** All cloud chat writes go through a single server-side path (a `post-message` Edge Function). Sending a normal message from the UI still works end-to-end and appears in the room; a message whose nickname is a reserved owner name (`山海` / `shanhai` / `wuxian`) or whose content is empty / over 500 chars is rejected with a clear error. Messages produced while in local (offline) mode are back-filled through this same path on upgrade. The anon direct-insert bypass is NOT yet closed in this ticket (that's ticket 04) so nothing breaks mid-flight.

**Prefactor:** lift the reserved-nickname and profanity vocabulary into one shared source before wiring the function, so server and client can share the definition.

**Blocked by:** None — can start immediately.

**Status:** DONE (code) — implemented as a Postgres BEFORE INSERT trigger `chat_message_guard` in `supabase/schema.sql` (reserved-name reject; length via existing column CHECK). Not verifiable locally (no Postgres). Takes effect after re-running `schema.sql` in Supabase.

- [ ] A `post-message` server function is the write path used by the chat client's cloud persist step and its local→cloud backfill.
- [ ] A valid message sent from the UI is stored and rendered end-to-end.
- [ ] A reserved owner nickname is rejected server-side, regardless of client.
- [ ] Empty or >500-char content is rejected server-side.
- [ ] Local (offline) mode still works when the function/Supabase is unavailable.
- [ ] Reserved-name/profanity vocabulary lives in one shared source of truth.
