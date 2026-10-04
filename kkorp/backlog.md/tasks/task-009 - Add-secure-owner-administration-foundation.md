---
id: TASK-009
title: Add secure owner administration foundation
status: To Do
assignee: []
created_date: '2026-10-04 03:14'
updated_date: '2026-10-04 05:43'
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
- [ ] #1 The configured owner can sign in and sign out through a protected administration area on the VPS-hosted site.
- [ ] #2 Signed-out visitors and authenticated non-owners cannot view owner content or perform any content mutation; authorization is enforced on the server.
- [ ] #3 Local development and the public site fail safely when required backend settings are absent, with setup documented and no secrets exposed to browser code or version control.
- [ ] #4 The administration shell provides clear navigation for Site sections, Blog posts, and Projects and works at desktop and 390px widths.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
