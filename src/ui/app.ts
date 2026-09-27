// App shell: owns the profile, screen mounting, purchases and the level flow.
// Each screen lives in ./screens and each modal flow in ./flows.
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { h, fmt, mountOverlays, closeModals, toast } from './dom';
import { sfx, setAudio, unlockAudio, pauseAudio } from './audio';
import { haptic, setHaptics } from './haptics';
import { LevelScene, type LevelResult, type SceneOpts } from './game';
import { makeLevel, type LevelDef } from '../core/levels';
import { KINDS, type Kind } from '../core/world';
import { loadProfile, saveProfile, today, type Profile } from '../meta/profile';
import { createIap } from '../meta/iap';
import { CONTINUE_COSTS, PRODUCT_BY_ID, PRODUCT_BY_KEY, SKINS, type BoosterId } from '../meta/config';
import { discoverSpecies, grantProduct, spendGems, track } from '../meta/economy';
import { ensureQuests } from '../meta/progression';
import { MOMENTUM_PERKS, momentumActive, momentumLoss, momentumWin } from '../meta/momentum';
import { addVisitors } from '../meta/visitors';
import { rankFlow } from './flows/rank';
import { visitorsFlow } from './flows/visitors';
import { modesFlow } from './flows/modes';
import { welcomeBackFlow } from './flows/offers';
import { showHome } from './screens/home';
import { showLifebook } from './screens/lifebook';
import { showUpgrades } from './screens/upgrades';
import { showShop } from './screens/shop';
import { showStarMap } from './screens/starmap';
import { showRoad } from './screens/road';
import { dailyGiftFlow } from './flows/daily';
import { preLevel } from './flows/prelevel';
import { levelResults } from './flows/results';
import { settingsFlow } from './flows/settings';
import { questsFlow } from './flows/quests';

/** Coach tips for the first planets, keyed by level then by throws used. */
const COACH: Record<number, Record<number, string>> = {
  1: {
    1: 'Rock raised the land! Next up: the Ice Comet makes oceans.',
    2: 'Creatures move in where lands meet. Tap the small bubble to swap objects.',
    4: 'Fill the life bar past the ★ marks to earn stars.',
  },
  2: {
    0: 'New: Seed Pods grow meadows and forests. Try one on land!',
    2: 'A forest next to an ocean brings otters. The Lifebook lists every recipe.',
  },
  3: {
    0: 'The planet spins while your throw flies — aim a little ahead.',
    2: 'While aiming, the label shows what that spot will become.',
  },
};

export type ScreenName = 'home' | 'lifebook' | 'upgrades' | 'shop' | 'map' | 'road' | 'level';
export type Boosters = Record<BoosterId, boolean>;
export const NO_BOOSTERS: Boosters = { shower: false, spark: false, scope: false };

export class App {
  root: HTMLElement;
  host!: HTMLElement;
  p!: Profile;
  iap = createIap();
  prices: Record<string, string> = {};
  scene: LevelScene | null = null;
  screen: ScreenName = 'home';
  /** Cleanup for the current screen (animation loops etc). */
  private teardown: (() => void) | null = null;
  private saveTimer = 0;
  private awayMs = 0;
  private busy = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init() {
    this.host = h('div', { class: 'host' });
    this.root.append(this.host);
    mountOverlays(this.root);
    this.p = await loadProfile();
    this.p.meta.sessions++;
    this.applySettings();
    ensureQuests(this.p, today());
    addVisitors(this.p, Date.now());
    this.awayMs = Date.now() - this.p.meta.lastSeen;
    this.p.meta.lastSeen = Date.now();
    const unlock = () => {
      unlockAudio();
      removeEventListener('pointerdown', unlock);
    };
    addEventListener('pointerdown', unlock);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      CapApp.addListener('pause', () => {
        this.p.meta.lastSeen = Date.now();
        saveProfile(this.p);
        pauseAudio(true);
      });
      CapApp.addListener('resume', () => {
        pauseAudio(false);
        ensureQuests(this.p, today());
        if (addVisitors(this.p, Date.now())) this.save();
        this.awayMs = Date.now() - this.p.meta.lastSeen;
        this.p.meta.lastSeen = Date.now();
        if (this.screen === 'home') this.showHome();
        this.daily();
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      this.p.meta.lastSeen = Date.now();
      saveProfile(this.p);
    });
    this.iap
      .init((pid, tx) => this.grant(pid, tx))
      .then(() => this.iap.prices())
      .then((pr) => {
        this.prices = pr;
        if (this.screen === 'shop') this.showShop();
      })
      .catch(() => {});
    if (!this.p.tutorial) this.startLevel(1, { tutorial: true });
    else {
      this.showHome();
      this.daily();
    }
    this.save();
  }

