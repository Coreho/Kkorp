---
id: TASK-023
title: Health-check the content service and alert the owner when the site degrades
status: In Progress
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 06:08'
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
- [x] #1 The control service has a health endpoint that confirms the content directory is readable and writable without revealing content or settings, and its Compose file uses it as the container healthcheck with automatic restart.
- [x] #2 The owner can tell whether the public app is serving live or fallback content, for example from /api/health.
- [ ] #3 An external check of koreokorp.com, adctrl.koreokorp.com, and the public content API notifies the owner within 15 minutes of a failure or fallback.
- [x] #4 The checks, where alerts go, and the first response steps are documented.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: built by Codex, reviewed by Claude with one fix round (shared, cached HTTP probe so the public endpoint cannot force disk writes). Evidence: #1 tests/admin.spec.js control health tests (contract, fails closed on missing storage and invalid JSON, exits after consecutive timed failures, recovers, cached concurrent requests), 20/20 passing; on the VPS a scratch build of deploy/Dockerfile.control run with the real Compose healthcheck (renamed container, temporary data) became healthy in about 8 s and returned 503 when its data directory was made read-only; scratch image and container removed. #2 npm run health:check against production prints 'public content: live'. #4 docs/monitoring.md. Open: #3 alerting starts only after monitor.yml reaches main, and the control health check fails until the new control image is deployed, so deploy koreokorp-control from the merged commit at the same time as merging (until then every scheduled run fails and emails the owner).
<!-- SECTION:NOTES:END -->
