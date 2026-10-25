# Content control

The admin editor manages the current HTML site. It uses the Node server, not a static-only host. Production is configured for **https://adctrl.koreokorp.com**; the public site remains at **https://koreokorp.com**. The repository includes configuration, but that does not create DNS records or deploy a server.

The editor is now deployed on the existing server behind Nginx Proxy Manager, with a trusted Let's Encrypt certificate. The public Next.js version is connected to the same content store. See [the deployment record](admin-deployment.md) for the actual service paths and rollback. The Caddy/systemd examples below are alternatives for a fresh VPS, not the live proxy configuration.

## Local use

1. Run `npm ci`.
2. Run `npm run admin:password` in an interactive terminal. Enter and confirm a unique password of at least 14 characters. Input is hidden; only a salted scrypt hash is stored.
3. Run `npm run dev` and open `http://127.0.0.1:4173/admin`.
4. Sign in. Edit page text and choose **Save page text**, or create projects and blog entries. **Save draft** keeps an entry private; **Publish entry** makes it visible immediately. Dates label posts; they do not schedule publication. Published entries can be edited, unpublished, or deleted.

Projects support descriptions, external links, and image uploads. Blog entries support dates, introductions, Markdown bodies, and cover images. Each published entry has its own page at `/blog/<slug>`; the address comes from the title when the entry is first saved and stays fixed once it is published, and the editor shows it under the post text. The Markdown subset and its limits are listed in the README. Images need a description for screen readers. PNG, JPEG, WebP, and GIF images up to 5 MB are supported; SVG and executable files are rejected. Uploads are image assets, not executable project bundles.

Changes require an explicit save. Navigation warns before discarding unsaved work. A version check prevents two editors from silently overwriting each other; copy unsaved text before reloading after a conflict. Sessions expire after eight hours or a server restart. Losing a session keeps the open form available after signing in again.

## Hosting and encrypted login

The login sends credentials over HTTPS in production. Passwords are hashed, not reversibly encrypted. Sessions use random server-side tokens and host-only HttpOnly, Secure, SameSite=Strict cookies. The server rejects cross-origin write requests, throttles login attempts to five per IP per 15 minutes, checks entry fields server-side, and serves only approved public files. Draft bodies and the password hash are never returned by the public API. Admin editing APIs are available only on the admin host in production.

This is a single-owner editor, without user accounts, password recovery, MFA, or a rich-text/HTML editor. To reset the password, run the password command on the server and restart the service. This also revokes all sessions. Login rate limits and sessions are held in process memory; run one Node process. Put additional network-level protection in front of the service if needed for a larger deployment.

### VPS setup

For **Hostinger VPS**, use the VPS IP and SSH access shown in hPanel, then follow this setup. The included service and Caddy configuration are for a VPS, not Hostinger Website Builder. [Hostinger managed Node hosting](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) is also available on selected Business/Cloud plans, but uses a different deployment layout and process management. This repository's current production configuration targets a VPS. Do not upload it as a static site or place private content/password files in `public_html`. Confirm the actual plan and persistent storage before adapting it for managed hosting.

Use an existing reverse proxy if one already owns ports 80/443; do not install a competing listener. The provided files assume Linux with systemd, Node.js 24 or newer at `/usr/bin/node`, and Caddy. Verify paths for your server first.

1. Create or update DNS records for `koreokorp.com`, `www.koreokorp.com`, and `adctrl.koreokorp.com` to the VPS. Remove stale AAAA records if IPv6 is not configured. Allow inbound TCP ports 80/443. Keep port 4173 private.
2. Place this repository in `/opt/koreokorp`. Create an unprivileged `koreokorp` service user and an owned, private `/var/lib/koreokorp` directory. Install dependencies and run `npm test` before switching traffic.
3. As that service user, run `CONTENT_DIR=/var/lib/koreokorp npm run admin:password` from the checkout. Never put a plaintext password in a command argument, environment file, or commit.
4. Install [the service template](../deploy/koreokorp.service) as `/etc/systemd/system/koreokorp.service`. Run `systemctl daemon-reload` and `systemctl enable --now koreokorp`. The service refuses to start in production without configured credentials.
5. Merge [the Caddy blocks](../deploy/Caddyfile) into the server's existing Caddyfile, preserving other sites. Validate with `caddy validate --config /etc/caddy/Caddyfile`, then reload Caddy. Caddy's [automatic HTTPS](https://caddyserver.com/docs/automatic-https) requires working DNS and reachable ports. Its [reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) preserves the request host; the supplied config overwrites the client-IP header used for login throttling.
6. Verify that HTTP redirects to HTTPS, both certificates validate, `https://adctrl.koreokorp.com/` shows the sign-in page, and `https://koreokorp.com/admin` returns 404. An unauthenticated request to the admin host's `/api/admin/content` must return 401. Sign in, save a draft, publish it, and confirm the public site changes. Verify sign out revokes access. Do not send credentials until the HTTPS certificate validates.

For another proxy, preserve `Host`, overwrite `X-Forwarded-For` with the actual client IP, terminate trusted TLS, and restrict Node to loopback. `ADMIN_ORIGIN`, `PUBLIC_ORIGIN`, `HOST`, `PORT`, and `CONTENT_DIR` are configurable. `ADMIN_PASSWORD_HASH` can supply the same `salt:hexhash` format instead of the private credentials file, using an existing secret manager. Do not put the hash in the repository.

## Persistence, backups, and updates

The default data directory is `data/` (ignored by Git). Production uses `/var/lib/koreokorp` outside the release checkout:

- `admin-auth.json`: salted password hash; private.
- `content.json`: page text and all entries, including drafts; private.
- `uploads/`: image assets served through generated `/uploads/...` URLs.

Back up the complete data directory securely and regularly; production does this daily, see [content backups](admin-deployment.md#content-backups). Content writes use atomic replacement. Run only one instance against the directory; this is not a multi-server database. Keep data on persistent disk, never inside an ephemeral deployment image. A fresh directory starts with the existing page copy, two projects, and an empty blog. Existing mock blog posts were sample content, not published articles.

Deleting an entry or removing an image reference does not delete image files. This preserves images referenced by other entries; review unused uploads manually if storage grows. Uploaded URLs are public when known, even for draft images. Do not upload confidential material. Server-side validation caps each collection at 500 entries and the content request at 2 MB.

For updates, preserve the data directory, deploy the tested checkout, then restart `koreokorp`. For rollback, restore the previous code release and, if necessary, a compatible data backup. The original static-only VPS instructions are superseded by this guide because a running Node process is now required for editing and live content.
