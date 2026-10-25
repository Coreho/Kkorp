---
id: TASK-026
title: Enable the www domain alias
status: Done
assignee: []
created_date: '2026-10-04 03:01'
updated_date: '2026-10-25 06:19'
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
- [x] #2 Both HTTP and HTTPS requests to www redirect to https://koreokorp.com while preserving the path and query string.
- [x] #3 The www certificate is trusted and automatically renewed; existing subdomain routes continue to work.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: nslookup www.koreokorp.com returns 64.177.54.33, the production VPS. AC #1 verified.

2026-10-25: deploy/configure-www-redirect.py ran on the VPS as root after backing up Proxy Manager's database to /opt/stacks/koreokorp/backups/www-20261025/npm-before.sqlite. It created Let's Encrypt certificate 14 (CN=www.koreokorp.com, issuer Let's Encrypt YE1, expires 2027-01-23) and redirection host 1 (meta nginx_online true). Evidence: #2 http and https requests to www.koreokorp.com/ and /blog/post?x=1&y=2 each return one 301 to https://koreokorp.com with the same path and query, and following https://www ends at 200 on https://koreokorp.com/ after 1 redirect. #3 Proxy Manager's hourly job renews Let's Encrypt certificates within 30 days of expiry (internal/certificate.js; 'Completed SSL cert renew process' in its log). Status codes for koreokorp.com, staging, adctrl, prxymgr, workflow, heckrepair and capitalcocksuckers were identical before and after (capitalcocksuckers already returned no response before the change).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
www.koreokorp.com now redirects to https://koreokorp.com on HTTP and HTTPS with a trusted, auto-renewed certificate; other hosts unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
