# KoreoKorp production architecture

Status: **implemented through the application cutover (Stage 4)**.
Applies to: the Next.js application running in two independent environments on
the existing VPS.

> **Current deployment.** Production is `koreokorp-prod` behind
> `koreokorp.com`; staging is `koreokorp-app` behind
> `staging.koreokorp.com`. Both run immutable images from the same
> `koreokorp-app:<commit-sha12>` lineage. The former static production site was
> retired on 2026-10-06 and is available only as an offline disaster archive.
> See `docs/vps-deployment.md` for the authoritative current topology,
> promotion, and rollback procedures.

The remaining sections preserve the original architecture decisions and future
content-system plan. Where historical staging/static language conflicts with
the current deployment, `docs/vps-deployment.md` takes precedence.

This document supersedes the hosting and backend decisions in
`docs/codex-prompt.md`. That prompt remains the source of truth for the
site's *visual and behavioural* design, but its stack section is obsolete:

| `docs/codex-prompt.md` said | Decision now |
|---|---|
| Deploy on Vercel (free tier) | **Superseded.** koreokorp.com stays on the owner's VPS. |
| Supabase for Postgres, Realtime, Auth | **Confirmed**, on the Supabase Cloud Free plan. |
| OpenRouter free models for bots | Unchanged, still server-only. Deferred to DRAFT-008. |
| Next.js 16 App Router, TypeScript strict | **Confirmed.** |
| Plain CSS ported from the mockup | **Confirmed.** |

---

## 1. Shape of the system

```
                    internet
                        │  :443
              ┌─────────▼──────────┐
              │ Nginx Proxy Manager │  owns 80/443 for every site on the box
              └─────────┬──────────┘
        proxy host 9    │            proxy host (staging)
        koreokorp.com   │            staging.koreokorp.com
                        ▼                     ▼
              ┌───────────────────────────────────┐
              │  network: edge                    │
              │                                   │
              │  koreokorp-web   (nginx:alpine)  │  ← today's static site, stays up
              │  koreokorp-app   (node:22-alpine)│  ← the new app, from Stage 1
              └──────────────┬────────────────────┘
                             │ HTTPS, service role from root-only env file
                             ▼
                  ┌──────────────────────┐
                  │ Supabase Cloud (Free)│
                  │ Postgres · Auth      │
                  │ Storage · Realtime*  │
                  └──────────────────────┘
                             │
                  nightly pg_dump ──▶ /opt/stacks/koreokorp/backups
```

`*` Realtime is provisioned but unused until DRAFT-006/007/008 are promoted.

The app container holds **no state**. Postgres, media, and sessions all live
outside it. That is what keeps releases and rollbacks to a container swap.

---

## 2. Application runtime and process supervision

**Runtime.** Next.js 16, App Router, TypeScript `strict`, built with
`output: 'standalone'` and run on `node:22-alpine`. Node 26 is on the host but
the container pins 22 LTS to match the existing `workflow-board` stack.

A server runtime is not optional. TASK-009 requires that authorization be
enforced server-side, and the owner must be able to edit content without a
redeploy. Neither works from a static export.

**Supervision.** Docker Compose under `/opt/stacks/koreokorp/compose.yaml`,
following the conventions already proven by `/opt/stacks/workflow-board`:

```yaml
services:
  app:
    build:
      context: /home/korebear/Kkorp
    image: koreokorp-app:${KOREOKORP_RELEASE}
    container_name: koreokorp-app
    restart: unless-stopped
    init: true
    read_only: true
    env_file: /opt/stacks/koreokorp/app.env   # root-only, mode 600
    tmpfs: [/tmp]
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    mem_limit: 512m
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    networks: [edge]

networks:
  edge:
    external: true
```

No published host port. NPM reaches it as `koreokorp-app:3000` over `edge`,
exactly as it reaches `workflow-board:8080`. Docker is already enabled at boot.
512 MB is generous for this workload; the box has ~12 GB available.

`/api/health` reports the app's own liveness only. Dependency health is
reported separately at `/api/health?deep=1` so that a Supabase outage marks the
site degraded rather than restarting it.

**Reverse proxy route.** A new NPM proxy host for `staging.koreokorp.com`
created first, pointing at `koreokorp-app:3000`, with its own Let's Encrypt
certificate. Proxy host **9** keeps serving `koreokorp.com` from
`koreokorp-web` until the staging host has been verified. Cutover is then a
one-click forward-host change in Proxy Manager, after which `koreokorp-web` is
retained but idle for one release cycle as the fast rollback target.

