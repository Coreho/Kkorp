---
id: TASK-003
title: Publish the blog index and post pages
status: Done
assignee:
  - '@claude'
created_date: '2026-10-04 03:01'
updated_date: '2026-10-25 14:33'
labels:
  - blog
  - frontend
milestone: m-0
dependencies:
  - TASK-002
  - TASK-018
documentation:
  - docs/codex-prompt.md
  - mockups/koreokorp-v2/README.md
priority: high
type: feature
ordinal: 2100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Blog panel currently presents sample posts without the planned durable publishing flow. After a production runtime and content source are agreed, readers need individual published articles in the existing editorial style. Authoring is separate work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Blog list shows published posts newest first and opens a readable page for each slug.
- [x] #2 Unpublished or unknown slugs are not publicly readable, and Markdown content cannot execute embedded scripts.
- [x] #3 The site remains usable with sample posts when backend configuration is absent; article pages fit desktop and phone widths.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Give posts a web address: slug in the shared content model (assignSlugs), validated and assigned by the content store, kept once published by the editor, and derived by the public API and the app for older content.
2. Add /blog/<slug> in the Next.js app: a client page fed by the same public /api/content as the carousel (no new service wiring), with loading, not-found (noindex) and unavailable states; malformed addresses get a real 404.
3. Render bodies as Markdown with a small in-repo reader (lib/markdown.ts) that outputs React elements, because the 620 KiB client JS budget has no room for a Markdown library. Raw HTML stays text; links allow only http(s), mailto and same-site addresses.
4. Link Blog panel entries to their pages; /#blog returns to the Blog slide.
5. Tests first where possible: tests/app/blog.spec.js (list order, rendering, safety, not found, unavailable, 390px) and tests/admin.spec.js (lasting address, private draft address, slug validation).
6. Docs: README, admin guide, Markdown help in the editor; record limitations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): partly started by the file-backed editor (PR #3). The Blog panel lists published entries newest first and expands each entry's full text in place; drafts are never public and bodies render as plain text. Still open: per-slug post pages, Markdown rendering, and article layouts at desktop and 390px. Build on the Supabase schema from TASK-017.

2026-10-25 decisions with the owner: (1) the client JS budget now caps the home page at 620 KiB (every emitted chunk except those only entry pages load) and an entry page's own chunks at 15 KiB; the old all-chunk total had under 1 KiB of headroom, and the entry page adds 9.6 KiB (home page measures 619.8 KiB). (2) AC#3 'with sample posts' is met in intent: sample posts were removed by the editor work, so without the content service the Blog slide and entry pages show a clear empty or could-not-load message instead.
Entry pages are client-rendered from the same /api/content as the carousel, so a missing entry is a not-found page with status 200 and noindex; malformed addresses get a real 404. Server rendering can follow with the Supabase read path (TASK-017).
Evidence: tests/app/blog.spec.js (5 tests: list order and links, Markdown rendering and the way back to /#blog, markup as text and unsafe links dropped, unknown/draft/malformed addresses, unavailable journal, 390px and desktop fit); tests/admin.spec.js 'gives a published entry a web address that survives a new title'; full app suite with CI=1: 36 passed, 2 skipped (staging TLS), then the one tile-timing failure fixed and content+blog passed 21/21 over 3 repeats; npm test 13 passed; lint 0 errors; typecheck clean; git diff --check clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published entries now open at /blog/<slug> with Markdown bodies. Slugs come from the title, are validated and stored by the content store, stay fixed once published, and are derived for older content. The Blog slide links to each entry and /#blog returns to it. Markdown is read by lib/markdown.ts into React elements, so raw HTML stays text and only http(s), mailto and same-site links survive. Verified with tests/app/blog.spec.js, the new editor test, the full app suite and npm test.
<!-- SECTION:FINAL_SUMMARY:END -->
