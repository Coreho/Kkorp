---
id: TASK-020
title: Commit the live admin editor and content integration to the repository
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
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
- [ ] #1 One branch based on origin/main contains the admin UI, content model, content store, auth and password scripts, control Dockerfile and Compose template, React content provider, the Next.js 16.4.3 lockfile, and their tests; nothing production needs remains only in a worktree, patch, or server directory.
- [ ] #2 npm test, npm run test:app, and the 620 KiB client JavaScript ceiling pass on that branch, and CI passes on its pull request.
- [ ] #3 deploy/next-content-integration.patch is removed once its changes are committed, and README.md explains how to run the app, the editor, and the control service locally.
- [ ] #4 The app and control images are rebuilt from the merged commit and promoted with the existing health-checked workflow, and the release marker records that commit.
- [ ] #5 The codex/visual-polish-test-harness branch and the uncommitted worktree changes are retired only after every needed file is confirmed in the merged branch.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
