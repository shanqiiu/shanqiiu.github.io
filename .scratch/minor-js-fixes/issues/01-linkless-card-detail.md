# 01 — Link-less knowledge cards open the in-site detail panel

**What to build:** Clicking a dynamic knowledge card that has no external link opens the in-site detail panel (matching static-card behavior) instead of doing nothing useful, and such cards no longer carry a dead `target="_blank"`/`href="#"`. Cards that do have a link still open it in a new tab as before.

**Blocked by:** None — can start immediately.

**Status:** DONE — verified. `renderDynamicItem` only sets `target=_blank`/real href when a link exists; link-less cards fall through to the in-site detail panel. `hugo` build green.

- [ ] A dynamic card with no link opens the detail panel on click.
- [ ] A dynamic card with a link still opens that link in a new tab (`rel="noopener noreferrer"`).
- [ ] Link-less cards have no `target="_blank"` attribute.
- [ ] `hugo --minify` builds successfully.
