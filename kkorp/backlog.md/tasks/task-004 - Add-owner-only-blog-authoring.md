---
id: TASK-004
title: Create and manage blog posts
status: To Do
assignee: []
created_date: '2026-10-04 03:01'
updated_date: '2026-10-04 03:16'
labels:
  - blog
  - admin
milestone: m-0
dependencies:
  - TASK-003
  - TASK-009
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
- [ ] #1 The owner can create, edit, preview, save drafts, publish, unpublish, and delete Markdown posts with title, slug, excerpt, and publication date.
- [ ] #2 The Blog section’s latest-post card and list update from published content, while drafts and deleted posts are never exposed publicly.
- [ ] #3 Only the configured owner can read drafts or mutate posts, and authorization is enforced on the server for every operation.
- [ ] #4 Slug conflicts, unsafe Markdown, unsaved changes, validation failures, and save errors are handled without silent data loss.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
