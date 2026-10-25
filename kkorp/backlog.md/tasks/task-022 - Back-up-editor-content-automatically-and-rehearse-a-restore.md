---
id: TASK-022
title: Back up editor content automatically and rehearse a restore
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
labels:
  - hosting
  - cms
  - security
milestone: m-0
dependencies: []
priority: high
type: task
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All editor data is in /var/lib/koreokorp-content on the VPS: content.json (page text, drafts, and published entries), admin-auth.json, and uploads/. The only backup is a one-off copy from deployment day under /opt/stacks/koreokorp/backups/admin-20261024. A disk failure, bad write, or accidental deletion would lose every post and upload made since. The data exists now, so this should not wait for the store decision in TASK-021; if the owner later moves to Supabase, TASK-017's backup criteria replace this job.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A scheduled job runs at least daily and copies content.json and uploads/ together, so restored entries never reference missing images, into a backup directory on the VPS with documented retention.
- [ ] #2 A copy is also kept off the VPS in a location the owner chooses, and admin-auth.json keeps the same access restrictions it has on the server.
- [ ] #3 A restore into a scratch content directory is performed once, and an editor started on it shows the same entries and images as production.
- [ ] #4 A failed or missing backup is visible to the owner through a log and a check they can run, and the procedure is documented in docs/admin-deployment.md.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
