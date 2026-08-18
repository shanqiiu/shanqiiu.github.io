# 04 — Guard check: no tracked build output + single main.js

**What to build:** A `scripts/check-*.ps1`-style structural guard that fails if any build-output path becomes tracked, or if a second `main.js` source reappears — so the hygiene fixes can't silently regress.

**Blocked by:** 01 (generalize .gitignore), 02 (delete dead main.js).

**Status:** DONE — verified. `scripts/check-repo-hygiene.ps1` passes clean, fails on a tracked build path, fails on a second `main.js`, passes clean again (full matrix run).

- [ ] The guard fails when a build-output path is tracked.
- [ ] The guard fails when more than one `main.js` source exists.
- [ ] The guard passes on the current clean repo.
