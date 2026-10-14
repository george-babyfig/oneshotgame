import { expect, test, type TestInfo } from '@playwright/test';
import { makeLevel } from '../src/core/levels';
import { PULL_TO_SPEED, flyPull, flightWorld, findPull, seedHint, seedPulls, type Pull } from '../tests/sim/flying';
import { freshInstall, midGame } from './helpers';
import { LAUNCH_ROSTER, launcherAtTune, type LauncherId, type LauncherSelection } from '../src/core/launchers';

const TEACHING = [33, 41, 46, 51, 57];
type Hit = { kind: string; sector?: number; by?: string };
type Sample = { sector: number; releaseTime: number; vx: number; vy: number };
type Row = {
  level: number;
  sector: number;
  predicted: Hit;
  actual: Hit;
  agree: boolean;
  badge: boolean;
  bounces: number;
  curved: boolean;
  breaks?: number;
  specialBounce?: boolean;
};
const vector = (pull: Pull, selection: LauncherSelection) => {
  const speed = launcherAtTune(selection.id, selection.tune).maxPull * PULL_TO_SPEED * pull.power;
  return { vx: Math.cos(pull.angle) * speed, vy: Math.sin(pull.angle) * speed };
};

function samples(
  n: number,
  selection: LauncherSelection = { id: 'sling', tune: 1 },
  sectors = 24,
  special: boolean | 'launcher' = true,
): Sample[] {
  const level = makeLevel(n);
  const phone = { width: 390, height: 844 };
  const start = flightWorld(level, level.start, { brokenRocks: [] }, phone, 0);
  const hints = seedPulls(`scene-bot:${n}`, start.launch, start.world, selection);
  const out: Sample[] = [];
  for (const releaseTime of [0, 1.5, 3]) {
    const { world, launch } = flightWorld(level, level.start, { brokenRocks: [] }, phone, releaseTime);
    const clear = { ...world, sky: undefined };
    for (let sector = 0; sector < 24; sector += 24 / sectors) {
      const pull = findPull(sector, releaseTime, launch, clear, seedHint(hints, sector, clear), false, selection);
      if (!pull) throw Error(`No clear aim for planet ${n}, sector ${sector}`);
      out.push({ sector, releaseTime, ...vector(pull, selection) });
    }
  }
  if (!special) return out;
  if (special === 'launcher') {
    let found = 0;
    for (const releaseTime of [0, 1.5, 3]) {
      const { world, launch } = flightWorld(level, level.start, { brokenRocks: [] }, phone, releaseTime);
      for (let power = 0.35; power <= 1 && found < 3; power += 0.05)
        for (let degrees = -175; degrees <= -5 && found < 3; degrees += 5) {
          const pull = { angle: (degrees * Math.PI) / 180, power };
          const path = flyPull(pull, releaseTime, launch, world, selection);
          const contact =
            selection.id === 'thumper'
              ? path.breaks?.some((entry) => entry.kind === (n === 33 ? 'rock' : 'ring'))
              : n === 41
                ? path.bounces.length > 0
                : path.specialBounced;
          if (contact) {
            out.push({ sector: -1, releaseTime, ...vector(pull, selection) });
            found++;
          }
        }
      if (found >= 3) break;
    }
    if (found < 3) throw Error(`${selection.id} planet ${n}: only ${found} special-contact vectors`);
    return out;
  }
  // Small cores and narrow contacts get five deliberate shots in addition to the sector sweep.
  const needed = n === 57 ? ['fizzle', 'curve'] : n === 46 ? ['curve'] : n === 41 ? ['bounce'] : ['bonk'];
  for (const kind of needed) {
    let found = 0;
    for (const releaseTime of [0, 1.5, 3]) {
      const { world, launch } = flightWorld(level, level.start, { brokenRocks: [] }, phone, releaseTime);
      for (let power = 0.35; power <= 1 && found < 5; power += 0.05)
        for (let degrees = -175; degrees <= -5 && found < 5; degrees += kind === 'fizzle' ? 2 : 5) {
          const pull = { angle: (degrees * Math.PI) / 180, power };
          const path = flyPull(pull, releaseTime, launch, world, selection);
          const clear = flyPull(pull, releaseTime, launch, { ...world, sky: undefined }, selection);
          const matches =
            kind === 'bounce'
              ? path.bounces.length > 0
              : kind === 'fizzle'
                ? path.hit?.kind === 'fizzle'
                : kind === 'curve'
                  ? path.hit?.kind === 'land' && Math.hypot(path.state.x - clear.state.x, path.state.y - clear.state.y) > 8
                  : path.hit?.kind === 'bonk' && path.hit.by === (n === 33 ? 'rock' : 'ring');
          if (matches) {
            out.push({ sector: -1, releaseTime, ...vector(pull, selection) });
            found++;
          }
        }
      if (found >= 5) break;
    }
    if (found < 5) throw Error(`Planet ${n}: only ${found} ${kind} vectors`);
  }
  return out;
}

