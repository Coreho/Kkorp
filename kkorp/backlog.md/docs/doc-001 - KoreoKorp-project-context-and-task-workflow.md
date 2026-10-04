---
id: doc-001
title: KoreoKorp project context and task workflow
type: guide
created_date: '2026-10-04 02:59'
updated_date: '2026-10-04 03:01'
tags:
  - project
  - workflow
  - hosting
---
# Current project

The live site is https://koreokorp.com on the owner's VPS (173.230.140.70), served by a dedicated Nginx container behind the existing Nginx Proxy Manager. The self-contained prototype is mockups/koreokorp-v2/index.html; chat and posts still use sample data.

# Source documents

- docs/backlog-workflow.md: commands, status meanings, Definition of Done, and SSH tunnel instructions via README.md.
- docs/vps-deployment.md: current deployment, update and rollback commands, and TLS configuration.
- mockups/koreokorp-v2/README.md: shipped prototype behavior and known gaps.
- docs/codex-prompt.md: proposed future production app. Its Vercel hosting requirement is superseded by the owner's VPS decision; do not treat the old prompt as authorization to migrate or connect a backend.

# Task policy

The active setup task records this request. Future work from the existing design and known gaps is stored as drafts with acceptance criteria, without dates or assignees. Review and promote only the work the owner chooses. Resolve runtime and backend prerequisites before starting dependent features. Use the CLI to maintain all Backlog records.

The repository pins Backlog.md 1.53.0. Run npm ci, then npm run backlog -- instructions overview. Task edits remain manual Git changes; automatic commits are disabled. The browser stays on loopback port 6420.
