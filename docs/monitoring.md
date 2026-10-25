# Live site monitoring

Run `npm run health:check` with Node 24. No dependency installation is needed
when running `node scripts/check-live-health.mjs` directly. It prints five lines
and exits 1 if any check fails (0 if all pass). Each GET has a five-second
timeout, including body reads; redirects fail rather than hiding a routing error.

| Check | Meaning |
| --- | --- |
| public site | `/` returns HTTP 200 with HTML. |
| public app health | Public `/api/health` returns HTTP 200 JSON with `ok: true`; app process liveness only. |
| public content | `/api/content` returns HTTP 200 JSON with a pages object and projects/posts arrays. `live` means the content API is reachable; `FALLBACK (visitors see bundled default copy)` means the API contract failed. |
| control health | Admin `/api/health` returns HTTP 200 JSON with `ok: true`; storage probe passes. |
| editor | Admin `/` returns HTTP 200; this does not test authenticated editing. |

Public `/api/health` deliberately remains independent of storage and databases.
The proxy sends only public `/api/content` and `/uploads/` to control. Content
checks cannot prove freshness, detect missing individual uploads, or distinguish
a fresh empty store's initial copy from previously published content. A missing
`content.json` is allowed; a missing content directory is unhealthy.

Override origins for local or staging checks, for example in PowerShell:

```powershell
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:4173'
$env:ADMIN_ORIGIN = 'http://127.0.0.1:4173'
npm run health:check
```

## Control health and restart

Unauthenticated `GET /api/health` accepts any Host, including Docker's loopback
request. It returns exactly `{ "ok": true, "service": "koreokorp-control" }`
with 200, or the same fields with `ok: false` and 503. All responses use
`Cache-Control: no-store`; no paths, content, settings or error details are exposed.
Other routes retain their host and authentication checks.

HTTP health requests share one in-flight storage probe and reuse its result
(success or failure) for `HEALTH_CACHE_MS` milliseconds after completion
(default 5000). This limits disk writes and content JSON parsing under repeated
requests. The setting uses the same positive-integer validation as the restart
settings below; invalid values use the default. HTTP results can therefore lag
storage changes by up to the cache window, despite the response's `no-store`
header. Timed self-checks always run a fresh probe, bypassing this HTTP cache.

The probe exclusively creates a randomly named private file in `CONTENT_DIR`,
reads and compares its contents, and removes it. Existing `content.json` must
be readable and parse as JSON. Failure to remove the probe also fails health.
The probe never creates the content directory or repairs stored content.

Compose checks every 30 seconds, with a 5-second timeout, 3 retries and a
15-second startup grace period, using Node fetch inside the container.
Docker does not restart a merely unhealthy container. A separate single,
unreferenced service timer runs the same storage probe every 60 seconds after
the previous probe completes. Three consecutive failures cause exit code 1;
`restart: unless-stopped` then restarts the service. Success resets the count.
HTTP probes do not affect this count. Shutdown clears both the health timer
and existing session cleanup timer and closes connections.

`HEALTH_CHECK_INTERVAL_MS` (default 60000) and
`HEALTH_CHECK_FAILURE_THRESHOLD` (default 3) accept positive integers up to
2147483647; invalid values use defaults. Small intervals are for tests only.
Persistent disk/permission/corrupt-JSON problems need operator repair and may
cause restart loops. Restarts invalidate editor sessions. Hung filesystem calls
or a blocked event loop can leave Docker unhealthy without triggering this
storage-failure counter; external monitoring remains necessary.

Deploy a newly built control image containing these changes and the updated
Compose file together; applying the healthcheck to the old image will fail.
The repository's existing image tag is unchanged. Nothing here deploys itself.

## External alerts

`.github/workflows/monitor.yml` runs every ten minutes (minutes 7, 17, 27, 37,
47 and 57 UTC) and supports **Run workflow**. It uses Node 24 without npm install,
a two-minute job limit, and cancels overlapping runs. Scheduled runs use only
the default branch, so alerting starts after merge there.

Enable failed-workflow email in GitHub notification settings and verify delivery
with a manual run. Scheduled workflow notifications go to the creator, or the
person who last changed the cron schedule; re-enabling a disabled workflow can
change the recipient to the person who re-enabled it. The repository owner
must be that recipient and have email notifications enabled; ownership alone
does not guarantee delivery. See [GitHub workflow notifications](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs).

GitHub may delay or drop scheduled runs under load. Public repositories have
scheduled workflows disabled after 60 days without repository activity; check
the Actions tab and re-enable when needed. A ten-minute cadence targets detection
within 15 minutes but does **not guarantee** that deadline or email delivery.
See [scheduled event limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## First response

Read the failed check's output in GitHub Actions, then on the server inspect:

```sh
docker ps
docker logs koreokorp-control
docker compose -f /opt/stacks/koreokorp/compose-control.yaml up -d
```

Use `docker ps -a` if control is absent from the running list. Check disk space,
the data mount and its ownership/permissions when storage is unhealthy; preserve
the content and backups. `up -d` starts missing containers but does not repair
storage or necessarily restart an unchanged unhealthy container. Resolve the
underlying error first, then restart control if needed. If only app checks fail,
inspect `koreokorp-prod` and proxy logs as well. Rerun `npm run health:check` from
outside the server and confirm all five lines pass.
