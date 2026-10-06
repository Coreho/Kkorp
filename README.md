# Kkorp

KoreoKorp V2 is the Next.js application at **https://koreokorp.com**: an
editorial carousel, hand-written canvas engines (the jelly swarm, dot fields
and panel scenes), a blog, projects, and a scripted retro chat room. The
original single-file prototype in `mockups/koreokorp-v2/index.html` is retained
as the visual and behavioural reference, not as a deployable site.

## Local development

```powershell
npm ci
npm run install:browsers
npm run dev:app
```

Open `http://127.0.0.1:4180`. `npm run dev` still serves the historical
prototype from `mockups/koreokorp-v2/index.html` at `http://127.0.0.1:4173`.

## Quality checks

```powershell
npm run check          # Validate required files and markup invariants
npm test               # Repository checks and the prototype smoke tests
npm run lint           # ESLint across the repository
npm run typecheck      # tsc --noEmit
npm run build          # Next.js production build
npm run test:app       # Playwright suite against the built application
npm run test:e2e       # Run only the prototype browser tests
npm run test:e2e:ui    # Open Playwright's interactive test runner
```

The deployable application is built with `npm run build` and shipped as the
immutable `koreokorp-app:<sha12>` Docker image. Production and staging run the
same codebase as separate containers (`koreokorp-prod` and `koreokorp-app`);
see [deployment notes](docs/vps-deployment.md) for the deploy, promote and
rollback procedure, and
[production architecture](docs/production-architecture.md) for the decision
record.

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
ssh -N -L 6420:127.0.0.1:6420 -p 47823 korebear@173.230.140.70
```

Then open `http://127.0.0.1:6420` on your computer.

Read the [Backlog workflow](docs/backlog-workflow.md) before creating or completing
tasks. Future feature proposals start as drafts; promoting a draft makes it part
of the active backlog. Task edits are committed manually with related changes.
