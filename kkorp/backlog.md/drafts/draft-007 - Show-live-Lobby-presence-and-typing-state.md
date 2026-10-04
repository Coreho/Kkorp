---
id: DRAFT-007
title: Show live Lobby presence and typing state
status: Draft
assignee: []
created_date: '2026-10-04 03:01'
labels:
  - chat
dependencies: []
documentation:
  - docs/codex-prompt.md
  - mockups/koreokorp-v2/README.md
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The buddy list and typing activity are currently scripted. After shared chat is available, visitors need an accurate view of who is present without duplicate active screen names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Active screen names are unique case-insensitively and obey the existing 3-to-16-character validation.
- [ ] #2 Independent sessions observe joins, leaves, away status, and throttled typing indicators; stale sessions stop appearing online.
- [ ] #3 The About caption and buddy list reflect current presence, while the no-backend experience remains usable.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
