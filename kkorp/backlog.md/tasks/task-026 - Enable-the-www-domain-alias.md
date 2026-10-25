---
id: TASK-026
title: Enable the www domain alias
status: To Do
assignee: []
created_date: '2026-10-04 03:01'
updated_date: '2026-10-25 04:37'
labels:
  - hosting
milestone: m-0
dependencies: []
documentation:
  - docs/vps-deployment.md
priority: medium
type: enhancement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
www.koreokorp.com now resolves to the VPS (64.177.54.33), but Nginx Proxy Manager has no host for it. Checked 2026-10-25: http://www.koreokorp.com returns the proxy's Default Site page, and https://www.koreokorp.com fails the TLS handshake. Visitors who type www see a stock page or a certificate error instead of KoreoKorp.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 www.koreokorp.com resolves to the intended VPS endpoint.
- [ ] #2 Both HTTP and HTTPS requests to www redirect to https://koreokorp.com while preserving the path and query string.
- [ ] #3 The www certificate is trusted and automatically renewed; existing subdomain routes continue to work.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: nslookup www.koreokorp.com returns 64.177.54.33, the production VPS. AC #1 verified.
<!-- SECTION:NOTES:END -->
