---
id: TASK-023
title: Health-check the content service and alert the owner when the site degrades
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
labels:
  - hosting
milestone: m-0
dependencies: []
priority: medium
type: task
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
koreokorp-control has no container healthcheck. When it stops, the public site falls back to bundled copy, so an offline editor or content API looks normal to visitors and to the owner, and new posts silently disappear from the site. The app already has /api/health, but nothing outside the server watches it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The control service has a health endpoint that confirms the content directory is readable and writable without revealing content or settings, and its Compose file uses it as the container healthcheck with automatic restart.
- [ ] #2 The owner can tell whether the public app is serving live or fallback content, for example from /api/health.
- [ ] #3 An external check of koreokorp.com, adctrl.koreokorp.com, and the public content API notifies the owner within 15 minutes of a failure or fallback.
- [ ] #4 The checks, where alerts go, and the first response steps are documented.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
