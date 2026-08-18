# 03 — Per-identity rate limiting

**What to build:** Rapid repeated sends from a single identity/IP are throttled at the write path. When the limit is exceeded the request is rejected and the user sees the existing chat error toast; normal-pace sending is unaffected.

**Blocked by:** 01 — Server-authoritative chat write path.

**Status:** DONE (code) — rate limiting is part of the `chat_message_guard` trigger (rejects when a user_id has >= 5 messages in the last 10s; index `messages_user_created_idx` added). Rejection surfaces as the existing chat error toast. Needs `schema.sql` re-run in Supabase.

- [ ] Exceeding the per-identity/IP limit within the window is rejected by the write path.
- [ ] The client surfaces the rejection through the existing error toast.
- [ ] Normal-cadence sending is never throttled.
