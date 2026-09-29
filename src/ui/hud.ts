import { ledger } from '../meta/ledger';
import { type BiomeId, BIOMES, KINDS, SPECIES_BY_ID, type Kind } from '../core/world';
import { FINISH_DUST_PER_THROW } from '../meta/tuning';
import { goalProgress, goalsMet, starsFor, type Goal } from '../core/levels';
import { h, btn, fmt, modal } from './dom';
import { icon } from './icons';
import { critterCanvas } from './art/critters';
import { projectileCanvas } from './art/projectiles';
import { sfx } from './audio';
import { haptic } from './haptics';
import { t, tp } from '../i18n';
import { rarityName } from './text';
import { toast } from './dom';
import { CONTINUE_COST, CONTINUE_THROWS } from '../meta/continues';
import { waysToEarnGems } from './flows/earn';

import type { LevelScene } from './game';

export function buildHud(scene: LevelScene) {
  scene.hudThrows = h('div', { class: 'hud-throws' });
  scene.hudFill = h('div', { class: 'life-fill' });
  scene.hudScore = h('div', { class: 'life-score' });
  const bar = h('div', { class: 'life-bar' }, scene.hudFill);
  const max = scene.barMax();
  scene.hudStars = scene.L.stars.map((t) => {
    const s = h('div', { class: 'life-star', style: `left:${(t / max) * 100}%` }, '★');
    bar.append(s);
    return s;
  });
  scene.curEl = h('button', { class: 'obj cur', 'aria-label': t('Current object') });
  scene.nextEl = h('button', { class: 'obj next', 'aria-label': t('Swap with next object') });
  scene.nextEl.addEventListener('click', (e) => {
    e.stopPropagation();
    scene.swap();
  });
  scene.descEl = h('div', { class: 'obj-desc' });
  scene.goalsEl = h('div', { class: `goals${scene.L.goals.length ? '' : ' hidden'}` });
  scene.hintEl = h('div', { class: 'hint' }, h('div', { class: 'hint-hand' }, '👆'), h('div', null, t('Pull back & release to fling')));
  const twist = scene.L.twist !== 'none' ? h('div', { class: 'twist' }, scene.twistLabel()) : null;
  scene.finishEl = h(
    'button',
    { class: 'finish hidden', onclick: () => scene.finishEarly() },
    h('b', null, t('Finish ✓')),
    h('small', null, ''),
  );
  scene.discoverEl = h('div', { class: 'discover' });
  scene.coachEl = h('div', { class: 'coach' });
  return h(
    'div',
    { class: 'hud' },
    h(
      'div',
      { class: 'hud-top' },
      h('button', { class: 'icon', 'aria-label': t('Pause'), onclick: () => scene.pause() }, icon('pause', 22)),
      h(
        'div',
        { class: 'hud-title' },
        h('div', { class: 'hud-level' }, scene.o.label ?? t('Planet {n}', { n: scene.L.n })),
        h('div', { class: 'hud-name' }, scene.L.name),
        scene.L.difficulty !== 'normal'
          ? h('div', { class: `hud-diff ${scene.L.difficulty}` }, scene.L.difficulty === 'super' ? t('💀 SUPER HARD') : t('🔥 HARD'))
          : null,
        scene.o.momentum ? h('div', { class: 'hud-diff momentum-tag' }, t('⚡ Momentum ×{n}', { n: scene.o.momentum })) : null,
      ),
      scene.hudThrows,
    ),
    h('div', { class: 'life' }, bar, scene.hudScore),
    scene.goalsEl,
    twist,
    h('div', { class: 'banners' }, scene.coachEl, scene.discoverEl),
    scene.finishEl,
    h(
      'div',
      { class: 'hud-bottom' },
      h(
        'div',
        { class: 'queue' },
        scene.curEl,
        h('div', { class: 'next-wrap' }, scene.nextEl, h('div', { class: 'swap-lbl' }, t('tap to swap'))),
      ),
      scene.descEl,
    ),
    scene.hintShown ? scene.hintEl : null,
  );
}

export function twistLabel(scene: LevelScene) {
  const map: Record<string, string> = {
    fast: t('🌀 Fast Spin'),
    tiny: t('🔹 Tiny World'),
    moon: t('🌑 A moon blocks shots'),
    boss: t('☄️ Comet Guardian — hit it 3 times!'),
    hot: t('🔥 Scorched start'),
    frozen: t('🧊 Frozen start'),
    ocean: t('🌊 Water World'),
    wind: t('💨 Solar Wind'),
    heavy: t('🪐 Dense Core'),
    wobble: t('🌀 Wobbly Spin'),
    twin: t('🌑🌑 Twin Moons'),
  };
  return map[scene.L.twist] ?? '';
}

