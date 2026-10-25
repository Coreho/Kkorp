---
id: TASK-009
title: Add secure owner administration foundation
status: Done
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-25 05:55'
labels:
  - admin
  - security
  - cms
milestone: m-0
dependencies:
  - TASK-002
  - TASK-018
documentation:
  - docs/codex-prompt.md
  - docs/vps-deployment.md
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Blog and section editing need one protected owner area, a durable content store, and server-enforced authorization. Building this foundation once avoids separate login and security behavior for every editor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The configured owner can sign in and sign out through a protected administration area on the VPS-hosted site.
- [x] #2 Signed-out visitors and authenticated non-owners cannot view owner content or perform any content mutation; authorization is enforced on the server.
- [x] #3 Local development and the public site fail safely when required backend settings are absent, with setup documented and no secrets exposed to browser code or version control.
- [x] #4 The administration shell provides clear navigation for Site sections, Blog posts, and Projects and works at desktop and 390px widths.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): met by the file-backed editor shipped on 2026-10-24 and committed in PR #3 (TASK-020). Evidence: #1 and #2, tests/admin.spec.js 'requires a login before accessing content administration', 'rejects unauthorized writes, unsafe uploads, unsafe links, and stale saves' and 'production uses the admin host, secure cookies, CSRF checks, and login throttling' (12/12 pass on PR #3); live sign-in, draft privacy and sign-out revocation verified with scripts/verify-live-admin.mjs on 2026-10-24 (docs/admin-deployment.md). There is one owner account and no others, so non-owners cannot sign in. #3, the service refuses to start in production without credentials, the password is stored only as a salted scrypt hash outside the repo, and the public app falls back to bundled copy when /api/content is unavailable (lib/useContent.tsx, docs/admin-panel.md). #4, rail navigation for page text, blog entries and projects; 'keeps editing usable at phone width and warns about unsaved navigation' covers 390px.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered by the interim file-backed editor at https://adctrl.koreokorp.com (PR #3). decision-001, reaffirmed 2026-10-25, moves sign-in to Supabase Auth; TASK-017 carries that migration and must keep these criteria passing.
<!-- SECTION:FINAL_SUMMARY:END -->
