---
id: TASK-008
title: Add selectable site themes
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
labels:
  - design
  - theme
  - frontend
milestone: m-0
dependencies:
  - TASK-007
priority: medium
type: feature
ordinal: 4200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Approved alternate palettes need a consistent implementation rather than scattered color overrides. Visitors should be able to choose a look without losing readability, animation identity, or their preference between visits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A visible keyboard-accessible theme control switches among the approved schemes and clearly communicates the active choice.
- [ ] #2 The choice persists across reloads, respects the system preference before a visitor chooses, and avoids a flash of the wrong theme during loading.
- [ ] #3 Landing, carousel panels, canvas artwork, focus states, project previews, blog pages, admin screens, and the Lobby remain readable in every shipped theme.
- [ ] #4 Automated or documented visual checks cover every theme at desktop and 390px widths, including reduced motion.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