NPM's generated `proxy_host` files are never hand-edited.

---

## 3. Content database, media, and backup

**Database.** Supabase Cloud Free, Postgres 17, 500 MB. Schema owned entirely
by KoreoKorp and named so it can be lifted out later: `koreokorp`. Tables:

| Table | Purpose | Task |
|---|---|---|
| `posts` | `slug` (unique), `title`, `excerpt`, `body_md`, `published`, `published_at`, timestamps | TASK-003, TASK-004 |
| `projects` | `slug`, `title`, `summary`, `body_md`, `sort_order`, `published` | TASK-012 |
| `project_media` | `project_id`, `storage_path`, `alt`, `width`, `height`, `sort_order` | TASK-013 |
| `sections` | single-row-per-key copy for About/Blog/Projects intros and CTAs | TASK-010 |
| `timeline_entries` | About timeline `year`, `label`, `body` | TASK-011 |
| `contact_links` | About contact list `label`, `href`, `icon`, `sort_order` | TASK-011 |
| `chat_messages` | Lobby messages; created only when DRAFT-006 is promoted | deferred |
| `bot_state` | bot cooldown counters | deferred, DRAFT-008 |

Row Level Security is enabled on every table. Published content is
`anon`-readable; everything else requires a Supabase session whose email
matches `ADMIN_EMAIL`. The anon key is public by design and safe **only**
because RLS is on — a table without RLS is a data leak, so new tables ship with
it enabled in the same migration that creates them.

**Media.** Supabase Storage, private bucket `project-media`, 1 GB on the Free
plan, 50 MB per upload. Images are served to the public through a Next.js route
handler that reads with the service role and streams with long cache headers,
so bucket paths are never exposed and the anon key cannot enumerate the bucket.
Only `image/webp`, `image/png`, `image/avif`, `image/svg+xml` and `image/jpeg`
are accepted, each validated by sniffing magic bytes rather than trusting the
declared MIME type or the file extension.

**Backup.** Supabase's Free plan has **no automatic backups**, so this is ours:

| What | How | Where | Retention |
|---|---|---|---|
| Database | `pg_dump -Fc` nightly | `/opt/stacks/koreokorp/backups/db/` | 14 daily, 8 weekly |
| Media | Storage sync to local dir nightly | `/opt/stacks/koreokorp/backups/media/` | 14 daily |
| App env | never backed up here | root-only, owner-held off-box copy | — |

Restore is documented in `docs/vps-deployment.md` and rehearsed once per
milestone. The database dump is the only thing standing between the owner and a
lost blog if the Supabase account is lost, so it is treated as required, not
optional.

**Keeping the Free project awake.** A Free Supabase project pauses after one
week of inactivity, which would take the *public* site down. A keep-alive ping
runs every three days via `cron` on the VPS against
`koreokorp-app/api/health?deep=1`, which touches the database and prevents the
pause. This is load-bearing, not optional: if the keep-alive stops, the public
site starts returning errors until Supabase resumes the project.

---

## 4. Authentication and authorization

**Authentication.** Supabase Auth, **email + password**. Magic link was
rejected for the first cut: it depends on transactional email, and the
Supabase-hosted SMTP service is rate-limited to a few messages per hour, which
makes sign-in unreliable exactly when you need it. Password auth needs no email
provider and no external account, and Supabase still does the hashing, session
rotation, and lockout work that must not be hand-rolled.

The password is the owner's only credential on this site, so it must be long and
unique. Custom SMTP can be added later without changing the auth model.

**Authorization.** Two layers, both server-side:

1. **RLS** in Postgres, keyed on `auth.jwt() ->> 'email' = ADMIN_EMAIL`.
   Enforced by the database, so it holds even if application code regresses.
2. **Server-side guards** on every mutating route and server action: verify the
   Supabase session, then compare the email to `ADMIN_EMAIL`. A mismatch
   returns **404, not 403** — a 403 confirms the admin area exists.

There is exactly one privileged account. There is no registration, no password
reset endpoint that accepts an arbitrary address, and no user table.

**Secrets.** All server-only, in `/opt/stacks/koreokorp/app.env`, mode 600,
owner-only:

