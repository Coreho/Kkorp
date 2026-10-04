---
id: DRAFT-006
title: Share Lobby messages between visitors
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
The live Lobby is a local simulation. Once runtime and backend choices are approved, visitors should be able to exchange real text while preserving the current AIM-style window. Presence and AI bot generation are separate proposals.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two independent browser sessions can send and receive the same messages without reloading, and opening the room loads the latest 50 messages.
- [ ] #2 Messages are text-only, limited to 300 characters, and rejected server-side when invalid or rate-limited; human clients cannot forge bot messages.
- [ ] #3 Missing backend configuration retains scripted chat, and connection failures produce a recoverable state.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
