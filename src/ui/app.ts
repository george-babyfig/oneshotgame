import { ledger, loadLedger } from '../meta/ledger';
// App shell: owns the profile, screen mounting, purchases and the level flow.
// Each screen lives in ./screens and each modal flow in ./flows.
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { icon } from './icons';
import { h, btn, modal, fmt, mountOverlays, closeModals, toast } from './dom';
import { sfx, setAudio, unlockAudio, pauseAudio, setMusicTheme, chapterTheme } from './audio';
import { haptic, setHaptics } from './haptics';
import { LevelScene, type LevelResult, type SceneOpts } from './game';
import { makeLevel, type LevelDef } from '../core/levels';
import { modifiersFor, type RoundMode } from '../core/modifiers';
import { KINDS, type Kind } from '../core/world';
import { loadProfile, saveProfile, today, type Profile } from '../meta/profile';
import { createIap } from '../meta/iap';
import { PRODUCT_BY_ID, PRODUCT_BY_KEY, SKINS, type BoosterId } from '../meta/config';
import { clearFails, continueAllowed, countsAsFail, recordFail } from '../meta/continues';
import { discoverSpecies, grantProduct, spendGems, track } from '../meta/economy';
import { chapterOf, ensureQuests } from '../meta/progression';
import { MOMENTUM_PERKS, momentumActive, momentumLoss, momentumWin } from '../meta/momentum';
import { addVisitors } from '../meta/visitors';
import { rankFlow } from './flows/rank';
import { visitorsFlow } from './flows/visitors';
import { modesFlow } from './flows/modes';
import { awayFlow } from './flows/away';
import { titleBeat } from './flows/title';
import { choosePopup, type PopupKind } from '../meta/governor';
import { awayCollectables } from '../meta/economy';
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
import { settingsFlow, setTextSize } from './flows/settings';
import { questsFlow } from './flows/quests';
import { setLang, t, type Lang } from '../i18n';
import { COACH, pendingIntroAfterWin } from '../meta/coach';
import { addIntroLetter } from '../meta/inbox';
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
import { currentBuddy } from '../meta/buddy';
import { showVoyage } from './screens/voyage';
import { showAlbum } from './screens/album';
import { festivalFlow } from './flows/festival';
import { ensureFestival, festivalActive, festivalLive, spotFestival } from '../meta/festivals';
import { tickHome } from '../meta/homeworld';
import { labLevels } from '../meta/lab';
import { addFling } from '../meta/records';
import { sight } from '../meta/lore';
import { seasonOf, skyEventOn } from '../meta/seasons';
import { keeperHead } from './art/keeper';
import { debutsAt, unlocked } from '../meta/unlocks';

