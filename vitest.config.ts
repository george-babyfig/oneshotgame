import { defineConfig } from 'vitest/config';

// `npm run sim` runs the slow difficulty simulation (tests/difficulty.sim.ts) on its own.
export default defineConfig({
  test: { include: process.env.SIM ? ['tests/**/*.sim.ts'] : ['tests/**/*.test.ts'], testTimeout: process.env.SIM ? 900000 : 5000 },
});
