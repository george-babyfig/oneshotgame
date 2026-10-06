import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { emptyRoundLog } from '../src/meta/help';
import { helpedLine } from '../src/meta/helped';

describe('one Homeworld helped line', () => {
  const p = defaultProfile();
  it('shows the first guard contribution before a form or power', () => {
    const log = emptyRoundLog();
    log.lab = [
      { type: 'power', kind: 'rock', level: 2, sector: 0 },
      { type: 'form', kind: 'rock', form: 'pebbleShower', sector: 0, changed: 1 },
      { type: 'guard', kind: 'rock', perk: 'firewall', trouble: 'vent', sector: 1, how: 'blocked' },
    ];
    expect(helpedLine(p, log, 'campaign')).toContain('Firewall');
  });
  it('stays silent in competitive modes', () => {
    const log = emptyRoundLog();
    log.lab = [{ type: 'power', kind: 'seed', level: 2, sector: 0 }];
    for (const mode of ['daily', 'rush', 'challenge', 'remix'] as const) expect(helpedLine(p, log, mode)).toBeNull();
  });
  it('credits only a Buddy shield or Calm delay, not a wild creature', () => {
    const log = emptyRoundLog();
    log.troubles = [{ id: 'vent', kind: 'blocked', sector: 3, by: 'fireproof' }];
    expect(helpedLine(p, log, 'campaign')).toBeNull();
    log.troubles[0].buddy = true;
    expect(helpedLine(p, log, 'campaign')).toContain('Buddy');
    log.troubles = [{ id: 'vine', kind: 'blocked', sector: 2, by: 'calm', buddy: true }];
    expect(helpedLine(p, log, 'campaign')).toContain('Buddy');
  });
});
