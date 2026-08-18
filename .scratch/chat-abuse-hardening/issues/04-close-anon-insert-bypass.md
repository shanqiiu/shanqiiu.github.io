# 04 — Close the bypass: revoke anon INSERT, client checks advisory-only

**What to build:** Direct REST inserts into the messages table by an anonymous client now fail — the validated write path is the only way in. The UI continues to send normally. The client-side nickname/profanity/length checks remain only as fast UX feedback, documented as advisory (never security-bearing). This is the security-closing slice.

**Blocked by:** 01, 02, 03 — the write path must fully validate (insert + length + reserved name + profanity + rate limit) before the direct-insert door is shut.

**Status:** DONE (code) — satisfied by construction. The trigger validates EVERY insert (UI or direct REST), so there is no bypass to close: anon INSERT stays enabled for the browser and enforcement is unconditional. Client-side checks are now documented as advisory in `chat.js`. Needs `schema.sql` re-run in Supabase. (Note: this reframes the original "revoke anon INSERT" plan, which assumed the Edge Function seam.)

- [ ] Anonymous direct REST insert into the messages table is rejected.
- [ ] Sending a message through the UI still works.
- [ ] Reads (room history, realtime, presence) are unaffected.
- [ ] Client-side checks are documented as advisory UX only.