export function barMax(scene: LevelScene) {
  return Math.round(scene.L.stars[2] * 1.12);
}

export function renderHud(scene: LevelScene) {
  if (scene.o.timeLimit) {
    scene.renderClock();
  } else if (scene.o.endless) {
    scene.hudThrows.replaceChildren(h('span', { class: 'n' }, '∞'), h('span', { class: 'l' }, t('zen')));
  } else {
    scene.hudThrows.replaceChildren(h('span', { class: 'n' }, String(scene.throwsLeft)), h('span', { class: 'l' }, t('throws')));
    scene.hudThrows.classList.toggle('low', scene.throwsLeft <= 2);
  }
  const k = KINDS[scene.cur];
  const n = KINDS[scene.next];
  scene.curEl.replaceChildren(projectileCanvas(scene.cur, 40));
  scene.curEl.style.setProperty('--c', k.color);
  scene.nextEl.replaceChildren(projectileCanvas(scene.next, 36));
  scene.nextEl.style.setProperty('--c', n.color);
  scene.descEl.replaceChildren(h('b', null, t(k.name)), ` — ${t(k.desc)}`);
  scene.renderScore();
  scene.renderGoals();
  scene.renderFinish();
}

export function heat(scene: LevelScene, delta: number) {
  const lv = delta >= 40 ? 3 : delta >= 22 ? 2 : delta >= 10 ? 1 : 0;
  if (!lv) return;
  const el = scene.hudScore;
  el.classList.remove('heat1', 'heat2', 'heat3');
  void el.offsetWidth;
  el.classList.add(`heat${lv}`);
  scene.hudFill.classList.toggle('blaze', lv >= 2);
  clearTimeout(scene.heatTimer);
  scene.heatTimer = window.setTimeout(() => {
    el.classList.remove('heat1', 'heat2', 'heat3');
    scene.hudFill.classList.remove('blaze');
  }, 1400);
}

export function renderScore(scene: LevelScene) {
  const max = scene.barMax();
  scene.hudFill.style.width = `${Math.min(100, (scene.shownScore / max) * 100)}%`;
  scene.hudScore.textContent = t('{n} life', { n: fmt(scene.shownScore) });
  const met = goalsMet(scene.planet, scene.L.goals);
  scene.hudStars.forEach((s, i) => {
    s.classList.toggle('on', met && scene.shownScore >= scene.L.stars[i]);
    s.classList.toggle('wait', !met && scene.shownScore >= scene.L.stars[i]);
  });
}

export function renderClock(scene: LevelScene) {
  const secs = Math.max(0, Math.ceil(scene.timeLeft));
  if (secs === scene.lastClock) return;
  if (secs <= 5 && secs > 0 && scene.lastClock !== secs) sfx.click();
  scene.lastClock = secs;
  scene.hudThrows.replaceChildren(h('span', { class: 'n' }, `${secs}`), h('span', { class: 'l' }, t('seconds')));
  scene.hudThrows.classList.toggle('low', secs <= 10);
}

export function checkStars(scene: LevelScene) {
  const got = scene.starsNow(scene.shownScore);
  if (got <= scene.starsGot) return;
  scene.starsGot = got;
  sfx.star(got - 1);
  haptic.success();
  if (got === 3) {
    scene.confetti();
    scene.popup(scene.cx, scene.cy - scene.R * 1.9, t('★★★ Perfect planet!'), '#ffd84a', 24, 2);
  }
  scene.renderFinish();
  const s = scene.hudStars[got - 1];
  s.classList.remove('pop');
  void s.offsetWidth;
  s.classList.add('pop');
}

export function starsNow(scene: LevelScene, score = scene.score) {
  return goalsMet(scene.planet, scene.L.goals) ? starsFor(score, scene.L.stars) : 0;
}

export function goalIcon(scene: LevelScene, g: Goal) {
  return g.type === 'species' ? critterCanvas(g.id, 26) : h('span', { class: 'gi' }, BIOMES[g.id as BiomeId].deco || '⬤');
}

