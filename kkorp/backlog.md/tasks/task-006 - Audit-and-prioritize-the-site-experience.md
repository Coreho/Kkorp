---
id: TASK-006
title: Audit and prioritize the site experience
status: Done
assignee:
  - '@claude'
created_date: '2026-10-04 03:14'
updated_date: '2026-10-26 01:09'
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
- [x] #1 A design review covers landing, all four panels, navigation, empty and populated content states, motion, accessibility, desktop, and 390px phone layouts.
- [x] #2 Recommendations are documented with screenshots or annotated references, ranked by user impact and effort, and distinguish quick refinements from larger experiments.
- [x] #3 The review addresses content hierarchy, desktop dead space, mobile scroll and section cues, placeholder treatment, focus and contrast, and reduced-motion behavior.
- [x] #4 Each recommended implementation can be converted into a focused task without requiring the reviewer to rediscover its rationale.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Capture the live site with a repeatable script (scripts/site-audit-capture.mjs): landing, four panels, populated and empty Blog and Projects (content substituted in the browser only), entry pages, keyboard sweep, reduced motion, 390px, 200% zoom.
2. Measure rather than eyeball: horizontal overflow, content hidden below, used space, control sizes, contrast on rendered pixels and by computed colour, focus stops.
3. Write docs/design/site-review-2026-10.md: what works, ranked findings with impact, effort, quick vs experiment, evidence links, a recommendation and a done-when line each, and the owner's decisions.
4. Note the findings on the tasks they affect (TASK-010, TASK-013, TASK-014) without creating new tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: review written to docs/design/site-review-2026-10.md from 25 captured states of https://koreokorp.com (d38560941f42) at 1280x800, 390x844 and 200% zoom, plus a keyboard sweep and reduced motion; evidence and measurements.json in docs/evidence/site-audit/. Eleven ranked findings, R1 to R11. Highest: the live site still shows a 'Mockup · sample content' badge, 'Placeholder' tags beside real details and the tab title 'KoreoKorp V2 Mockup' (R1); intros, the Latest card and the section buttons are never visible although the editor offers them (R2, measured in every panel visit at both widths); the empty Blog sits on a skeleton-like scene (R3); at 390px the Projects scene paints over cards (R4); phone section buttons are named only '01' to '04' for screen readers because the labels use display:none (R7). Works: zero overflow in all states, visible focus at every Tab stop, text contrast 5.6:1 to 18.8:1 computed, zero console errors. No follow-up tasks were created; the review lists the owner's decisions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reviewed the live site at desktop, phone and 200% zoom with a repeatable capture script, and documented eleven ranked findings with screenshots, measurements, recommendations and done-when lines in docs/design/site-review-2026-10.md. Each maps to an existing task or a proposed new one, pending the owner's choice.
<!-- SECTION:FINAL_SUMMARY:END -->
