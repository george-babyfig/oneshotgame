import { vi } from 'vitest';

// Test-only shadow switch. Shipped modules never inspect RULES_PLAY.
vi.mock('../../src/core/rules-version', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/rules-version')>();
  return { ...actual, RULES_VERSION: 2 };
});
