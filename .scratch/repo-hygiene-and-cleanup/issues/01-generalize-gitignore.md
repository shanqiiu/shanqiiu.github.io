# 01 — Generalize .gitignore for local build/verify output

**What to build:** A stray `git add -A` can no longer stage local build or verify output. The ignore rules use general patterns (by convention) rather than one-off per-incident entries, the current untracked `d/` build directory is covered, the duplicated entry is removed, and the convention for where local verify builds go is documented so future ones are covered by one rule.

**Blocked by:** None — can start immediately.

**Status:** DONE — verified (`d/` now ignored via general patterns, duplicate line removed, `git status` clean of build output).

- [ ] `git status` is clean with the current working tree (no untracked build output showing).
- [ ] The duplicated ignore entry is removed.
- [ ] `/public/` remains ignored.
- [ ] The verify-directory convention is documented (in-repo relative path, single ignore rule).
