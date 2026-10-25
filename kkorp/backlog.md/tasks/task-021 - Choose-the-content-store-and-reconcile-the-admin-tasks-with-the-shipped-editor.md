---
id: TASK-021
title: Choose the content store and reconcile the admin tasks with the shipped editor
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
labels:
  - documentation
  - cms
  - admin
milestone: m-0
dependencies:
  - TASK-020
priority: high
type: task
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
decision-001 chose Supabase Cloud Free for the database, auth, and media, and TASK-017 plans that migration. The editor in production instead stores everything in JSON files on the VPS, with one scrypt-hashed owner password. decision-001's Context, Decision, and Consequences sections are empty, and doc-001 still describes the earlier static Nginx setup and VPS address. Until the owner chooses one store, TASK-003, 004, 009, 010, 011, 012, 013, and 017 describe work that is partly delivered or may no longer apply. Only the owner can make the choice; this task records it and updates the board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The owner chooses between keeping the file store and migrating to Supabase, and a decision record states the choice, its reasons, and its consequences for backups, auth, and media; decision-001 is completed or marked superseded.
- [ ] #2 TASK-003, 004, 009, 010, 011, 012, 013, and 017 are updated: criteria the shipped editor meets are checked with evidence, remaining work stays open, and tasks made obsolete by the decision are archived with a note.
- [ ] #3 doc-001 matches production: VPS address, Nginx Proxy Manager, the staging and production app containers, the koreokorp-control service, and adctrl.koreokorp.com.
- [ ] #4 docs/vps-deployment.md and docs/production-architecture.md describe the editor and control service, or point to the document that does.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
