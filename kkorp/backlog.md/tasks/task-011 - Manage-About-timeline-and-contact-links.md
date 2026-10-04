---
id: TASK-011
title: Manage About timeline and contact links
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
labels:
  - admin
  - cms
  - content
milestone: m-0
dependencies:
  - TASK-009
documentation:
  - mockups/koreokorp-v2/README.md
priority: medium
type: feature
ordinal: 3100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The About timeline and contact links are placeholders embedded in the page. The owner needs structured controls for these repeatable items so real details can change without code edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The owner can add, edit, reorder, publish or hide, and remove timeline entries and contact links.
- [ ] #2 Email, external URL, internal section, and copy-to-clipboard link types validate appropriately and render with accessible labels and safe external-link behavior.
- [ ] #3 The public About panel preserves the approved desktop and phone layout for empty, single-item, and longer content sets.
- [ ] #4 Saving errors are shown without losing entered content, and published content has a documented static fallback.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
