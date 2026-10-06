---
id: TASK-018
title: Cut the live domain over to the application with a rehearsed rollback
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 05:41'
updated_date: '2026-10-06 12:49'
labels:
  - hosting
milestone: m-0
dependencies: []
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
Stage 4 cutover approved by the owner on 2026-10-06. The VPS currently runs a static production mockup and a verified Next.js staging image. Production and staging will become independent containers from the same Next.js image lineage. The obsolete static implementation will be archived as offline rollback material rather than retained as an active third environment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The approved staging image passes the application and TLS checks before production cutover
- [x] #2 koreokorp.com routes through Nginx Proxy Manager to an independent production Next.js container
- [x] #3 koreokorp.com serves trusted HTTPS, redirects HTTP, and preserves the required security headers
- [x] #4 staging.koreokorp.com remains healthy and independent from production
- [x] #5 Obsolete static releases and the static container are archived and removed from active deployment state
- [x] #6 Production image rollback and archived-static disaster rollback procedures are documented and verified
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
- [x] #4 The cutover is performed only after a recorded go/no-go check, and the decision to keep or drop koreokorp-web is written down.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record the current proxy, container, image, and static rollback state. 2. Run the repository and staging TLS verification suites. 3. Create a hardened production container from the approved staging image and verify it privately. 4. Back up Proxy Manager and use its API to repoint production. 5. Verify production and staging independently in HTTP and Chromium. 6. Archive static releases, remove the old static container, update deployment documentation, and record exact rollback commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Go/no-go passed before cutover: npm run lint, npm run typecheck, npm test (3 passed), npm run build, CI=1 npm run test:app (25 passed, 2 expected TLS skips), and staging TLS checks (2 passed). Approved image koreokorp-app:81003b0df5a7, revision 81003b0df5a7a36d038c3767ba25173c2b6b4f6a, was healthy before promotion.

Cutover evidence: NPM proxy host 9 now sends koreokorp.com to koreokorp-prod:3000; host 10 keeps staging.koreokorp.com on koreokorp-app:3000. Both containers are healthy, read-only, memory-limited, and independent at 172.18.0.14 and 172.18.0.11. Public production and staging health endpoints return 200. Production redirects HTTP to HTTPS and returns HSTS, nosniff, referrer, permissions, and X-Served-By headers. Production TLS browser checks passed 2/2.

Cleanup and rollback evidence: archived /var/www/koreokorp and static deployment config to /opt/stacks/koreokorp/backups/retired-static-site-20261006T124120Z.tar.gz (SHA-256 678f88be95a476ed47dc8279333759c1652474099d4a44660464379284c11e17), then removed koreokorp-web and /var/www/koreokorp. Previous app image c6007dc6ca5a was launched as a temporary hardened container, became healthy, and returned 200 from /api/health before removal. promote-prod.sh was run idempotently against 81003b0df5a7. NPM database/config backups from before cutover are retained.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-10-06 12:31
---
Owner explicitly approved replacing the divergent static production implementation with the Next.js application and requested exactly two definitive environments.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced divergent static production with an independent hardened Next.js production container from the approved staging image, retained staging as the second environment, archived and removed the static deployment, and documented promotion plus both image and disaster rollback. Verified through repository checks, Playwright/TLS suites, public HTTP and security-header checks, container health/isolation checks, archive checksums, and a live temporary start of the previous image.
<!-- SECTION:FINAL_SUMMARY:END -->
