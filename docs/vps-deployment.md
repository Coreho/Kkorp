# KoreoKorp VPS deployment

## Canonical environments

KoreoKorp has one Next.js codebase and exactly two active environments:

| Environment | URL | Container | Proxy Manager host | Purpose |
|---|---|---|---|---|
| Production | `https://koreokorp.com` | `koreokorp-prod` | 9 → `koreokorp-prod:3000` | Last approved image |
| Staging | `https://staging.koreokorp.com` | `koreokorp-app` | 10 → `koreokorp-app:3000` | Candidate image |

Both containers use immutable `koreokorp-app:<commit-sha12>` images on the
external Docker network `edge`. Production and staging never share a process;
promoting an image creates or replaces only `koreokorp-prod`.

The static prototype is retired. It is retained only as the root-only disaster
archive `/opt/stacks/koreokorp/backups/retired-static-site-20261006T124120Z.tar.gz`
(SHA-256 `678f88be95a476ed47dc8279333759c1652474099d4a44660464379284c11e17`).
It is not an active environment or deployment source.

## Current release

The current production release is image `koreokorp-app:a0f696cb46b5`, revision
`a0f696cb46b5df6247135f3f87c09b20cf5cf262`, promoted on 2026-10-06. It keeps
the jelly swarm animating regardless of `prefers-reduced-motion` per the
owner's decision; the CSS decoration (orbit ring, breathing tagline, panel
pulse, flip cards) and pointer tactility still collapse under the preference.
It also carries the visible animation pass. Before promotion it passed the
repository suite, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, the full application suite (30 passed, 2 staging-only tests
skipped), and the staging TLS suite. After promotion the production TLS suite
passed, and a frame probe confirmed the canvas animates under both settings
(12/12, 12/12 and 14/14 distinct frames on landing, entering and navigation)
while the CSS reduced-motion rules stayed applied and zero console errors were
logged.

The previous production image, `koreokorp-app:1989492169c5`, is recorded in
`previous-release-prod`. Proxy host 9 targets `koreokorp-prod:3000`. The
retired static container is still running but unrouted as a hot fallback; the
archive above remains the documented disaster source.

## Host files

| Path | Purpose |
|---|---|
| `/opt/stacks/koreokorp/compose-app.yaml` | Staging service definition |
| `/opt/stacks/koreokorp/compose-prod.yaml` | Production service definition |
| `/opt/stacks/koreokorp/deploy-app.sh` | Builds and deploys a committed candidate to staging |
| `/opt/stacks/koreokorp/promote-prod.sh` | Promotes the exact healthy staging image to production |
| `/opt/stacks/koreokorp/previous-release-app` | Previous staging image tag |
| `/opt/stacks/koreokorp/current-release-prod` | Current production image tag |
| `/opt/stacks/koreokorp/previous-release-prod` | Previous production image tag, once one exists |
| `/opt/stacks/koreokorp/backups/` | Root-only proxy and retired-static backups |

Both Compose services run read-only as uid 1001, drop all capabilities, use a
512 MB memory limit, mount only `/tmp` as tmpfs, restart unless stopped, and
must pass `/api/health`.

## Deploy a candidate to staging

Only committed source may be deployed:

```bash
cd /home/korebear/Kkorp
npm run lint
npm run typecheck
npm test
npm run build
CI=1 npm run test:app
git diff --check
sudo /opt/stacks/koreokorp/deploy-app.sh /home/korebear/Kkorp
CI=1 KOREOKORP_STAGING=1 npm run test:app -- tests/app/staging-tls.spec.js
```

This changes `koreokorp-app` only. Production remains on its existing image.

## Promote staging to production

Read the staging image tag, then promote that exact tag:

```bash
candidate=$(docker inspect --format '{{.Config.Image}}' koreokorp-app)
candidate=${candidate#koreokorp-app:}
sudo /opt/stacks/koreokorp/promote-prod.sh "$candidate"
```

The promotion script refuses an image that is not currently healthy on
staging. Before replacing production it records the old production tag in
`previous-release-prod`, waits for the new production container to become
healthy, and verifies the public health endpoint.

Proxy host 9 normally does not change during promotion. It permanently targets
`koreokorp-prod:3000`; only the immutable image behind that container changes.

## Roll back production

When `previous-release-prod` exists:

```bash
previous=$(cat /opt/stacks/koreokorp/previous-release-prod)
sudo env KOREOKORP_RELEASE="$previous" \
  docker compose -f /opt/stacks/koreokorp/compose-prod.yaml up -d
curl --fail --silent --show-error https://koreokorp.com/api/health
```

After verification, update `current-release-prod` to the restored tag. Database
migrations must remain backward compatible; the deployment process never rolls
them back automatically.

For a disaster requiring the retired static implementation, extract the
root-only archive back to `/`, start its archived Compose file, and change
Proxy Manager host 9 to `koreokorp-web:80` through the Proxy Manager API or UI.
That is a disaster rollback, not a third maintained environment.

## Verification

```bash
docker inspect --format '{{.State.Health.Status}} {{.Config.Image}}' koreokorp-prod
docker inspect --format '{{.State.Health.Status}} {{.Config.Image}}' koreokorp-app
curl --fail --silent --show-error https://koreokorp.com/api/health
curl --fail --silent --show-error https://staging.koreokorp.com/api/health
curl --head http://koreokorp.com
curl --head https://koreokorp.com
```

Required public headers are `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, and HSTS. Nginx Proxy Manager owns both certificates and
the HTTP-to-HTTPS redirects.

The browser TLS tests can target either environment:

```bash
# Staging
CI=1 KOREOKORP_STAGING=1 npm run test:app -- tests/app/staging-tls.spec.js

# Production
CI=1 KOREOKORP_STAGING=1 \
  KOREOKORP_STAGING_BASE=https://koreokorp.com \
  npm run test:app -- tests/app/staging-tls.spec.js
```

## Operational notes

- Manage proxy hosts through the Nginx Proxy Manager API or UI. Never hand-edit
  generated files under `/opt/stacks/npm/data/nginx/proxy_host/`.
- Docker is enabled at boot and both services use `restart: unless-stopped`.
- `/api/health` is liveness-only and does not restart-loop the site during an
  external dependency outage.
- `mockups/koreokorp-v2/index.html` is historical prototype/reference material,
  not a deployable production version.
