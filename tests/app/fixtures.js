import { expect, test as base } from '@playwright/test';
import { initialContent } from '../../mockups/koreokorp-v2/content-model.js';

/**
 * In production the proxy routes /api/content to the content service; the
 * standalone test server has no such route, so the request 404s and the browser
 * logs a console error. Tests that are not about content get the bundled
 * defaults instead. tests/app/content.spec.js routes the API itself and imports
 * @playwright/test directly, because a page route here would override its
 * context routes.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/content', (route) => route.fulfill({ json: initialContent() }));
    await use(page);
  },
});

export { expect };
