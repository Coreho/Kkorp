---
id: TASK-020
title: Commit the live admin editor and content integration to the repository
status: Done
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 15:52'
labels:
  - admin
  - tooling
  - hosting
milestone: m-0
dependencies: []
documentation:
  - docs/vps-deployment.md
priority: high
type: task
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Since 2026-10-24, production has run the file-backed editor at adctrl.koreokorp.com (koreokorp-control) and a Next.js app that reads published content from it. Their source exists only as uncommitted changes: the editor, content model, store and auth scripts in C:\Users\koreo\Kkorp on the outdated codex/visual-polish-test-harness branch; the React content provider and tests in the Kkorp-admin-live worktree on codex/admin-live; deploy/next-content-integration.patch; and /home/korebear/kkorp-admin-release-20261024 on the server. A release built from origin/main would silently remove the editor connection and the Next.js 16.4.3 security update. See docs/admin-deployment.md in the primary workspace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One branch based on origin/main contains the admin UI, content model, content store, auth and password scripts, control Dockerfile and Compose template, React content provider, the Next.js 16.4.3 lockfile, and their tests; nothing production needs remains only in a worktree, patch, or server directory.
- [x] #2 npm test, npm run test:app, and the 620 KiB client JavaScript ceiling pass on that branch, and CI passes on its pull request.
- [x] #3 deploy/next-content-integration.patch is removed once its changes are committed, and README.md explains how to run the app, the editor, and the control service locally.
- [x] #4 The app and control images are rebuilt from the merged commit and promoted with the existing health-checked workflow, and the release marker records that commit.
- [x] #5 The codex/visual-polish-test-harness branch and the uncommitted worktree changes are retired only after every needed file is confirmed in the merged branch.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: PR #3 (claude/task-020-admin-source). #1 the server copy at /home/korebear/kkorp-admin-release-20261024 was compared by SHA-256 against both worktrees; source differs only by a blank line in .dockerignore and an older content-model.d.ts, and every needed file is on the branch. #2 local: npm test 12/12, lint 0 errors, typecheck, build, CI=1 test:app 32 passed and 2 skipped (staging TLS), 620 KiB budget passing; CI on PR #3 passes, and PR #4's full CI (which includes this branch) passed app-test and both image builds. #3 the patch is removed and README.md covers the app, the editor and the control service. Open after merge: #4 rebuild koreokorp-app and koreokorp-control from the merged commit and promote with the health-checked workflow (deploy the control image together with TASK-023's monitor); #5 retire codex/visual-polish-test-harness, codex/admin-live and their uncommitted worktree changes, which are now redundant copies.

2026-10-25 release: main d38560941f42 (PRs #3-#10; #4-#9 first landed on stacked branches, so PR #10 merged them into main).
- App: deploy-app.sh built koreokorp-app:d38560941f42 on staging. The staging TLS suite passed 2/2. promote-prod.sh promoted it; current-release-prod is d38560941f42 and previous-release-prod is 7ff44e8a1f43.
- Control: koreokorp-control:d38560941f42 runs with the repository Compose healthcheck (healthy, 0 restarts). Old Compose file kept at /opt/stacks/koreokorp/backups/compose-control.yaml.20261024.
- Incident: the first control build crash-looped for about 3 minutes. The server checkout's umask-007 modes made mockups/ unreadable to the node user. The 2026-10-24 image was restored, then the release was rebuilt from a git archive export and dry-run on a copy of the content. Fixed for good in deploy/Dockerfile.control (chmod -R a+rX /app); CI now builds the control image from a restricted checkout and waits for /api/health.
- Production after release: health:check 5/5 OK, production TLS suite 2/2, security headers present, www redirect intact.
- Retirement: the codex/visual-polish-test-harness branch is an ancestor of main and was deleted locally and on origin. C:\Users\koreo\Kkorp now tracks main; its uncommitted work is in a stash named 'codex/visual-polish-test-harness uncommitted work...', and the local agent-skill folders (.agents/, .claude/skills/) were left in place. Kkorp-admin-live was snapshotted to the local branch retired/admin-live-20261025, then removed. Every file in it matched a committed version (f0d819f or 1dd9be7) or was older than main. The server's uncommitted TASK-009 edit is stashed in /home/korebear/Kkorp.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Committed the live editor and Next.js content integration (PR #3) and landed the stacked work (PR #10). Rebuilt koreokorp-app and koreokorp-control from main d38560941f42, then deployed through staging to production with health checks; both run that commit. Retired the old branch and worktrees after confirming their files are in main.
<!-- SECTION:FINAL_SUMMARY:END -->
