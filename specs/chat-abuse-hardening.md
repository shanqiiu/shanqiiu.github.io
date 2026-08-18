# Spec: Chat Room Abuse Hardening

> Status: IMPLEMENTED via Postgres triggers + RLS (`chat_message_guard` in schema.sql) — a deviation from the Edge Function seam, chosen because no supabase CLI / Deno is available and it works on both hosts. Pending apply: re-run `schema.sql` in Supabase. Not verifiable locally (no Postgres). Publishing to a tracker still blocked — see Further Notes.

## Problem Statement

As the site owner, my public chat room's safety rules are enforced only in the
browser. The nickname blacklist that protects my own identity (`山海` /
`shanhai` / `wuxian`), the profanity filter, and the message-length limit all
live in `chat.js`. But the Supabase anon key is embedded in the page source, and
the `messages` insert policy is `with check (true)`, so anyone can call the REST
endpoint directly and insert a message with any `user_name`, any `user_id`, and
any `content` — skipping every UI check. That means a visitor can impersonate me,
post content the filter would have masked, and flood a room. There is no rate
limiting anywhere. I want abuse controls that cannot be bypassed simply by not
using the UI.

## Solution

Make the server the single authority for message writes. All cloud writes go
through one server-side path that validates the nickname rules, masks profanity,
enforces length, and rate-limits before it persists — and direct anonymous
inserts into `messages` are revoked. Reads stay public so the room still loads
instantly for everyone. The offline/local fallback mode is untouched: when
Supabase is absent the room keeps working via `localStorage` +
`BroadcastChannel`, and messages produced while local are back-filled through the
validated path on upgrade.

## User Stories

1. As a site owner, I want reserved owner nicknames rejected on the server, so that no visitor can post as me even by calling the API directly.
2. As a site owner, I want profanity masking applied on the server, so that bypassing the browser filter still results in masked text stored in the database.
3. As a site owner, I want message length enforced on the server, so that oversized or empty payloads never reach the table regardless of client.
4. As a site owner, I want per-identity rate limiting, so that a single actor cannot flood a room with rapid messages.
5. As a site owner, I want anonymous clients to lose direct insert permission on the messages table, so that the only way to write is through the validated path.
6. As a visitor, I want to keep reading all room history without logging in, so that the room still feels open and instant.
7. As a visitor, I want to send a normal message and see it appear immediately, so that the added validation doesn't degrade the chat experience.
8. As a visitor, I want a clear error when my message is rejected (reserved name, rate limit, too long), so that I understand why it didn't send.
9. As a visitor on an unstable network, I want the local fallback to keep working when the cloud path is unreachable, so that I can still chat within my own browser.
10. As a returning visitor, I want messages I sent while offline to be persisted through the validated path once the cloud connects, so that no back-filled message skips the rules.
11. As a site owner, I want the client's copy of the profanity/nickname list to be treated as advisory UX only, so that there is a single source of truth on the server.
12. As an abuser, I want my direct-API attempt to impersonate the owner to be rejected, so that (from the defender's view) impersonation fails closed.
13. As an abuser, I want my direct-API flood to hit a rate limit, so that (from the defender's view) spam is throttled at the source.
14. As a site owner, I want the change to be invisible when Supabase isn't configured, so that the template still runs as a pure static site for other users.

## Implementation Decisions

- **Single write seam.** Introduce one server-side write path (a Supabase Edge
  Function, e.g. `post-message`) that is the *only* way to insert into
  `messages`. All validation lives there: reserved-nickname rejection, profanity
  masking, length check (1–500), and rate limiting. This is the highest and only
  new seam for the feature.
- **RLS change.** Drop the `messages_insert with check (true)` policy; anon keeps
  `select` only. The Edge Function writes with the service-role key. The `rooms`
  table policies are unchanged.
- **Client change.** In `chat.js`, the cloud-mode branch of `persistMessage`
  calls the function endpoint instead of `.from('messages').insert(...)`. Realtime
  subscription and Presence are unchanged (they read/observe, not write). The
  `localOnlyMessages` back-fill on `upgradeToSupabase` also routes each pending
  message through the function rather than a raw insert.
- **Source of truth for vocabulary.** The reserved-name and profanity lists move
  to the server. The client retains its lists only as a fast pre-check for
  responsive UX, documented explicitly as advisory (never security-bearing).
- **Rate limiting.** Keyed on `(user_id, ip, time-bucket)` in a small table or KV;
  the function returns a 429-style rejection on exceedance, surfaced through the
  existing `showError` toast.
- **Known limitation.** Because anonymous `user_id` / `user_name` remain
  client-asserted, the function can block *reserved* names and throttle, but it
  cannot cryptographically prove a given visitor is or isn't a particular person.
  True participant authentication is out of scope (see below).

## Testing Decisions

- **What makes a good test:** exercise the write seam by external behavior only —
  send a request, assert the response and the resulting database state (or the
  client-visible outcome). Do not assert internal helper shapes.
- **Modules tested:**
  - The Edge Function (primary, behavioral): a valid post inserts and echoes
    success; a reserved nickname is rejected; profanity is stored masked; empty /
    oversized content is rejected; exceeding the rate limit is rejected.
  - `chat.js` `persistMessage` cloud path (jsdom): a send routes to the function
    endpoint; on failure the optimistic message is rolled back and the error toast
    shows; local-mode still persists via `localStorage` when Supabase is absent.
- **Prior art:** the `scripts/check-*.ps1` structural checks, and the jsdom
  "load the real built page and drive it" verification described in
  `.workbuddy/memory` (used to validate the login flow). Extend that jsdom
  approach for the `persistMessage` contract.

## Out of Scope

- True authentication of chat participants (accounts / verified identity).
- A moderation dashboard, message deletion, or ban management UI.
- Migrating local-mode chat to cloud accounts.
- CAPTCHA or bot-detection beyond simple rate limiting.

## Further Notes

- The anon key being visible in page source is by design for Supabase; this spec
  is about *authority of writes*, not hiding the key.
- Local-mode (`localStorage` + `BroadcastChannel`) must remain fully functional
  when Supabase is not configured — that fallback is a core property of the site.
- **Publishing blocked:** `docs/agents/issue-tracker.md` is missing, so this spec
  could not be posted to the project tracker or labeled `ready-for-agent`. Run
  `/setup-matt-pocock-skills`, then publish this file's contents and apply the
  label.
