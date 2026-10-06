import { describe, expect, it } from 'vitest';
import { KINDS, clonePlanet, impact, newPlanet, type Kind } from '../src/core/world';
import { makeLevel } from '../src/core/levels';
import { NO_MODIFIERS, modifiersFor, maxLabModifiers } from '../src/core/modifiers';
import { LAB_FORM, LAB_LEVEL, LAB_TEXT } from '../src/meta/labcopy';
import { firebreakBy, forecastTroubles, type TroubleEvent } from '../src/core/troubles';
import { roundState, stepRound, serializeRound, restoreRound } from '../src/core/round';
import { defaultProfile, migrate } from '../src/meta/profile';
import { dropsFor, essenceDropsFor } from '../src/meta/constellations';
import {
  buildLab,
  canBuildLab,
  canLevelLab,
  formState,
  labBuildCost,
  labCap,
  labCost,
  labLevel,
  levelLab,
  perkTaught,
  recordLabEvents,
  setForm,
  activeForms,
} from '../src/meta/labs';
import { firstHourFriend, firstHourLab, firstHourStep } from '../src/meta/firsthour';
import { tickBuilds, canBuild, build } from '../src/meta/homeworld';
import { LAB_ESSENCE_COST, PRODUCTS } from '../src/meta/tuning';
import { protectedWallSectors } from '../src/ui/art/troubles';

const T0 = 100_000;
const fertile = () => newPlanet(() => ({ land: 1, life: 0, water: 0, heat: 0 }));
const maxMods = { ...NO_MODIFIERS, ...maxLabModifiers() };

it('uses short, gentle and accurate Lab copy', () => {
  expect(Object.values(LAB_LEVEL).map((levels) => levels[2])).toEqual([
    'Your Rock grows a little extra life where it lands.',
    'Your Ice grows a little extra life where it lands.',
    'Your Seed Pod grows a little extra life where it lands.',
    'Your Magma grows a little extra life where it lands.',
    'Your Rain Cloud grows a little extra life where it lands.',
    'Your Sunburst grows a little extra life where it lands.',
  ]);
  expect(Object.values(LAB_LEVEL).map((levels) => levels[3])).toEqual([
    'Glacier can reach one more place.',
    'Steam can reach one more place.',
    'Rain Garden can reach one more place.',
    'Steam can reach one more place.',
    'Rain Garden can reach one more place.',
    'Wildflowers can reach one more place.',
  ]);
  expect(LAB_LEVEL.seed[4]).toBe("Strong Roots: land your Seed Pod touches can't be tangled this round.");
  expect(LAB_LEVEL.rock[4]).toBe('Firewall: mountains your Rock makes shelter the land next to them from Ember Vents.');
  expect(LAB_LEVEL.storm[5]).toBe('Supernova can bring more water.');
  expect(LAB_LEVEL.sun[5]).toBe('Supernova can bring more life.');
  expect(LAB_FORM.sun.line).toBe('Sunburst warms only places where plants already grow.');
  expect(LAB_TEXT.powerHelped).toBe('{name} added a little extra life.');
  expect(JSON.stringify({ LAB_LEVEL, LAB_FORM, LAB_TEXT })).not.toMatch(/\bHeat\b|\bUpgrade\b/);
});

function readyProfile() {
  const p = defaultProfile(T0);
  p.level = 61;
  p.home.ring = 5;
  p.dust = 100_000;
  p.mats = { stone: 500, frost: 500, leaf: 1000, ember: 500, dew: 500 };
  return p;
}

