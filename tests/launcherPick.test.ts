import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/core/levels';
import { goodHere, needsSlingGhost, resolveLauncher } from '../src/meta/launcherPick';
import { helpedLine, launcherActuallyHelped } from '../src/meta/helped';
import { emptyRoundLog } from '../src/meta/help';
import { defaultProfile } from '../src/meta/profile';

const level = (twist: LevelDef['twist'], obstacle: LevelDef['sky']['obstacle'] = null): Pick<LevelDef, 'twist' | 'sky'> =>
  ({ twist, sky: { obstacle } }) as Pick<LevelDef, 'twist' | 'sky'>;

describe('fixed launcher choice advice', () => {
  it('uses the named table without consulting a generated level solution', () => {
    expect(goodHere('swoop', level('moon'))).toBe(true);
    expect(goodHere('swoop', level('twin'))).toBe(true);
    expect(goodHere('swoop', level('bubble', 'bubble'))).toBe(false);
    for (const twist of ['fast', 'wobble', 'wind'] as const) expect(goodHere('zip', level(twist))).toBe(true);
    expect(goodHere('zip', level('none', 'mist'))).toBe(true);
    expect(goodHere('thumper', level('none', 'rocks'))).toBe(true);
    expect(goodHere('thumper', level('none', 'ring'))).toBe(true);
    expect(goodHere('pinpoint', level('tiny'))).toBe(false);
    expect(goodHere('skipper', level('none', 'bubble'))).toBe(false);
    expect(goodHere('sparkler', level('tiny'))).toBe(false);
    expect(goodHere('sling', level('moon'))).toBe(false);
  });

  it('keeps a saved choice only when the round allows and owns it', () => {
    const tune = () => 3 as const;
    const owned = ['sling', 'zip'] as const;
    expect(resolveLauncher('campaign', 31, 'zip', owned, tune)).toEqual({ id: 'zip', tune: 3 });
    expect(resolveLauncher('campaign', 30, 'zip', owned, tune)).toEqual({ id: 'sling', tune: 1 });
    expect(resolveLauncher('campaign', 43, 'swoop', owned, tune)).toEqual({ id: 'sling', tune: 1 });
    expect(resolveLauncher('campaign', 70, 'sparkler', ['sling', 'sparkler'], tune)).toEqual({ id: 'sling', tune: 1 });
    for (const mode of ['daily', 'rush', 'challenge', 'remix'] as const)
      expect(resolveLauncher(mode, 62, 'zip', owned, tune)).toEqual({ id: 'sling', tune: 1 });
  });

  it('shows the comparison for exactly three completed real rounds', () => {
    expect([0, 1, 2, 3, 4].map((n) => needsSlingGhost('swoop', n))).toEqual([true, true, true, false, false]);
    expect(needsSlingGhost('sling', 0)).toBe(false);
  });
});

describe('launcher result credit', () => {
  it('requires an observed benefit', () => {
    const equal = { before: 12, after: 14, lost: [], novaGain: 1 };
    expect(launcherActuallyHelped(equal, { after: 14, lost: [], novaGain: 1 }, 5)).toBe(false);
    expect(launcherActuallyHelped(equal, { after: 14, lost: [], novaGain: 1 }, null)).toBe(true);
    expect(launcherActuallyHelped(equal, { after: 13, lost: [], novaGain: 1 }, 5)).toBe(true);
    expect(launcherActuallyHelped(equal, { after: 14, lost: ['creature'], novaGain: 1 }, 5)).toBe(true);
  });
  it('names the observed launcher contribution', () => {
    const log = emptyRoundLog();
    const credited = log as typeof log & { launcher?: import('../src/meta/helped').LauncherHelpCredit };
    credited.launcher = { id: 'thumper', reason: 'life' };
    expect(helpedLine(defaultProfile(), log, 'campaign')).toBe("Thumper's wide landing grew more life.");
    credited.launcher = { id: 'sparkler', reason: 'charge' };
    expect(helpedLine(defaultProfile(), log, 'campaign')).toBeNull();
  });
});
