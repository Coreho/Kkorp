# KoreoKorp application image.
#
# Multi-stage so the runtime layer carries only the standalone server and the
# node_modules Next.js traced for it. Node 22 LTS is pinned to match the existing
# workflow-board stack on this host, rather than tracking the host's Node 26.
ARG GIT_REVISION=unknown

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` installs exactly the lockfile, including devDependencies, which the
# build needs for TypeScript.
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build must succeed with no environment variables set: the site falls back
# to local content files and the scripted chat, so a fresh clone works offline.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standard OCI labels. The revision label is what makes a deployed image
# traceable back to a commit, and what the deploy script records as the
# rollback target.
ARG GIT_REVISION
LABEL org.opencontainers.image.title="KoreoKorp" \
      org.opencontainers.image.revision="${GIT_REVISION}"

# Run unprivileged. The node image already provides a `node` user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `output: 'standalone'` emits a self-contained server plus a traced
# node_modules. The build script copies .next/static alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# A public/ directory is copied only when present; the repository has none yet.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Liveness only. It must not touch Postgres or any other dependency, or a
# database outage would restart-loop a container that is otherwise healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]