---
id: TASK-018
title: Cut the live domain over to the application with a rehearsed rollback
status: To Do
assignee: []
created_date: '2026-10-04 05:41'
labels:
  - hosting
milestone: m-0
dependencies:
  - TASK-017
references:
  - docs/vps-deployment.md
documentation:
  - docs/production-architecture.md
priority: high
type: task
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stage 4 of the delivery plan in docs/production-architecture.md. The static prototype has served koreokorp.com since its first deployment and must keep serving until the application has been verified in production under real traffic and real TLS. This stage performs the one-way switch and keeps the previous static release reachable as a fast rollback target for one release cycle. The rehearsal belongs to TASK-016; this stage is the actual cutover and its verification. Nothing here is reversible by simply reverting a commit, so the ordering and the go/no-go checks matter more than usual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Staging has passed a full verification cycle, including the Playwright suite over TLS, before the live domain is repointed.
- [ ] #2 Proxy host 9 is repointed from koreokorp-web to koreokorp-app through Nginx Proxy Manager without hand-editing its generated configuration.
- [ ] #3 koreokorp.com serves the application over trusted HTTPS with HTTP still redirecting, and the security headers match the existing configuration.
- [ ] #4 The static koreokorp-web container is retained but idle for at least one release cycle as a rollback target, and the restore procedure is documented and rehearsed.
- [ ] #5 Database migrations are backward compatible with the previous release, so an image rollback against a newer schema is safe.
- [ ] #6 The deploy procedure and rollback commands in docs/vps-deployment.md are updated to describe the application, and the prototype is recorded as a rollback target rather than the production site.
- [ ] #7 A tested rollback restores the previous application image and, if necessary, the static release, with no data loss.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
- [ ] #4 The cutover is performed only after a recorded go/no-go check, and the decision to keep or drop koreokorp-web is written down.
<!-- DOD:END -->
