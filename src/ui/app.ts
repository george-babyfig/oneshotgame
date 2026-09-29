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
import { discoverSpecies, grantProduct, spendGems } from '../meta/economy';
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
import { roadReady, chestsReady } from '../meta/progression';
import { letterOf } from '../meta/inbox';
import { homeBadge } from '../meta/homeworld';
import { wishClaimable } from '../meta/wishes';

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
  | 'pass'
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
  private screenStack = new ScreenHistory();
  private returning = false;

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
    await loadLedger();
    ledger.count('app_open');
    this.p.meta.sessions++;
    this.applySettings();
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
    const same = name === this.screen && name !== 'level';
    const scrollTop = same ? (this.host.querySelector('.scroll')?.scrollTop ?? 0) : 0;
    if (!same) el.classList.add('enter');
    if (MAIN_TABS.includes(name as MainTab)) el.append(this.tabBar(name as MainTab));
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
      pass: () => this.showPass(),
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
      !compact && this.p.chapters.length && this.p.meta.sessions > 1
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
        }
      },
      onThrow: (kind) => {
        this.p.stats.throws++;
        const star = addFling(this.p, kind);
        if (star) toast(t('{name} record: {stars}', { name: t(KINDS[kind].name), stars: '★'.repeat(star) }), 'good');
        const l = currentLook(this.p).launcher;
        this.p.mastery[l] = (this.p.mastery[l] ?? 0) + 1;
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
