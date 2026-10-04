---
id: TASK-017
title: Connect the content database with row level security and offline fallbacks
status: To Do
assignee: []
created_date: '2026-10-04 05:41'
labels:
  - cms
  - security
  - hosting
milestone: m-0
dependencies:
  - TASK-016
references:
  - docs/codex-prompt.md
documentation:
  - docs/production-architecture.md
priority: high
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stage 2 of the delivery plan in docs/production-architecture.md. TASK-016 proves the runtime, but content is still hardcoded until a durable store exists. This stage creates the Supabase project, writes the migrations, and wires a read path that degrades instead of failing. The Free plan has no automatic backups and pauses a project after a week of inactivity, so the backup and keep-alive procedures are part of this stage rather than a later concern. Owner authorization at this stage means RLS policies and secret handling only; the admin shell itself is TASK-009. Migrations are written but not applied by the agent, and no project or bucket is provisioned without the owner's action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The owner creates the Supabase Free project, and the application reads it using a committed .env.example with every variable documented and no real value in version control.
- [ ] #2 Migrations in supabase/migrations/ create the posts, projects, project_media, sections, timeline_entries, and contact_links tables, and every table enables row level security in the same migration that creates it.
- [ ] #3 Published content is readable with the anon key, and no table is readable or writable with the anon key that should not be.
- [ ] #4 The service role key is read only in server modules, and a build-time check fails the build if it appears in the client bundle.
- [ ] #5 With no environment variables set the site serves local content files, and with the database unreachable it serves last-known-good published content and reports degraded rather than returning a server error.
- [ ] #6 A nightly logical database dump and media sync write to /opt/stacks/koreokorp/backups with documented retention, and a restore is performed at least once from those backups.
- [ ] #7 A keep-alive job runs at least every three days against the deep health endpoint, because the Free plan otherwise pauses after a week of inactivity and takes the public site down.
- [ ] #8 The deep health endpoint reports whether the expected tables exist, so a missing migration is a visible warning rather than a production stack trace.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria are verified with recorded evidence.
- [ ] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [ ] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->
