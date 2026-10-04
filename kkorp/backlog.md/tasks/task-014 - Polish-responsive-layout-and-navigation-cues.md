---
id: TASK-014
title: Polish responsive layout and navigation cues
status: To Do
assignee: []
created_date: '2026-10-04 03:15'
labels:
  - design
  - frontend
  - accessibility
milestone: m-0
dependencies:
  - TASK-006
priority: medium
type: enhancement
ordinal: 3050
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The live prototype is functional at phone width, but section peeks, scrollable content, and the bottom number-only navigation can be ambiguous. Desktop panels also leave large areas unused when content is short. Apply only the refinements approved by the design audit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Visitors can tell which section is active, which adjacent panels are reachable, and when the current panel has more content below on desktop and phone.
- [ ] #2 Open sections use available desktop space intentionally and remain readable with short, long, empty, and media-rich content.
- [ ] #3 Keyboard, pointer, and swipe navigation retain equivalent behavior with visible focus and no accidental activation while scrolling.
- [ ] #4 No horizontal page overflow occurs at 390px, core controls stay reachable at 200% zoom, and existing motion and reduced-motion tests continue to pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