export type ScreenName =
  | 'home'
  | 'lifebook'
  | 'upgrades'
  | 'shop'
  | 'map'
  | 'road'
  | 'level'
  | 'workshop'
  | 'pass'
  | 'passport'
  | 'homeworld'
  | 'sky'
  | 'voyage'
  | 'album'
  | 'title';
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
  private lastAbsenceMs = 0;
  private busy = false;
  private homeSeenThisOpen = false;
  private popupShownThisOpen = false;
  private roundFirstCampaignClear = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init() {
    this.host = h('div', { class: 'host' });
    this.root.append(this.host);
    mountOverlays(this.root);
    this.p = await loadProfile();
    await loadLedger();
    ledger.count('app_open');
    this.p.meta.sessions++;
    this.applySettings();
    ensureQuests(this.p, today());
    fixClock(this.p);
    addVisitors(this.p, Date.now());
    tickHome(this.p);
    this.lastAbsenceMs = this.p.meta.sessions === 1 ? Infinity : Math.max(0, Date.now() - this.p.meta.lastSeen);
    this.awayMs = this.lastAbsenceMs === Infinity ? 0 : this.lastAbsenceMs;
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
        this.lastAbsenceMs = Math.max(0, Date.now() - this.p.meta.lastSeen);
        this.awayMs = Math.max(this.awayMs, this.lastAbsenceMs);
        if (this.lastAbsenceMs >= 30 * 60_000) this.popupShownThisOpen = false;
        this.p.meta.lastSeen = Date.now();
        if (this.screen === 'home') this.showHome();
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
    if (!this.p.tutorial) {
      if (this.p.meta.sessions === 1) titleBeat(this, () => this.startLevel(1, { tutorial: true }));
      else this.startLevel(1, { tutorial: true });
    } else this.showHome();
    this.save();
    if (this.p.settings.gameCenter) gcSignIn().then((ok) => ok && this.syncGameCenter());
  }

  /** Report achievements and leaderboard scores (iOS Game Center; no-op elsewhere). */
  syncGameCenter() {
    gcSync(this.p, () => this.save());
  }

  applySettings() {
    setLang(this.p.settings.lang as Lang);
    setAudio(this.p.settings.sound, this.p.settings.music);
    setHaptics(this.p.settings.haptics);
    setTextSize(this.p.settings.textSize);
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
    if (name !== 'homeworld') ledger.homeworldClose();
    if (name !== 'level') setMusicTheme(name === 'voyage' ? 'voyage' : festivalLive(this.p) ? 'festival' : 'home');
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
      voyage: () => this.showVoyage(),
      album: () => this.showAlbum(),
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
    showHome(this);
    if (quiet) return;
    this.homeSeenThisOpen = true;
    if (this.p.meta.sessions > 1 && awayCollectables(this.p, this.awayMs).show && this.autoPopup('away')) {
      awayFlow(this, this.awayMs);
      return;
    }
    const intro = pendingIntroAfterWin(this.p);
    if (intro?.intro && this.autoPopup('intro')) {
      addIntroLetter(this.p, intro.id);
      this.save();
      const target: Record<string, string> = {
        homeworld: '.world-btn',
        festival: '.fest-chip',
        star_calendar: '.calendar-chip',
        voyage: '.voyage-btn',
      };
      const focus = target[intro.id] ? this.host.querySelector<HTMLElement>(target[intro.id]) : null;
      const card = modal(
        [
          h('div', { class: 'intro-art' }, '✨'),
          h('div', { class: 'm-title' }, intro.id === 'homeworld' ? t('Your Homeworld is ready') : t(intro.intro.title)),
          h('p', null, t(intro.intro.body)),
          focus
            ? btn(t('Show me'), 'primary wide', () => {
                card.close();
                if (intro.id === 'homeworld') return this.showHomeworld();
                focus.scrollIntoView({ block: 'nearest' });
                focus.classList.add('coach-focus');
                window.setTimeout(() => focus.classList.remove('coach-focus'), 3000);
              })
            : btn(t('Close'), 'primary wide', () => card.close()),
        ],
        { dismiss: false },
      );
    }
  }
  keepAwayPending(awayMs: number) {
    this.awayMs = Math.max(this.awayMs, awayMs);
  }
  clearAwayPending() {
    this.awayMs = 0;
  }
  showLifebook() {
    ledger.discover('lifebook', this.p.level);
    showLifebook(this);
  }
  showUpgrades() {
    ledger.discover('upgrades', this.p.level);
    showUpgrades(this);
  }
  showShop() {
    ledger.discover('shop', this.p.level);
    if (this.screen !== 'shop') ledger.count('offer_shop');
    showShop(this);
  }
  showStarMap() {
    ledger.discover('star_map', this.p.level);
    showStarMap(this);
  }
  showRoad() {
    ledger.discover('star_road', this.p.level);
    showRoad(this);
  }
  showWorkshop() {
    ledger.discover('workshop', this.p.level);
    showWorkshop(this);
  }
  showPassport() {
    ledger.discover('passport', this.p.level);
    showPassport(this);
  }
  showPass() {
    ledger.discover('pass', this.p.level);
    if (this.screen !== 'pass') ledger.count('contents_sheet');
    showPass(this);
  }
  showSky() {
    ledger.discover('sky', this.p.level);
    showSky(this);
  }
  showVoyage() {
    ledger.discover('voyage', this.p.level);
    showVoyage(this);
  }
  showAlbum() {
    ledger.discover('album', this.p.level);
    showAlbum(this);
  }
  festival() {
    festivalFlow(this);
  }
  inbox() {
    inboxFlow(this);
  }
  showHomeworld() {
    ledger.discover('homeworld', this.p.level);
    if (this.screen !== 'homeworld') ledger.homeworldOpen();
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
  /** The calendar opens from its Home chip. */
  daily() {
    if (!unlocked(this.p, 'star_calendar')) return;
    dailyGiftFlow(this);
  }
  /** Reserve the one automatic card before creating its sheet. */
  autoPopup(kind: PopupKind) {
    if (kind === 'intro' && this.screen === 'level') return true;
    if (
      (this.p.meta.sessions <= 1 && kind !== 'intro') ||
      choosePopup({ homeSeen: this.homeSeenThisOpen, shownThisOpen: this.popupShownThisOpen, awayMs: this.lastAbsenceMs }, [kind]) !== kind
    )
      return false;
    this.popupShownThisOpen = true;
    return true;
  }
  preLevel(n: number) {
    if (this.p.meta.sessions === 1) this.startLevel(n);
    else preLevel(this, n);
  }

  /** Shared top bar with currencies. */
  topBar(back = false): HTMLElement {
    return h(
      'div',
      { class: 'topbar' },
      back
        ? h('button', { class: 'icon', 'aria-label': t('Back'), onclick: () => (sfx.click(), this.showHome()) }, icon('back', 24))
        : h('button', { class: 'icon', 'aria-label': t('Settings'), onclick: () => this.settings() }, icon('gear', 26)),
      back || !unlocked(this.p, 'passport')
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
      this.p.chapters.length && this.p.meta.sessions > 1
        ? h(
            'button',
            { class: 'pill gems', 'aria-label': t('Gems'), onclick: () => this.showShop() },
            `💎 ${fmt(this.p.gems)}`,
            h('span', { class: 'plus' }, '+'),
          )
        : h('span', { class: 'pill gems', 'aria-label': t('Gems') }, `💎 ${fmt(this.p.gems)}`),
    );
  }

  // ------------------------------------------------------------------ level flow
  sceneOpts(
    mode: RoundMode | 'tutorial',
    extra: Partial<SceneOpts> & { practice?: boolean } & Pick<SceneOpts, 'onEnd'>,
    boosters: Boosters = NO_BOOSTERS,
    tutorial = false,
  ): SceneOpts {
    const skin = SKINS.find((s) => s.id === this.p.skin) ?? SKINS[0];
    const look = currentLook(this.p);
    const mods = modifiersFor(mode === 'tutorial' ? 'campaign' : mode, {
      scopeLevel: tutorial ? 3 : this.p.upgrades.scope,
      splash: this.p.upgrades.splash,
      extraThrows: this.p.upgrades.throws,
      boosters,
      lab: labLevels(this.p),
      momentum: extra.momentum ?? 0,
      shower: !!skyEventOn(new Date()),
    });
    return {
      look,
      mastered: masteryLevel(this.p.mastery[look.launcher] ?? 0) >= MASTERY_STEPS.length,
      ...mods,
      glow: skin.glow,
      seen: new Set(this.p.seen),
      tutorial,
      reduceMotion: this.p.settings.reduceMotion,
      gems: () => this.p.gems,
      spendGems: (g) => {
        const ok = spendGems(this.p, g, 'continue');
        if (ok) this.save();
        return ok;
      },
      onNewSpecies: (id) => {
        discoverSpecies(this.p, id);
        this.save();
      },
      onSpecies: (id) => {
        this.p.stats.creatures++;
        sight(this.p, id);
        if (!extra.endless && festivalActive(this.p)) {
          spotFestival(this.p);
          track(this.p, 'spot');
        }
        if (!extra.endless) track(this.p, 'creature');
      },
      onThrow: (kind) => {
        this.p.stats.throws++;
        const star = addFling(this.p, kind);
        if (star) toast(t('{name} record: {stars}', { name: t(KINDS[kind].name), stars: '★'.repeat(star) }), 'good');
        const l = currentLook(this.p).launcher;
        this.p.mastery[l] = (this.p.mastery[l] ?? 0) + 1;
        track(this.p, 'throw');
      },
      onTransform: extra.endless || extra.competitive ? undefined : (n) => track(this.p, 'land', n),
      eventEmoji: !extra.endless && !extra.competitive && eventActive(this.p) ? ensureEvent(this.p).emoji : undefined,
      onLand:
        extra.endless || extra.competitive
          ? undefined
          : (changed, spawned) => {
              if (!eventActive(this.p)) return 0;
              const n = tokensForLand(ensureEvent(this.p), changed, spawned);
              addTokens(this.p, n);
              return n;
            },
      onQuit: () => this.showHome(),
      onShop: () => this.showShop(),
      season: seasonOf(new Date(), this.p.settings.hemi),
      festAcc: festivalActive(this.p) ? ensureFestival(this.p).acc : undefined,
      buddy: currentBuddy(this.p, festivalActive(this.p) ? ensureFestival(this.p).acc : undefined),
      ...extra,
      scopeLevel: mods.scopeLevel,
      splash: mods.splash,
      extraThrows: mods.extraThrows,
      boosters: mods.boosters,
      lab: mods.lab,
      momentum: mods.momentum,
      shower: mods.shower,
    };
  }

  startLevel(n: number, o: { tutorial?: boolean; warmup?: boolean; boosters?: Boosters; level?: LevelDef } = {}) {
    const L = o.level ?? makeLevel(n);
    this.roundFirstCampaignClear = !o.warmup && n === this.p.level && !this.p.stars[n];
    const boosters = o.boosters ?? NO_BOOSTERS;
    if (Object.values(boosters).some(Boolean)) {
      track(this.p, 'booster');
      ledger.count('boosters_used', Object.values(boosters).filter(Boolean).length);
    }
    this.p.stats.plays++;
    const tier = momentumActive(this.p) && !this.p.momentum.paused && !o.warmup ? this.p.momentum.streak : 0;
    const perk = MOMENTUM_PERKS[tier];
    const merged: Boosters = { shower: boosters.shower, spark: boosters.spark || perk.spark, scope: boosters.scope || perk.scope };
    const debut = debutsAt(n).find((entry) => entry.id in KINDS && n > 2 && unlocked(this.p, entry.id));
    const opts = this.sceneOpts(
      o.tutorial || n === 1 ? 'tutorial' : 'campaign',
      {
        onEnd: (r) => this.levelEnded(r),
        continueOk: (won) =>
          this.p.meta.sessions > 1 &&
          continueAllowed({
            mode: o.tutorial || n === 1 ? 'tutorial' : 'campaign',
            planet: n,
            won,
            cleared: n < this.p.level,
            failsBefore: this.p.fails[n] ?? 0,
            used: this.p.continuesUsed[n] ?? 0,
          }),
        onContinue: () => {
          this.p.continuesUsed[n] = (this.p.continuesUsed[n] ?? 0) + 1;
          this.save();
        },
        momentum: tier,
        practice: !!o.warmup,
        practiceFirstClear: this.roundFirstCampaignClear,
        coach: COACH[n],
        intro: debut && n === this.p.level ? (debut.id as Kind) : undefined,
        allowIntro: () => this.autoPopup('intro'),
        onIntro: (id) => {
          addIntroLetter(this.p, id);
          this.save();
        },
      },
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
      if (r.level.n >= this.p.level && countsAsFail(r.throwsUsed, r.throwsTotal)) recordFail(this.p, r.level.n);
      const res = momentumLoss(this.p, today(), this.roundFirstCampaignClear);
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
    clearFails(this.p, r.level.n);
    momentumWin(this.p, this.roundFirstCampaignClear);
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
    toast(t('Not enough gems yet'), 'bad');
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
      if (r.ok) {
        this.grant(r.productId ?? pr.id, r.txId ?? `local-${Date.now()}`);
      } else if (r.cancelled) ledger.count('purchase_cancelled');
      else if (r.error) {
        ledger.count(/pending|ask to buy/i.test(r.error) ? 'purchase_pending' : 'purchase_failed');
        toast(r.error, 'bad');
      }
    } finally {
      this.busy = false;
      this.root.classList.remove('buying');
    }
  }

  grant(productId: string, txId: string) {
    const g = grantProduct(this.p, productId, txId);
    if (!g) return;
    ledger.count('purchase_ok');
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