export function renderGoals(scene: LevelScene) {
  if (!scene.L.goals.length) return;
  scene.goalsEl.replaceChildren(
    h('span', { class: 'goals-l' }, t('Goals')),
    ...scene.L.goals.map((g) => {
      const have = Math.min(g.count, goalProgress(scene.planet, g));
      const done = have >= g.count;
      const name = g.type === 'species' ? t(SPECIES_BY_ID[g.id].name) : t(BIOMES[g.id as BiomeId].name);
      return h(
        'span',
        { class: `goal${done ? ' done' : ''}`, title: name },
        scene.goalIcon(g),
        h('b', null, done ? '✓' : `${have}/${g.count}`),
      );
    }),
  );
  const n = scene.L.goals.filter((g) => goalProgress(scene.planet, g) >= g.count).length;
  if (n > scene.goalsDone) {
    scene.goalsDone = n;
    const all = n === scene.L.goals.length;
    if (all) {
      scene.renderScore();
      scene.checkStars();
    }
    setTimeout(() => {
      scene.popup(scene.cx, scene.cy - scene.R * 1.6, all ? t('All goals complete!') : t('Goal complete!'), '#9dffb0', 24, 1.6);
      sfx.star(all ? 2 : 0);
      haptic.success();
    }, 500);
    scene.goalsEl.classList.remove('pop');
    void scene.goalsEl.offsetWidth;
    scene.goalsEl.classList.add('pop');
  } else scene.goalsDone = n;
}

export function renderFinish(scene: LevelScene) {
  if (scene.o.competitive || scene.o.endless || scene.o.timeLimit) {
    scene.finishEl.classList.add('hidden');
    return;
  }
  const now = scene.starsNow();
  const show = now > 0 && scene.throwsLeft > 0 && !scene.ended && !scene.finishing;
  scene.finishEl.classList.toggle('hidden', !show);
  scene.finishEl.classList.toggle('hot', now >= 3);
  (scene.finishEl.lastChild as HTMLElement).textContent = t('+✨{d} for {n} left', {
    d: scene.throwsLeft * FINISH_DUST_PER_THROW,
    n: scene.throwsLeft,
  });
}

export function finishEarly(scene: LevelScene) {
  if (scene.shot || scene.ended || scene.finishing || scene.modalOpen || scene.starsNow() === 0) return;
  scene.finishing = true;
  clearTimeout(scene.endTimer);
  scene.renderFinish();
  const n = scene.throwsLeft;
  sfx.whoosh();
  for (let k = 0; k < n; k++) {
    setTimeout(
      () => {
        if (scene.ended) return;
        const a = Math.random() * Math.PI * 2;
        const x = scene.cx + Math.cos(a) * scene.R * 1.05;
        const y = scene.cy + Math.sin(a) * scene.R * 1.05;
        scene.burst(x, y, '#ffd76a', 16, 5);
        scene.ring(x, y, '#ffd76a', scene.R * 0.5);
        scene.popup(x, y - 12, `+✨${FINISH_DUST_PER_THROW}`, '#ffd76a', 18);
        scene.throwsLeft--;
        scene.renderHud();
        sfx.coin();
        haptic.tick();
      },
      120 + k * 160,
    );
  }
  const done = () => {
    if (scene.ended) return;
    if (scene.paused) return void setTimeout(done, 300);
    scene.finishing = false;
    scene.leftover = n;
    scene.endModal(scene.starsNow());
  };
  setTimeout(done, 400 + n * 160);
}

export function swap(scene: LevelScene) {
  if (scene.shot || scene.ended) return;
  [scene.cur, scene.next] = [scene.next, scene.cur];
  sfx.click();
  haptic.tick();
  scene.renderHud();
  scene.curEl.classList.remove('pop');
  void scene.curEl.offsetWidth;
  scene.curEl.classList.add('pop');
}

export function announce(scene: LevelScene, id: string, at: number, firstArrival: boolean) {
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  scene.spawnAnim.set(at, 0.9);
  const [x, y] = scene.sectorPoint(at, 1.55);
  const rare = sp.rarity === 'rare' || sp.rarity === 'legendary';
  const isNew = !scene.o.seen.has(id);
  if (firstArrival) scene.o.onSpecies?.(id);
  sfx.creature(rare || isNew);
  haptic.success();
  scene.burst(x, y, rare ? '#ffd84a' : '#ffffff', rare ? 40 : 20, rare ? 7 : 4);
  scene.popup(x, y - 16, `${t(sp.name)}${isNew ? t(' — NEW!') : ''}`, rare ? '#ffd84a' : '#e0f7ff', rare ? 20 : 16, 2.2);
  if (isNew) {
    scene.o.seen.add(id);
    scene.o.onNewSpecies(id);
    scene.discoverQueue.push(id);
    scene.showDiscover();
  }
}

