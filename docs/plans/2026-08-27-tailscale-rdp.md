# Tailscale RDP Article Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a Chinese tutorial for secure Windows remote control with Tailscale and built-in RDP.

**Architecture:** Add one Hugo page bundle under `content/post/tailscale-windows-remote-desktop/`; rely on existing post templates and taxonomy discovery. No template or menu changes.

**Tech Stack:** Hugo, Markdown, YAML front matter.

---

### Task 1: Add article

**Files:**
- Create: `content/post/tailscale-windows-remote-desktop/index.md`

**Steps:** Write front matter and sections covering setup, connection, security, troubleshooting, and rollback.

### Task 2: Verify build

**Steps:** Run `hugo --minify` (or the repository's documented build command) and confirm successful rendering.

### Task 3: Commit

**Steps:** Review `git diff`, then commit the article and plan.