  applySettings() {
    setAudio(this.p.settings.sound, this.p.settings.music);
    setHaptics(this.p.settings.haptics);
    document.documentElement.classList.toggle('reduce-motion', this.p.settings.reduceMotion);
  }

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => saveProfile(this.p), 150);
  }

  saveNow() {
    clearTimeout(this.saveTimer);
    return saveProfile(this.p);
  }

  mount(el: HTMLElement, name: ScreenName, teardown: (() => void) | null = null) {
    this.teardown?.();
    this.teardown = teardown;
    this.scene?.destroy();
    this.scene = null;
    closeModals();
    el.classList.add('enter');
    this.host.replaceChildren(el);
    this.screen = name;
  }

  /** Re-render whatever non-level screen is showing (after currencies change). */
  refresh() {
    const map: Partial<Record<ScreenName, () => void>> = {
      home: () => this.showHome(),
      shop: () => this.showShop(),
      upgrades: () => this.showUpgrades(),
      map: () => this.showStarMap(),
      road: () => this.showRoad(),
    };
    map[this.screen]?.();
  }

  // ------------------------------------------------------------------ navigation
  showHome() {
    showHome(this);
  }
  showLifebook() {
    showLifebook(this);
  }
  showUpgrades() {
    showUpgrades(this);
  }
  showShop() {
    showShop(this);
  }
  showStarMap() {
    showStarMap(this);
  }
  showRoad() {
    showRoad(this);
  }
  settings() {
    settingsFlow(this);
  }
  quests() {
    questsFlow(this);
  }
  rank() {
    rankFlow(this);
  }
  visitors() {
    visitorsFlow(this);
  }
  modes() {
    modesFlow(this);
  }
  /** Launch sequence: daily gift, then any visitors' gifts. */
  daily() {
    if (!this.p.tutorial) return;
    const away = this.awayMs;
    this.awayMs = 0;
    dailyGiftFlow(this, () =>
      welcomeBackFlow(this, away, () => {
        if (this.p.visitors.length && this.screen === 'home') this.visitors();
      }),
    );
  }
  preLevel(n: number) {
    preLevel(this, n);
  }

  /** Shared top bar with currencies. */
  topBar(back = false): HTMLElement {
    return h(
      'div',
      { class: 'topbar' },
      back
        ? h('button', { class: 'icon', 'aria-label': 'Back', onclick: () => (sfx.click(), this.showHome()) }, '‹')
        : h('button', { class: 'icon', 'aria-label': 'Settings', onclick: () => this.settings() }, '⚙'),
      h('div', { class: 'grow' }),
      h('button', { class: 'pill dust', 'aria-label': 'Stardust', onclick: () => this.showUpgrades() }, `✨ ${fmt(this.p.dust)}`),
      h(
        'button',
        { class: 'pill gems', 'aria-label': 'Gems', onclick: () => this.showShop() },
        `💎 ${fmt(this.p.gems)}`,
        h('span', { class: 'plus' }, '+'),
      ),
    );
  }

  // ------------------------------------------------------------------ level flow
  sceneOpts(extra: Partial<SceneOpts> & Pick<SceneOpts, 'onEnd'>, boosters: Boosters = NO_BOOSTERS, tutorial = false): SceneOpts {
    const skin = SKINS.find((s) => s.id === this.p.skin) ?? SKINS[0];
    return {
      scopeLevel: tutorial ? 3 : this.p.upgrades.scope,
      splash: this.p.upgrades.splash,
      extraThrows: this.p.upgrades.throws,
      boosters,
      glow: skin.glow,
      seen: new Set(this.p.seen),
      tutorial,
      reduceMotion: this.p.settings.reduceMotion,
      gems: () => this.p.gems,
      spendGems: (g) => {
        const ok = spendGems(this.p, g);
        if (ok) this.save();
        return ok;
      },
      continueCost: (i) => CONTINUE_COSTS[Math.min(i, CONTINUE_COSTS.length - 1)],
      onNewSpecies: (id) => {
        discoverSpecies(this.p, id);
        this.save();
      },
      onSpecies: () => {
        this.p.stats.creatures++;
        track(this.p, 'creature');
      },
      onThrow: () => {
        this.p.stats.throws++;
        track(this.p, 'throw');
      },
      onTransform: (n) => track(this.p, 'land', n),
      onQuit: () => this.showHome(),
      onShop: () => this.showShop(),
      ...extra,
    };
  }

  startLevel(n: number, o: { tutorial?: boolean; boosters?: Boosters; level?: LevelDef } = {}) {
    const L = o.level ?? makeLevel(n);
    const boosters = o.boosters ?? NO_BOOSTERS;
    if (Object.values(boosters).some(Boolean)) track(this.p, 'booster');
    this.p.stats.plays++;
    const tier = momentumActive(this.p) ? this.p.momentum.streak : 0;
    const perk = MOMENTUM_PERKS[tier];
    const merged: Boosters = { shower: boosters.shower, spark: boosters.spark || perk.spark, scope: boosters.scope || perk.scope };
    const debut = (Object.values(KINDS) as { id: Kind; unlock: number }[]).find((k) => k.unlock === n && n > 2);
    const opts = this.sceneOpts(
      { onEnd: (r) => this.levelEnded(r), momentum: tier, coach: COACH[n], intro: debut && n === this.p.level ? debut.id : undefined },
      merged,
      !!o.tutorial || n === 1,
    );
    opts.extraThrows += perk.throws;
    const scene = new LevelScene(L, opts);
    this.mount(scene.el, 'level');
    this.scene = scene;
  }

  private levelEnded(r: LevelResult) {
    if (r.throwsUsed === -1 || !r.won) {
      const res = momentumLoss(this.p, today());
      this.save();
      this.startLevel(r.level.n);
      if (res === 'shield') toast('🛡️ Your daily shield kept your Momentum!', 'good');
      if (res === 'lost') toast('Momentum lost — win to build it back up', 'bad');
      return;
    }
    momentumWin(this.p);
    levelResults(this, r);
  }

  // ------------------------------------------------------------------ purchases
  priceOf(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return this.prices[pr.id] ?? pr.fallbackPrice;
  }

  needGems() {
    sfx.error();
    toast('Not enough gems — grab a pack in the Shop!', 'bad');
  }

  async buy(key: string) {
    if (this.busy) return;
    const pr = PRODUCT_BY_KEY[key];
    if ((key === 'starter' && this.p.starter) || (key === 'pass' && this.p.pass)) return;
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
    const g = grantProduct(this.p, productId, txId);
    if (!g) return;
    this.saveNow();
    sfx.gem();
    haptic.success();
    toast(g.gems ? `Thank you! +${fmt(g.gems)} 💎` : `${g.title} unlocked!`, 'good');
    this.refresh();
  }

  async restore() {
    const owned = await this.iap.restore();
    let restored = 0;
    for (const id of owned) {
      const key = PRODUCT_BY_ID[id]?.key;
      if (key === 'starter' && !this.p.starter) {
        this.p.starter = true;
        if (!this.p.skins.includes('aurora')) this.p.skins.push('aurora');
        restored++;
      }
      if (key === 'pass' && !this.p.pass) {
        this.p.pass = true;
        restored++;
      }
    }
    if (restored) {
      this.saveNow();
      toast('Purchases restored!', 'good');
    } else toast(this.iap.kind === 'native' ? 'Nothing to restore' : 'Restore works in the iOS app');
    this.refresh();
  }
}
