import { defineConfig } from 'vitest/config';

// `npm run sim` runs the slow difficulty simulation (tests/sim/difficulty.sim.ts) on its own.
export default defineConfig({
  test: {
    setupFiles: process.env.RULES_PLAY === '2' ? ['tests/setup/play-v2.ts'] : [],
    include: process.env.SIM ? ['tests/**/*.sim.ts'] : ['tests/**/*.test.ts'],
    testTimeout: process.env.SIM ? 900000 : 30000,
  },
});
