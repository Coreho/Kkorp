---
id: TASK-021
title: Choose the content store and reconcile the admin tasks with the shipped editor
status: Done
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 05:58'
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
- [x] #1 The owner chooses between keeping the file store and migrating to Supabase, and a decision record states the choice, its reasons, and its consequences for backups, auth, and media; decision-001 is completed or marked superseded.
- [x] #2 TASK-003, 004, 009, 010, 011, 012, 013, and 017 are updated: criteria the shipped editor meets are checked with evidence, remaining work stays open, and tasks made obsolete by the decision are archived with a note.
- [x] #3 doc-001 matches production: VPS address, Nginx Proxy Manager, the staging and production app containers, the koreokorp-control service, and adctrl.koreokorp.com.
- [x] #4 docs/vps-deployment.md and docs/production-architecture.md describe the editor and control service, or point to the document that does.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: the owner chose Supabase (decision-001 reaffirmed) in this session. decision-001 now has its context, decision and consequences. TASK-009 is Done with evidence; TASK-004 and TASK-010 have the criteria the editor meets checked; TASK-003, 011, 012 and 013 record what exists and what is left; TASK-017 gained criteria #9 to #11 for migrating live data and sign-in and retiring the file store; TASK-025 now depends on TASK-017; TASK-022 is marked interim. No task became obsolete, so none were archived. doc-001, docs/vps-deployment.md (content service, current release) and docs/production-architecture.md (interim content service, stage 5) match production as read on the VPS on 2026-10-25.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Recorded the owner's choice to keep Supabase as the target store and reconciled the board and deployment docs with the shipped file-backed editor.
<!-- SECTION:FINAL_SUMMARY:END -->
