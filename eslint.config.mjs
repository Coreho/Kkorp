import next from 'eslint-config-next';

/**
 * Flat config for the application sources.
 *
 * `next lint` was removed in Next.js 16, so ESLint runs directly. The prototype
 * under mockups/ is a finished single-file artefact and is deliberately not
 * linted; it stays the rollback target, not a source file we maintain.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'mockups/**',
      'kkorp/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...next,
];

export default config;