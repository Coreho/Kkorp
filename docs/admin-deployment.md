# Live admin deployment · 2026-10-24 UTC

Update: the public and staging app now use `koreokorp-app:7ff44e8a1f43`. Project cards show only their uploaded logo on the front and description on the back; the bundled KoreoKorp logo is the fallback. Tiles are capped at 280 × 220px and link directly to their configured project URL in a new tab. Desktop hover adds a glow, 4px lift, and 4.5% enlargement while revealing the description; keyboard focus also reveals the description. Phone taps activate the link immediately. Reduced-motion preferences disable movement. The preceding app images are retained for rollback. Historical details below describe the initial admin deployment.

- Admin: https://adctrl.koreokorp.com
- Public site: https://koreokorp.com
- Existing VPS: `64.177.54.33`, accessible through the owner's existing SSH configuration.
- Proxy: existing Nginx Proxy Manager container `npm`; retained other domains and `/miniatures/` downloads.
- TLS: Let's Encrypt certificate `npm-13`, registered in Proxy Manager for automatic renewal; admin proxy host ID 12.

## Running services

The `koreokorp-control` container runs the editor/API with a read-only root filesystem and writable persistent data at `/var/lib/koreokorp-content`. It joins the existing private Docker `edge` network and publishes no host ports. Its Compose file is `/opt/stacks/koreokorp/compose-control.yaml`. `PRIVATE_PROXY_NETWORK=1` explicitly permits binding inside that private network; do not use this setting with a publicly exposed Node port.

Public `/api/content` and `/uploads/` requests proxy to the content service. Admin APIs are blocked on the public site. The admin hostname serves the login/editor and uses host-only secure session cookies. The new proxy and content routes are also registered in Proxy Manager's database, so saving a host in its UI retains them.

The existing `koreokorp-app` staging and `koreokorp-prod` public containers now use `koreokorp-app:b54d31249674`. The previously live image `koreokorp-app:a0f696cb46b5` is retained. Production was switched using the existing promotion script after staging HTTPS checks passed. Next.js was updated from 16.3.8 to 16.4.3 to address the critical advisories reported by npm; the lockfile's development Zod dependency was also patched. The deployment lockfile's full npm audit reports zero vulnerabilities.

## Source and reproducibility

The deployment was first assembled outside the repository: the static editor in an older prototype checkout, and the Next.js content provider in a separate worktree, joined on the server by a patch. As of 2026-10-25 (TASK-020) all of it is committed on one branch based on `origin/main`: the editor (`mockups/koreokorp-v2/admin/`), the shared content model, the file store, authentication and password scripts in `scripts/`, the control service files in `deploy/`, and the React content provider (`lib/useContent.tsx`) with its tests. The patch is retired. The server copy at `/home/korebear/kkorp-admin-release-20261024` was compared file by file before the commit; it differs only by a trailing blank line in `.dockerignore` and an older `content-model.d.ts`.

The control service uses [Dockerfile.control](../deploy/Dockerfile.control), its matching ignore file, and [the Compose template](../deploy/compose-control.yaml). The public app keeps the existing multi-stage Next standalone Dockerfile. The public provider fetches only published data and retains fallback copy when the API is unavailable. Page text, posts, and project cards render through React without injecting HTML; the existing project flip interaction and canvas/chat engines remain intact.

## Credentials and password reset

The initial random password was saved in a private file on the owner's computer, outside both repositories. It was never printed to tool output or saved in source. The server holds only a salted scrypt hash in `/var/lib/koreokorp-content/admin-auth.json`. Sessions expire after eight hours or a service restart.

To reset from an interactive terminal:

```powershell
ssh -t 64.177.54.33 "docker exec -it koreokorp-control node scripts/admin-password.mjs && docker restart koreokorp-control"
```

This prompts privately for the new password and revokes existing sessions. Update the owner's private login note after a reset.

## Verification

- Primary repository: all 12 browser tests and repository checks pass, including auth, uploads, page edits, draft/published visibility, deletion, session expiry, restart persistence, host separation, secure cookies, CSRF, throttling, and 390px layout.
- Next candidate: content, carousel, chat, canvas, motion, keyboard, and responsive checks passed. The JavaScript size test initially exceeded the existing 620 KiB ceiling by 249 bytes; separating public defaults from admin field labels reduced the bundle and the original ceiling now passes. No ceiling was relaxed.
- Trusted staging HTTPS: navigation and chat tests pass.
- Live production: verified sign-in, page save, draft privacy, draft deletion, sign-out revocation, and public content rendering using `scripts/verify-live-admin.mjs`. No test entries were left published or saved.
- Editor review: all three requested finish fixes were scored resolved: minimum 44px targets, consistent SVG icons, and removal of the meaningless navigation badge.

## Backups and rollback

Private proxy/database backups and the original host settings are under `/opt/stacks/koreokorp/backups/admin-20261024`. Do not restore the entire proxy database casually: it also manages unrelated applications. The content directory needs regular secure backups of its JSON files and uploads together.

To roll back only the public application to the previously live image:

```sh
sudo env KOREOKORP_RELEASE=a0f696cb46b5 docker compose -f /opt/stacks/koreokorp/compose-prod.yaml up -d
```

The editor/data remain intact. To return to this release, use the same command with `b54d31249674`. For future releases, keep the source, image tag, and release markers consistent and retain the existing health-checked promotion workflow.

Blog content is plain text with paragraph breaks. The timeline currently has three editable entries, not an arbitrary collection. Project uploads are images and links, not executable bundles. Existing backlog items for Markdown slugs, richer media, ordering, and more general timeline/contact editing remain separate follow-up work.
