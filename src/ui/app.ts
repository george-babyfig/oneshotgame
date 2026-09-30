import { ledger, flushLedger, loadLedger, recordPurchase } from '../meta/ledger';
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
import {
  clearInterruptedRound,
  loadProfile,
  readInterruptedRound,
  saveInterruptedRound,
  saveProfile,
  saveProfileChecked,
  today,
  type Profile,
  type RoundCheckpoint,
} from '../meta/profile';
import { setPlanetPalette } from './art/planet';
import type { SkyState } from '../core/sky';
import { restoredSkyState } from './feel';
import { createIap, type IapEvent, type StorePrice } from '../meta/iap';
import { PRODUCT_BY_ID, PRODUCT_BY_KEY, SKINS, type BoosterId } from '../meta/config';
import { clearFails, continueAllowed, countsAsFail, recordFail } from '../meta/continues';
import { discoverSpecies, grantProduct, refundQuietUntil, revokeProduct, spendGems } from '../meta/economy';
import { chapterOf } from '../meta/progression';
import { ensureWishes } from '../meta/wishes';
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
import { getLang, setLang, t, type Lang } from '../i18n';
import { COACH, pendingIntroAfterWin } from '../meta/coach';
import { addIntroLetter } from '../meta/inbox';
import { gcSignIn, gcSync } from './gamecenter';
import { fixClock } from '../meta/economy';
import { currentLook, masteryLevel, MASTERY_STEPS } from '../meta/cosmetics';
import { showStyles } from './screens/styles';
import { showMissions } from './screens/missions';
import { showCollection } from './screens/collection';
import { showFieldGuide } from './screens/fieldguide';
import { showPassport } from './screens/passport';
import { showHomeworld } from './screens/homeworld';
import { bindGateProfile, parentalGate } from './flows/gate';
import { contentsSheet } from './flows/contents';
import { receiptCard } from './flows/receipt';
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
import { refreshCreatureGalleryMotion } from './art/critters';
import { GUSTY_WIND_TIP, debutsAt, unlocked } from '../meta/unlocks';
import { roadReady, chestsReady } from '../meta/progression';
import { letterOf } from '../meta/inbox';
import { homeBadge } from '../meta/homeworld';
import { wishClaimable } from '../meta/wishes';
import { countUp, effectiveReduceMotion, screenTransition } from './motion';
import { recordCombo, recordReaction } from '../meta/reactions';

export type ScreenName =
  | 'home'
  | 'lifebook'
  | 'upgrades'
  | 'shop'
  | 'map'
  | 'road'
  | 'level'
  | 'workshop'
  | 'styles'
  | 'missions'
  | 'collection'
  | 'fieldguide'
  | 'passport'
  | 'homeworld'
  | 'sky'
  | 'voyage'
  | 'album'
  | 'title';
export type Boosters = Record<BoosterId, boolean>;
export const NO_BOOSTERS: Boosters = { shower: false, spark: false, scope: false };
export type MainTab = 'home' | 'missions' | 'homeworld' | 'collection' | 'styles';
const MAIN_TABS: MainTab[] = ['home', 'missions', 'homeworld', 'collection', 'styles'];

export class ScreenHistory {
  private entries: ScreenName[] = [];
  visit(from: ScreenName, to: ScreenName) {
    if (from !== to && from !== 'level' && from !== 'title' && to !== 'level' && to !== 'title') this.entries.push(from);
  }
  reset() {
    this.entries = [];
  }
  pop() {
    return this.entries.pop();
  }
  get length() {
    return this.entries.length;
  }
}

