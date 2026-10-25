---
id: TASK-022
title: Back up editor content automatically and rehearse a restore
status: Done
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 06:16'
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
- [x] #1 A scheduled job runs at least daily and copies content.json and uploads/ together, so restored entries never reference missing images, into a backup directory on the VPS with documented retention.
- [x] #2 A copy is also kept off the VPS in a location the owner chooses, and admin-auth.json keeps the same access restrictions it has on the server.
- [x] #3 A restore into a scratch content directory is performed once, and an editor started on it shows the same entries and images as production.
- [x] #4 A failed or missing backup is visible to the owner through a log and a check they can run, and the procedure is documented in docs/admin-deployment.md.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): interim. The owner reaffirmed decision-001 (Supabase), so this job protects the file store only until TASK-017's cutover; TASK-017 then retires it in favour of its own database dump and media sync.

2026-10-25: installed and verified. #1 korebear's crontab runs ~/koreokorp-backup/backup-content.sh at 03:17 UTC; content.json is copied before uploads/ and inconsistent snapshots are refused; 14 daily and 8 weekly snapshots kept (docs/admin-deployment.md#content-backups). First snapshot koreokorp-content-20261025T061210Z.tar.gz, 93,431 bytes. #2 the Windows scheduled task 'KoreoKorp content backup pull' copies the newest snapshot daily at 09:30 local to %USERPROFILE%\KoreoKorp-backups with SHA-256 verification; the folder ACL grants only the owner's account (inheritance removed), and the server folder is mode 700. A manual Task Scheduler run returned 0. #3 restore rehearsed in a scratch container from the live control image: public /api/content, content.json, admin-auth.json and the one upload all matched production by SHA-256. #4 failures are FAIL lines in backup.log and pull.log, a non-zero Task Scheduler result, and --check / -Check commands for both sides; tests/content-backup.spec.js covers snapshot contents, refusal of inconsistent snapshots, stale and missing checks, and pruning (runs on Linux CI; skipped on Windows).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Daily content snapshots on the VPS with an off-server copy on the owner's computer, a rehearsed restore, and checks for both. Interim until TASK-017 moves content to Supabase.
<!-- SECTION:FINAL_SUMMARY:END -->