test('Scene Bot checks drawn badges and every teaching obstacle', async ({ page }, info: TestInfo) => {
  test.skip(info.project.name !== 'chromium-390x844');
  test.setTimeout(15 * 60_000);
  await freshInstall(page);
  await midGame(page, { level: 60 });
  const rows: Row[] = [];
  let surpriseBonks = 0;
  for (const n of TEACHING) {
    const planned = samples(n);
    const round = await page.evaluate(
      async ({ n, planned }) => {
        const app = (window as any).__app;
        const log: Row[] = [];
        let surprise = 0;
        for (const sample of planned) {
          app.startLevel(n, { tutorial: false });
          const scene = app.scene;
          scene.o.reduceMotion = true;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          // the teaching planet's intro card is already covered elsewhere; close it so the launcher is ready
          for (let tries = 0; !scene.canAim() && tries < 5; tries++) {
            scene.modalOpen?.close?.();
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          if (!scene.canAim()) throw Error(`Planet ${n}: launcher not ready`);
          cancelAnimationFrame(scene.raf);
          scene.time = sample.releaseTime;
          scene.rot = scene.L.spin * sample.releaseTime;
          const hook = (window as any).__scene;
          const shot = { vx: sample.vx, vy: sample.vy };
          const preview = hook.drawPreview(shot);
          if (!preview.drawn) throw Error(`Planet ${n}: preview missing`);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const predicted = (preview.predicted.hit ?? { kind: 'miss' }) as Hit;
          hook.fire(shot);
          let bounces = 0;
          for (let frame = 0; scene.shot && frame < 300; frame++) {
            scene.update(1 / 60);
            bounces = Math.max(bounces, scene.shot?.bounceCount ?? 0);
          }
          if (scene.shot) throw Error(`Planet ${n}: shot did not resolve`);
          const actual = hook.lastHit as Hit;
          if (!actual) throw Error(`Planet ${n}: no last hit`);
          const agree =
            predicted.kind === actual.kind &&
            (predicted.kind === 'land'
              ? predicted.sector === actual.sector
              : predicted.kind === 'bonk'
                ? predicted.by === actual.by
                : true);
          const curved =
            actual.kind === 'land' &&
            Math.hypot(preview.predicted.state.x - preview.clear.state.x, preview.predicted.state.y - preview.clear.state.y) > 8;
          log.push({ level: n, sector: sample.sector, predicted, actual, agree, badge: preview.drawn.badge, bounces, curved });
          surprise += Number((actual.kind === 'bonk' || actual.kind === 'fizzle') && !preview.drawn.badge);
        }
        return { log, surprise };
      },
      { n, planned },
    );
    rows.push(...round.log);
    surpriseBonks += round.surprise;
  }
  for (const n of TEACHING) {
    const group = rows.filter((row) => row.level === n);
    const count = (fn: (row: Row) => boolean) => group.filter(fn).length;
    expect(
      count((row) => row.sector >= 0),
      `planet ${n} sector/time sweeps`,
    ).toBe(72);
    expect(count((row) => row.agree) / group.length, `planet ${n} agreement`).toBeGreaterThanOrEqual(0.95);
    if (n === 33)
      expect(
        count((row) => row.actual.kind === 'bonk' && row.actual.by === 'rock'),
        'rock bonks',
      ).toBeGreaterThanOrEqual(5);
    if (n === 41)
      expect(
        count((row) => row.bounces > 0),
        'bubble bounces',
      ).toBeGreaterThanOrEqual(5);
    if (n === 46)
      expect(
        count((row) => row.curved),
        'mist curved landings',
      ).toBeGreaterThanOrEqual(5);
    if (n === 51)
      expect(
        count((row) => row.actual.kind === 'bonk' && row.actual.by === 'ring'),
        'ring bonks',
      ).toBeGreaterThanOrEqual(5);
    if (n === 57) {
      expect(
        count((row) => row.curved),
        'tug curved landings',
      ).toBeGreaterThanOrEqual(5);
      expect(
        count((row) => row.actual.kind === 'fizzle'),
        'tug fizzles',
      ).toBeGreaterThanOrEqual(5);
    }
  }
  expect(surpriseBonks, 'bonks without a drawn badge').toBe(0);
  console.log(`Scene Bot: ${rows.filter((row) => row.agree).length}/${rows.length} agreement; surprise bonks ${surpriseBonks}`);
  await info.attach('scene-bot.json', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
});

const LAUNCHER_SCENES: Partial<Record<Exclude<LauncherId, 'sling'>, number[]>> = {
  swoop: [31],
  zip: [43],
  thumper: [33, 51], // Both breakable rock and ring paths.
};

test('Scene Bot fires each launcher through the live scene at three release times', async ({ page }, info: TestInfo) => {
  test.skip(info.project.name !== 'chromium-390x844');
  test.setTimeout(25 * 60_000);
  await freshInstall(page);
  await midGame(page, { level: 70 });
  const rows: (Row & { launcher: LauncherId })[] = [];
  for (const id of LAUNCH_ROSTER.filter((id) => id !== 'sling')) {
    const levels = LAUNCHER_SCENES[id];
    if (!levels) throw Error(`Missing Scene Bot levels for ${id}`);
    const selection: LauncherSelection = { id, tune: id === 'zip' ? 4 : 1 };
    for (const n of levels) {
      const planned = samples(n, selection, 12, id === 'thumper' && [33, 51].includes(n) ? 'launcher' : false);
      const result = await page.evaluate(
        async ({ n, selection, planned }) => {
          const app = (window as any).__app;
          const log: (Row & { launcher: LauncherId })[] = [];
          for (const sample of planned) {
            app.startLevel(n, { tutorial: false });
            const scene = app.scene;
            // The tester hook selects a launcher after constructing the ordinary campaign scene.
            scene.o.launcher = selection;
            scene.o.reduceMotion = true;
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            for (let tries = 0; !scene.canAim() && tries < 5; tries++) {
              scene.modalOpen?.close?.();
              await new Promise((resolve) => requestAnimationFrame(resolve));
            }
            if (!scene.canAim()) throw Error(`${selection.id} planet ${n}: launcher not ready`);
            cancelAnimationFrame(scene.raf);
            scene.time = sample.releaseTime;
            scene.rot = scene.L.spin * sample.releaseTime;
            const hook = (window as any).__scene;
            const shot = { vx: sample.vx, vy: sample.vy };
            const preview = hook.drawPreview(shot);
            if (!preview.drawn) throw Error(`${selection.id} planet ${n}: preview missing`);
            const predicted = (preview.predicted.hit ?? { kind: 'miss' }) as Hit;
            hook.fire(shot);
            let bounces = 0;
            let specialBounce = false;
            for (let frame = 0; scene.shot && frame < 300; frame++) {
              scene.update(1 / 60);
              bounces = Math.max(bounces, scene.shot?.bounceCount ?? 0);
              specialBounce ||= !!scene.shot?.specialBounced;
            }
            if (scene.shot) throw Error(`${selection.id} planet ${n}: shot did not resolve`);
            const actual = hook.lastHit as Hit;
            const agree =
              predicted.kind === actual.kind &&
              (predicted.kind === 'land'
                ? predicted.sector === actual.sector
                : predicted.kind === 'bonk'
                  ? predicted.by === actual.by
                  : true);
            log.push({
              launcher: selection.id,
              level: n,
              sector: sample.sector,
              predicted,
              actual,
              agree,
              badge: preview.drawn.badge,
              bounces,
              curved: false,
              breaks: scene.skyState.brokenRocks.length + Number(scene.ringBroken),
              specialBounce,
            });
          }
          return log;
        },
        { n, selection, planned },
      );
      rows.push(...result);
      if (id === 'thumper')
        expect(result.filter((row) => row.sector === -1 && (row.breaks ?? 0) > 0).length, `${id} P${n} break contacts`).toBe(3);
    }
    const own = rows.filter((row) => row.launcher === id);
    expect(own.filter((row) => row.agree).length / own.length, `${id} live Scene Bot agreement`).toBeGreaterThanOrEqual(0.95);
  }
  console.log(`Live launcher Scene Bot: ${rows.filter((row) => row.agree).length}/${rows.length} paired preview/fire shots`);
  await info.attach('launcher-scene-bot.json', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
});
