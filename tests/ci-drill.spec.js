import { expect, test } from '@playwright/test';

// CI drill (TASK-024 AC#4): fails on purpose so the failure artifacts upload. Never merge.
test('ci drill: prototype failure uploads artifacts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('ci drill marker that does not exist')).toBeVisible({ timeout: 1000 });
});
