---
id: TASK-024
title: Run the application tests and image builds in CI
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
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
- [ ] #1 CI on pull requests and main builds the application and runs npm run test:app alongside npm test.
- [ ] #2 Exceeding the client JavaScript ceiling fails the CI run.
- [ ] #3 CI builds the app and control Docker images without pushing them, so a broken Dockerfile fails before deployment.
- [ ] #4 Playwright traces and screenshots from failed runs are uploaded as CI artifacts, and the README lists the required checks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