export function showDiscover(scene: LevelScene) {
  if (scene.discoverBusy || scene.ended) return;
  const id = scene.discoverQueue.shift();
  if (!id) return;
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  scene.discoverBusy = true;
  const label = rarityName(sp.rarity);
  scene.discoverEl.className = `discover show r-${sp.rarity}`;
  scene.discoverEl.replaceChildren(
    h('div', { class: 'd-emoji' }, critterCanvas(sp.id, 56)),
    h(
      'div',
      { class: 'd-body' },
      h('small', null, t('New creature · {r}', { r: label })),
      h('b', null, t(sp.name)),
      h('span', null, t('+💎3 · added to your Lifebook')),
    ),
  );
  setTimeout(() => {
    scene.discoverEl.classList.remove('show');
    setTimeout(() => {
      scene.discoverBusy = false;
      scene.showDiscover();
    }, 300);
  }, 2300);
}

export function showCoach(scene: LevelScene, k: number) {
  const text = scene.o.coach?.[k];
  if (!text) {
    scene.coachEl.classList.remove('show');
    return;
  }
  scene.coachEl.replaceChildren(h('span', { class: 'coach-ic' }, '💡'), h('span', null, t(text)));
  scene.coachEl.classList.remove('show');
  void scene.coachEl.offsetWidth;
  scene.coachEl.classList.add('show');
}

export function introCard(scene: LevelScene, kind: Kind) {
  const k = KINDS[kind];
  scene.paused = true;
  const m = modal(
    [
      h('div', { class: 'm-sub' }, t('New object!')),
      h('div', { class: 'intro-art' }, projectileCanvas(kind, 110)),
      h('div', { class: 'm-title' }, t(k.name)),
      h('p', null, t(k.desc)),
      btn(t('Got it!'), 'primary wide', () => m.close()),
    ],
    { onClose: () => ((scene.paused = false), (scene.modalOpen = null)) },
  );
  scene.modalOpen = m;
  sfx.levelUp();
}

export function endModal(scene: LevelScene, stars: number) {
  const won = stars > 0;
  const canCont = scene.leftover === 0 && !!scene.o.continueOk?.(won);
  const finish = () => {
    m.close();
    scene.modalOpen = null;
    scene.finish(stars);
  };
  const cont = () => {
    if (!scene.o.continueOk?.(won)) return;
    if (!scene.o.spendGems(CONTINUE_COST)) {
      sfx.error();
      toast(t('Not enough gems yet'), 'bad');
      return;
    }
    m.close();
    scene.modalOpen = null;
    ledger.count('continues_bought');
    scene.o.onContinue?.();
    scene.throwsLeft += CONTINUE_THROWS;
    scene.throwsTotal += CONTINUE_THROWS;
    sfx.gem();
    haptic.success();
    scene.renderHud();
  };
  const need = won ? 0 : Math.max(0, scene.L.stars[0] - scene.score);
  const missing = scene.L.goals.filter((g) => goalProgress(scene.planet, g) < g.count);
  const missingEl =
    !won && missing.length
      ? h(
          'div',
          { class: 'end-missing' },
          h('small', null, t('Still needed:')),
          ...missing.map((g) =>
            h('span', { class: 'goal' }, scene.goalIcon(g), h('b', null, `${goalProgress(scene.planet, g)}/${g.count}`)),
          ),
        )
      : null;
  const m = modal(
    [
      h(
        'div',
        { class: 'end-title' + (won ? '' : ' lost') },
        won ? (scene.o.timeLimit ? t("Time's up!") : t('Planet complete!')) : scene.o.timeLimit ? t("Time's up!") : t('Out of throws'),
      ),
      h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
      h('div', { class: 'end-score' }, t('{n} life', { n: fmt(scene.score) })),
      scene.leftover
        ? h(
            'p',
            { class: 'end-need' },
            tp(scene.leftover, 'Meteor finale: +✨{d} for {n} unused throw', 'Meteor finale: +✨{d} for {n} unused throws', {
              d: scene.leftover * FINISH_DUST_PER_THROW,
            }),
          )
        : null,
      need > 0 && !scene.leftover && !canCont ? h('p', { class: 'end-need' }, t('Just {n} life short of a star.', { n: fmt(need) })) : null,
      missingEl,
      won || scene.o.competitive || scene.o.timeLimit
        ? btn(scene.o.endLabel ?? t('Collect'), 'primary wide', finish)
        : btn(t('Try again'), 'primary wide', () => {
            m.close();
            scene.modalOpen = null;
            scene.finish(0);
          }),
      canCont ? btn(t('+5 throws · 💎{n}', { n: CONTINUE_COST }), 'ghost small', cont) : null,
      canCont && scene.o.gems() < CONTINUE_COST
        ? h(
            'button',
            {
              class: 'btn small',
              type: 'button',
              style: 'background:none;box-shadow:none;color:#bfe8ff;text-decoration:underline',
              onclick: () => waysToEarnGems(),
            },
            t('Ways to earn gems'),
          )
        : null,
    ],
    { dismiss: false, cls: 'end' },
  );
  scene.modalOpen = m;
  if (won) {
    sfx.win();
    haptic.success();
    scene.confetti();
  } else {
    sfx.lose();
    haptic.warn();
  }
}

