---
id: TASK-013
title: Add rich project previews to the Projects panel
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-04 05:43'
labels:
  - projects
  - design
  - frontend
milestone: m-0
dependencies:
  - TASK-002
  - TASK-006
  - TASK-009
  - TASK-012
  - TASK-018
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Text-only project placeholders do not show what the work looks like or make individual projects easy to explore. Project cards should offer compact visual previews without competing with the animated node graph or harming performance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each published project can show an optimized image, short muted video, or intentional text-only fallback with title, summary, technologies, and status.
- [ ] #2 A preview opens an accessible project detail view or configured external destination, with clear keyboard behavior and safe external links.
- [ ] #3 Cards handle portrait and landscape media, missing media, and long titles without layout overflow at desktop and 390px widths.
- [ ] #4 Preview media is lazy-loaded, does not cause visible layout shifts, respects reduced-motion and data-saving preferences, and keeps the node graph responsive.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