```
SUPABASE_URL=                 # project URL, safe to also expose as NEXT_PUBLIC_*
SUPABASE_ANON_KEY=            # public by design; safe only because RLS is on
SUPABASE_SERVICE_ROLE_KEY=    # server-only, never sent to the browser, bypasses RLS
ADMIN_EMAIL=                  # the single privileged account
NEXT_PUBLIC_SITE_URL=https://koreokorp.com
OPENROUTER_API_KEY=           # deferred to DRAFT-008
OPENROUTER_MODEL=             # deferred to DRAFT-008
```

`SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY` are read only in server
modules and are asserted absent from the client bundle by a build-time check.
`NEXT_PUBLIC_*` values are inlined at build time and are treated as public.
`.env.example` is committed with every variable and a one-line comment; no real
value is ever committed.

---

## 5. Fallbacks and degraded behavior

The site must degrade rather than fail. A personal site that shows a 500
because a free-tier database is briefly unreachable is worse than one that
shows slightly stale content.

| Situation | Behavior |
|---|---|
| No env vars set (fresh clone) | Serves the prototype's local content files and scripted chat. `npm run dev` works offline. |
| Supabase unreachable at request time | Serve last-known-good published content from a build-time snapshot cache; log; expose `degraded: true`. Never a 500 on a public page. |
| Supabase unreachable at build time | Build succeeds using cached content. Deployment does not require the database to be up. |
| Supabase paused (keep-alive failed) | Same as unreachable. Public site keeps serving; `/admin` refuses with a clear message. |
| OpenRouter down or keyless | Canned bot lines only. Bots never block the chat. |
| Model call exceeds 10 s | Abort, fall back to a canned line. |
| Chat unavailable | Sign-on still works; the Lobby falls back to the scripted exchange so the panel is never dead. |

The last-known-good cache is written at build time and refreshed on successful
reads. It is a mitigation, not a source of truth: admin writes always go to
Postgres and a stale read never overwrites a newer one.

---

## 6. Data migrations

Migrations are plain SQL in `supabase/migrations/`, applied in filename order.
They are **written but not applied** by the agent; the owner applies them.

Rules:

- Every migration is additive and idempotent where practical (`create table if
  not exists`, `create policy if not exists`).
- Every new table enables RLS in the same statement block that creates it.
- Applying a migration twice must not fail or duplicate a policy.
- Destructive changes ship in two releases: stop writing, then drop.
- `supabase/migrations/` is applied with `supabase db push` or the SQL editor;
  the exact command the owner will use is confirmed at Stage 1.

`/api/health?deep=1` reports whether the expected tables exist, so a missing
migration is a visible warning rather than a stack trace in production.

---

## 7. Deployment and rollback

**Deploy** — extend the existing `deploy.sh` into a release script, still
publishing committed HEAD only:

```bash
cd /home/korebear/Kkorp
npm ci
npm run lint && npm run typecheck && npm test
git diff --check
sudo /opt/stacks/koreokorp/deploy.sh /home/korebear/Kkorp   # build + migrate + swap
curl --fail --silent --show-error --head https://staging.koreokorp.com
```

`deploy.sh` gains these steps, keeping its existing guarantees:

1. Refuse to proceed on uncommitted changes to the app source (as today).
2. Build image `koreokorp-app:<commit-sha12>`, tagged `current`.
3. Run migrations against the Supabase project.
4. Start the new container on `edge` under a **staging** compose project, wait
   for `/api/health`, then `nginx -t`-equivalent verification through NPM.
5. Record the previous image tag in `/opt/stacks/koreokorp/previous-release`.
6. Only then repoint proxy host 9 from `koreokorp-web` to `koreokorp-app`.

Steps are ordered so that any failure leaves the live site serving. The live
site is never down during a deploy; the switch is a proxy config change.

**Rollback.** Two levels, both exercised during Stage 1:

```bash
# Fast — restore the previous image, leave the proxy host alone
sudo bash -c 'docker tag "$(cat /opt/stacks/koreokorp/previous-release)" koreokorp-app:current'
sudo docker compose -f /opt/stacks/koreokorp/compose.yaml up -d

# Slow — restore the previous static release (target of record)
# existing symlink procedure in docs/vps-deployment.md, unchanged
```

Migrations are **not** rolled back automatically, so every migration is written
to be backward compatible with the previous release. A rollback that lands on
an older image against a newer schema is safe; the reverse is not.

---

## 8. Delivery stages

Each stage ends with the live site verified. No stage begins until the previous
one is verified in production.

