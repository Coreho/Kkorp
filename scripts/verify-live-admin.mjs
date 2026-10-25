// Pass a private credential file path. Passwords and session tokens are never logged.
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const credentials = await readFile(process.argv[2], 'utf8');
const password = credentials.match(/^Password: (.+)$/m)?.[1];
if (!password) throw new Error('Credential file has no password.');
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const admin = 'https://adctrl.koreokorp.com';
try {
  await page.goto(admin);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Page text' })).toBeVisible();
  const tagline = await page.getByLabel('Tagline', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Save page text' }).click();
  await expect(page.getByRole('status')).toContainText('Your changes are live');
  await page.getByRole('button', { name: /^Blog entries/ }).click();
  await page.getByRole('button', { name: 'Add blog entry' }).click();
  const title = `Private deployment check ${Date.now()}`;
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Post text').fill('Temporary private draft to verify the deployed editor.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  const publicResponse = await context.request.get('https://koreokorp.com/api/content');
  expect(publicResponse.status()).toBe(200);
  const published = await publicResponse.json();
  expect(published.posts.some((post) => post.title === title)).toBe(false);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Entry deleted');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect((await context.request.get(`${admin}/api/admin/content`)).status()).toBe(401);
  await page.goto('https://koreokorp.com');
  await expect(page.locator('.landing-tag')).toHaveText(tagline);
  await page.getByRole('button', { name: 'Enter KoreoKorp' }).click();
  await page.locator('[data-i="1"]').click();
  await expect(page.locator('.post-list')).toBeEmpty();
  console.log('Live HTTPS login, page save, draft privacy, draft deletion, logout, and public integration verified.');
} finally {
  await context.close();
  await browser.close();
}