describe('Lab ladder and first hour', () => {
  it('pins per-level cost, cap, taught gate and retained legacy levels', () => {
    const p = readyProfile();
    expect([2, 3, 4, 5].map((lv) => labCost('sun', lv as 2 | 3 | 4 | 5))).toEqual([
      { dust: 400, essence: 'leaf', amount: 10 },
      { dust: 1200, essence: 'leaf', amount: 25 },
      { dust: 3000, essence: 'leaf', amount: 50 },
      { dust: 7000, essence: 'leaf', amount: 140 },
    ]);
    expect(LAB_ESSENCE_COST.slice(2)).toEqual([10, 25, 50, 140]);
    p.home.ring = 1;
    expect(labCap(p)).toBe(2);
    p.lab.seed = 5;
    expect(labLevel(p, 'seed')).toBe(5);
    p.level = 14;
    expect(perkTaught(p, 'rock', 3)).toBe(false);
    expect(perkTaught(p, 'seed', 3)).toBe(true);
    expect(perkTaught(p, 'sun', 4)).toBe(false);
  });

  it('first Lab is free, later one costs 300, and levelled legacy kinds rebuild free', () => {
    const p = readyProfile();
    expect(labBuildCost(p, 'rock')).toBe(0);
    expect(buildLab(p, 0, 'rock', T0)).toBe('ok');
    expect(p.home.labFreeUsed).toBe(true);
    expect(labBuildCost(p, 'ice')).toBe(300);
    expect(buildLab(p, 1, 'ice', T0)).toBe('ok');
    expect(p.dust).toBe(99_700);
    expect(canBuildLab(p, 2, 'rock', T0)).toBe('max');
    const old = readyProfile();
    old.lab.seed = 5;
    expect(labBuildCost(old, 'seed')).toBe(0);
    expect(buildLab(old, 0, 'seed', T0)).toBe('ok');
    expect(old.home.labFreeUsed).toBe(false);
    const spent = readyProfile();
    spent.home.labFreeUsed = true;
    spent.lab.seed = 5;
    expect(labBuildCost(spent, 'seed')).toBe(0);
    expect(buildLab(spent, 0, 'seed', T0)).toBe('ok');
    expect(spent.home.labFreeUsed).toBe(true);
  });
  it('keeps retired producers unavailable even with a free plot and enough dust', () => {
    const p = readyProfile();
    for (const type of ['mill', 'grove', 'observatory'] as const) {
      expect(canBuild(p, 0, type, T0)).toBe('max');
      expect(build(p, 0, type, T0)).toBe('max');
    }
  });
  it('migrates an untouched Homeworld into the first-hour steps', () => {
    const raw = structuredClone(defaultProfile(T0)) as unknown as Record<string, unknown>;
    delete (raw.home as Record<string, unknown>).firstHour;
    expect(migrate(raw).home.firstHour).toBe(0);
    (raw.home as Record<string, unknown>).intro = true;
    expect(migrate(raw).home.firstHour).toBe(2);
  });

  it('levels instantly with stardust and Essence, without a drone or gem path', () => {
    const p = readyProfile();
    buildLab(p, 0, 'rock', T0);
    expect(canLevelLab(p, 'rock')).toBe('ok');
    const gems = p.gems;
    expect(levelLab(p, 'rock')).toBe('ok');
    expect(labLevel(p, 'rock')).toBe(2);
    expect(p.dust).toBe(99_600);
    expect(p.mats.stone).toBe(490);
    expect(p.gems).toBe(gems);
    expect(p.home.plots[0]?.done).toBe(T0 + 30_000);
    p.level = 11;
    expect(canLevelLab(p, 'rock')).toBe('untaught');
    p.level = 61;
    p.home.ring = 1;
    expect(canLevelLab(p, 'rock')).toBe('cap');
  });

  it('counts feats in allowed modes and leaves an earned form off until switched on', () => {
    const p = readyProfile();
    p.lab.rock = 5;
    const step = { kind: 'ice' as Kind, reactions: [{ id: 'glacier' as const, at: 0, partner: 1, sectors: [0] }], troubleEvents: [] };
    for (let i = 0; i < 9; i++) expect(recordLabEvents(p, step, 'campaign')).toEqual([]);
    expect(recordLabEvents(p, step, 'daily')).toEqual([]);
    expect(recordLabEvents(p, step, 'voyage')).toEqual(['rock']);
    expect(formState(p, 'rock')).toMatchObject({ progress: 10, earned: true, usable: true, on: false });
    expect(activeForms(p).rock).toBe(false);
    expect(setForm(p, 'rock', true)).toBe(true);
    expect(activeForms(p).rock).toBe(true);
    expect(setForm(p, 'rock', false)).toBe(true);
    expect(activeForms(p).rock).toBe(false);
    expect(setForm(p, 'ice', true)).toBe(false);
  });
  it('counts Trouble feats only when the landing cleared the Trouble', () => {
    const p = readyProfile();
    const step: { kind: Kind; reactions: []; troubleEvents: TroubleEvent[] } = {
      kind: 'magma',
      reactions: [],
      troubleEvents: [{ id: 'vine', kind: 'settled', sector: 3 }],
    };
    recordLabEvents(p, step, 'campaign');
    expect(p.feats.vineBurned ?? 0).toBe(0);
    step.troubleEvents[0].clearedByThrow = true;
    recordLabEvents(p, step, 'campaign');
    expect(p.feats.vineBurned).toBe(1);
  });

  it('first hour builds one Lab, gives a Den and friend, and pays 100 dust once', () => {
    const p = readyProfile();
    p.level = 5;
    p.home.ring = 1;
    p.seen = ['bunny'];
    expect(firstHourStep(p)).toBe('lab');
    expect(firstHourLab(p, 'rock', 0, T0)).toBe('ok');
    expect(firstHourStep(p)).toBe('friend');
    tickBuilds(p.home, T0 + 31_000);
    const dust = p.dust;
    expect(firstHourFriend(p, T0 + 31_000)).toEqual({ species: 'bunny', dust: 100 });
    expect(p.home.plots.some((b) => b?.type === 'den')).toBe(true);
    expect(p.dust).toBe(dust + 100);
    expect(p.home.residents[0].species).toBe('bunny');
    expect(firstHourFriend(p, T0 + 31_000)).toBeNull();
  });

  it('replays pay half the base drop and first 2-3 star clears reward stone and leaf', () => {
    const planet = newPlanet((i) => (i < 5 ? { land: 3, water: 0 } : { land: 0, water: 3, heat: -2 }));
    const base = dropsFor(planet, 3);
    const full = essenceDropsFor(planet, 3, true);
    const replay = essenceDropsFor(planet, 3, false);
    for (const [mat, amount] of Object.entries(base)) expect(replay[mat as keyof typeof replay] ?? 0).toBe(Math.floor(amount / 2));
    for (const mat of ['stone', 'leaf'] as const) if (base[mat]) expect(full[mat]).toBe(base[mat]! + 4);
    const twoStar = essenceDropsFor(planet, 2, true);
    const twoStarBase = dropsFor(planet, 2);
    for (const mat of ['stone', 'leaf'] as const) if (twoStarBase[mat]) expect(twoStar[mat]).toBe(twoStarBase[mat]! + 2);
  });

  it('product grants are limited to gems and looks', () => {
    for (const product of PRODUCTS) {
      expect(Object.keys(product).some((key) => ['mats', 'essence', 'lab', 'forms'].includes(key))).toBe(false);
    }
  });
});

