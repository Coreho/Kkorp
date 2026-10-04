---
id: TASK-006
title: Audit and prioritize the site experience
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
labels:
  - design
  - accessibility
  - frontend
milestone: m-0
dependencies: []
documentation:
  - docs/design/meridian-editorial-carousel-DESIGN.md
  - mockups/koreokorp-v2/index.html
priority: high
type: task
ordinal: 1100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The prototype has a strong identity, but the live desktop and phone layouts have not had a structured usability and visual review. A ranked review will separate high-value refinements from subjective redesign and protect the existing character.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A design review covers landing, all four panels, navigation, empty and populated content states, motion, accessibility, desktop, and 390px phone layouts.
- [ ] #2 Recommendations are documented with screenshots or annotated references, ranked by user impact and effort, and distinguish quick refinements from larger experiments.
- [ ] #3 The review addresses content hierarchy, desktop dead space, mobile scroll and section cues, placeholder treatment, focus and contrast, and reduced-motion behavior.
- [ ] #4 Each recommended implementation can be converted into a focused task without requiring the reviewer to rediscover its rationale.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
