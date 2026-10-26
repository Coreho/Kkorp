---
id: TASK-007
title: Design accessible alternate color schemes
status: Done
assignee:
  - '@claude'
created_date: '2026-10-04 03:14'
updated_date: '2026-10-26 03:27'
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
- [x] #1 At least three named palette proposals define semantic tokens for page, surface, text, muted text, borders, primary accent, secondary accent, focus, success, warning, and danger.
- [x] #2 Every proposal includes representative desktop and phone mockups for the landing page and at least one open content panel.
- [x] #3 Text, controls, focus indicators, and status colors meet WCAG AA contrast for their intended use, with recorded contrast results.
- [x] #4 The review identifies which palette or palettes should ship and how the retro Lobby colors and logo artwork behave in each.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define four palettes as semantic tokens in docs/design/palettes.json: Indigo Night (today's, as the baseline), two dark variants that keep the glass-and-jelly character (Plum Dusk, Terminal Mint), and one light (Paper Day), because TASK-008's system-preference rule needs a light option to mean anything.
2. Render each on the live site, not a drawing: scripts/palette-capture.mjs injects token overrides (plus the light-only overrides a mockup needs) and captures landing and the open About panel at 1280 and 390, and the Lobby at 1280.
3. Measure: WCAG ratios for every text, control, focus and status token pair, plus rendered-pixel contrast of body text in each capture.
4. Write docs/design/palettes-2026-10.md: tokens, mockups, contrast table, how the Lobby and the logo behave, what shipping each would take (hard-coded colours and canvas engines), and a recommendation for the owner.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-26: four palettes (Indigo Night as today's baseline, Plum Dusk, Terminal Mint, Paper Day light) as semantic tokens in docs/design/palettes.json covering page, surface, text, soft and muted text, primary, secondary, accent, focus, success, warning, danger and the four panel accents. scripts/palette-capture.mjs rendered each on the live site: landing and open About panel at 1280 and 390, Lobby at 1280 (docs/evidence/palettes/, 20 JPEGs). Contrast in contrast.json: every proposal passes AA for text (4.5), focus and accents (3), and status colours; rendered body text 4.73 to 12.97. Found a live failure: today's Blog section number #4b4ba0 on the panel is 2.61:1; #7a7ae0 gives 5.28:1. Plum Dusk's first secondary (4.39 with white) was darkened to #a8572a (5.17) before capture. The Lobby window keeps its Windows 2000 colours in every palette; the logo reads on all four; the jelly bubbles stay purple and pink because the engine hard-codes them. Recommendation in docs/design/palettes-2026-10.md: fix the Blog accent now, ship Terminal Mint then Plum Dusk (CSS only), Paper Day only with TASK-008's full tokenization.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Proposed three alternate palettes beside today's, rendered them on the live site at desktop and phone widths, and recorded WCAG contrast for every token pair; all proposals pass AA. Recommended Terminal Mint and Plum Dusk as CSS-only alternates and Paper Day as the light option once TASK-008 tokenizes the remaining hard-coded colours, and found today's Blog section number fails contrast (2.61:1).
<!-- SECTION:FINAL_SUMMARY:END -->
