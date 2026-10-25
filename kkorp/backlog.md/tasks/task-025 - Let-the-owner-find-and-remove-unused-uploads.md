---
id: TASK-025
title: Let the owner find and remove unused uploads
status: To Do
assignee: []
created_date: '2026-10-25 04:37'
updated_date: '2026-10-25 05:56'
labels:
  - admin
  - cms
milestone: m-0
dependencies:
  - TASK-017
priority: low
type: enhancement
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deleting an entry or replacing its image never deletes the uploaded file, so stored media only grows, and images from deleted drafts stay reachable to anyone who has their URL. Today uploads are files in /var/lib/koreokorp-content/uploads and docs/admin-panel.md tells the owner to review them by hand on the server. decision-001 moves media to Supabase Storage in TASK-017, so this is built against Supabase Storage after that cutover rather than against the interim file store.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The editor lists uploads that no page, project, or blog entry references (draft or published), with a preview, size, and upload date.
- [ ] #2 The owner can delete selected unreferenced uploads after confirming, and the server refuses to delete any file that is still referenced.
- [ ] #3 Deleted files stop being served, and the action is covered by an admin regression test.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-25 (TASK-021): re-scoped to Supabase Storage and made dependent on TASK-017, because the owner reaffirmed decision-001; building cleanup for the interim file store would be thrown away.
<!-- SECTION:NOTES:END -->
