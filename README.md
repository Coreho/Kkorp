# Kkorp

KoreoKorp V2 is a single-file, interactive website mockup with an editorial carousel, animated canvas scenes, and a scripted retro chat room.

## Local development

```powershell
npm ci
npm run install:browsers
npm run dev
```

Open `http://127.0.0.1:4173`. The development server maps `/` to `mockups/koreokorp-v2/index.html` and serves the rest of the repository for local assets.

## Quality checks

```powershell
npm run check          # Validate required files and markup invariants
npm test               # Run repository checks and Playwright smoke tests
npm run test:e2e       # Run only the browser tests
npm run test:e2e:ui    # Open Playwright's interactive test runner
```

There is no production build step. The deployable site is the static content in `mockups/koreokorp-v2/`. See `docs/codex-vps-deploy-prompt.md` for a copy-ready VPS deployment handoff.

The current site runs at **https://koreokorp.com** on the VPS. See
[deployment notes](docs/vps-deployment.md) for updates and rollback.

The planned replacement — an owner-editable application on this same VPS — is
specified in [production architecture](docs/production-architecture.md). It is
a decision record, not a description of anything running yet.

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
