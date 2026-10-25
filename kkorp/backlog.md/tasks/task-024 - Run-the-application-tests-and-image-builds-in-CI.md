---
id: TASK-024
title: Run the application tests and image builds in CI
status: In Progress
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 06:08'
labels:
  - tooling
milestone: m-0
dependencies: []
priority: medium
type: chore
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production serves the Next.js application, but .github/workflows/tests.yml runs only npm test, which covers the static prototype. npm run test:app (content, carousel, chat, canvas, motion, and the 620 KiB JavaScript ceiling) runs only when someone remembers to run it locally, and nothing checks that the app or control Docker images still build before a deploy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CI on pull requests and main builds the application and runs npm run test:app alongside npm test.
- [x] #2 Exceeding the client JavaScript ceiling fails the CI run.
- [x] #3 CI builds the app and control Docker images without pushing them, so a broken Dockerfile fails before deployment.
- [ ] #4 Playwright traces and screenshots from failed runs are uploaded as CI artifacts, and the README lists the required checks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25: built by Codex, reviewed by Claude (workflow parsed, lint rerun, rebased onto the TASK-020 lint fix). Evidence: PR #4's first CI run passed all five jobs, https://github.com/Coreho/Kkorp/actions/runs/40167800600 (test 58s, quality 29s, app-test 3m41s including the 620 KiB budget test, docker-build app 37s and control 9s). Open: #4 the artifact uploads and README list are in place, but no failing run has exercised the upload yet; check the first failing run's artifacts, then close.
<!-- SECTION:NOTES:END -->
