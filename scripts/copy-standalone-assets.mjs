/**
 * Copy the static assets Next.js leaves outside the standalone bundle.
 *
 * `output: 'standalone'` emits only the server and its traced node_modules. The
 * hashed client bundles under `.next/static` and anything in `public/` are not
 * included, so the standalone server serves a page with no CSS or JS until they
 * are copied in. The container image and the local test run both need this.
 */
import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('..', import.meta.url);
const standalone = new URL('.next/standalone/', root);

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(from, to) {
  if (await exists(from)) {
    await cp(from, to, { recursive: true });
    return true;
  }
  return false;
}

const staticCopied = await copyDir(
  new URL('.next/static', root),
  new URL('.next/static', standalone),
);
// The repository has no public/ directory yet; copy it only if one appears.
const publicCopied = await copyDir(
  new URL('public', root),
  new URL('public', standalone),
);

if (!staticCopied) {
  console.error('No .next/static directory found. Run next build first.');
  process.exit(1);
}

console.log(
  `Copied standalone assets: static=yes public=${publicCopied ? 'yes' : 'absent'}`,
);