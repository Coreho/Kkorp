import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { hashPassword } from './admin-auth.mjs';

// Password input is never echoed, printed, or saved in plaintext.
if (!process.stdin.isTTY) throw new Error('Run npm run admin:password in an interactive terminal.');
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
async function ask(label) {
  process.stdout.write(label);
  muted = true;
  const answer = await new Promise((done) => prompt.question('', done));
  muted = false;
  process.stdout.write('\n');
  return answer;
}
try {
  const password = await ask('New admin password (at least 14 characters): ');
  if (password.length < 14 || password.length > 1024) throw new Error('Use 14–1024 characters.');
  if (password !== await ask('Confirm password: ')) throw new Error('Passwords did not match.');
  const directory = resolve(process.env.CONTENT_DIR || 'data');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(directory, 'admin-auth.json'), JSON.stringify({ hash: await hashPassword(password) }), { mode: 0o600 });
  console.log('Admin password saved as a salted hash. Restart the server to apply it and revoke existing sessions.');
} finally {
  prompt.close();
}
