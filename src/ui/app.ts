// App shell: owns the profile, screen mounting, purchases and the level flow.
// Each screen lives in ./screens and each modal flow in ./flows.
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { icon } from './icons';
import { h, fmt, mountOverlays, closeModals, toast } from './dom';
import { sfx, setAudio, unlockAudio, pauseAudio, setMusicTheme, chapterTheme } from './audio';
import { haptic, setHaptics } from './haptics';
import { LevelScene, type LevelResult, type SceneOpts } from './game';
import { makeLevel, type LevelDef } from '../core/levels';
import { KINDS, type Kind } from '../core/world';
import { loadProfile, saveProfile, today, type Profile } from '../meta/profile';
import { createIap } from '../meta/iap';
import { CONTINUE_COSTS, PRODUCT_BY_ID, PRODUCT_BY_KEY, SKINS, type BoosterId } from '../meta/config';
import { discoverSpecies, grantProduct, spendGems, track } from '../meta/economy';
import { chapterOf, ensureQuests } from '../meta/progression';
import { MOMENTUM_PERKS, momentumActive, momentumLoss, momentumWin } from '../meta/momentum';
import { addVisitors } from '../meta/visitors';
import { rankFlow } from './flows/rank';
import { visitorsFlow } from './flows/visitors';
import { modesFlow } from './flows/modes';
import { welcomeBackFlow } from './flows/offers';
import { scheduleReminders } from './platform';
import { addTokens, ensureEvent, eventActive, tokensForLand } from '../meta/events';
import { eventFlow } from './flows/event';
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
import { setLang, t, type Lang } from '../i18n';
import { COACH } from '../meta/coach';
import { gcSignIn, gcSync } from './gamecenter';
import { fixClock } from '../meta/economy';
import { currentLook, masteryLevel, MASTERY_STEPS } from '../meta/cosmetics';
import { showWorkshop } from './screens/workshop';
import { showPassport } from './screens/passport';
import { showPass } from './screens/pass';
import { showHomeworld } from './screens/homeworld';
import { parentalGate } from './flows/gate';
import { inboxFlow } from './flows/inbox';
import { showSky } from './screens/sky';
import { tickHome } from '../meta/homeworld';
import { labLevels } from '../meta/lab';
import { addFling } from '../meta/records';
import { sight } from '../meta/lore';
import { seasonOf, skyEventOn } from '../meta/seasons';
import { keeperHead } from './art/keeper';

