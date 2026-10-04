---
id: TASK-002
title: Define the production application architecture for the VPS
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 03:01'
updated_date: '2026-10-04 05:35'
labels:
  - hosting
  - documentation
milestone: m-0
dependencies: []
documentation:
  - docs/codex-prompt.md
  - docs/vps-deployment.md
priority: high
type: spike
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current site is a static prototype, while editing, authentication, stored posts, and project media need an application runtime and durable services. The older Vercel plan conflicts with the owner’s decision to host koreokorp.com on this VPS, so the production architecture must be settled before implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The documented production plan keeps koreokorp.com on the existing VPS and specifies the application runtime, process supervision, reverse proxy route, content database, media storage, backup, deployment, and rollback approach.
- [x] #2 Authentication, authorization, required secrets, local fallbacks, data migrations, and behavior when services are unavailable are explicit.
- [x] #3 The plan maps the approved Backlog tasks into incremental delivery stages that preserve the current live site until each replacement is verified.
- [x] #4 Open provider or product choices are identified for owner approval, with free-tier and self-hosted tradeoffs described without provisioning external services.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria are verified with recorded evidence.
- [x] #2 Relevant checks pass; new interactions have regression coverage, and npm test plus git diff --check pass before committing.
- [x] #3 Documentation is updated where behavior or workflow changes, and remaining limitations are recorded.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the live VPS facts the plan depends on: Docker/Compose versions, the edge network, Nginx Proxy Manager proxy host 9, the existing shared Postgres 17, free CPU/RAM/disk, and the deployed static release layout. Done by inspection only; change nothing.
2. Resolve the core conflict: docs/codex-prompt.md mandates Vercel + Supabase, but the owner hosts koreokorp.com on this VPS. The VPS decision wins; the Vercel/Supabase stack is superseded rather than implemented.
3. Choose the runtime that satisfies server-enforced authorization (TASK-009 AC#2): Next.js App Router standalone output in a Node container, replacing static-only export. Follow the workflow-board container conventions already on this box.
4. Choose durable storage with no external provisioning: self-hosted Postgres for content, and local media on a named volume. Decide whether to share the existing shared_postgres instance or run a dedicated container, and record the tradeoff.
5. Replace Supabase Realtime and Supabase Auth with self-hosted equivalents: Postgres LISTEN/NOTIFY plus SSE or WebSocket fan-out for chat and presence, and cookie-session owner auth enforced in the app. Record the free-tier tradeoff for keeping an external provider.
6. Specify supervision, health checks, resource limits, secret handling from a root-only env file, and behavior when the database or model provider is unavailable, including the prototype's local fallbacks.
7. Specify backup (logical dumps plus media), retention, restore, atomic release deployment, and rollback by image tag.
8. Map approved tasks TASK-003 through TASK-014 into ordered delivery stages that keep the live static site serving until each replacement is verified.
9. List open provider and product choices for owner approval with free-tier and self-hosted tradeoffs, provisioning nothing.
10. Write the result to docs/production-architecture.md, cross-link it from README.md, docs/vps-deployment.md and docs/codex-prompt.md, and record the open decisions as a Backlog decision record.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner decisions collected 2026-10-04 (In Progress, @codex). Storage/auth: Supabase Cloud Free plan — Postgres + Auth (email+password, no custom SMTP) + Storage; keep-alive cron to defeat the 1-week inactivity pause; nightly logical dump to /opt/stacks/koreokorp/backups. This supersedes the earlier 'dedicated koreokorp-postgres' answer, which was given after I wrongly ruled Supabase out. Build: on the VPS, no registry or CI secrets. Cutover rehearsal: staging.koreokorp.com as a second Nginx Proxy Manager host with its own Let's Encrypt cert, proxy host 9 untouched until verified. VPS inventory confirmed by read-only inspection: Docker Compose v5.5.1, Node v26.9.0/npm 11.19.1, external network 'edge', NPM 2.12.6 owning 80/443, proxy host 9 -> koreokorp-web:80, 6 CPU / 15Gi RAM (12Gi available) / 229G free on /.

Delivered docs/production-architecture.md (9 sections: system shape, runtime + supervision + proxy route, database/media/backup, auth + authorization + secrets, fallbacks and degraded behavior, data migrations, deploy + rollback, 13 delivery stages, open owner choices plus the self-hosted variant recorded for comparison). Cross-linked from README.md, docs/vps-deployment.md, docs/codex-prompt.md and mockups/koreokorp-v2/README.md so the superseded Vercel assumption is no longer reachable as if current. Evidence: npm run check passed (5 files, 4 panels, 26 unique ids); npm test passed (3 Playwright smoke tests); git diff --check clean; backlog doctor reported no duplicate IDs, self-referential dependencies or cycles. Limitation: 'backlog decision' exposes only create/list with no edit subcommand, so decision-001 was created via the CLI but its Context/Decision/Consequences body cannot be written without hand-editing the markdown, which the workflow forbids. The full rationale lives in docs/production-architecture.md instead. Remaining blockers are listed in section 9 of that document: the Supabase project itself and the staging.koreokorp.com DNS record, neither of which has been provisioned.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Settled the production architecture for koreokorp.com and wrote it to docs/production-architecture.md. The core conflict is resolved: the site stays on the owner's VPS, and the Vercel requirement in docs/codex-prompt.md is marked void rather than implemented. Chosen stack, all confirmed by the owner: Next.js 16 App Router standalone in a read-only node:22-alpine Compose service on the external 'edge' network with no published port, supervised by Docker restart policy and a health check, reached through a new staging.koreokorp.com Nginx Proxy Manager host while proxy host 9 keeps serving the live static site; Supabase Cloud Free for Postgres (schema 'koreokorp', RLS on every table), email-and-password Auth with no custom SMTP, and a private Storage bucket fronted by a caching route handler; nightly pg_dump and media sync to /opt/stacks/koreokorp/backups plus a three-dayly keep-alive ping, because the Free plan pauses after a week of inactivity and has no automatic backups. Server-enforced authorization uses two layers, RLS plus route guards returning 404 rather than 403, so the runtime that the old static prototype lacked is now justified by TASK-009. Verified by section-level inspection: all eight AC1 topics, the AC2 topics (section 4 auth/authorization/secrets, section 5 degraded behavior, section 6 migrations), all twelve approved tasks mapped across thirteen delivery stages with the live site marked untouched through stage 3, and seventeen open owner choices in section 9 with the self-hosted variant's tradeoffs documented. Nothing was provisioned; VPS inspection was read-only. npm run check passed, npm test passed with 3 Playwright tests, git diff --check clean, backlog doctor clean. Three follow-ups need owner action and are listed in section 9: create the Supabase project, add the staging.koreokorp.com DNS record, and stage the untracked Stages 1, 2 and 4 as Backlog tasks. TASK-015 is explicitly excluded pending splitting.
<!-- SECTION:FINAL_SUMMARY:END -->
