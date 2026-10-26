---
id: TASK-004
title: Create and manage blog posts
status: Done
assignee:
  - '@claude'
created_date: '2026-10-04 03:01'
updated_date: '2026-10-26 00:27'
labels:
  - blog
  - admin
milestone: m-0
dependencies:
  - TASK-002
  - TASK-003
  - TASK-009
  - TASK-018
documentation:
  - docs/codex-prompt.md
  - mockups/koreokorp-v2/README.md
priority: high
type: feature
ordinal: 3300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The site needs an owner-only writing workflow so blog posts can move from draft to publication without code edits or server access. It builds on the public post model and shared administration foundation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The owner can create, edit, preview, save drafts, publish, unpublish, and delete Markdown posts with title, slug, excerpt, and publication date.
- [x] #2 The Blog section’s latest-post card and list update from published content, while drafts and deleted posts are never exposed publicly.
- [x] #3 Only the configured owner can read drafts or mutate posts, and authorization is enforced on the server for every operation.
- [x] #4 Slug conflicts, unsafe Markdown, unsaved changes, validation failures, and save errors are handled without silent data loss.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move the Markdown reader from lib/markdown.ts to mockups/koreokorp-v2/markdown.js with a .d.ts beside it, the pattern content-model.js already uses, so the editor preview and the public entry page read Markdown with the same code. components/Markdown.tsx imports it from there.
2. Editor: a Web address field (/blog/ prefix). It follows the title while the entry is unpublished and the address is still the one the title would give; typing in it, or publishing, fixes it. Duplicates get -2, -3 as on the server. Invalid or taken addresses are reported on the field before saving; the server's 400 stays as the backstop.
3. Editor: the preview renders title, date, introduction and body through the shared reader as DOM nodes (no innerHTML), and refreshes while open.
4. Tests in tests/admin.spec.js: custom address saved and public; auto address follows title; taken and malformed addresses blocked with nothing saved; preview renders Markdown and keeps script tags and javascript: links inert. Update the published-address test for the field.
5. Docs: docs/admin-panel.md and README blog section.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): the file-backed editor (PR #3) meets #2 and #3. Evidence: tests/admin.spec.js 'publishes a readable blog entry and can unpublish it' and 'rejects unauthorized writes, unsafe uploads, unsafe links, and stale saves'; tests/app/content.spec.js 'published content updates the React panels and safely renders complete entries'; the public API returns published entries only. Open: #1 posts are plain text with title, date, excerpt, body and cover image, with no slug and no Markdown (a plain-text preview exists); #4 unsaved-change warnings, session-expiry recovery, stale-save conflicts and validation errors are handled, but slug conflicts and Markdown safety do not apply yet. Build on the Supabase schema from TASK-017 (posts.slug, posts.body_md).

2026-10-25: built on the file-backed editor (field names match the planned Supabase posts.slug). The Markdown reader moved from lib/markdown.ts to mockups/koreokorp-v2/markdown.js (+ .d.ts), so the editor preview and the public entry page share it. Evidence, tests/admin.spec.js (17/17): 'chooses an entry web address and previews its Markdown safely' covers create with title, address, date and introduction; the address following the title, typed text tidied (First Light → first-light), title edits no longer moving it; preview of heading, bold, italic, list, safe link, dropped javascript: link and <script> shown as text with window.__ran undefined; live preview refresh; publish with slug, date and excerpt in /api/content; a taken address blocked by the field with the stored revision unchanged; delete of both entries. 'publishes a readable blog entry and can unpublish it' covers draft, publish and unpublish; 'gives a published entry a web address that survives a new title' covers edit; server 400s for duplicate and malformed addresses; stale saves 409; unsaved-change and session-expiry tests unchanged. npm test 22 passed (4 skipped locally), app suite 37 passed (2 staging skips) including the JS budgets, lint 0 errors, typecheck clean, build OK.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The editor now sets each entry's web address (it follows the title until typed, stays fixed once published, and refuses one already in use) and previews entries through the same Markdown reader as the public page, so the owner can write, preview, draft, publish, unpublish and delete Markdown posts. Verified by the editor suite (17 tests), the app suite and the JS budget test.
<!-- SECTION:FINAL_SUMMARY:END -->
