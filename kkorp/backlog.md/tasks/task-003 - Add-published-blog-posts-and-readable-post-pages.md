---
id: TASK-003
title: Publish the blog index and post pages
status: To Do
assignee: []
created_date: '2026-10-04 03:01'
updated_date: '2026-10-04 05:43'
labels:
  - blog
  - frontend
milestone: m-0
dependencies:
  - TASK-002
  - TASK-018
documentation:
  - docs/codex-prompt.md
  - mockups/koreokorp-v2/README.md
priority: high
type: feature
ordinal: 2100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Blog panel currently presents sample posts without the planned durable publishing flow. After a production runtime and content source are agreed, readers need individual published articles in the existing editorial style. Authoring is separate work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Blog list shows published posts newest first and opens a readable page for each slug.
- [ ] #2 Unpublished or unknown slugs are not publicly readable, and Markdown content cannot execute embedded scripts.
- [ ] #3 The site remains usable with sample posts when backend configuration is absent; article pages fit desktop and phone widths.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