export function finish(scene: LevelScene, stars: number) {
  if (scene.ended) return;
  scene.ended = true;
  if (!scene.o.endless) {
    if (stars === 0) ledger.count('round_failed');
    ledger.count(
      stars > 0
        ? 'round_won'
        : scene.L.goals.some((g) => goalProgress(scene.planet, g) < g.count)
          ? 'round_failed_goal'
          : 'round_failed_score',
    );
    ledger.add('round_seconds', Math.max(1, Math.round((performance.now() - scene.startedAt) / 1000)));
  }
  const send = () =>
    !scene.destroyed &&
    scene.o.onEnd({
      level: scene.L,
      score: scene.score,
      stars,
      planet: scene.planet,
      won: stars > 0,
      throwsUsed: scene.throwsUsed,
      throwsTotal: scene.throwsTotal,
      leftover: scene.leftover,
      boss: scene.L.twist === 'boss' && scene.bossHp <= 0,
    });
  if (stars === 0 || scene.o.reduceMotion || scene.o.endless) return send();
  // the finished planet shrinks and flies up to join your galaxy
  sfx.whoosh();
  scene.el.querySelector('.hud')?.classList.add('fade-out');
  const t0 = performance.now();
  const step = (now: number) => {
    scene.exitK = Math.min(1, (now - t0) / 750);
    if (Math.random() < 0.8) scene.burst(scene.cx, scene.cy + scene.R, '#ffd76a', 2, 2);
    if (scene.destroyed) return;
    if (scene.exitK < 1) scene.exitRaf = requestAnimationFrame(step);
    else send();
  };
  scene.exitRaf = requestAnimationFrame(step);
}

export function pause(scene: LevelScene) {
  if (scene.ended || scene.modalOpen) return;
  scene.paused = true;
  scene.aimFrom = scene.aimTo = null;
  const m = modal(
    [
      h('div', { class: 'end-title' }, t('Paused')),
      btn(t('Resume'), 'primary wide', () => m.close()),
      btn(t('Restart planet'), 'ghost wide', () => {
        if (scene.ended) return;
        m.close();
        scene.ended = true;
        if (!scene.o.endless) ledger.count('round_restarted');
        scene.o.onEnd({
          level: scene.L,
          score: 0,
          stars: 0,
          planet: scene.planet,
          won: false,
          throwsUsed: -1,
          throwsTotal: scene.throwsTotal,
          leftover: 0,
        });
      }),
      btn(t('Leave to galaxy'), 'ghost wide', () => {
        if (scene.ended) return;
        m.close();
        scene.ended = true;
        scene.o.onQuit();
      }),
    ],
    {
      onClose: () => {
        scene.paused = false;
        if (scene.modalOpen === m) scene.modalOpen = null;
      },
    },
  );
  scene.modalOpen = m;
}

export function afterShot(scene: LevelScene) {
  scene.renderHud();
  scene.showCoach(scene.throwsUsed);
  if (scene.o.endless) return;
  if (scene.over) {
    clearTimeout(scene.endTimer);
    scene.endTimer = window.setTimeout(() => scene.checkEnd(), 1400);
  }
}

export function checkEnd(scene: LevelScene) {
  if (scene.ended || (scene.modalOpen && !scene.paused) || !scene.over) return;
  if (scene.shot || scene.paused) {
    scene.endTimer = window.setTimeout(() => scene.checkEnd(), 300);
    return;
  }
  scene.shownScore = scene.score;
  scene.renderScore();
  scene.endModal(scene.starsNow());
}
