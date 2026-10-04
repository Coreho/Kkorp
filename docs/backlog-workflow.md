# Backlog.md workflow

Run commands from the repository root. `npm ci` installs Backlog.md **1.53.0**;
use `npm run backlog -- <command>` to select the repository's pinned version.
The globally installed `backlog` command on this VPS is the same version.

Configuration lives in `backlog.config.yml`, and the chosen storage directory is
`kkorp/backlog.md/`. Commit configuration and task records alongside the work.
Automatic commits and automatic browser launching are disabled. Existing Git
branch discovery and remote-operation settings remain enabled.

## Workflow

1. Read `npm run backlog -- instructions overview` at the start of a conversation.
2. Search before creating work: `npm run backlog -- search 'topic' --plain`.
3. Read `instructions task-creation` before creating tasks. Use one outcome per
   task, repeat `--ac` for separate testable acceptance criteria, and include source
   references. Use drafts for proposals awaiting a decision.
4. Read `instructions task-execution` before starting. View the task, confirm its
   dependencies, assign it, move it to **In Progress**, and record the researched
   plan. **To Do** means accepted but not started.
5. Read `instructions task-finalization` before finishing. Verify criteria and
   Definition of Done with evidence, record the final summary, and move to **Done**.

Use the CLI for all task, draft, document, decision, and milestone changes; do not
edit their Markdown directly. Run `<command> --help` for unfamiliar commands.
Agent entry points in `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` link to the same
CLI workflow. `.claude/agents/project-manager-backlog.md` provides the optional
Claude project-management agent.

```bash
npm run backlog -- task list --plain
npm run backlog -- draft list --plain
npm run backlog -- task view TASK-001 --plain
npm run backlog -- draft promote <draft-id>
npm run backlog:board
npm run backlog:browser
npm run backlog:check
```

The browser is local to the VPS; the README gives the SSH tunnel command. No
public domain route is configured for the task-management interface.

## Project context

- The live site at https://koreokorp.com is the static prototype, served by Nginx
  behind the existing VPS Nginx Proxy Manager. See `docs/vps-deployment.md`.
- `mockups/koreokorp-v2/index.html` remains the visual and behavioral source of
  truth. Existing tests cover landing/carousel controls, scripted chat, and phone
  layout. Current commands are in `package.json`; there is no production build.
- `docs/codex-prompt.md` describes a future app, not the current implementation.
  Its Vercel assumption and open production-domain question predate the user's
  decision to host **koreokorp.com on this VPS**. Do not switch hosting based on
  that older prompt. Resolve remaining architecture choices before promotion of
  the production-app proposals.
- The initial drafts capture existing project gaps and planning notes. They are
  proposals, not authorization to connect external services, migrate the live
  site, or publish new content. Keep personal copy and bot personas as placeholders
  until the owner supplies them. No dates or owners are assigned to proposals.

The shared Definition of Done requires evidence for acceptance criteria, relevant
checks and regression coverage for new interactions, and current documentation.
Before committing implementation work, run `npm test` and `git diff --check`.
For task-only changes, also run `npm run backlog:check`.
