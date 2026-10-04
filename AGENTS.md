# Repository Guidelines

## Project Structure & Module Organization

This repository contains a self-contained prototype rather than a compiled application. The main implementation is `mockups/koreokorp-v2/index.html`, which includes the markup, styles, and browser JavaScript. Treat it as the visual and behavioral source of truth.

- `mockups/koreokorp-v2/README.md`: current feature inventory and known gaps.
- `assets/`: logo images and the JSON outline used by the jelly animation.
- `docs/design/`: design-system and layout references.
- `scripts/`: the local static server and repository checks.
- `tests/`: Playwright browser smoke tests.
- `docs/codex-prompt.md`: planned production architecture; it describes future Next.js work, not commands available today.

Keep new design notes in `docs/` and prototype-specific files under `mockups/koreokorp-v2/`. Do not commit generated output or local secrets.

## Build, Test, and Development Commands

Install dependencies with `npm ci`, then install Chromium once with `npm run install:browsers`. Key commands are:

```powershell
npm run dev           # Serve the mockup at http://127.0.0.1:4173
npm run check         # Validate files, panels, IDs, and script tags
npm test              # Run checks and Playwright browser tests
npm run test:e2e:ui   # Debug tests in Playwright's UI
```

There is no production build step. Before committing, run `npm test` and `git diff --check`.

## Coding Style & Naming Conventions

Follow the existing plain HTML, CSS, and JavaScript style: two-space indentation in script blocks, semicolons in JavaScript, single-quoted strings, and lowercase kebab-case CSS classes. Reuse the CSS custom properties in `:root` instead of duplicating colors, spacing, or typography. Keep animation code time-based and clean up any listeners or timers added by new components. Use accessible HTML, visible focus states, and `aria-*` attributes where state is communicated visually.

## Testing Guidelines

Playwright tests live in `tests/*.spec.js`. Name tests after user-visible behavior, use role-based locators when possible, and keep each test isolated. Cover landing entry/exit, all carousel panels, keyboard controls, chat sign-on and commands, and the 390px layout. New interactions should include a regression test. Failure traces, screenshots, and videos are written to ignored Playwright output directories.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Add ...`, `Switch ...`, and `Guard ...`. Keep each commit focused and explain user-visible behavior. Pull requests should include a concise summary, testing notes, linked issues when applicable, and before/after screenshots for visual changes at desktop and phone widths. Call out intentional differences from the mockup and any remaining TODOs.
