import { describe, expect, it } from 'vitest';
import { LAUNCHERS, LAUNCHER_COPY, LAUNCHER_IDS } from '../src/core/launchers';
import { availability } from '../src/meta/launchbay';
import { defaultProfile } from '../src/meta/profile';
import { allKeys } from './i18n.test';

describe('launcher localization data', () => {
  it('collects every launcher copy field, including the saved M15 roster', () => {
    const keys = new Set(allKeys());
    for (const id of LAUNCHER_IDS) {
      for (const text of [LAUNCHERS[id].name, LAUNCHERS[id].job, ...Object.values(LAUNCHER_COPY[id])]) {
        expect(keys.has(text), `${id}: ${text}`).toBe(true);
      }
    }
  });

  it('keeps unlock copy identical to the existing earn channels', () => {
    const p = defaultProfile();
    for (const id of LAUNCHER_IDS.filter((id) => id !== 'sling')) {
      const status = availability(p, id);
      expect(status.kind).toBe('waiting-channel');
      if (status.kind === 'waiting-channel') expect(status.label).toBe(LAUNCHER_COPY[id].unlockStep);
    }
  });
});
