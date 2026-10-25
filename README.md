# Kkorp

_Last updated: 2026-10-25_

KoreoKorp V2 is the Next.js application at **https://koreokorp.com**: an
editorial carousel, hand-written canvas engines (the jelly swarm, dot fields
and panel scenes), a blog, projects, and a scripted retro chat room. Page
text, projects and blog entries are edited by the owner in a password-protected
editor at **https://adctrl.koreokorp.com**, served by a separate content
service. The original single-file prototype in
`mockups/koreokorp-v2/index.html` is retained as the visual and behavioural
reference, not as a deployable site.

## Local development

```powershell
npm ci
npm run install:browsers
```

**Application.** `npm run dev:app` serves the Next.js app at
`http://127.0.0.1:4180`. It fetches published content from `/api/content`;
locally nothing answers that route, so the app shows its bundled default copy.
In production the proxy routes `/api/content` and `/uploads/` to the content
service.

**Editor and content service.** `npm run dev` starts the Node server in
`scripts/serve.mjs` at `http://127.0.0.1:4173`. It serves the prototype at `/`,
the editor at `/admin`, the public content API at `/api/content`, and uploaded
images at `/uploads/`. Run `npm run admin:password` once to set the owner
password, restart the server, then sign in at `/admin`. Content, the password
hash and uploads are stored in `data/` (ignored by Git). See
[the admin guide](docs/admin-panel.md) for editing, sessions and limits.
The server also answers `GET /api/health`, and `npm run health:check` checks
the live site, the content API and the editor; a scheduled workflow runs it
every ten minutes (see [monitoring](docs/monitoring.md)).

**Blog entries.** Each published entry has its own page at `/blog/<slug>`,
linked from the Blog slide; "All entries" returns to `/#blog`. The address
comes from the title the first time an entry is saved and stays fixed once it
is published, so renaming a published entry keeps its link. Drafts and unknown
addresses show "Entry not found". Bodies are Markdown: paragraphs (single line
breaks are kept), `##` headings, bold, italic, `code`, links, bulleted and
numbered lists, quotes, fenced code and rules. Raw HTML is shown as text, and
links keep only http(s), mailto and same-site addresses. The reader is
`lib/markdown.ts` rather than a library, because the client JavaScript budget
has no room for one; nested lists, tables and inline images are not supported.
The budget test in `tests/app/tactile.spec.js` caps the home page at 620 KiB
(every emitted chunk except those only entry pages load) and an entry page's
own chunks at 15 KiB. Entry pages read the same `/api/content` as the carousel in the
browser, so a missing entry shows its not-found page with status 200 and
`noindex`; only malformed addresses return a real 404.

**Control service image.** Production runs the same server as the
`koreokorp-control` container:

```powershell
docker build -f deploy/Dockerfile.control -t koreokorp-control:local .
```

[`deploy/compose-control.yaml`](deploy/compose-control.yaml) is the Compose file
used on the VPS. It mounts persistent content at `/data` and joins the private
proxy network without publishing a host port.

## Quality checks

CI runs on every pull request and push to `main`. All of these checks must
pass before merging:

- Repository checks and the prototype/editor browser suite (`npm test`, which
  runs `npm run check` followed by `playwright test`).
- ESLint (`npm run lint`) and TypeScript (`npm run typecheck`).
- The production application build (`npm run build`) and the full application
  browser suite (`CI=1 npm run test:app`), including the 620 KiB client
  JavaScript ceiling.
- Both Docker image builds, without pushing: `docker build -t
  koreokorp-app:ci-local .` and `docker build -f deploy/Dockerfile.control -t
  koreokorp-control:ci-local .`, each using the repository root as its context.

The prototype/editor, lint/typecheck, application and Docker build jobs run independently.
Failed browser suites upload `test-results/` and `playwright-report/` under
distinct artifact names, retained for seven days.

```powershell
npm run check          # Validate required files and markup invariants
npm test               # Repository checks, prototype smoke tests and editor tests
npm run lint           # ESLint across the repository
npm run typecheck      # tsc --noEmit
npm run build          # Next.js production build
npm run test:app       # Playwright suite against the built application
npm run test:e2e       # Run only the prototype and editor browser tests
npm run test:e2e:ui    # Open Playwright's interactive test runner
```

## Deployment

The deployable application is built with `npm run build` and shipped as the
immutable `koreokorp-app:<sha12>` Docker image. Production and staging run the
same codebase as separate containers (`koreokorp-prod` and `koreokorp-app`);
see [deployment notes](docs/vps-deployment.md) for the deploy, promote and
rollback procedure, and
[production architecture](docs/production-architecture.md) for the decision
record.

The editor runs as `koreokorp-control` behind the same Nginx Proxy Manager,
with content on persistent disk at `/var/lib/koreokorp-content`.
[The admin deployment record](docs/admin-deployment.md) covers its proxy
routes, password reset, backups and rollback. The Caddy and systemd files in
`deploy/` are alternatives for a fresh VPS, not the live configuration.

Editor content is backed up daily on the VPS and copied to the owner's
computer by a scheduled task; see
[content backups](docs/admin-deployment.md#content-backups) for checking and
restoring. `www.koreokorp.com` redirects to `https://koreokorp.com`.

## Task management

Backlog.md is pinned as a development dependency and installed by `npm ci`.
Its configuration is `backlog.config.yml`; tasks and drafts live in
`kkorp/backlog.md/`.

```bash
npm run backlog -- task list --plain
npm run backlog:board
npm run backlog:browser
npm run backlog:check
```

The browser interface listens on `127.0.0.1:6420` on the VPS. To use it from
your computer, leave `npm run backlog:browser` running on the VPS and open an
SSH tunnel from your computer:

```bash
ssh -N -L 6420:127.0.0.1:6420 -p 47823 korebear@64.177.54.33
```

Then open `http://127.0.0.1:6420` on your computer.

Read the [Backlog workflow](docs/backlog-workflow.md) before creating or completing
tasks. Future feature proposals start as drafts; promoting a draft makes it part
of the active backlog. Task edits are committed manually with related changes.