export class App {
  root: HTMLElement;
  host!: HTMLElement;
  p!: Profile;
  iap = createIap();
  prices: Record<string, StorePrice> = {};
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
  private screenStack = new ScreenHistory();
  private returning = false;
  private lastReceipt: Promise<void> | null = null;
  private processingTx = new Map<string, Promise<void>>();
  private txQueue: Promise<void> = Promise.resolve();
  private roundsThisSession = 0;
  private breakDue = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init() {
    this.host = h('div', { class: 'host' });
    this.root.append(this.host);
    mountOverlays(this.root);
    let swipeX = -1;
    let swipeY = 0;
    this.root.addEventListener('pointerdown', (event) => {
      swipeX = event.clientX < 20 && this.screen !== 'level' ? event.clientX : -1;
      swipeY = event.clientY;
    });
    this.root.addEventListener('pointerup', (event) => {
      if (swipeX >= 0 && event.clientX - swipeX > 70 && Math.abs(event.clientY - swipeY) < 80) this.back();
      swipeX = -1;
    });
    this.root.addEventListener('pointercancel', () => (swipeX = -1));
    this.p = await loadProfile();
    bindGateProfile(this.p);
    await loadLedger();
    ledger.count('app_open');
    this.p.meta.sessions++;
    this.applySettings();
    if (typeof matchMedia === 'function') {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => this.applySettings());
    }
    ensureWishes(this.p, today());
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
        this.checkpointRound(true);
        this.p.meta.lastSeen = Date.now();
        saveProfile(this.p);
        scheduleReminders(this.p);
        pauseAudio(true);
      });
      CapApp.addListener('resume', () => {
        pauseAudio(false);
        ensureWishes(this.p, today());
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
      this.checkpointRound(true);
      this.p.meta.lastSeen = Date.now();
      saveProfile(this.p);
    });
    this.iap
      .init((event) => {
        if (event.revokedAt) {
          if (revokeProduct(this.p, event.productId, event.revokedAt)) {
            this.saveNow();
            this.refresh();
          }
        } else void this.handleTransaction(event);
      })
      .then(() => this.iap.prices())
      .then(async (pr) => {
        this.prices = pr;
        await this.flushPendingPurchaseRecords();
        if (this.screen === 'shop') this.refresh();
      })
      .then(() => this.reconcilePurchases())
      .catch(() => {});
    const saved = readInterruptedRound(this.p);
    if (saved) this.startLevel(saved.n, { resume: saved });
    else if (!this.p.tutorial) {
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
    setPlanetPalette(this.p.settings.planetColours);
    document.documentElement.classList.toggle('reduce-motion', effectiveReduceMotion(this.p));
    refreshCreatureGalleryMotion();
  }

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => saveProfile(this.p), 150);
  }

  saveNow() {
    clearTimeout(this.saveTimer);
    return saveProfile(this.p);
  }

  private checkpointRound(pause = false) {
    const scene = this.screen === 'level' ? this.scene : null;
    if (!scene || scene.ended || scene.finishing || scene.o.competitive || scene.o.endless || scene.o.timeLimit) return;
    saveInterruptedRound(this.p, {
      n: scene.L.n,
      seedPrefix: scene.L.seed.match(/^(.*)-(\d+)(?:~-?\d+)?$/)?.[1] ?? 'PP',
      salt: Number(scene.L.seed.match(/~(-?\d+)$/)?.[1]) || undefined,
      state: scene.roundState(),
      modifiers: scene.roundModifiers(),
      throwsLeft: scene.throwsLeft,
      throwsUsed: scene.throwsUsed,
      throwsTotal: scene.throwsTotal,
      qi: scene.qi,
      cur: scene.cur,
      next: scene.next,
      score: scene.score,
      shownScore: scene.shownScore,
      starsGot: scene.starsGot,
      rot: scene.rot,
      time: scene.time,
      timeLeft: scene.timeLeft,
      bossHp: scene.bossHp,
      shot: scene.shot,
      landedKinds: scene.landedKinds,
      comboIconsCurrent: scene.comboIconsCurrent,
      comboIconsBest: scene.comboIconsBest,
      reactionEvents: scene.reactionEvents,
      reactionsSeen: [...scene.reactionsSeen],
      comboEvents: scene.comboEvents,
      warmup: !!scene.o.practice,
      practiceFirstClear: !!scene.o.practiceFirstClear,
      practiceGifts: scene.practiceGifts,
      skyState: { brokenRocks: [...scene.skyState.brokenRocks] },
      practiceBonkUsed: scene.practiceBonkUsed,
      mistTipShown: scene.mistTipShown,
      gustTipShown: scene.gustTipShown,
    } as RoundCheckpoint & { skyState: SkyState; practiceBonkUsed: boolean; mistTipShown: boolean; gustTipShown: boolean });
    this.saveNow();
    if (pause) {
      scene.paused = true;
      scene.aimFrom = scene.aimTo = null;
      if (!scene.modalOpen) scene.pause();
    }
  }

  mount(el: HTMLElement, name: ScreenName, teardown: (() => void) | null = null) {
    const previousScreen = this.screen;
    const previousPills = new Map<string, number>();
    for (const kind of ['dust', 'gems']) {
      const pill = this.host.querySelector(`.topbar .pill.${kind}`);
      if (pill) previousPills.set(kind, Number(pill.textContent?.replace(/[^\d]/g, '') ?? 0));
    }
    if (!this.refreshing && !this.returning) this.screenStack.visit(this.screen, name);
    if (MAIN_TABS.includes(name as MainTab) && this.screenStack.length) {
      const first = el.querySelector('.topbar .icon');
      first?.replaceWith(
        h('button', { class: 'icon', 'aria-label': t('Back'), onclick: () => (sfx.click(), this.back()) }, icon('back', 24)),
      );
    }
    this.teardown?.();
    this.teardown = teardown;
    this.scene?.destroy();
    this.scene = null;
    if (!this.refreshing) closeModals();
    // Re-rendering the same screen (after a tap) keeps its scroll position and skips the entrance animation.
    const same = !!this.host.firstElementChild && name === this.screen && name !== 'level';
    const scrollTop = same ? (this.host.querySelector('.scroll')?.scrollTop ?? 0) : 0;
    if (MAIN_TABS.includes(name as MainTab)) el.append(this.tabBar(name as MainTab));
    this.host.replaceChildren(el);
    if (!same) {
      const fromTab = MAIN_TABS.indexOf(previousScreen as MainTab);
      const toTab = MAIN_TABS.indexOf(name as MainTab);
      const mode = name === 'level' && previousScreen !== 'level' ? 'planet' : fromTab >= 0 && toTab >= 0 ? 'tab' : 'page';
      if (mode === 'tab') el.classList.add('tab-enter');
      screenTransition(el, mode, fromTab >= 0 && toTab >= 0 ? toTab - fromTab : 1);
    }
    for (const kind of ['dust', 'gems']) {
      const pill = el.querySelector<HTMLElement>(`.topbar .pill.${kind}`);
      const before = previousPills.get(kind);
      if (!pill || before === undefined) continue;
      const after = Number(pill.textContent?.replace(/[^\d]/g, '') ?? 0);
      if (before !== after) countUp(pill, before, after, kind === 'dust' ? '✨ ' : '💎 ');
    }
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
      missions: () => this.showMissions(),
      collection: () => this.showCollection(),
      styles: () => this.showStyles(),
      fieldguide: () => this.showFieldGuide(),
      lifebook: () => this.showLifebook(),
      shop: () => this.showShop(),
      upgrades: () => this.showUpgrades(),
      map: () => this.showStarMap(),
      road: () => this.showRoad(),
      workshop: () => this.showStyles(),
      passport: () => this.showPassport(),
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
  private tabBar(active: MainTab) {
    const p = this.p;
    const mailGifts = p.mail.filter((mail) => !mail.claimed && !!letterOf(mail)?.gift).length;
    const missionReady = unlocked(p, 'quests') ? wishClaimable(p) + roadReady(p).length + chestsReady(p).length + mailGifts : 0;
    const tabs: { id: MainTab; label: string; symbol: string; badge: number; reason?: string }[] = [
      { id: 'home', label: t('Play'), symbol: 'planet', badge: 0 },
      {
        id: 'missions',
        label: t('Missions'),
        symbol: 'scroll',
        badge: missionReady,
        reason: unlocked(p, 'quests') ? undefined : t('Opens at planet {n}', { n: 12 }),
      },
      {
        id: 'homeworld',
        label: getLang() === 'ja' ? t('Home') : t('Homeworld'),
        symbol: 'world',
        badge: homeBadge(p),
        reason: unlocked(p, 'homeworld') ? undefined : t('Opens at planet {n}', { n: 5 }),
      },
      { id: 'collection', label: t('Collection'), symbol: 'book', badge: 0 },
      { id: 'styles', label: t('Styles'), symbol: 'paint', badge: 0, reason: p.chapters.length ? undefined : t('Opens after chapter 1') },
    ];
    // Keep one numeric badge style and limit simultaneous badges.
    let shown = 0;
    return h(
      'nav',
      { class: 'main-tabs', 'aria-label': t('Tabs') },
      ...tabs.map((tab) => {
        const count = tab.badge && shown < 3 ? tab.badge : 0;
        if (count) shown++;
        const button = h(
          'button',
          {
            class: `main-tab${active === tab.id ? ' on' : ''}${tab.reason ? ' locked' : ''}`,
            'data-tab': tab.id,
            type: 'button',
            'aria-label': tab.reason ? `${tab.label} · ${tab.reason}` : tab.label,
            'aria-current': active === tab.id ? 'page' : undefined,
          },
          h('span', { class: 'main-tab-icon', 'aria-hidden': 'true' }, icon(tab.symbol, 24)),
          h('span', { class: 'main-tab-label' }, tab.label),
          count ? h('span', { class: 'nb' }, String(count)) : null,
        );
        button.addEventListener('click', () => this.selectTab(tab.id));
        return button;
      }),
    );
  }
  selectTab(tab: MainTab) {
    this.screenStack.reset();
    const wasReturning = this.returning;
    this.returning = true;
    try {
      if (tab === 'home') this.showHome(true);
      else if (tab === 'missions') this.showMissions();
      else if (tab === 'homeworld') this.showHomeworld();
      else if (tab === 'collection') this.showCollection();
      else this.showStyles();
    } finally {
      this.returning = wasReturning;
    }
  }
  back() {
    const previous = this.screenStack.pop();
    if (!previous) return;
    this.returning = true;
    try {
      this.renderScreen(previous);
    } finally {
      this.returning = false;
    }
  }
  canGoBack() {
    return this.screenStack.length > 0;
  }
  private renderScreen(name: ScreenName) {
    const render: Partial<Record<ScreenName, () => void>> = {
      home: () => this.showHome(true),
      missions: () => this.showMissions(),
      homeworld: () => this.showHomeworld(),
      collection: () => this.showCollection(),
      styles: () => this.showStyles(),
      fieldguide: () => this.showFieldGuide(),
      lifebook: () => this.showLifebook(),
      album: () => this.showAlbum(),
      sky: () => this.showSky(),
      shop: () => this.showShop(),
      upgrades: () => this.showUpgrades(),
      map: () => this.showStarMap(),
      road: () => this.showRoad(),
      workshop: () => this.showStyles(),
      passport: () => this.showPassport(),
      voyage: () => this.showVoyage(),
    };
    render[name]?.();
  }
  showMissions() {
    showMissions(this);
  }
  showCollection() {
    showCollection(this);
  }
  showStyles() {
    if (!this.p.chapters.length) {
      this.mount(
        h(
          'div',
          { class: 'screen page tab-page' },
          this.topBar(),
          h('div', { class: 'page-title' }, t('Styles')),
          h('p', { class: 'locked-note' }, t('Opens after chapter 1')),
        ),
        'styles',
      );
      return;
    }
    ledger.discover('workshop', this.p.level);
    showStyles(this);
  }
  showFieldGuide() {
    showFieldGuide(this);
  }
  showHome(quiet = false) {
    if (!this.returning && !this.refreshing) this.screenStack.reset();
    showHome(this);
    if (quiet) return;
    if (this.breakDue) {
      this.breakDue = false;
      const card = modal([
        h('div', { class: 'm-title' }, t('Time for a stretch?')),
        h('p', null, t('Your planets will wait.')),
        btn(t('Keep playing'), 'primary wide', () => card.close()),
      ]);
      return;
    }
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
        homeworld: '[data-tab="homeworld"]',
        festival: '[data-tab="missions"]',
        star_calendar: '[data-tab="missions"]',
        voyage: '[data-tab="missions"]',
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
                if (intro.id === 'homeworld') return this.selectTab('homeworld');
                if (intro.id === 'festival' || intro.id === 'star_calendar' || intro.id === 'voyage') return this.selectTab('missions');
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
    this.showStyles();
  }
  showPassport() {
    ledger.discover('passport', this.p.level);
    showPassport(this);
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
    if (!unlocked(this.p, 'homeworld')) {
      this.mount(
        h(
          'div',
          { class: 'screen page tab-page' },
          this.topBar(),
          h('div', { class: 'page-title' }, t('Homeworld')),
          h('p', { class: 'locked-note' }, t('Opens at planet {n}', { n: 5 })),
        ),
        'homeworld',
      );
      return;
    }
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
    preLevel(this, n);
  }

  /** Shared top bar with currencies. */
  topBar(back = false, compact = false): HTMLElement {
    return h(
      'div',
      { class: 'topbar' },
      back
        ? h('button', { class: 'icon', 'aria-label': t('Back'), onclick: () => (sfx.click(), this.back()) }, icon('back', 24))
        : h('button', { class: 'icon', 'aria-label': t('Settings'), onclick: () => this.settings() }, icon('gear', 26)),
      compact || back || !unlocked(this.p, 'passport')
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
      compact
        ? h('span', { class: 'pill dust', 'aria-label': t('Stardust') }, `✨ ${fmt(this.p.dust)}`)
        : h('button', { class: 'pill dust', 'aria-label': t('Stardust'), onclick: () => this.showUpgrades() }, `✨ ${fmt(this.p.dust)}`),
      h('span', { class: 'pill gems', 'aria-label': t('Gems') }, `💎 ${fmt(this.p.gems)}`),
    );
  }

  // ------------------------------------------------------------------ level flow
  sceneOpts(
    mode: RoundMode | 'tutorial',
    extra: Partial<SceneOpts> & { practice?: boolean } & Pick<SceneOpts, 'onEnd'>,
    boosters: Boosters = NO_BOOSTERS,
    tutorial = false,
  ): SceneOpts {
    const skin = SKINS.find((s) => s.id === this.p.skin && (!this.p.settings.hidePaidLooks || (!s.starter && !s.pass))) ?? SKINS[0];
    const look = currentLook(this.p);
    const mods = modifiersFor(mode === 'tutorial' ? 'campaign' : mode, {
      scopeLevel: tutorial ? 3 : this.p.upgrades.scope,
      splash: this.p.upgrades.splash,
      extraThrows: this.p.upgrades.throws,
      boosters,
      lab: labLevels(this.p),
      momentum: extra.momentum ?? 0,
      shower: !!skyEventOn(new Date()),
      gentle: !!this.p.settings.gentle,
    });
    if (mode === 'remix') mods.gentle = !!this.p.settings.gentle;
    return {
      look,
      mastered: masteryLevel(this.p.mastery[look.launcher] ?? 0) >= MASTERY_STEPS.length,
      ...mods,
      clearPalette: this.p.settings.planetColours === 'clear',
      gustTip: this.p.gustSeen ? undefined : GUSTY_WIND_TIP,
      onGustSeen: () => {
        if (!this.p.gustSeen) {
          this.p.gustSeen = true;
          this.save();
        }
      },
      onSkySeen: (id) => {
        if (!this.p.skySeen.includes(id)) {
          this.p.skySeen.push(id);
          this.save();
        }
      },
      glow: skin.glow,
      seen: new Set(this.p.seen),
      tutorial,
      reduceMotion: effectiveReduceMotion(this.p),
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
        }
      },
      onThrow: (kind) => {
        this.p.stats.throws++;
        const star = addFling(this.p, kind);
        if (star) toast(t('{name} record: {stars}', { name: t(KINDS[kind].name), stars: '★'.repeat(star) }), 'good');
        const l = currentLook(this.p).launcher;
        this.p.mastery[l] = (this.p.mastery[l] ?? 0) + 1;
      },
      onReaction: (id) => {
        const result = recordReaction(this.p, id, mode === 'tutorial' ? 'campaign' : mode);
        this.saveNow();
        return result;
      },
      onCombo: (links, reaction, superFusion) => {
        recordCombo(this.p, links, reaction, superFusion, mode === 'tutorial' ? 'campaign' : mode);
        this.saveNow();
      },
      onPairTried: (first, second) => {
        const pair = [first, second].sort().join('+');
        if (this.p.reactionPairsTried.includes(pair)) return;
        this.p.reactionPairsTried.push(pair);
        this.saveNow();
      },
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
      onQuit: () => {
        clearInterruptedRound(this.p);
        this.save();
        this.showHome();
      },
      season: seasonOf(new Date(), this.p.settings.hemi),
      festAcc: festivalActive(this.p) ? ensureFestival(this.p).acc : undefined,
      buddy: currentBuddy(this.p, festivalActive(this.p) ? ensureFestival(this.p).acc : undefined),
      ...extra,
      onEnd: (result) => {
        if (result.throwsUsed !== -1 && !extra.endless) {
          this.roundsThisSession++;
          const breakAfter = this.p.settings.breakAfterRounds;
          if (breakAfter && this.roundsThisSession % breakAfter === 0) this.breakDue = true;
        }
        extra.onEnd(result);
      },
      scopeLevel: mods.scopeLevel,
      splash: mods.splash,
      extraThrows: mods.extraThrows,
      boosters: mods.boosters,
      lab: mods.lab,
      momentum: mods.momentum,
      shower: mods.shower,
    };
  }

  startLevel(n: number, o: { tutorial?: boolean; warmup?: boolean; boosters?: Boosters; level?: LevelDef; resume?: RoundCheckpoint } = {}) {
    if (!o.resume && this.p.savedRound) {
      clearInterruptedRound(this.p);
      this.save();
    }
    const L = o.level ?? makeLevel(n, o.resume?.seedPrefix ?? 'PP', { salt: o.resume?.salt });
    const warmup = o.resume?.warmup ?? o.warmup;
    this.roundFirstCampaignClear = o.resume?.practiceFirstClear ?? (!warmup && n === this.p.level && !this.p.stars[n]);
    const boosters = o.resume?.modifiers.boosters ?? o.boosters ?? NO_BOOSTERS;
    if (!o.resume && Object.values(boosters).some(Boolean)) {
      ledger.count('boosters_used', Object.values(boosters).filter(Boolean).length);
    }
    if (!o.resume) this.p.stats.plays++;
    const tier =
      o.resume?.modifiers.momentum ?? (momentumActive(this.p) && !this.p.momentum.paused && !warmup ? this.p.momentum.streak : 0);
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
        practice: !!warmup,
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
    if (o.resume) {
      const m = o.resume.modifiers;
      opts.scopeLevel = m.scopeLevel;
      opts.splash = m.splash;
      opts.extraThrows = m.extraThrows;
      opts.boosters = m.boosters;
      opts.lab = m.lab;
      opts.momentum = m.momentum;
      opts.shower = m.shower;
      opts.gentle = m.gentle;
      opts.buddy = m.buddy;
      opts.allowIntro = () => false;
      opts.coach = undefined;
      opts.intro = undefined;
    }
    const scene = new LevelScene(L, opts);
    if (o.resume) {
      const s = o.resume as RoundCheckpoint & {
        skyState?: SkyState;
        practiceBonkUsed?: boolean;
        mistTipShown?: boolean;
        gustTipShown?: boolean;
      };
      scene.skyState = restoredSkyState(s.skyState);
      scene.practiceBonkUsed = !!s.practiceBonkUsed;
      scene.mistTipShown = !!s.mistTipShown;
      scene.gustTipShown = !!s.gustTipShown;
      scene.planet = s.state.planet;
      scene.nova = s.state.nova;
      scene.combo = s.state.combo;
      scene.comboCharge = s.state.comboCharge;
      scene.comboIconsCurrent = s.comboIconsCurrent ?? [];
      scene.comboIconsBest = s.comboIconsBest ?? [];
      scene.reactionEvents = s.reactionEvents ?? [];
      scene.reactionsSeen = new Set(s.reactionsSeen ?? scene.reactionEvents);
      scene.comboEvents = s.comboEvents ?? [];
      scene.bonus = s.state.bonus;
      scene.regionBests = s.state.regionBests;
      scene.arrived = new Set(s.state.arrived);
      scene.throwsLeft = s.throwsLeft;
      scene.throwsUsed = s.throwsUsed;
      scene.throwsTotal = s.throwsTotal;
      scene.qi = s.qi;
      scene.cur = s.cur;
      scene.next = s.next;
      scene.score = s.score;
      scene.shownScore = s.shownScore;
      scene.starsGot = s.starsGot;
      scene.rot = s.rot;
      scene.time = s.time;
      scene.timeLeft = s.timeLeft;
      scene.bossHp = s.bossHp;
      scene.shot = s.shot;
      if (
        s.landedKinds?.length === scene.landedKinds.length &&
        s.landedKinds.every((kind) => kind === null || (typeof kind === 'string' && kind in KINDS))
      )
        scene.landedKinds = [...s.landedKinds];
      scene.practiceGifts = s.practiceGifts ?? 0;
      scene.paused = true;
    }
    this.mount(scene.el, 'level');
    setMusicTheme(chapterTheme(chapterOf(n).n));
    this.scene = scene;
    scene.onResolvedThrow = () => this.checkpointRound();
    if (o.resume) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (this.scene !== scene) return;
          closeModals();
          scene.modalOpen = null;
          const card = modal(
            [
              h('div', { class: 'end-title' }, t('Welcome back — your planet is waiting')),
              btn(t('Resume'), 'primary wide', () => card.close()),
              btn(t('Leave to galaxy'), 'ghost wide', () => {
                card.close();
                scene.ended = true;
                scene.o.onQuit();
              }),
            ],
            {
              dismiss: false,
              onClose: () => {
                scene.paused = false;
                scene.modalOpen = null;
                if (scene.over && !scene.ended) scene.checkEnd();
              },
            },
          );
          scene.modalOpen = card;
          scene.renderHud();
        }),
      );
    }
  }

  private levelEnded(r: LevelResult) {
    if (this.p.savedRound) {
      clearInterruptedRound(this.p);
      this.save();
    }
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
    return (SKINS.find((s) => s.id === this.p.skin && (!this.p.settings.hidePaidLooks || (!s.starter && !s.pass))) ?? SKINS[0]).glow;
  }

  // ------------------------------------------------------------------ purchases
  get refundQuietUntil() {
    return refundQuietUntil(this.p);
  }

  priceOf(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return pr ? (this.prices[pr.id]?.display ?? (this.iap.kind === 'native' ? '' : pr.fallbackPrice)) : '';
  }

  canBuy(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return (
      !!pr &&
      (this.iap.kind !== 'native' || !!this.prices[pr.id]?.display) &&
      !(key === 'starter' && this.p.starter) &&
      !(key === 'pass' && this.p.pass) &&
      !(key === 'piggy' && (!this.p.piggy || this.p.pendingPiggy))
    );
  }

  currencyOf(key: string) {
    const pr = PRODUCT_BY_KEY[key];
    return pr ? this.prices[pr.id]?.currency || undefined : undefined;
  }

  needGems() {
    sfx.error();
    toast(t('Not enough gems yet'), 'bad');
  }

  async buy(key: string) {
    if (this.busy) return;
    const pr = PRODUCT_BY_KEY[key];
    if (!pr) return;
    if (this.screen !== 'shop') {
      this.showShop();
      return;
    }
    if (!this.canBuy(key)) return;
    this.busy = true;
    if (!(await parentalGate('buy')) || !(await contentsSheet(pr, this.priceOf(key), this.p.piggy, this.p.roadPoints))) {
      this.busy = false;
      return;
    }
    this.root.classList.add('buying');
    try {
      if (key === 'piggy') {
        this.p.pendingPiggy = { amount: this.p.piggy, startedAt: Date.now() };
        await saveProfileChecked(this.p);
      }
      const r = await this.iap.purchase(pr);
      if (r.ok && r.txId) {
        this.root.classList.remove('buying');
        await this.handleTransaction({ productId: r.productId ?? pr.id, txId: r.txId });
        if (this.lastReceipt) await this.lastReceipt;
      } else if (r.pending) {
        ledger.count('purchase_pending');
        toast(t("Waiting for a grown-up's approval"));
      } else if (r.cancelled) {
        if (key === 'piggy') this.p.pendingPiggy = null;
        ledger.count('purchase_cancelled');
      } else if (r.error) {
        if (key === 'piggy') this.p.pendingPiggy = null;
        ledger.count('purchase_failed');
        toast(t('Purchase could not be completed'), 'bad');
      }
    } catch {
      toast(t('Purchase could not be completed'), 'bad');
    } finally {
      if (key === 'piggy') await this.saveNow();
      this.busy = false;
      this.root.classList.remove('buying');
      if (this.screen === 'shop') this.refresh();
    }
  }

  private handleTransaction(event: IapEvent): Promise<void> {
    const running = this.processingTx.get(event.txId);
    if (running) return running;
    const task = this.txQueue
      .then(() => this.grant(event.productId, event.txId, event.purchasedAt))
      .catch(() => toast(t('Purchase could not be completed'), 'bad'))
      .finally(() => this.processingTx.delete(event.txId));
    this.txQueue = task;
    this.processingTx.set(event.txId, task);
    return task;
  }

  async grant(productId: string, txId: string, purchasedAt = Date.now()) {
    const alreadyProcessed = this.p.processedTx.includes(txId);
    const product = PRODUCT_BY_ID[productId];
    const alreadyOwned = (product?.key === 'starter' && this.p.starter) || (product?.key === 'pass' && this.p.pass);
    const g = grantProduct(this.p, productId, txId);
    if (!g && alreadyProcessed) {
      await saveProfileChecked(this.p);
      if (this.iap.kind === 'native') await this.iap.finish(txId).catch(() => {});
      return;
    }
    if (g && !alreadyOwned) {
      ledger.count('purchase_ok');
    }
    if (product && g && !alreadyOwned) {
      const storePrice = this.prices[product.id];
      if (storePrice || this.iap.kind !== 'native')
        recordPurchase({
          tx: txId,
          key: product.key,
          cents: Math.round((storePrice?.amount ?? Number(product.fallbackPrice.slice(1))) * 100),
          currency: storePrice?.currency || 'USD',
          at: purchasedAt,
        });
      else this.p.pendingPurchaseRecords.push({ tx: txId, key: product.key, at: purchasedAt });
    }
    await flushLedger(product && g && !alreadyOwned && (this.prices[product.id] || this.iap.kind !== 'native') ? txId : undefined);
    await saveProfileChecked(this.p);
    if (this.iap.kind === 'native') await this.iap.finish(txId).catch(() => {});
    if (!g || alreadyOwned) return;
    sfx.gem();
    haptic.success();
    this.refresh();
    if (product) this.lastReceipt = receiptCard(product, g.gems);
  }

  private async flushPendingPurchaseRecords() {
    const unresolved: Profile['pendingPurchaseRecords'] = [];
    const recorded: string[] = [];
    for (const entry of this.p.pendingPurchaseRecords) {
      const product = PRODUCT_BY_KEY[entry.key];
      const price = product && this.prices[product.id];
      if (!price) {
        unresolved.push(entry);
        continue;
      }
      recordPurchase({ tx: entry.tx, key: entry.key, cents: Math.round(price.amount * 100), currency: price.currency, at: entry.at });
      recorded.push(entry.tx);
    }
    try {
      for (const tx of recorded) await flushLedger(tx);
    } catch {
      return;
    }
    this.p.pendingPurchaseRecords = unresolved;
    if (recorded.length) await saveProfileChecked(this.p).catch(() => {});
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
        (this.p.meta as Profile['meta'] & { passLooksOnly?: boolean }).passLooksOnly = true;
        restored++;
      }
    }
    if (restored) this.saveNow();
    return restored;
  }

  private async reconcilePurchases() {
    if (this.iap.kind === 'native') {
      try {
        const transactions = await this.iap.transactions();
        for (const event of transactions) {
          const product = PRODUCT_BY_ID[event.productId];
          if (!product || event.revokedAt || this.p.processedTx.includes(event.txId)) continue;
          if (!event.purchasedAt || event.purchasedAt < this.p.meta.installed - 60_000) continue;
          await this.handleTransaction(event);
        }
      } catch {
        // StoreKit can be unavailable offline; retry next launch.
      }
    }
    try {
      const owned = await this.iap.owned();
      if (this.iap.kind === 'native') {
        for (const id of Object.keys(PRODUCT_BY_ID)) {
          const key = PRODUCT_BY_ID[id].key;
          if (
            !PRODUCT_BY_ID[id].consumable &&
            !owned.includes(id) &&
            ((key === 'starter' && this.p.starter) || (key === 'pass' && this.p.pass))
          ) {
            revokeProduct(this.p, id);
            await this.saveNow();
          }
        }
      }
      if (this.applyOwned(owned)) this.refresh();
    } catch {
      // Keep local ownership if the store cannot answer.
    }
  }

  async restore() {
    const restored = this.applyOwned(await this.iap.restore());
    if (restored) toast(t('Purchases restored!'), 'good');
    else toast(this.iap.kind === 'native' ? t('Nothing to restore') : t('Restore works in the iOS app'));
    this.refresh();
  }
}
