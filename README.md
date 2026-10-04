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
