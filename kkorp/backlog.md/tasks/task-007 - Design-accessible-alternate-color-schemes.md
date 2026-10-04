---
id: TASK-007
title: Design accessible alternate color schemes
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-04 05:43'
labels:
  - design
  - theme
  - accessibility
milestone: m-0
dependencies:
  - TASK-006
  - TASK-018
documentation:
  - docs/design/meridian-editorial-carousel-DESIGN.md
priority: medium
type: task
ordinal: 1200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The site has one committed dark indigo-and-purple palette. The owner wants additional looks that still feel like KoreoKorp and remain legible across glass panels, canvases, status colors, and the retro Lobby.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At least three named palette proposals define semantic tokens for page, surface, text, muted text, borders, primary accent, secondary accent, focus, success, warning, and danger.
- [ ] #2 Every proposal includes representative desktop and phone mockups for the landing page and at least one open content panel.
- [ ] #3 Text, controls, focus indicators, and status colors meet WCAG AA contrast for their intended use, with recorded contrast results.
- [ ] #4 The review identifies which palette or palettes should ship and how the retro Lobby colors and logo artwork behave in each.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
