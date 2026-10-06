// Planet Passport: your profile card, stats and trophy shelf, plus the
// first-time setup and the shareable card image.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { totalStars } from '../../meta/profile';
import { currentLook } from '../../meta/cosmetics';
import { ACHIEVEMENTS } from '../../meta/achievements';
import {
  BADGE_SLOTS,
  BANNERS,
  NAME_A,
  NAME_B,
  badgeEmoji,
  bestFriends,
  currentBanner,
  currentPortraitFrame,
  currentTitle,
  explorerId,
  passportName,
  passportStats,
  pinnedBadges,
  randomName,
  PORTRAIT_FRAMES,
  ownsPortraitFrame,
  titlesOwned,
  toggleBadge,
} from '../../meta/passport';
import { rankTitle } from '../../meta/rank';
import { SPECIES } from '../../core/world';
import { drawKeeper, keeperCanvas } from '../art/keeper';
import { critterCanvas, drawCreature } from '../art/critters';
import { currentBuddy } from '../../meta/buddy';
import { ensureFestival, festivalActive } from '../../meta/festivals';
import { shareCanvas } from '../postcard';
import type { App } from '../app';
import { t } from '../../i18n';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { remixFrame, remixStars, remixTotal } from '../../meta/remix';
import { LANDMARKS } from '../../meta/tuning';
import { SPECIES_BY_ID } from '../../core/world';

const festAcc = (p: App['p']) => (festivalActive(p) ? ensureFestival(p).acc : undefined);

function passportAction(label: string, style: string, action: () => void) {
  const [icon, ...words] = label.split(' ');
  return btn(
    h('span', { class: 'passport-action-content' }, h('span', { 'aria-hidden': 'true' }, icon), h('span', null, words.join(' '))),
    style,
    action,
  );
}

/** The card itself (used on the Passport screen and in the setup sheet). */
export function passportCard(app: App, compact = false) {
  const p = app.p;
  const banner = currentBanner(p);
  const title = currentTitle(p);
  const badges = pinnedBadges(p);
  return h(
    'div',
    {
      class: `pp-card${p.pass && !p.settings.hidePaidLooks ? ' gold' : ''}${compact ? ' compact' : ''}`,
      style: `--b1:${banner.colors[0]};--b2:${banner.colors[1]}`,
    },
    h(
      'div',
      { class: 'pp-av portrait-frame', style: `--portrait-frame:${currentPortraitFrame(p).color}` },
      keeperCanvas(currentLook(p), compact ? 96 : 120, 0.3),
      p.buddy.species
        ? h('span', { class: 'pp-buddy' }, critterCanvas(p.buddy.species, compact ? 40 : 48, 0.4, currentBuddy(p, festAcc(p))?.acc ?? ''))
        : null,
    ),
    h(
      'div',
      { class: 'pp-id' },
      h('div', { class: 'pp-name' }, passportName(p)),
      h('div', { class: `pp-title${title?.gold ? ' gold' : ''}` }, title ? t(title.text) : ''),
      h('div', { class: 'pp-num' }, t('Explorer {id}', { id: explorerId(p) })),
      p.level >= 5 ? h('div', { class: 'pp-home-level' }, t('Homeworld Level {n}', { n: p.home.level })) : null,
    ),
    compact
      ? null
      : h(
          'div',
          { class: 'pp-strip' },
          h('span', null, h('b', null, String(p.chapters.length)), h('small', null, t('Chapters'))),
          h('span', null, h('b', null, `${totalStars(p)}★`), h('small', null, t('Stars'))),
          h('span', null, h('b', null, `${p.seen.length}/${SPECIES.length}`), h('small', null, t('Lifebook'))),
        ),
    compact
      ? null
      : h(
          'div',
          { class: 'pp-badges' },
          ...Array.from({ length: BADGE_SLOTS }, (_, i) => {
            const a = badges[i];
            return h('span', { class: `pp-badge${a ? '' : ' empty'}`, title: a ? t(a.title) : '' }, a ? badgeEmoji(a.id) : '');
          }),
        ),
  );
}

