---
id: decision-001
title: >-
  Host KoreoKorp on the owner's VPS with Supabase Cloud Free for the database,
  auth, and media
date: '2026-10-04 05:34'
status: accepted
---
## Context

KoreoKorp needed a production runtime and a durable store for posts, projects,
section copy, owner sign-in and media. `docs/codex-prompt.md` assumed Vercel and
Supabase. The owner already runs a VPS that hosts other sites behind Nginx Proxy
Manager, so hosting moved there (TASK-002, `docs/production-architecture.md`).

On 2026-10-24 an owner editor shipped before the database existed. It stores
content as JSON plus uploads on the VPS disk, with one scrypt-hashed password,
in the `koreokorp-control` container at `https://adctrl.koreokorp.com`. That
raised the question of whether the file store should simply stay (TASK-021).

## Decision

Host the application on the owner's VPS, and use Supabase Cloud Free for the
database (Postgres with row level security), owner authentication (email and
password) and media (Storage).

Reaffirmed by the owner on 2026-10-25, after the file-backed editor shipped: the
file store is interim and is replaced by Supabase in TASK-017.

## Consequences

- TASK-017 must migrate the live content, uploads and owner sign-in from the
  file store into Supabase, and keep everything the editor does today working
  (`tests/admin.spec.js` and `tests/app/content.spec.js` behaviour), before the
  file store is retired.
- The Free plan has no automatic backups and pauses after a week without
  activity, so nightly dumps, a media sync and a keep-alive are part of
  TASK-017. Until cutover, TASK-022 backs up the file store.
- Public pages must degrade to bundled or last-known-good content when Supabase
  is unreachable; the app never shows a server error for a database outage.
- The service role key stays in server modules only; the anon key is safe only
  because every table has row level security.
- Owner-only work (creating the Supabase project, the owner's password) cannot
  be done by an agent and blocks TASK-017.
