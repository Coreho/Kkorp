---
id: TASK-010
title: Edit shared section presentation content
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-26 01:09'
labels:
  - admin
  - cms
  - content
milestone: m-0
dependencies:
  - TASK-002
  - TASK-009
  - TASK-018
priority: medium
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
About, Blog, and Projects contain supporting copy embedded in the prototype. The owner needs to change section introductions and calls to action without editing HTML, while the stable navigation names and layout remain protected.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The owner can edit and preview the intro, supporting copy, and call-to-action label and destination for About, Blog, and Projects.
- [x] #2 Published changes appear on the corresponding public panels without a code deployment, while canceling or failed saves leave the published version unchanged.
- [ ] #3 Inputs have useful length and URL validation, plain text cannot inject markup, and stable panel identifiers and navigation semantics cannot be accidentally changed.
- [x] #4 Each section has a documented fallback so the public site remains usable when stored content is missing or the backend is unavailable.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): the file-backed editor (PR #3) meets #2 and #4. Evidence: tests/admin.spec.js 'edits page copy, persists after reload, and renders text safely'; failed saves leave content.json unchanged (atomic replace, revision check); defaults live in mockups/koreokorp-v2/content-model.js (defaultPages) and lib/useContent.tsx falls back to them when /api/content fails, documented in README.md and docs/admin-deployment.md. Open: #1 intros, supporting copy and button labels are editable, but call-to-action destinations are not, and there is no preview of the public panel; #3 text renders as text and panel identifiers are not editable, but every field shares one 4000-character limit rather than per-field limits.

2026-10-25 (TASK-006 review, R2): the section buttons this task's AC#1 calls 'call-to-action' are hidden on the live site (.panel .action { display: none }), and the section intros are hidden whenever a panel is open (.panel.open .rest { display: none }); none was ever on screen at either width. The review recommends showing each intro in the open panel and dropping the button-label fields, which would reduce AC#1 to intro and supporting copy. Waiting on the owner's choice before building.
<!-- SECTION:NOTES:END -->