| Stage | Work | Backlog tasks | Live site during stage |
|---|---|---|---|
| 0 | This architecture decision | TASK-002 | static, untouched |
| 1 | Scaffold the Next.js standalone container, serve on `staging.koreokorp.com`, port the prototype's markup/CSS/JS, verify deploy and rollback | new task | static, untouched |
| 2 | Supabase project, migrations, RLS, content read path with fallbacks | new task | static, untouched |
| 3 | Design audit | TASK-006 | static, runs on the prototype in parallel |
| 4 | Cut over `koreokorp.com` to `koreokorp-app`; keep `koreokorp-web` idle as rollback target | new task | **now served by the app** |
| 5 | Owner authentication and admin shell | TASK-009 | app |
| 6 | Public blog index and post pages | TASK-003 | app |
| 7 | Blog authoring | TASK-004 | app |
| 8 | Project collection, then rich previews | TASK-012, TASK-013 | app |
| 9 | Editable section copy; timeline and contact links | TASK-010, TASK-011 | app |
| 10 | Replace placeholder content with owner-approved material | TASK-005 | app |
| 11 | Alternate palettes, then selectable themes | TASK-007, TASK-008 | app |
| 12 | Responsive and navigation polish from the audit | TASK-014 | app |

Stages 1, 2, and 4 have no existing Backlog task and need one created; the
architecture is settled but the work is not yet tracked.

TASK-006 is deliberately placed at Stage 3, before any UI work in the app, so
the audit reviews the prototype rather than a half-ported app and its findings
reach the port.

**Out of scope until promoted from drafts:** shared Lobby messages (DRAFT-006),
presence and typing (DRAFT-007), bot replies (DRAFT-008). The architecture
provisions the tables, the service role, and Realtime so promotion is
configuration rather than redesign.

**TASK-015 is not in this plan.** It is an undivided wishlist with no
acceptance criteria, it assumes Next.js plus Vercel, GSAP, React Three Fiber and
Framer Motion, and it conflicts with this document's performance and
single-file-CSS decisions. It needs splitting into scoped, testable tasks and
owner prioritization before it can be scheduled.

---

## 9. Open choices for owner approval

Nothing in this section has been provisioned. Each needs a decision before the
stage that depends on it.

| # | Choice | Recommendation | Blocking |
|---|---|---|---|
| 1 | Create the Supabase Free project | Yes; 2 free projects allowed, so reserve one for dev and one for production | Stage 2 |
| 2 | `staging.koreokorp.com` DNS A record to `173.230.140.70` | Yes; needed for the TLS cutover rehearsal | Stage 1 |
| 3 | Bot model provider | OpenRouter free models, server-only, 10 s timeout, canned fallback. Unchanged from `docs/codex-prompt.md` | DRAFT-008 only |
| 4 | Custom SMTP for Supabase Auth | Not now. Password auth needs no email. Revisit if magic link is wanted | not blocking |
| 5 | Admin password and its off-box copy | Owner's call; the credential is the site's only privileged secret | Stage 5 |
| 6 | Whether `www.koreokorp.com` is configured | Separate draft-001, still open; an alias is trivial once the app is running | not blocking |
| 7 | Telegram/Discord/webhook notifications for deploy failures | Not now; read logs instead. Revisit if deploys become unattended | not blocking |

### Self-hosted alternative, for the record

If the owner later prefers no external account, the substitution is:

- **Database:** dedicated `postgres:17-alpine` container on `edge`, database
  `koreokorp`, owned by a `koreokorp` role. ~150 MB RAM. Do **not** reuse
  `shared_postgres`: it holds the FatCatCatalog CMS and Umami databases, and
  coupling the live site to that lifecycle is a worse risk than the RAM.
- **Auth:** Supabase Auth replaced by scrypt password hashing with a signed
  `HttpOnly; SameSite=Lax; Secure` session cookie, plus RLS dropped in favour of
  server-side authorization only. This is the main cost — session rotation,
  lockout and reset flows become code we own and must keep correct.
- **Media:** local volume mounted read-write into the app, or a separate
  `koreokorp-media` container served through Nginx.
- **Realtime:** Postgres `LISTEN`/`NOTIFY` with a Server-Sent Events endpoint.
  Suitable at this scale, but Presence semantics (join, leave, away, online
  count) become work we own, and `LISTEN`/`NOTIFY` payloads cap at 8000 bytes.

The trade is roughly: one external account to keep, in exchange for not owning
auth, Realtime, or a second database. Supabase Cloud Free was chosen because
auth is the worst thing to hand-roll and the box already runs twelve stacks.