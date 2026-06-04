import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config — unit tests for pure logic across packages (no infra/keys needed).
 * Tests are colocated as `*.test.ts` and import their subject via relative paths.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    // Set a real encryption key for the secret-store crypto tests.
    env: {
      CREDENTIALS_ENCRYPTION_KEY: 'dGVzdC1rZXktMzItYnl0ZXMtZm9yLXZpdGVzdC11bml0cw==',
    },
  },
});