describe('Lab terrain and Trouble effects', () => {
  it('adds one centre life only when the land type stays the same', () => {
    for (const kind of Object.keys(KINDS) as Kind[]) {
      const field = newPlanet(() => ({ land: 1, life: kind === 'seed' ? 0 : 1, water: 0, heat: 0 }));
      const base = clonePlanet(field);
      const power = clonePlanet(field);
      impact(base, kind, 5);
      impact(power, kind, 5, 0, { power: 1 });
      expect(power.sectors[5].life, kind).toBe(Math.min(3, base.sectors[5].life + 1));
      expect(power.sectors[5].biome, kind).toBe(base.sectors[5].biome);
    }
  });

  it('extends ordinary Supernova reach for four objects and adds Rain/Sun Supernova power', () => {
    for (const kind of ['rock', 'ice', 'seed', 'magma'] as Kind[]) {
      const base = newPlanet(() => ({
          land: kind === 'ice' ? 1 : 3,
          water: kind === 'ice' ? 3 : 0,
          heat: kind === 'magma' ? 2 : 0,
          life: 1,
        })),
        boosted = clonePlanet(base);
      impact(base, kind, 5, 0, { nova: true });
      impact(boosted, kind, 5, 0, { nova: true, novaReach: 1 });
      expect(boosted.sectors[8]).not.toEqual(base.sectors[8]);
    }
    for (const kind of ['storm', 'sun'] as Kind[]) {
      const base = newPlanet(() => ({ land: 1, water: kind === 'storm' ? 1 : 0, life: 1 })),
        boosted = clonePlanet(base);
      impact(base, kind, 5, 0, { nova: true });
      impact(boosted, kind, 5, 0, { nova: true, novaReach: 1 });
      const key = kind === 'storm' ? 'water' : 'life';
      expect(boosted.sectors[9][key]).toBe(base.sectors[9][key] + 1);
    }
  });

  it('extends Fusion reach for the thrown object and stacks with Combo inside radius four', () => {
    const planet = newPlanet((i) => (i === 5 ? { land: 3, heat: 2 } : {}));
    const rules = { version: 1, reactions: ['steam' as const], troubles: [], combo: true };
    const base = stepRound(roundState(planet), { kind: 'ice', sector: 5 }, NO_MODIFIERS, rules);
    const lab = stepRound(roundState(planet), { kind: 'ice', sector: 5 }, { ...NO_MODIFIERS, lab: { ice: 3 } }, rules);
    const comboState = roundState(planet);
    comboState.combo.links = 2;
    const stacked = stepRound(comboState, { kind: 'ice', sector: 5 }, { ...NO_MODIFIERS, lab: { ice: 3 } }, rules);
    expect(base.reactions[0].sectors).toHaveLength(5);
    expect(lab.reactions[0].sectors).toHaveLength(7);
    expect(stacked.reactions[0].sectors).toHaveLength(9);
  });

  it('applies each of the six top forms only when enabled by the impact', () => {
    const rockA = fertile(),
      rockB = fertile();
    impact(rockA, 'rock', 5);
    impact(rockB, 'rock', 5, 0, { form: true });
    expect(rockB.sectors[8].land).toBe(rockA.sectors[8].land + 1);
    const iceA = fertile(),
      iceB = fertile();
    impact(iceA, 'ice', 5);
    impact(iceB, 'ice', 5, 0, { form: true });
    expect(iceB.sectors[5].heat).toBe(-2);
    expect(iceB.sectors[6].water).toBe(iceA.sectors[6].water - 1);
    const seedA = fertile(),
      seedB = fertile();
    impact(seedA, 'seed', 5);
    impact(seedB, 'seed', 5, 0, { form: true });
    expect(seedB.sectors[6].life).toBe(seedA.sectors[6].life + 1);
    const magmaA = newPlanet(() => ({ land: 1, water: 2 })),
      magmaB = clonePlanet(magmaA);
    impact(magmaA, 'magma', 5);
    impact(magmaB, 'magma', 5, 0, { form: true });
    expect(magmaB.sectors[5].water).toBe(magmaA.sectors[5].water + 1);
    expect(magmaB.sectors[6].land).toBe(magmaA.sectors[6].land + 1);
    const rainA = fertile(),
      rainB = fertile();
    impact(rainA, 'storm', 5);
    impact(rainB, 'storm', 5, 0, { form: true });
    expect(rainB.sectors[5].life).toBe(rainA.sectors[5].life + 1);
    const sunA = newPlanet((i) => ({ land: 1, life: i === 5 ? 2 : 0 })),
      sunB = clonePlanet(sunA);
    impact(sunA, 'sun', 5);
    impact(sunB, 'sun', 5, 0, { form: true });
    expect(sunB.sectors[5].heat).toBe(sunA.sectors[5].heat);
    expect(sunB.sectors[6].heat).toBe(sunA.sectors[6].heat - 1);
  });

  it.each([
    ['ice', 'vent', 2, 'ventCooler'],
    ['magma', 'vine', 2, 'weedBurner'],
    ['sun', 'frost', 4, 'frostMelter'],
  ] as const)('%s Lab Guard settles %s at distance %i', (kind, trouble, distance, perk) => {
    const state = roundState(fertile(), true, [{ id: trouble, source: distance }]);
    const base = stepRound(state, { kind, sector: 0 }, NO_MODIFIERS);
    const lab = stepRound(state, { kind, sector: 0 }, { ...NO_MODIFIERS, lab: { [kind]: 4 } });
    expect(base.state.troubles[0].settled).toBe(false);
    expect(lab.state.troubles[0].settled).toBe(true);
    expect(lab.troubleEvents).toContainEqual(expect.objectContaining({ kind: 'settled', perk }));
    expect(lab.labEvents).toContainEqual(expect.objectContaining({ type: 'guard', kind, perk, how: 'settled' }));
  });

  it('Rinse keeps Rain vent reach at three while clearing vines', () => {
    const vent = roundState(fertile(), true, [{ id: 'vent', source: 4 }]);
    const rain = stepRound(vent, { kind: 'storm', sector: 0 }, { ...NO_MODIFIERS, lab: { storm: 4 } });
    expect(rain.state.troubles[0].settled).toBe(false);
    const level = makeLevel(28);
    const vine = roundState(level.start, level.nova, level.troubles);
    vine.troubles[0].nextIn = 1;
    const spread = stepRound(vine, { kind: 'rock', sector: 0 });
    const tangled = spread.state.troubles[0].tangled?.[0];
    expect(tangled).toBeDefined();
    const base = stepRound(spread.state, { kind: 'storm', sector: tangled! });
    const rinsed = stepRound(spread.state, { kind: 'storm', sector: tangled! }, { ...NO_MODIFIERS, lab: { storm: 4 } });
    expect(base.state.troubles[0].settled).toBe(false);
    expect(rinsed.state.troubles[0].settled).toBe(true);
    expect(rinsed.troubleEvents).toContainEqual(expect.objectContaining({ perk: 'rinse', clearedByThrow: true }));
  });

  it('Firewall and Strong Roots are mirrored by forecast and protected walls', () => {
    const planet = fertile();
    planet.sectors[5].land = 2;
    planet.sectors[5].life = 1;
    planet.sectors[4].land = 3;
    const rockGuard = { lab: { rock: 4 }, marks: { rock: [4], seed: [] } };
    expect(firebreakBy(planet, 5, 'vent', rockGuard)).toBe('firewall');
    const seedGuard = { lab: { seed: 4 }, marks: { rock: [], seed: [5] } };
    expect(firebreakBy(planet, 5, 'vine', seedGuard)).toBe('labRoots');
    const state = roundState(planet, true, [{ id: 'vent', source: 4 }]);
    state.troubles[0].nextIn = 1;
    state.labMarks = rockGuard.marks;
    const forecast = forecastTroubles(state, { ...NO_MODIFIERS, lab: rockGuard.lab });
    expect(forecast[0].blockedBy).toBe('firewall');
    expect(protectedWallSectors(planet, 'vent', forecast, rockGuard)).toContain(5);
    expect(protectedWallSectors(planet, 'vine', [], seedGuard)).toContain(5);
  });

  it('Rock and Seed mark their footprints for nearby Trouble beats', () => {
    const ventPlanet = fertile();
    ventPlanet.sectors[6].life = 1;
    const vent = roundState(ventPlanet, true, [{ id: 'vent', source: 5 }]);
    vent.troubles[0].nextIn = 1;
    const rock = stepRound(vent, { kind: 'rock', sector: 4 }, { ...NO_MODIFIERS, lab: { rock: 4 } });
    expect(rock.state.labMarks?.rock).toContain(5);
    expect(rock.troubleEvents).toContainEqual(expect.objectContaining({ by: 'firewall' }));
    const vine = roundState(fertile(), true, [{ id: 'vine', source: 4 }]);
    vine.troubles[0].nextIn = 1;
    const seed = stepRound(vine, { kind: 'seed', sector: 4 }, { ...NO_MODIFIERS, lab: { seed: 4 } });
    expect(seed.state.labMarks?.seed).toContain(4);
    expect(seed.state.labMarks?.seed).toContain(5);
    expect(seed.troubleEvents).toContainEqual(expect.objectContaining({ by: 'labRoots' }));
  });
  it('Firewall and Strong Roots block beats in generated rounds where the base rule does not', () => {
    for (const [kind, trouble, by] of [
      ['rock', 'vent', 'firewall'],
      ['seed', 'vine', 'labRoots'],
    ] as const) {
      let found = false;
      for (let n = trouble === 'vent' ? 14 : 28; n <= 120 && !found; n++) {
        const level = makeLevel(n);
        if (!level.troubles.some((entry) => entry.id === trouble)) continue;
        for (let sector = 0; sector < 24 && !found; sector++) {
          const state = roundState(level.start, level.nova, level.troubles, level.difficulty !== 'normal');
          for (const entry of state.troubles) if (entry.id === trouble) entry.nextIn = 1;
          const mods = { ...NO_MODIFIERS, lab: { [kind]: 4 } };
          const boosted = stepRound(state, { kind, sector }, mods);
          const blocked = boosted.troubleEvents.find((event) => event.id === trouble && event.by === by);
          if (!blocked) continue;
          const base = stepRound(state, { kind, sector }, NO_MODIFIERS);
          expect(base.troubleEvents).not.toContainEqual(expect.objectContaining({ by }));
          expect(firebreakBy(boosted.state.planet, blocked.sector, trouble, { lab: mods.lab, marks: boosted.state.labMarks })).toBe(by);
          expect(restoreRound(serializeRound(boosted.state))?.labMarks).toEqual(boosted.state.labMarks);
          expect(protectedWallSectors(boosted.state.planet, trouble, [], { lab: mods.lab, marks: boosted.state.labMarks })).toContain(
            blocked.sector,
          );
          found = true;
        }
      }
      expect(found, `${by} has a reachable block`).toBe(true);
    }
  });

  it('reports Power and switched-on form contributions without a flat score bonus', () => {
    const state = roundState(newPlanet(() => ({ land: 3, life: 1 })));
    const step = stepRound(state, { kind: 'rock', sector: 5 }, { ...NO_MODIFIERS, lab: { rock: 5 }, forms: { rock: true } });
    expect(step.labEvents).toContainEqual(expect.objectContaining({ type: 'power', kind: 'rock', level: 5 }));
    expect(step.labEvents).toContainEqual(expect.objectContaining({ type: 'form', kind: 'rock', form: 'pebbleShower' }));
    expect(step.state.bonus).toBe(0);
  });
  it('passes Power, Fusion reach and form terrain through stepRound', () => {
    const field = newPlanet(() => ({ land: 3, life: 1 }));
    const state = roundState(field);
    const base = stepRound(state, { kind: 'rock', sector: 5 });
    const power = stepRound(state, { kind: 'rock', sector: 5 }, { ...NO_MODIFIERS, lab: { rock: 2 } });
    expect(power.state.planet.sectors[5].life).toBe(base.state.planet.sectors[5].life + 1);
    const form = stepRound(state, { kind: 'rock', sector: 5 }, { ...NO_MODIFIERS, lab: { rock: 5 }, forms: { rock: true } });
    expect(form.state.planet.sectors[2].land).toBeGreaterThan(base.state.planet.sectors[2].land);
    const icy = newPlanet((i) => (i === 5 ? { land: 3, heat: -2 } : { land: 3, life: 1 }));
    const fusionState = roundState(icy);
    const rules = { version: 1, reactions: ['glacier' as const], troubles: [] };
    const short = stepRound(fusionState, { kind: 'rock', sector: 5 }, NO_MODIFIERS, rules);
    const long = stepRound(fusionState, { kind: 'rock', sector: 5 }, { ...NO_MODIFIERS, lab: { rock: 3 } }, rules);
    expect(long.reactions[0]?.sectors.length).toBeGreaterThan(short.reactions[0]?.sectors.length ?? 0);
  });
  it('Obsidian Flow keeps water during a Magma Supernova repeat', () => {
    const field = newPlanet(() => ({ land: 1, water: 3 }));
    const state = roundState(field);
    state.nova.charge = state.nova.threshold;
    const normal = stepRound(state, { kind: 'magma', sector: 5, nova: true }, { ...NO_MODIFIERS, lab: { magma: 5 } });
    const obsidian = stepRound(
      state,
      { kind: 'magma', sector: 5, nova: true },
      { ...NO_MODIFIERS, lab: { magma: 5 }, forms: { magma: true } },
    );
    expect(obsidian.state.planet.sectors[5].water).toBeGreaterThan(normal.state.planet.sectors[5].water);
  });

  it('score modes strip both Labs and forms and old checkpoints restore empty marks', () => {
    for (const mode of ['daily', 'rush', 'challenge', 'remix'] as const) {
      expect(modifiersFor(mode, maxMods).lab).toEqual({});
      expect(modifiersFor(mode, maxMods).forms).toEqual({});
    }
    const state = roundState(fertile());
    delete state.labMarks;
    expect(restoreRound(serializeRound(state))?.labMarks).toEqual({ rock: [], seed: [] });
  });
});