export type ScreenName =
  'home' | 'lifebook' | 'upgrades' | 'shop' | 'map' | 'road' | 'level' | 'workshop' | 'pass' | 'passport' | 'homeworld' | 'sky';
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
    fixClock(this.p);
    addVisitors(this.p, Date.now());
    tickHome(this.p);
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
        scheduleReminders(this.p);
        pauseAudio(true);
      });
      CapApp.addListener('resume', () => {
        pauseAudio(false);
        ensureQuests(this.p, today());
        fixClock(this.p);
        if (addVisitors(this.p, Date.now())) this.save();
        tickHome(this.p);
        this.awayMs = Date.now() - this.p.meta.lastSeen;
        this.p.meta.lastSeen = Date.now();
        if (this.screen === 'home') this.refresh();
        if (this.screen !== 'level') this.daily();
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      this.p.meta.lastSeen = Date.now();
      saveProfile(this.p);
    });
    this.iap
      .init((pid, tx) => this.grant(pid, tx))
      .then(() => this.syncOwned())
      .then(() => this.iap.prices())
      .then((pr) => {
        this.prices = pr;
        if (this.screen === 'shop') this.refresh();
      })
      .catch(() => {});
    if (!this.p.tutorial) this.startLevel(1, { tutorial: true });
    else this.showHome(); // the first home screen of a session runs the daily-gift sequence
    this.save();
    gcSignIn().then((ok) => ok && this.syncGameCenter());
  }

  /** Report achievements and leaderboard scores (iOS Game Center; no-op elsewhere). */
  syncGameCenter() {
    gcSync(this.p, () => this.save());
  }

  applySettings() {
    setLang(this.p.settings.lang as Lang);
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
    if (!this.refreshing) closeModals();
    // Re-rendering the same screen (after a tap) keeps its scroll position and skips the entrance animation.
    const same = name === this.screen && name !== 'level';
    const scrollTop = same ? (this.host.querySelector('.scroll')?.scrollTop ?? 0) : 0;
    if (!same) el.classList.add('enter');
    this.host.replaceChildren(el);
    if (scrollTop) {
      const sc = el.querySelector('.scroll');
      if (sc) sc.scrollTop = scrollTop;
    }
    this.screen = name;
    if (name !== 'level') setMusicTheme('home');
  }

  /** Re-render whatever non-level screen is showing (after currencies change). */
  private refreshing = false;

  refresh() {
    const map: Partial<Record<ScreenName, () => void>> = {
      home: () => this.showHome(),
      lifebook: () => this.showLifebook(),
      shop: () => this.showShop(),
      upgrades: () => this.showUpgrades(),
      map: () => this.showStarMap(),
      road: () => this.showRoad(),
      workshop: () => this.showWorkshop(),
      passport: () => this.showPassport(),
      pass: () => this.showPass(),
      homeworld: () => this.showHomeworld(),
      sky: () => this.showSky(),
    };
    this.refreshing = true;
    try {
      map[this.screen]?.();
    } finally {
      this.refreshing = false;
    }
  }

  // ------------------------------------------------------------------ navigation
  showHome(quiet = false) {
    showHome(this, quiet);
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
  showWorkshop() {
    showWorkshop(this);
  }
  showPassport() {
    showPassport(this);
  }
  showPass() {
    showPass(this);
  }
  showSky() {
    showSky(this);
  }
  inbox() {
    inboxFlow(this);
  }
  showHomeworld() {
    showHomeworld(this);
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
  events() {
    eventFlow(this);
  }
  modes() {
    modesFlow(this);
  }
  /** Launch sequence: daily gift, then any visitors' gifts. */
  launched = false;
  daily() {
    if (!this.p.tutorial) return;
    this.launched = true;
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
        ? h('button', { class: 'icon', 'aria-label': t('Back'), onclick: () => (sfx.click(), this.showHome()) }, icon('back', 24))
        : h('button', { class: 'icon', 'aria-label': t('Settings'), onclick: () => this.settings() }, icon('gear', 26)),
      back
        ? null
        : h(
            'button',
            {
              class: `icon avatar${this.p.pass ? ' gold' : ''}`,
              'aria-label': t('Planet Passport'),
              onclick: () => (sfx.click(), this.showPassport()),
            },
            keeperHead(currentLook(this.p), 40),
          ),

      h('div', { class: 'grow' }),
      h('button', { class: 'pill dust', 'aria-label': t('Stardust'), onclick: () => this.showUpgrades() }, `✨ ${fmt(this.p.dust)}`),
      h(
        'button',
        { class: 'pill gems', 'aria-label': t('Gems'), onclick: () => this.showShop() },
        `💎 ${fmt(this.p.gems)}`,
        h('span', { class: 'plus' }, '+'),
      ),
    );
  }

  // ------------------------------------------------------------------ level flow
  sceneOpts(extra: Partial<SceneOpts> & Pick<SceneOpts, 'onEnd'>, boosters: Boosters = NO_BOOSTERS, tutorial = false): SceneOpts {
    const skin = SKINS.find((s) => s.id === this.p.skin) ?? SKINS[0];
    const look = currentLook(this.p);
    return {
      look,
      mastered: masteryLevel(this.p.mastery[look.launcher] ?? 0) >= MASTERY_STEPS.length,
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
      onSpecies: (id) => {
        this.p.stats.creatures++;
        sight(this.p, id);
        track(this.p, 'creature');
      },
      onThrow: (kind) => {
        this.p.stats.throws++;
        const star = addFling(this.p, kind);
        if (star) toast(t('{name} record: {stars}', { name: t(KINDS[kind].name), stars: '★'.repeat(star) }), 'good');
        const l = currentLook(this.p).launcher;
        this.p.mastery[l] = (this.p.mastery[l] ?? 0) + 1;
        track(this.p, 'throw');
      },
      onTransform: (n) => track(this.p, 'land', n),
      eventEmoji: eventActive(this.p) ? ensureEvent(this.p).emoji : undefined,
      onLand: (changed, spawned) => {
        if (!eventActive(this.p)) return 0;
        const n = tokensForLand(ensureEvent(this.p), changed, spawned);
        addTokens(this.p, n);
        return n;
      },
      onQuit: () => this.showHome(),
      onShop: () => this.showShop(),
      // Object Lab levels apply to the campaign and Zen, not to the score-competitive modes
      lab: extra.competitive ? undefined : labLevels(this.p),
      season: seasonOf(new Date(), this.p.settings.hemi),
      // the meteor-shower bonus stays out of score-competitive modes
      shower: !extra.competitive && !!skyEventOn(new Date()),
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
    setMusicTheme(chapterTheme(chapterOf(n).n));
    this.scene = scene;
  }

  private levelEnded(r: LevelResult) {
    if (r.throwsUsed === -1) return this.startLevel(r.level.n); // restart: no penalty, same as leaving
    if (!r.won) {
      const res = momentumLoss(this.p, today());
      this.save();
      // campaign retries go through the pre-level sheet, where boosters can help
      if (r.level.n === this.p.level && r.level.n >= 4) {
        this.showHome(true);
        this.preLevel(r.level.n);
      } else this.startLevel(r.level.n);
      if (res === 'shield') toast(t('🛡️ Your daily shield kept your Momentum!'), 'good');
      if (res === 'lost') toast(t('Momentum lost — win to build it back up'), 'bad');
      return;
    }
    momentumWin(this.p);
    levelResults(this, r);
  }

  skinGlow() {
    return (SKINS.find((s) => s.id === this.p.skin) ?? SKINS[0]).glow;
  }

  // ------------------------------------------------------------------ purchases
  priceOf(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return this.prices[pr.id] ?? pr.fallbackPrice;
  }

  needGems() {
    sfx.error();
    toast(t('Not enough gems — grab a pack in the Shop!'), 'bad');
  }

  async buy(key: string) {
    if (this.busy) return;
    const pr = PRODUCT_BY_KEY[key];
    if ((key === 'starter' && this.p.starter) || (key === 'pass' && this.p.pass)) return;
    this.busy = true;
    if (!(await parentalGate())) {
      this.busy = false;
      return;
    }
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
    toast(g.gems ? t('Thank you! +{n} 💎', { n: fmt(g.gems) }) : t('{name} unlocked!', { name: t(g.title) }), 'good');
    this.refresh();
  }

  /** Mark one-time purchases as owned (flags only — gems are never re-granted). */
  private applyOwned(owned: string[]) {
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
    if (restored) this.saveNow();
    return restored;
  }

  private async syncOwned() {
    if (this.applyOwned(await this.iap.owned())) this.refresh();
  }

  async restore() {
    const restored = this.applyOwned(await this.iap.restore());
    if (restored) toast(t('Purchases restored!'), 'good');
    else toast(this.iap.kind === 'native' ? t('Nothing to restore') : t('Restore works in the iOS app'));
    this.refresh();
  }
}
