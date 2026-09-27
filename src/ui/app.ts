import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { h, btn, fmt, modal, mountOverlays, closeModals, confirmBox, toast } from './dom';
import { sfx, setAudio, unlockAudio, pauseAudio } from './audio';
import { haptic, setHaptics } from './haptics';
import { LevelScene, type LevelResult } from './game';
import { makeLevel, TWISTS, type LevelDef } from '../core/levels';
import { SPECIES, SPECIES_BY_ID, KINDS, BIOMES, type Rarity } from '../core/world';
import { loadProfile, saveProfile, defaultProfile, today, dayGap, planetRate, type Profile } from '../meta/profile';
import { createIap } from '../meta/iap';
import {
  BOOSTERS,
  CONTINUE_COSTS,
  DAILY_GEMS,
  GEMS_PER_NEW_SPECIES,
  PIGGY_MAX,
  PIGGY_PER_WIN,
  PRODUCTS,
  PRODUCT_BY_ID,
  PRODUCT_BY_KEY,
  SKINS,
  UPGRADES,
  VAULT_HOURS,
  type BoosterId,
  type UpgradeId,
} from '../meta/config';

type ScreenName = 'home' | 'lifebook' | 'upgrades' | 'shop';

export class App {
  root: HTMLElement;
  host!: HTMLElement;
  p!: Profile;
  iap = createIap();
  prices: Record<string, string> = {};
  scene: LevelScene | null = null;
  screen: ScreenName | 'level' = 'home';
  private saveTimer = 0;
  private busy = false;
  private galaxyRaf = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init() {
    this.host = h('div', { class: 'host' });
    this.root.append(this.host);
    mountOverlays(this.root);
    this.p = await loadProfile();
    this.applySettings();
    const unlock = () => {
      unlockAudio();
      removeEventListener('pointerdown', unlock);
    };
    addEventListener('pointerdown', unlock);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      CapApp.addListener('pause', () => {
        saveProfile(this.p);
        pauseAudio(true);
      });
      CapApp.addListener('resume', () => {
        pauseAudio(false);
        if (this.screen === 'home') this.showHome();
        this.daily();
      });
    }
    document.addEventListener('visibilitychange', () => document.hidden && saveProfile(this.p));
    this.iap
      .init((pid, tx) => this.grant(pid, tx))
      .then(() => this.iap.prices())
      .then((pr) => {
        this.prices = pr;
        if (this.screen === 'shop') this.showShop();
      })
      .catch(() => {});
    if (!this.p.tutorial) this.startLevel(1, true);
    else {
      this.showHome();
      this.daily();
    }
  }

  applySettings() {
    setAudio(this.p.settings.sound, this.p.settings.music);
    setHaptics(this.p.settings.haptics);
  }

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => saveProfile(this.p), 150);
  }

  private mount(el: HTMLElement, name: ScreenName | 'level') {
    cancelAnimationFrame(this.galaxyRaf);
    this.scene?.destroy();
    this.scene = null;
    closeModals();
    this.host.replaceChildren(el);
    this.screen = name;
  }

  // ------------------------------------------------------------------ idle stardust
  pendingDust(): number {
    const hours = Math.min(VAULT_HOURS[this.p.upgrades.vault], (Date.now() - this.p.lastCollect) / 3600000);
    const rate = this.p.galaxy.reduce((a, g) => a + planetRate(g), 0);
    return Math.floor(rate * hours);
  }

  collectDust() {
    const d = this.pendingDust();
    if (d <= 0) return 0;
    this.p.dust += d;
    this.p.lastCollect = Date.now();
    this.save();
    return d;
  }

  // ------------------------------------------------------------------ daily
  daily() {
    const t = today();
    if (this.p.daily.last === t || !this.p.tutorial) return;
    const gap = this.p.daily.last ? dayGap(this.p.daily.last, t) : 99;
    const streak = gap === 1 ? this.p.daily.streak + 1 : 1;
    const idx = Math.min(streak, DAILY_GEMS.length) - 1;
    const m = modal(
      [
        h('div', { class: 'm-title' }, 'Daily gift'),
        h('p', { class: 'muted' }, streak > 1 ? `${streak}-day streak! Come back tomorrow for more.` : 'Visit every day to grow your streak.'),
        h('div', { class: 'streak' }, ...DAILY_GEMS.map((g, i) => h('div', { class: `sd${i < idx ? ' done' : ''}${i === idx ? ' today' : ''}` }, h('small', null, `Day ${i + 1}`), h('b', null, String(g)), i < idx ? '✓' : '💎'))),
        btn(`Collect ${DAILY_GEMS[idx]} 💎`, 'primary wide', () => {
          this.p.daily = { last: t, streak };
          this.p.gems += DAILY_GEMS[idx];
          this.save();
          sfx.gem();
          haptic.success();
          m.close();
          if (this.screen === 'home') this.showHome();
        }),
      ],
      { dismiss: false },
    );
  }

  // ------------------------------------------------------------------ top bar
  private topBar(back = false): HTMLElement {
    return h(
      'div',
      { class: 'topbar' },
      back ? h('button', { class: 'icon', 'aria-label': 'Back', onclick: () => { sfx.click(); this.showHome(); } }, '‹') : h('button', { class: 'icon', 'aria-label': 'Settings', onclick: () => this.settings() }, '⚙'),
      h('div', { class: 'grow' }),
      h('button', { class: 'pill dust', onclick: () => this.showUpgrades() }, `✨ ${fmt(this.p.dust)}`),
      h('button', { class: 'pill gems', onclick: () => this.showShop() }, `💎 ${fmt(this.p.gems)}`, h('span', { class: 'plus' }, '+')),
    );
  }

  // ------------------------------------------------------------------ home (galaxy)
  showHome() {
    const p = this.p;
    const next = makeLevel(p.level);
    const pending = this.pendingDust();
    const canvas = h('canvas', { class: 'galaxy' });
    const totalStars = Object.values(p.stars).reduce((a, b) => a + b, 0);
    const seen = p.seen.length;
    const collect = btn(h('span', { class: 'stack' }, h('b', null, `Collect ✨ ${fmt(pending)}`), h('small', null, `${fmt(p.galaxy.reduce((a, g) => a + planetRate(g), 0))} stardust / hour`)), 'dust-btn', () => {
      const d = this.collectDust();
      if (d) {
        sfx.coin();
        haptic.success();
        toast(`+${fmt(d)} stardust`, 'good');
      }
      this.showHome();
    });
    collect.disabled = pending <= 0;
    const el = h(
      'div',
      { class: 'screen home' },
      this.topBar(),
      h('div', { class: 'title' }, h('span', null, 'Pocket'), h('span', null, 'Planet')),
      h('div', { class: 'galaxy-wrap' }, canvas, p.galaxy.length ? null : h('div', { class: 'galaxy-empty' }, 'Your galaxy is empty.\nFinish planets to fill it!')),
      p.galaxy.length ? collect : null,
      btn(
        h('span', { class: 'stack' }, h('b', null, `▶ PLAY  Planet ${p.level}`), h('small', null, next.twist !== 'none' ? TWISTS[next.twist].name : next.name)),
        'primary big wide',
        () => this.preLevel(p.level),
      ),
      h(
        'div',
        { class: 'nav' },
        this.navBtn('📖', 'Lifebook', `${seen}/${SPECIES.length}`, () => this.showLifebook()),
        this.navBtn('⬆️', 'Upgrades', '', () => this.showUpgrades()),
        this.navBtn('🛍️', 'Shop', p.starter ? '' : 'OFFER', () => this.showShop()),
        this.navBtn('🗺️', 'Replay', `${totalStars}★`, () => this.replayList()),
      ),
      p.piggy >= 40 ? h('button', { class: 'piggy-chip', onclick: () => this.showShop() }, `🐷 Piggy bank: 💎 ${p.piggy}`) : null,
    );
    this.mount(el, 'home');
    this.drawGalaxy(canvas);
  }

  private navBtn(icon: string, label: string, badge: string, fn: () => void) {
    return h('button', { class: 'nav-btn', onclick: () => { sfx.click(); haptic.light(); fn(); } }, h('span', { class: 'ni' }, icon), h('span', { class: 'nl' }, label), badge ? h('span', { class: 'nb' }, badge) : null);
  }

  private drawGalaxy(c: HTMLCanvasElement) {
    const g = c.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const planets = this.p.galaxy.slice(-12);
    const rnd = (i: number) => ((Math.sin(i * 91.7) * 43758.5) % 1 + 1) % 1;
    const draw = (now: number) => {
      const r = c.getBoundingClientRect();
      if (c.width !== Math.round(r.width * dpr)) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = r.width;
      const H = r.height;
      const cx = w / 2;
      const cy = H / 2;
      const t = now / 1000;
      g.clearRect(0, 0, w, H);
      for (let i = 0; i < 60; i++) {
        g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + i));
        g.fillStyle = '#fff';
        g.fillRect(rnd(i) * w, rnd(i + 100) * H, 1.5, 1.5);
      }
      g.globalAlpha = 1;
      const sun = g.createRadialGradient(cx, cy, 2, cx, cy, 34);
      sun.addColorStop(0, '#fff6c2');
      sun.addColorStop(0.4, '#ffc34a');
      sun.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = sun;
      g.beginPath();
      g.arc(cx, cy, 34, 0, Math.PI * 2);
      g.fill();
      const maxR = Math.min(w, H) / 2 - 18;
      planets.forEach((pl, i) => {
        const orbit = 42 + ((maxR - 42) * (i + 1)) / Math.max(planets.length, 4);
        g.strokeStyle = 'rgba(255,255,255,0.08)';
        g.beginPath();
        g.arc(cx, cy, orbit, 0, Math.PI * 2);
        g.stroke();
        const a = t * (0.35 / (1 + i * 0.35)) + rnd(pl.n) * 6.28;
        const x = cx + Math.cos(a) * orbit;
        const y = cy + Math.sin(a) * orbit * 0.62;
        const size = 9 + Math.min(8, pl.species.length);
        const cols = pl.colors?.length ? pl.colors : [`hsl(${pl.hue} 60% 55%)`];
        const spin = t * 0.6 + i;
        cols.forEach((col, k) => {
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(x, y);
          g.arc(x, y, size, spin + (k / cols.length) * Math.PI * 2, spin + ((k + 1) / cols.length) * Math.PI * 2);
          g.fill();
        });
        const pg = g.createRadialGradient(x - size / 3, y - size / 3, 1, x, y, size);
        pg.addColorStop(0, 'rgba(255,255,255,0.35)');
        pg.addColorStop(1, 'rgba(0,0,30,0.45)');
        g.fillStyle = pg;
        g.beginPath();
        g.arc(x, y, size, 0, Math.PI * 2);
        g.fill();
        const sp = pl.species[0] ? SPECIES_BY_ID[pl.species[0]] : null;
        if (sp) {
          g.font = `${Math.round(size * 1.1)}px "Apple Color Emoji","Noto Color Emoji",sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(sp.emoji, x, y - size - 6);
        }
      });
      this.galaxyRaf = requestAnimationFrame(draw);
    };
    this.galaxyRaf = requestAnimationFrame(draw);
  }

  // ------------------------------------------------------------------ level flow
  preLevel(n: number) {
    const L = makeLevel(n);
    const chosen: Record<BoosterId, boolean> = { shower: false, spark: false, scope: false };
    const kinds = Object.values(KINDS).filter((k) => k.unlock <= n);
    const newKind = kinds.find((k) => k.unlock === n);
    const row = h('div', { class: 'boosters' });
    const renderBoosters = () => {
      row.replaceChildren(
        ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
          const b = BOOSTERS[id];
          const owned = this.p.boosters[id];
          const el = h('button', { class: `booster${chosen[id] ? ' on' : ''}` }, h('span', { class: 'be' }, b.emoji), h('span', { class: 'bn' }, b.name), h('span', { class: 'bc' }, owned > 0 ? `×${owned}` : `✨${b.dust}`));
          el.addEventListener('click', () => {
            sfx.click();
            if (chosen[id]) chosen[id] = false;
            else if (owned > 0) chosen[id] = true;
            else if (this.p.dust >= b.dust) {
              this.p.dust -= b.dust;
              this.p.boosters[id]++;
              chosen[id] = true;
              sfx.coin();
              this.save();
            } else {
              sfx.error();
              toast(`Needs ✨${b.dust} stardust — or 💎${b.gems} in the Shop`, 'bad');
            }
            renderBoosters();
          });
          return el;
        }),
      );
    };
    renderBoosters();
    const best = this.p.stars[n] ?? 0;
    const m = modal(
      [
        h('div', { class: 'm-sub' }, `Planet ${n}`),
        h('div', { class: 'm-title' }, L.name),
        L.twist !== 'none' ? h('div', { class: 'twist-chip' }, `${TWISTS[L.twist].name}: ${TWISTS[L.twist].desc}`) : null,
        h('div', { class: 'targets' }, ...L.stars.map((t, i) => h('div', { class: `tg${i < best ? ' got' : ''}` }, h('b', null, '★'.repeat(i + 1)), h('span', null, `${fmt(t)} life`)))),
        h('div', { class: 'kinds' }, ...kinds.map((k) => h('span', { class: `kc${k === newKind ? ' new' : ''}`, title: k.desc }, k.emoji, k === newKind ? h('small', null, 'NEW') : null))),
        newKind ? h('p', { class: 'newkind' }, `New: ${newKind.emoji} ${newKind.name} — ${newKind.desc}`) : null,
        h('div', { class: 'm-sub' }, 'Boosters'),
        row,
        btn('Launch!', 'primary big wide', () => {
          for (const id of Object.keys(chosen) as BoosterId[]) if (chosen[id]) this.p.boosters[id]--;
          this.save();
          m.close();
          this.startLevel(n, false, chosen, L);
        }),
      ],
      { cls: 'pre' },
    );
  }

  startLevel(n: number, tutorial = false, boosters: Record<BoosterId, boolean> = { shower: false, spark: false, scope: false }, L: LevelDef = makeLevel(n)) {
    this.p.stats.plays++;
    const skin = SKINS.find((s) => s.id === this.p.skin) ?? SKINS[0];
    const seen = new Set(this.p.seen);
    const scene = new LevelScene(L, {
      scopeLevel: tutorial ? 3 : this.p.upgrades.scope,
      splash: this.p.upgrades.splash,
      extraThrows: this.p.upgrades.throws,
      boosters,
      glow: skin.glow,
      seen,
      tutorial: tutorial || n === 1,
      gems: () => this.p.gems,
      spendGems: (g) => {
        if (this.p.gems < g) return false;
        this.p.gems -= g;
        this.save();
        return true;
      },
      continueCost: (i) => CONTINUE_COSTS[Math.min(i, CONTINUE_COSTS.length - 1)],
      onNewSpecies: (id) => {
        this.p.seen.push(id);
        this.p.gems += GEMS_PER_NEW_SPECIES;
        this.save();
      },
      onEnd: (r) => this.levelEnded(r),
      onQuit: () => this.showHome(),
      onShop: () => this.showShop(),
    });
    this.mount(scene.el, 'level');
    this.scene = scene;
  }

  private levelEnded(r: LevelResult) {
    const n = r.level.n;
    if (r.throwsUsed === -1) return this.startLevel(n); // restart
    if (!r.won) return this.startLevel(n);
    const p = this.p;
    const prevStars = p.stars[n] ?? 0;
    const firstClear = prevStars === 0;
    const dust = 25 + r.stars * 15 + (firstClear ? 40 : 0);
    const gems = r.stars === 3 && prevStars < 3 ? 2 : 0;
    p.stars[n] = Math.max(prevStars, r.stars);
    p.dust += dust;
    p.gems += gems;
    p.piggy = Math.min(PIGGY_MAX, p.piggy + PIGGY_PER_WIN);
    p.stats.wins++;
    p.stats.bestLife = Math.max(p.stats.bestLife, r.score);
    const counts = new Map<string, number>();
    for (const sec of r.planet.sectors) if (sec.biome !== 'barren') counts.set(BIOMES[sec.biome].color, (counts.get(BIOMES[sec.biome].color) ?? 0) + 1);
    const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
    const entry = { n, name: r.level.name, hue: r.level.hue, stars: p.stars[n], species: [...r.planet.speciesFound], life: r.score, colors };
    const existing = p.galaxy.findIndex((g) => g.n === n);
    if (existing >= 0) {
      if (r.score >= p.galaxy[existing].life) p.galaxy[existing] = entry;
    } else {
      if (!p.galaxy.length) p.lastCollect = Date.now();
      p.galaxy.push(entry);
    }
    if (n === p.level) p.level++;
    const wasTutorial = !p.tutorial;
    p.tutorial = true;
    saveProfile(p);
    const m = modal(
      [
        h('div', { class: 'm-title' }, firstClear ? 'Planet added to your galaxy!' : 'Planet improved!'),
        h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < r.stars ? 'on' : '' }, '★'))),
        h('div', { class: 'rewards' }, h('div', null, h('b', null, `✨ ${dust}`), h('small', null, 'stardust')), gems ? h('div', null, h('b', null, `💎 ${gems}`), h('small', null, '3-star bonus')) : null, h('div', null, h('b', null, `${r.planet.speciesFound.length}`), h('small', null, 'creatures'))),
        h('p', { class: 'muted' }, `It now makes ✨${planetRate(entry)}/hour for you, even while you're away.`),
        h('div', { class: 'row' },
          btn('Galaxy', 'ghost', () => { m.close(); this.showHome(); if (wasTutorial) this.daily(); }),
          btn(`Next ▶`, 'primary', () => { m.close(); if (wasTutorial) this.startLevel(p.level); else this.preLevel(p.level); }),
        ),
      ],
      { dismiss: false },
    );
  }

  private replayList() {
    const p = this.p;
    const list = h('div', { class: 'replay' });
    for (let n = 1; n < p.level; n++) {
      const s = p.stars[n] ?? 0;
      list.append(btn(h('span', { class: 'stack' }, h('b', null, String(n)), h('small', null, '★'.repeat(s) + '☆'.repeat(3 - s))), `lv${s === 3 ? ' gold' : ''}`, () => { m.close(); this.preLevel(n); }));
    }
    const m = modal([h('div', { class: 'm-title' }, 'Replay for 3 stars'), p.level > 1 ? list : h('p', { class: 'muted' }, 'Finish a planet first!')], { cls: 'tall' });
  }

  // ------------------------------------------------------------------ lifebook
  showLifebook() {
    const seen = new Set(this.p.seen);
    const order: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
    const label: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };
    const sections = order.map((r) =>
      h(
        'div',
        { class: 'lb-sec' },
        h('div', { class: 'sec-title' }, label[r]),
        h('div', { class: 'lb-grid' }, ...SPECIES.filter((s) => s.rarity === r).map((s) => {
          const got = seen.has(s.id);
          return h('div', { class: `lb r-${r}${got ? '' : ' locked'}` }, h('div', { class: 'lbe' }, got ? s.emoji : '?'), h('div', { class: 'lbn' }, got ? s.name : '???'), h('div', { class: 'lbh' }, s.hint));
        })),
      ),
    );
    const biomes = h('div', { class: 'biome-list' }, ...Object.values(BIOMES).filter((b) => b.id !== 'barren').map((b) => h('div', { class: 'bchip', style: `--c:${b.color}` }, h('b', null, `${b.deco} ${b.name}`), h('small', null, b.recipe ?? ''))));
    this.mount(h('div', { class: 'screen page' }, this.topBar(true), h('div', { class: 'page-title' }, `Lifebook ${seen.size}/${SPECIES.length}`), h('div', { class: 'scroll' }, h('p', { class: 'muted' }, `Each new creature you discover gives 💎${GEMS_PER_NEW_SPECIES}. Hints show where they live.`), ...sections, h('div', { class: 'sec-title' }, 'How to make each land'), biomes)), 'lifebook');
  }

  // ------------------------------------------------------------------ upgrades
  showUpgrades() {
    const p = this.p;
    const rows = (Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
      const u = UPGRADES[id];
      const lv = p.upgrades[id];
      const max = lv >= u.costs.length;
      const cost = u.costs[lv];
      return h(
        'div',
        { class: 'up-row' },
        h('div', { class: 'up-ic' }, u.emoji),
        h('div', { class: 'up-body' }, h('b', null, u.name), h('small', null, u.desc(lv)), h('div', { class: 'pips' }, ...u.costs.map((_, i) => h('i', { class: i < lv ? 'on' : '' })))),
        max
          ? h('div', { class: 'up-max' }, 'MAX')
          : btn(`✨${fmt(cost)}`, `buy${p.dust >= cost ? '' : ' dim'}`, () => {
              if (p.dust < cost) {
                sfx.error();
                return toast('Not enough stardust — collect from your galaxy!', 'bad');
              }
              p.dust -= cost;
              p.upgrades[id]++;
              sfx.coin();
              haptic.success();
              this.save();
              this.showUpgrades();
            }),
      );
    });
    this.mount(h('div', { class: 'screen page' }, this.topBar(true), h('div', { class: 'page-title' }, 'Upgrades'), h('div', { class: 'scroll' }, h('p', { class: 'muted' }, 'Spend stardust from your galaxy on permanent upgrades.'), ...rows)), 'upgrades');
  }

  // ------------------------------------------------------------------ shop
  priceOf(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return this.prices[pr.id] ?? pr.fallbackPrice;
  }

  showShop() {
    const p = this.p;
    const offer = !p.starter
      ? h(
          'div',
          { class: 'offer' },
          h('div', { class: 'ribbon' }, 'ONE-TIME'),
          h('div', { class: 'offer-t' }, 'Starter Pack'),
          h('ul', null, h('li', null, '💎 300 gems'), h('li', null, '🌠 ✨ 🔭 5 of every booster'), h('li', null, '🌈 Aurora atmosphere')),
          btn(this.priceOf('starter'), 'buy-real wide', () => this.buy('starter')),
        )
      : null;
    const piggy = h(
      'div',
      { class: 'piggy' },
      h('div', { class: 'piggy-ic' }, '🐷'),
      h('div', { class: 'piggy-body' }, h('b', null, `Piggy bank: 💎 ${p.piggy}`), h('small', null, `Every planet you finish drops 💎${PIGGY_PER_WIN} in (max ${PIGGY_MAX}). Break it to keep them all.`), h('div', { class: 'pbar' }, h('i', { style: `width:${(p.piggy / PIGGY_MAX) * 100}%` }))),
      btn(this.priceOf('piggy'), `buy-real${p.piggy >= 40 ? '' : ' dim'}`, () => (p.piggy >= 40 ? this.buy('piggy') : toast('Fill it to 40 gems first — finish more planets!'))),
    );
    const packs = h(
      'div',
      { class: 'packs' },
      ...PRODUCTS.filter((x) => x.consumable && x.gems > 0).map((x, i) =>
        h('button', { class: 'pack', onclick: () => this.buy(x.key) }, x.tag ? h('div', { class: 'tag' }, x.tag) : null, h('div', { class: 'pi' }, ['💎', '👝', '🧰', '🌌'][i]), h('b', null, fmt(x.gems)), h('small', null, x.title), h('div', { class: 'pp' }, this.priceOf(x.key))),
      ),
    );
    const boosters = h(
      'div',
      { class: 'bshop' },
      ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
        const b = BOOSTERS[id];
        return h('div', { class: 'up-row' }, h('div', { class: 'up-ic' }, b.emoji), h('div', { class: 'up-body' }, h('b', null, `${b.name} ×${p.boosters[id]}`), h('small', null, b.desc)), btn(`💎${b.gems}`, 'buy', () => {
          if (p.gems < b.gems) return this.needGems();
          p.gems -= b.gems;
          p.boosters[id]++;
          sfx.coin();
          this.save();
          this.showShop();
        }));
      }),
    );
    const skins = h(
      'div',
      { class: 'skins' },
      ...SKINS.map((s) => {
        const owned = p.skins.includes(s.id);
        const on = p.skin === s.id;
        return h(
          'button',
          {
            class: `skin${on ? ' on' : ''}`,
            onclick: async () => {
              if (owned) p.skin = s.id;
              else if (s.starter) return toast('Included in the Starter Pack');
              else {
                if (p.gems < s.gems) return this.needGems();
                if (!(await confirmBox(`Buy ${s.name} for 💎${s.gems}?`, 'Buy'))) return;
                p.gems -= s.gems;
                p.skins.push(s.id);
                p.skin = s.id;
              }
              sfx.coin();
              this.save();
              this.showShop();
            },
          },
          h('div', { class: 'sk-orb', style: `--g:${s.glow === 'aurora' ? 'conic-gradient(#ff8fc8,#6ec8ff,#b8ff6e,#ffd24a,#ff8fc8)' : s.glow}` }),
          h('b', null, s.name),
          h('small', null, on ? 'Equipped' : owned ? 'Equip' : s.starter ? 'Starter Pack' : `💎${s.gems}`),
        );
      }),
    );
    this.mount(
      h(
        'div',
        { class: 'screen page' },
        this.topBar(true),
        h('div', { class: 'page-title' }, 'Shop'),
        h('div', { class: 'scroll' }, offer, piggy, h('div', { class: 'sec-title' }, 'Gems'), packs, h('div', { class: 'sec-title' }, 'Boosters'), boosters, h('div', { class: 'sec-title' }, 'Atmospheres'), skins, btn('Restore purchases', 'ghost small', () => this.restore()), h('p', { class: 'tiny muted' }, 'Payment is charged to your Apple ID. Gems have no cash value.')),
      ),
      'shop',
    );
  }

  private needGems() {
    sfx.error();
    toast('Not enough gems — grab a pack above!', 'bad');
  }

  async buy(key: string) {
    if (this.busy) return;
    const pr = PRODUCT_BY_KEY[key];
    if (key === 'starter' && this.p.starter) return;
    this.busy = true;
    this.root.classList.add('buying');
    try {
      const r = await this.iap.purchase(pr);
      if (r.ok) this.grant(r.productId ?? pr.id, r.txId ?? `local-${Date.now()}`);
      else if (!r.cancelled && r.error) toast(r.error, 'bad');
    } finally {
      this.busy = false;
      this.root.classList.remove('buying');
    }
  }

  grant(productId: string, txId: string) {
    const p = this.p;
    const def = PRODUCT_BY_ID[productId];
    if (!def || p.processedTx.includes(txId)) return;
    p.processedTx = [...p.processedTx.slice(-200), txId];
    let gems = def.gems;
    if (def.key === 'piggy') {
      gems = p.piggy;
      p.piggy = 0;
    }
    if (def.key === 'starter') {
      if (p.starter) gems = 0;
      p.starter = true;
      if (!p.skins.includes('aurora')) p.skins.push('aurora');
      for (const id of Object.keys(p.boosters) as BoosterId[]) p.boosters[id] += 5;
    }
    p.gems += gems;
    saveProfile(p);
    sfx.gem();
    haptic.success();
    toast(gems ? `Thank you! +${gems} 💎` : `${def.title} unlocked!`, 'good');
    if (this.screen === 'shop') this.showShop();
  }

  async restore() {
    const owned = await this.iap.restore();
    if (owned.some((id) => PRODUCT_BY_ID[id]?.key === 'starter') && !this.p.starter) {
      this.p.starter = true;
      if (!this.p.skins.includes('aurora')) this.p.skins.push('aurora');
      saveProfile(this.p);
      toast('Starter Pack restored!', 'good');
    } else toast(this.iap.kind === 'native' ? 'Nothing to restore' : 'Restore works in the iOS app');
    if (this.screen === 'shop') this.showShop();
  }

  // ------------------------------------------------------------------ settings
  settings() {
    const s = this.p.settings;
    const tog = (label: string, key: keyof typeof s) => {
      const b = h('button', { class: `toggle${s[key] ? ' on' : ''}` }, label, h('i'));
      b.addEventListener('click', () => {
        s[key] = !s[key];
        b.classList.toggle('on', s[key]);
        this.applySettings();
        this.save();
        sfx.click();
      });
      return b;
    };
    const m = modal([
      h('div', { class: 'm-title' }, 'Settings'),
      tog('Sound', 'sound'),
      tog('Music', 'music'),
      tog('Haptics', 'haptics'),
      btn('How to play', 'ghost wide', () => { m.close(); this.howTo(); }),
      btn('Restore purchases', 'ghost wide', () => this.restore()),
      btn('Reset progress', 'danger wide', async () => {
        m.close();
        if (!(await confirmBox('Erase all progress? This cannot be undone.', 'Erase'))) return;
        const tx = this.p.processedTx;
        this.p = defaultProfile();
        this.p.processedTx = tx;
        await saveProfile(this.p);
        this.startLevel(1, true);
      }),
      h('p', { class: 'tiny muted' }, 'Pocket Planet v1.0 · No accounts, no tracking. Progress is saved on this device.'),
    ]);
  }

  howTo() {
    modal([
      h('div', { class: 'm-title' }, 'How to play'),
      h('div', { class: 'howto' },
        h('p', null, '👆 Pull back anywhere and let go to fling. Gravity bends your shot — watch the dotted line.'),
        h('p', null, '🪨 Rock raises land · ☄️ Ice makes oceans · 🌱 Seeds grow life · 🔥 Magma heats & builds volcanoes'),
        h('p', null, '🦌 Creatures appear when the right lands meet — a Forest next to an Ocean brings Otters!'),
        h('p', null, '★ Reach the life target before your throws run out. Tap the small bubble to swap objects.'),
        h('p', null, '✨ Finished planets orbit your galaxy and make stardust, even while you are away.'),
      ),
    ]);
  }
}
