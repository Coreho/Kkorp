---
id: DRAFT-008
title: Add server-controlled Lobby bot replies
status: Draft
assignee: []
created_date: '2026-10-04 03:01'
labels:
  - chat
  - bots
dependencies: []
documentation:
  - docs/codex-prompt.md
  - mockups/koreokorp-v2/README.md
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
DialUpDan and Y2Kpixie currently use scripted lines. The future design proposes short contextual replies with predictable limits, after shared chat and a server runtime exist. Final names and personalities still need owner input.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Replies are generated server-side and API keys never appear in browser code or public responses.
- [ ] #2 A server-enforced shared cooldown and hourly cap prevent duplicate requests and uncontrolled idle banter.
- [ ] #3 Provider timeouts, errors, or missing configuration use canned fallback lines; persona content stays editable and explicitly provisional until approved.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
