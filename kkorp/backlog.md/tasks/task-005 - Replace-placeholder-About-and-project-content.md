---
id: TASK-005
title: Populate approved About and Project content
status: To Do
assignee: []
created_date: '2026-10-04 03:01'
updated_date: '2026-10-04 05:43'
labels:
  - content
  - frontend
milestone: m-0
dependencies:
  - TASK-002
  - TASK-009
  - TASK-010
  - TASK-011
  - TASK-012
  - TASK-018
documentation:
  - mockups/koreokorp-v2/README.md
  - docs/codex-prompt.md
priority: medium
type: enhancement
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The public prototype still displays placeholder timeline, contact, and project details. Once owner editing is available, real owner-approved material must replace the samples without inventing personal history, contact details, or projects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 About copy, timeline, contact links, shared section copy, and project records match owner-approved content.
- [ ] #2 Placeholder badges, sample-only notes, fake handles, and placeholder project cards are absent from the production experience.
- [ ] #3 Every published link and copy interaction works on desktop and at 390px, and unpublished or incomplete records are not exposed.
- [ ] #4 The approved content is included in backup and recovery documentation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
