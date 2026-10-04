---
id: DRAFT-001
title: Enable the www domain alias
status: Draft
assignee: []
created_date: '2026-10-04 03:01'
labels:
  - hosting
dependencies: []
documentation:
  - docs/vps-deployment.md
type: enhancement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The apex domain is live, but www.koreokorp.com has no DNS record. Visitors using the www address cannot reach the site. This proposal needs access to the domain DNS settings before it can be delivered.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 www.koreokorp.com resolves to the intended VPS endpoint.
- [ ] #2 Both HTTP and HTTPS requests to www redirect to https://koreokorp.com while preserving the path and query string.
- [ ] #3 The www certificate is trusted and automatically renewed; existing subdomain routes continue to work.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
