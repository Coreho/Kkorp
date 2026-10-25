import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// deploy/backup-content.sh runs on the Linux VPS with GNU coreutils.
test.skip(process.platform === 'win32', 'needs GNU bash, date and stat');

let root;
let content;
let backups;

function backup(args = [], environment = {}) {
  return spawnSync('bash', ['deploy/backup-content.sh', ...args], {
    encoding: 'utf8',
    env: { ...process.env, CONTENT_DIR: content, BACKUP_DIR: backups, ...environment },
  });
}

test.beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kkorp-backup-'));
  content = join(root, 'content');
  backups = join(root, 'backups');
  await mkdir(join(content, 'uploads'), { recursive: true });
  await writeFile(join(content, 'admin-auth.json'), '{"hash":"salt:hash"}');
  await writeFile(join(content, 'uploads', 'a1.png'), 'image');
  await writeFile(join(content, 'content.json'), JSON.stringify({
    pages: {},
    posts: [],
    projects: [{ id: 'p', title: 'P', status: 'published', image: '/uploads/a1.png', imageAlt: 'Logo' }],
  }));
});

test.afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

test('a snapshot holds content, credentials and uploads, with a checksum and a weekly copy', async () => {
  const result = backup([], { BACKUP_STAMP: '20261025T031700Z' });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain('OK saved koreokorp-content-20261025T031700Z.tar.gz (1 uploads');

  const archive = join(backups, 'daily', 'koreokorp-content-20261025T031700Z.tar.gz');
  const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' }).stdout.split('\n');
  expect(listing).toEqual(expect.arrayContaining(['./content.json', './admin-auth.json', './uploads/a1.png']));
  expect(await readFile(join(backups, 'latest'), 'utf8')).toBe('koreokorp-content-20261025T031700Z.tar.gz\n');
  expect(spawnSync('sha256sum', ['-c', `${archive.split('/').pop()}.sha256`], { cwd: join(backups, 'daily') }).status).toBe(0);
  expect(await readdir(join(backups, 'weekly'))).toEqual([
    'koreokorp-content-weekly-2026-W43.tar.gz',
    'koreokorp-content-weekly-2026-W43.tar.gz.sha256',
  ]);
  expect(backup(['--check']).status).toBe(0);
});

test('a snapshot that references a missing upload is refused, not saved', async () => {
  await rm(join(content, 'uploads', 'a1.png'));
  const result = backup();
  expect(result.status).toBe(1);
  expect(result.stdout).toContain('is inconsistent; nothing was saved');
  expect(await readdir(join(backups, 'daily'))).toEqual([]);
});

test('the check fails when there is no backup or the newest one is stale', async () => {
  expect(backup(['--check']).status).toBe(1);
  expect(backup([], { BACKUP_STAMP: '20261025T031700Z' }).status).toBe(0);
  const old = new Date(Date.now() - 30 * 3600 * 1000);
  await utimes(join(backups, 'daily', 'koreokorp-content-20261025T031700Z.tar.gz'), old, old);
  const stale = backup(['--check']);
  expect(stale.status).toBe(1);
  expect(stale.stdout).toContain('FAIL newest backup koreokorp-content-20261025T031700Z.tar.gz is 30h old');
});

test('old daily snapshots are pruned with their checksums', async () => {
  for (const day of ['21', '22', '23']) {
    expect(backup([], { BACKUP_STAMP: `202610${day}T031700Z`, KEEP_DAILY: '2' }).status).toBe(0);
  }
  expect((await readdir(join(backups, 'daily'))).sort()).toEqual([
    'koreokorp-content-20261022T031700Z.tar.gz',
    'koreokorp-content-20261022T031700Z.tar.gz.sha256',
    'koreokorp-content-20261023T031700Z.tar.gz',
    'koreokorp-content-20261023T031700Z.tar.gz.sha256',
  ]);
});
