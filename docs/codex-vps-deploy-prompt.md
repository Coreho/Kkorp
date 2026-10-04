# Codex prompt: deploy KoreoKorp on a VPS

Replace the placeholders, then paste the prompt below into Codex while connected to the VPS.

```text
You are operating on my VPS. Deploy the KoreoKorp static website from this repository and leave it running reliably.

Inputs:
- Repository: https://github.com/Coreho/Kkorp.git
- Branch: main
- Domain: <DOMAIN_OR_LEAVE_BLANK_FOR_IP_ONLY>
- Deployment root: /var/www/koreokorp

Important context:
- The deployable site is `mockups/koreokorp-v2/index.html`.
- This is currently a static mockup. Its chat is scripted and its content is sample data; do not claim that it has a production backend.
- Node.js is needed for validation and Playwright tests, but no Node process is needed to serve the production site.

Work carefully and complete the deployment end to end:

1. Inspect the OS, CPU architecture, current user and sudo access, open ports, firewall, DNS resolution, and any existing Nginx, Apache, or Caddy configuration. Do not disable, overwrite, or delete unrelated services or sites. If another service owns ports 80/443, integrate safely or stop and explain the conflict.
2. Install only missing prerequisites using the operating system's supported package manager: Git, rsync, Nginx, Node.js 24, and npm. If a domain is provided and its A/AAAA records resolve to this VPS, also install the supported Certbot Nginx integration. Report unsupported distributions instead of guessing commands.
3. Clone the repository into `/opt/koreokorp-src`, or fetch and fast-forward it if it already exists. If the existing checkout has local changes, do not discard them; stop and report the exact conflict. Check out the requested branch and record the deployed commit SHA.
4. In the checkout, run `npm ci`, `npm run check`, and `npm test`. Install Playwright's Chromium dependencies with `npx playwright install --with-deps chromium` only if they are missing. Do not deploy if checks fail; diagnose the failure and report it.
5. Create a timestamped directory under `/var/www/koreokorp/releases/`, copy the contents of `mockups/koreokorp-v2/` into it with `rsync`, set ownership and read permissions appropriate for Nginx, then atomically point `/var/www/koreokorp/current` at the new release. Never run `rsync --delete` against the deployment root or any unresolved path.
6. Create a dedicated Nginx server block whose root is `/var/www/koreokorp/current`. Serve `index.html` at `/`, use `try_files $uri $uri/ =404`, enable gzip for text assets, add conservative cache headers for images and no-cache headers for HTML, and add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a sensible permissions policy. Preserve the external Google Fonts used by the page when choosing a content security policy.
7. If the domain is valid, enable HTTPS with Certbot and redirect HTTP to HTTPS. If no domain is supplied or DNS does not resolve here, serve HTTP on the public IP and clearly state that trusted TLS cannot be completed yet. Do not use a self-signed certificate as the final public setup.
8. Validate with `nginx -t` before reloading Nginx. Then verify the local origin and public URL with `curl`, checking the status code, content type, security headers, and that the page title is present. Confirm Nginx is enabled across reboots.
9. Leave a concise deployment report containing the URL, commit SHA, files changed outside the repository, test results, TLS status, and exact update/rollback commands. Keep at least the previous release for rollback. Do not expose secrets or paste private key material.

If a required value or privilege is genuinely unavailable, finish every safe preparatory step first, then ask one concise question describing the blocker.
```
