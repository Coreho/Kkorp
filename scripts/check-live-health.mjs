const publicOrigin = process.env.PUBLIC_ORIGIN || 'https://koreokorp.com';
const adminOrigin = process.env.ADMIN_ORIGIN || 'https://adctrl.koreokorp.com';

async function check(origin, path, validate, success, failure) {
  try {
    const response = await fetch(new URL(path, origin), {
      signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store',
    });
    const ok = response.status === 200 && await validate(response);
    if (!response.bodyUsed) await response.body?.cancel();
    if (!ok) throw new Error('Check failed');
    console.log(success);
  } catch {
    console.log(failure);
    process.exitCode = 1;
  }
}

const json = (response) => response.headers.get('content-type')?.split(';')[0].trim() === 'application/json';
const health = async (response) => json(response) && (await response.json())?.ok === true;
await check(publicOrigin, '/', async (response) =>
  response.headers.get('content-type')?.includes('text/html') && /<!doctype html|<html[\s>]/i.test(await response.text()),
'public site: OK', 'public site: FAIL');
await check(publicOrigin, '/api/health', health, 'public app health: OK', 'public app health: FAIL');
await check(publicOrigin, '/api/content', async (response) => {
  if (!json(response)) return false;
  const content = await response.json();
  return content?.pages !== null && typeof content?.pages === 'object' && !Array.isArray(content.pages)
    && Array.isArray(content.projects) && Array.isArray(content.posts);
}, 'public content: live', 'public content: FALLBACK (visitors see bundled default copy)');
await check(adminOrigin, '/api/health', health, 'control health: OK', 'control health: FAIL');
await check(adminOrigin, '/', async () => true, 'editor: OK', 'editor: FAIL');