export function showPassport(app: App) {
  const p = app.p;
  const card = passportCard(app);
  const stats = h(
    'div',
    { class: 'pp-stats' },
    ...passportStats(p).map((s) =>
      h('div', null, h('b', null, typeof s.value === 'number' ? fmt(s.value) : s.value), h('small', null, s.label)),
    ),
  );
  const pinned = new Set(pinnedBadges(p).map((a) => a.id));
  const remixFrames = Object.keys(p.remix ?? {})
    .map(Number)
    .sort((a, b) => a - b)
    .map((chapter) => {
      const frame = remixFrame(p, chapter);
      const total = remixStars(p, chapter).reduce((a, b) => a + b, 0);
      return h(
        'div',
        { class: `passport-remix-frame remix-frame-${frame}` },
        h('b', null, t('Chapter {n}', { n: chapter })),
        h('span', null, t('Remix {n}/30', { n: total })),
        h('small', null, frame === 'gold' ? t('🥇 Gold frame') : frame === 'silver' ? t('🥈 Silver frame') : t('Frame in progress')),
      );
    });
  const trophies = h(
    'div',
    { class: 'trophies' },
    ...ACHIEVEMENTS.map((a) => {
      const done = a.done(p);
      return h(
        'button',
        {
          class: `trophy${done ? '' : ' locked'}${pinned.has(a.id) ? ' pinned' : ''}`,
          onclick: () => {
            if (!done) return toast(t('Not earned yet'));
            toggleBadge(p, a.id);
            sfx.click();
            haptic.light();
            app.save();
            showPassport(app);
          },
        },
        h('span', { class: 'ti' }, done ? badgeEmoji(a.id) : '🔒'),
        h('small', null, t(a.title)),
      );
    }),
  );
  app.mount(
    h(
      'div',
      { class: 'screen page passport' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Planet Passport')),
      h(
        'div',
        { class: 'scroll' },
        card,
        h(
          'div',
          { class: 'row passport-actions' },
          passportAction(t('✏️ Edit'), 'ghost', () => editPassport(app)),
          passportAction(t('🧑‍🚀 Styles'), 'ghost', () => app.showStyles()),
          passportAction(t('📤 Share'), 'primary', () => sharePassport(app)),
        ),
        h('div', { class: 'sec-title' }, t('Stats')),
        stats,
        h('div', { class: 'sec-title' }, t('Homeworld keepsakes')),
        h(
          'div',
          { class: 'passport-homeworld-list' },
          ...LANDMARKS.filter((site) => p.home.landmarks[site.id].stage === 4).map((site) => h('p', null, `✦ ${t(site.name)}`)),
          ...bestFriends(p).map((friend) =>
            h('p', null, t('Best friend: {name}', { name: friend.nick ?? t(SPECIES_BY_ID[friend.species].name) })),
          ),
          LANDMARKS.every((site) => p.home.landmarks[site.id].stage !== 4) && bestFriends(p).length === 0
            ? h('p', { class: 'muted' }, t('Your Homeworld memories will appear here.'))
            : null,
        ),
        remixFrames.length ? h('div', { class: 'sec-title' }, t('Bonus Remix · {n}★', { n: remixTotal(p) })) : null,
        remixFrames.length ? h('div', { class: 'passport-remix-list' }, ...remixFrames) : null,
        h('div', { class: 'sec-title' }, t('Trophies'), ' ', h('small', { class: 'muted' }, t('tap to pin up to {n}', { n: BADGE_SLOTS }))),
        trophies,
      ),
    ),
    'passport',
  );
  if (currentTitle(p))
    celebrate('passport', {
      root: card,
      reduceMotion: effectiveReduceMotion(p),
      duration: 850,
      beats: [
        {
          at: 120,
          play: (instant) => {
            card.querySelector('.pp-title')?.classList.add('unfurled');
            if (!instant) {
              sfx.whoosh();
              haptic.light();
            }
          },
        },
      ],
    });
}

/** Name, title and banner editor. `first` = the one-time setup after the first planet. */
export function editPassport(app: App, first = false) {
  const p = app.p;
  let { first: a, second: b } = p.passport.first < 0 ? randomName() : p.passport;
  let title = currentTitle(p)?.id ?? '';
  let banner = currentBanner(p).id;
  let frame = ownsPortraitFrame(p, p.passport.frame) ? p.passport.frame : 0;
  const wordA = h('span');
  const wordB = h('span');
  const paint = () => {
    wordA.textContent = NAME_A[a];
    wordB.textContent = NAME_B[b];
  };
  paint();
  const spin = (which: 0 | 1, d: number) => () => {
    if (which === 0) a = (a + d + NAME_A.length) % NAME_A.length;
    else b = (b + d + NAME_B.length) % NAME_B.length;
    sfx.click();
    paint();
  };
  const wheel = (which: 0 | 1) =>
    h(
      'div',
      { class: 'pe-wheel' },
      btn('◀', 'ghost small', spin(which, -1)),
      h('div', { class: 'pe-name' }, which ? wordB : wordA),
      btn('▶', 'ghost small', spin(which, 1)),
    );
  const titles = titlesOwned(p);
  const titleSel = h(
    'select',
    { class: 'lang-select', 'aria-label': t('Title') },
    ...titles.map((x) => h('option', { value: x.id }, t(x.text))),
  ) as HTMLSelectElement;
  titleSel.value = title;
  titleSel.addEventListener('change', () => (title = titleSel.value));
  const swatches = h(
    'div',
    { class: 'pe-banners' },
    ...BANNERS.filter((x) => !p.settings.hidePaidLooks || (x.id !== 6 && x.id !== 7)).map((x) => {
      const ok = x.unlocked(p);
      const el = h(
        'button',
        {
          class: `pe-sw${ok ? '' : ' locked'}${x.id === banner ? ' on' : ''}`,
          style: `background:linear-gradient(135deg,${x.colors[0]},${x.colors[1]})`,
          'aria-label': t(x.name),
          onclick: () => {
            if (!ok) return toast(`🔒 ${t(x.how)}`);
            banner = x.id;
            sfx.click();
            swatches.querySelectorAll('.pe-sw').forEach((s) => s.classList.remove('on'));
            el.classList.add('on');
          },
        },
        ok ? '' : '🔒',
      );
      return el;
    }),
  );
  const frameChoices = h(
    'div',
    { class: 'portrait-choices' },
    ...PORTRAIT_FRAMES.map((choice, index) => {
      const owned = ownsPortraitFrame(p, index);
      const button = h(
        'button',
        {
          class: `portrait-choice${frame === index ? ' on' : ''}`,
          style: `--portrait-frame:${choice.color}`,
          'aria-label': t(choice.name),
          onclick: () => {
            if (!owned) return toast(t('Open chapter {n} chest', { n: choice.unlock }));
            frame = index;
            sfx.click();
            (document.querySelector('.pe-av.portrait-frame') as HTMLElement | null)?.style.setProperty('--portrait-frame', choice.color);
            frameChoices.querySelectorAll('.portrait-choice').forEach((el) => el.classList.remove('on'));
            button.classList.add('on');
          },
        },
        owned ? t(choice.name) : '🔒',
      );
      return button;
    }),
  );
  const m = modal([
    h('div', { class: 'm-title' }, first ? t('Your Planet Passport') : t('Edit Passport')),
    first ? h('p', { class: 'muted' }, t('Every explorer needs a name. Pick one you like — you can change it any time.')) : null,
    h(
      'div',
      { class: 'pe-av portrait-frame', style: `--portrait-frame:${PORTRAIT_FRAMES[frame].color}` },
      keeperCanvas(currentLook(p), 92, 0.3, { cheer: 1 }),
    ),
    wheel(0),
    wheel(1),
    btn(t('✨ Surprise me'), 'ghost small passport-surprise', () => {
      ({ first: a, second: b } = randomName());
      sfx.click();
      paint();
    }),
    first ? null : h('label', { class: 'toggle lang' }, t('Title'), titleSel),
    first ? null : h('div', { class: 'sec-title' }, t('Banner')),
    first ? null : swatches,
    first ? null : h('div', { class: 'sec-title' }, t('Portrait frame')),
    first ? null : frameChoices,
    btn(first ? t('Looks good!') : t('Save'), 'primary wide', () => {
      // the first-time sheet has no title picker: keep following the rank title automatically
      p.passport = { ...p.passport, first: a, second: b, set: true, title: first ? p.passport.title : title, banner, frame };
      sfx.chest();
      haptic.success();
      app.save();
      m.close();
      if (app.screen === 'passport') showPassport(app);
      else if (first) toast(t('Welcome aboard, {name}!', { name: passportName(p) }), 'good');
      else app.refresh();
    }),
  ]);
}

/** A 1080×1350 image of the Passport for the share sheet. */
function renderPassportImage(app: App): HTMLCanvasElement {
  const p = app.p;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const banner = currentBanner(p);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, banner.colors[0]);
  bg.addColorStop(1, banner.colors[1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#fff';
  for (let i = 0; i < 120; i++) {
    g.globalAlpha = 0.2 + rnd() * 0.6;
    g.beginPath();
    g.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // card frame
  g.strokeStyle = p.pass && !p.settings.hidePaidLooks ? '#ffd24a' : 'rgba(255,255,255,0.5)';
  g.lineWidth = 14;
  g.beginPath();
  g.roundRect(40, 40, W - 80, H - 80, 60);
  g.stroke();
  const font = (w: number, s: number) => `${w} ${s}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = font(700, 40);
  g.fillText(t('PLANET PASSPORT'), W / 2, 130);
  drawKeeper(g, currentLook(p), W / 2, 640, 480, 0.3, { cheer: 1 });
  g.strokeStyle = currentPortraitFrame(p).color;
  g.lineWidth = 12;
  g.beginPath();
  g.roundRect(W / 2 - 280, 165, 560, 505, 100);
  g.stroke();
  if (p.buddy.species) drawCreature(g, p.buddy.species, W / 2 - 250, 640, 0, 150, 0.7, currentBuddy(p, festAcc(p))?.acc ?? '');
  g.fillStyle = p.pass && !p.settings.hidePaidLooks ? '#ffd24a' : '#ffffff';
  g.font = font(700, 88);
  g.fillText(passportName(p), W / 2, 770);
  const title = currentTitle(p);
  g.fillStyle = '#e8e4ff';
  g.font = font(500, 46);
  g.fillText(`${title ? t(title.text) : rankTitle(p.rank)} · ${explorerId(p)}`, W / 2, 840);
  const cells = [
    [String(p.chapters.length), t('Chapters')],
    [`${totalStars(p)}★`, t('Stars')],
    [`${p.seen.length}/${SPECIES.length}`, t('Lifebook')],
  ];
  cells.forEach(([v, l], i) => {
    const x = W / 2 + (i - 1) * 300;
    g.fillStyle = 'rgba(10,6,30,0.35)';
    g.beginPath();
    g.roundRect(x - 130, 890, 260, 150, 30);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = font(700, 62);
    g.fillText(v, x, 970);
    g.fillStyle = '#c9c2ff';
    g.font = font(500, 34);
    g.fillText(l, x, 1015);
  });
  const badges = pinnedBadges(p);
  g.font = font(500, 84);
  badges.forEach((a, i) => g.fillText(badgeEmoji(a.id), W / 2 + (i - (badges.length - 1) / 2) * 140, 1150));
  g.fillStyle = '#5ef2b0';
  g.font = font(700, 48);
  g.fillText('Comet Garden', W / 2, 1250);
  return c;
}

function sharePassport(app: App) {
  const p = app.p;
  sfx.click();
  shareCanvas(
    renderPassportImage(app),
    t('{name} · {stars}★ · {n} creatures found in Comet Garden ☄️', { name: passportName(p), stars: totalStars(p), n: p.seen.length }),
    'planet-passport',
  );
}
