# Spec: Repo Hygiene & Source Cleanup

> Status: DONE — all four tickets implemented and verified locally (hugo build + guard scripts green). Publishing to a tracker still blocked — see Further Notes.

## Problem Statement

As the developer, I keep accidentally committing local build output. It already
happened once — a `git add -A` swept a whole Hugo build directory
(`.vb_learn_check/`, 176 files) into the repo and pushed it, and it also deleted a
`_index.md` it shouldn't have. Right now there's a fresh 19 MB `d/` build-output
directory sitting untracked in the working tree, not covered by `.gitignore`. My
ignore rules are narrow, one-off, per-incident entries (and one is even
duplicated), so the same mistake recurs under each new directory name. On top of
that there are two `main.js` files — the real one under `assets/js/` and a stale
38-line copy under `static/js/` that nothing loads — plus a couple of small
utilities copy-pasted between `chat.js` and `main.js`. I want the repo to stop
accreting generated output and stale duplicates.

## Solution

Replace the per-incident ignore entries with general patterns that catch any
local build/verify output by convention, remove the dead duplicate source file,
and reduce the cheap-to-remove duplication — so a stray `git add -A` can no longer
re-commit generated output and there is a single source of truth for each script.

## User Stories

1. As a developer, I want local build output ignored by a general pattern, so that any future verify directory is excluded without a new rule.
2. As a developer, I want the duplicate `.gitignore` entry removed, so that the ignore file has no dead lines.
3. As a developer, I want the current untracked `d/` build directory covered, so that it can't be accidentally committed.
4. As a developer, I want a documented convention for where local verify builds go, so that they all land in one already-ignored place.
5. As a developer, I want the stale `static/js/main.js` removed, so that there is exactly one `main.js` source of truth.
6. As a developer, I want shared JS utilities de-duplicated where it's low-risk, so that a fix to one doesn't silently miss the other copy.
7. As a developer, I want a check that no build-output paths are tracked, so that regressions are caught before they're pushed.
8. As a maintainer reusing this template, I want a clean repo with no generated artifacts, so that a fresh clone contains only source.

## Implementation Decisions

- **Generalize `.gitignore`.** Replace the narrow per-directory rules with general
  patterns for local build/verify output (the existing `/.hugo_*/` is a good
  model; extend the same idea to the `d/` and ad-hoc verify directories). Remove
  the duplicated `/.vb_learn_check/` line. Keep `/public/` ignored.
- **Single verify-dir convention.** Standardize local verification builds into one
  gitignored directory name (in-repo relative path, never an absolute `/d/...`
  path), and document it so it's covered by one rule going forward.
- **Delete dead file.** Remove `static/js/main.js`. `baseof.html` loads
  `assets/js/main.js` via the Hugo asset pipeline (fingerprinted); confirm no
  remaining reference before deletion.
- **De-duplicate utilities.** `cleanStr` (and optionally `escapeHtml`) are
  identical in `chat.js` and `main.js`. Extract them into one small shared asset
  loaded before both, given there is no bundler. If extraction proves higher-risk
  than the duplication warrants, keep the copies but add a comment cross-linking
  them as intentional duplicates — the decision is single-source-preferred.

## Testing Decisions

- **What makes a good test:** assert externally observable build integrity, not
  internal structure — the site still builds correctly and the repo stays clean.
- **Modules tested:**
  - Build output: `hugo --minify` still produces the expected `public/` (e.g. the
    learning page contains its heading and no leftover artifacts).
  - VCS state: after a local build, `git status` shows no tracked build-output
    paths; exactly one `main.js` source exists.
- **Prior art:** the existing `scripts/check-*.ps1` scripts already do
  substring/structural assertions against source and built `public/`; add a check
  in that same style for "no tracked build output" and "single main.js".

## Out of Scope

- Introducing a JavaScript build system / bundler.
- Rewriting the IIFE scripts into ES modules.
- Enforcing the checks in CI (possible follow-up).

## Further Notes

- The root cause is process (`git add -A`), which the team already documented as a
  lesson in `.workbuddy/memory`. A general ignore rule is the durable fix; the
  narrow per-incident rules are precisely why the mistake recurred.
- **Publishing blocked:** `docs/agents/issue-tracker.md` is missing, so this spec
  could not be posted to the project tracker or labeled `ready-for-agent`. Run
  `/setup-matt-pocock-skills`, then publish and label.
