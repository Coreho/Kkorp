---
id: TASK-012
title: Manage the project collection
status: In Progress
assignee:
  - '@claude'
created_date: '2026-10-04 03:14'
updated_date: '2026-10-26 02:21'
labels:
  - admin
  - cms
  - projects
milestone: m-0
dependencies:
  - TASK-002
  - TASK-009
  - TASK-018
priority: high
type: feature
ordinal: 3200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Projects panel contains placeholder cards and cannot be updated without editing the prototype. A structured project collection lets the owner add work over time and supplies the data needed for richer previews.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The owner can create, edit, reorder, publish or hide, and remove projects with title, summary, technologies, status, and destination links.
- [ ] #2 The owner can upload or select preview images and short videos, replace them, add meaningful alternative text or mark media decorative, and remove unused media safely.
- [x] #3 Required fields, URLs, duplicate ordering, media type and size, and unsafe content are validated before publication.
- [x] #4 Published projects appear in owner-defined order, unpublished projects remain private, and the public panel has intentional empty and loading states.
- [x] #5 Project data and media have documented backup and fallback behavior that keeps the public site usable during service failures.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Model: technologies (up to 12), stage (In progress, Live, Paused, Archived or none), source link, video, and a decorative flag beside the existing fields; older content reads with defaults (emptyProject in content-model.js), field names chosen to carry over to the Supabase projects table.
2. Server: validate every new field; accept MP4 (MP4 brands only) and WebM up to 15 MB by their bytes; serve uploads with byte ranges for Safari; list earlier uploads for reuse.
3. Editor: new fields, a media slot for image and video with upload, preview, remove and 'use an earlier upload', one media description or a decorative mark, and Move earlier / Move later that saves the order and waits for unsaved changes.
4. Public panel: owner order (array order), a loading line instead of flashing the bundled sample projects, empty alt for decorative media, the site logo when an upload fails.
5. Backups: the integrity check follows video references too.
6. Tests: editor flow, server rules and range requests in tests/admin.spec.js; loading, order, decorative alt and logo fallback in tests/app/content.spec.js; video reference in tests/content-backup.spec.js. Docs: admin-panel.md, README.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): partly started by the file-backed editor (PR #3): create, edit, publish or keep as draft, and delete projects with title, description, link and one image with required alt text (PNG, JPEG, WebP or GIF up to 5 MB; SVG rejected). Still open: reordering, technologies and status fields, video, marking media decorative, safe removal of unused media (TASK-025), and backups (TASK-022 now, TASK-017 after cutover).

2026-10-26: built on the file store (PR #16, CI run 40258371814 all green). #1 tests/admin.spec.js 'orders projects and keeps their technologies, stage, links and media': create two, publish, technologies, stage, source link, Move later saved and reflected in /api/content order, moving refused while unsaved; delete covered by the existing project test. #3 the same test: duplicate technology flagged on the field; server 400 for duplicate technologies, unknown stage, javascript: source link, .mov video path, media without description or decorative mark; uploads that are not media and HEIC disguised as video 400; size caps 5 MB image, 15 MB video. Ordering is the array order, so duplicate positions cannot exist. #4 tests/app/content.spec.js 'projects wait for the published list, keep the owner order, and survive a missing upload': loading line with aria-busy and no sample tiles while the request is held, then owner order; drafts stay private (existing 'saves privately' test). #5 docs/admin-panel.md and README: bundled fallback when the service is down, site logo when an upload fails (tested), daily backups include videos and refuse snapshots naming a missing video (tests/content-backup.spec.js, Linux CI). Open: #2 upload, preview, replace, reuse an earlier upload, description or decorative are done and tested, but 'remove unused media safely' is TASK-025, which waits on TASK-017. Two editor bugs found by the new test and fixed: a failed save left the description field required for good, and saves re-enabled the deliberately disabled Move earlier. The Projects panel's four hard-coded tags (never visible, review R2) were removed to keep the home page under 620 KiB.
<!-- SECTION:NOTES:END -->
