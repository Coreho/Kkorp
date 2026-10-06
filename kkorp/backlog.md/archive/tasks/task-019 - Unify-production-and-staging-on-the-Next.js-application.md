---
id: TASK-019
title: Unify production and staging on the Next.js application
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-06 12:29'
labels:
  - deployment
  - operations
dependencies: []
priority: high
type: chore
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The VPS currently exposes a static mockup in production, a separate Next.js staging application, duplicate static release directories, and an incomplete animation release. This makes the deployed state ambiguous and allowed a failed static deployment to claim the wrong commit. Production and staging should become independent environments running the same traceable Next.js image lineage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 koreokorp.com runs an independent production container built from the approved Next.js image
- [ ] #2 staging.koreokorp.com remains available as the candidate environment
- [ ] #3 Production and staging report healthy responses and the deployed image revision is recorded
- [ ] #4 Obsolete static releases are archived and removed from the active releases directory
- [ ] #5 Rollback instructions and the two-environment promotion model are documented
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Capture container, proxy, image, and rollback state. 2. Start an independent production container from the approved staging image and verify it privately. 3. Switch the production proxy and verify HTTPS, health, assets, and browser behavior. 4. Archive and remove obsolete static releases and container. 5. Document the production/staging promotion model and verify rollback evidence.
<!-- SECTION:PLAN:END -->
