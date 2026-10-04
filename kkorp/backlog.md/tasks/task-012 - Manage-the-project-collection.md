---
id: TASK-012
title: Manage the project collection
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-04 05:43'
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
- [ ] #1 The owner can create, edit, reorder, publish or hide, and remove projects with title, summary, technologies, status, and destination links.
- [ ] #2 The owner can upload or select preview images and short videos, replace them, add meaningful alternative text or mark media decorative, and remove unused media safely.
- [ ] #3 Required fields, URLs, duplicate ordering, media type and size, and unsafe content are validated before publication.
- [ ] #4 Published projects appear in owner-defined order, unpublished projects remain private, and the public panel has intentional empty and loading states.
- [ ] #5 Project data and media have documented backup and fallback behavior that keeps the public site usable during service failures.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
