---
id: TASK-001
title: Finish repository Backlog.md setup
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 02:58'
updated_date: '2026-10-04 03:03'
labels:
  - tooling
  - documentation
dependencies: []
priority: high
type: chore
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Backlog.md has been initialized with agent instructions and a custom storage directory, but contributors lack a reproducible CLI, a documented workflow, and a useful record of the current site and future proposals.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A fresh npm ci installs the pinned Backlog.md CLI and documented npm commands can list tasks and open the board.
- [x] #2 The existing custom directory and agent instructions are preserved, and task edits do not create automatic commits.
- [x] #3 Contributors can find current VPS hosting context, workflow instructions, and clearly identified future-work drafts with acceptance criteria.
- [x] #4 Backlog doctor reports no integrity problems and the local browser interface serves the configured project.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the initialized CLI, configuration, agent guidance, and project/deployment notes.
2. Pin the existing CLI version, add npm shortcuts, and complete configuration defaults without changing the chosen storage path.
3. Document the task workflow and current VPS context; capture planned features as uncommitted drafts.
4. Verify CLI integrity, browser access, dependency installation, and repository checks; record evidence and finish this setup task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pinned Backlog.md 1.53.0 with npm scripts; preserved kkorp/backlog.md and existing staged agent instructions. Disabled automatic commits and browser launching; added labels and shared Definition of Done. Added docs/backlog-workflow.md, README commands and SSH access, doc-001 project context, and DRAFT-001 through DRAFT-008 as proposals.
Validation: clean npm ci succeeded (0 audit vulnerabilities); local CLI reports 1.53.0; task list and board render Kkorp; backlog doctor reports no duplicate IDs or dependency problems; npm test passed all 3 browser tests; git diff --check and cached diff check passed. Playwright verified the Kkorp task UI, all 8 drafts, and project guide with no JavaScript errors. ss confirms 127.0.0.1:6420. Git HEAD remains bfcc2937e32a2d0a3d9c07a038ee13337e7b3b7b, confirming no automatic commits.
Browser launched with npm run backlog:browser; it is a foreground development process, not a boot service. No live website deployment changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed repository Backlog.md setup with a pinned CLI, npm shortcuts, project defaults, contributor guidance, and eight clearly scoped roadmap drafts. Verified clean dependency installation, board and browser workflows, Backlog integrity, all three existing site tests, and whitespace checks; existing agent changes and Git HEAD were preserved.
<!-- SECTION:FINAL_SUMMARY:END -->
